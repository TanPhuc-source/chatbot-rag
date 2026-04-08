from __future__ import annotations

from datetime import timedelta, datetime, timezone
import os
import shutil
import logging
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Response, Request
from fastapi.security import OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import jwt, JWTError
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

from app.db.database import get_db
from app.db import models
from app.config import get_settings
from app.api import schemas

from app.core.limiter import limiter

router = APIRouter()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

logger = logging.getLogger("avatar_upload")

# ── Schemas ────────────────────────────────────────────────────────────────

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Helpers ────────────────────────────────────────────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict) -> str:
    settings = get_settings()
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

def get_current_user(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("access_token")

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin đăng nhập",
    )

    if not token:
        raise credentials_exception

    try:
        settings = get_settings()
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


# ── Endpoints: Authentication ──────────────────────────────────────────────

@router.post("/login")
@limiter.limit("5/minute")
def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(OAuth2PasswordRequestForm),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(
        models.User.username == form_data.username
    ).first()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản hoặc mật khẩu không chính xác",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên."
        )

    settings = get_settings()
    token = create_access_token({"sub": user.username})

    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        samesite="lax",
        secure=False,
        path="/",
    )

    return {"message": "Đăng nhập thành công", "role": user.role, "username": user.username}


@router.post("/logout")
def logout(response: Response):
    response.delete_cookie(key="access_token", samesite="lax", secure=False, path="/")
    return {"message": "Đã đăng xuất thành công"}


# ── Endpoints: User Profile (Me) ──────────────────────────────────────────

@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
def update_user_me(
    user_update: schemas.UserUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    update_data = user_update.model_dump(exclude_unset=True)

    if "role" in update_data:
        del update_data["role"]

    for key, value in update_data.items():
        setattr(current_user, key, value)

    db.commit()
    db.refresh(current_user)
    return current_user


UPLOAD_DIR = Path("uploads/avatars")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTS = {"jpg", "jpeg", "png", "gif", "webp"}
MAX_SIZE = 10 * 1024 * 1024  # 10MB

# Magic bytes dùng để detect loại file thật sự (thay thế imghdr đã bị xóa từ Python 3.13)
_MAGIC: list[tuple[bytes, str]] = [
    (b"\xff\xd8\xff", "jpeg"),
    (b"\x89PNG\r\n\x1a\n", "png"),
    (b"GIF87a", "gif"),
    (b"GIF89a", "gif"),
    (b"RIFF", "webp"),   # cần kiểm tra thêm bytes[8:12]
]

def _detect_image_type(data: bytes) -> str | None:
    for magic, fmt in _MAGIC:
        if data.startswith(magic):
            if fmt == "webp" and data[8:12] != b"WEBP":
                return None
            return fmt
    return None


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    logger.warning(f"[AVATAR] filename={file.filename!r}, content_type={file.content_type!r}, user={current_user.username!r}")

    if not file.filename or "." not in file.filename:
        logger.warning("[AVATAR] REJECT: no extension")
        raise HTTPException(400, detail="File không có phần mở rộng")

    ext = file.filename.rsplit(".", 1)[-1].lower()
    logger.warning(f"[AVATAR] ext={ext!r}")
    if ext not in ALLOWED_EXTS:
        logger.warning(f"[AVATAR] REJECT: ext not allowed: {ext}")
        raise HTTPException(400, detail=f"Không hỗ trợ định dạng .{ext}. Chỉ cho phép: {', '.join(ALLOWED_EXTS)}")

    content = await file.read()
    logger.warning(f"[AVATAR] content length={len(content)}")
    if len(content) > MAX_SIZE:
        logger.warning("[AVATAR] REJECT: file too large")
        raise HTTPException(400, detail="File quá lớn (tối đa 5MB)")

    detected = _detect_image_type(content[:16])
    logger.warning(f"[AVATAR] detected type={detected!r}")
    ALLOWED_DETECTED = {"jpeg", "png", "gif", "webp"}
    if detected not in ALLOWED_DETECTED:
        logger.warning(f"[AVATAR] REJECT: detected type not allowed: {detected}")
        raise HTTPException(400, detail=f"Nội dung file không hợp lệ (detected: {detected})")

    filename = f"user_{current_user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{ext}"
    file_path = UPLOAD_DIR / filename

    with open(file_path, "wb") as f:
        f.write(content)

    current_user.avatar_url = f"/uploads/avatars/{filename}"
    db.commit()
    db.refresh(current_user)

    return {"message": "Avatar đã được cập nhật", "avatar_url": current_user.avatar_url}

