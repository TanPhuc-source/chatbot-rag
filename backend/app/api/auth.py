"""
Auth API — đăng ký / đăng nhập
POST /auth/register
POST /auth/login
"""
from __future__ import annotations

from datetime import timedelta, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import jwt
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional

from app.db.database import get_db
from app.db import models
from app.config import get_settings
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from app.api import schemas

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# ── Schemas ────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None

class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    full_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    avatar_url: Optional[str] = None  # <--- THÊM DÒNG NÀY
    role: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str


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


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/register", response_model=UserResponse)
def register(user: UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == user.username).first():
        raise HTTPException(status_code=400, detail="Tên đăng nhập đã được sử dụng")

    if db.query(models.User).filter(models.User.email == user.email).first():
        raise HTTPException(status_code=400, detail="Email này đã được đăng ký")

    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hash_password(user.password),
        role="user",
        full_name=user.full_name,
        gender=user.gender,
        date_of_birth=user.date_of_birth,
        phone=user.phone,
        address=user.address,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(
        models.User.username == form_data.username
    ).first()

    # 1. Kiểm tra tài khoản và mật khẩu
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Tài khoản hoặc mật khẩu không chính xác",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # 2. THÊM MỚI: Kiểm tra tài khoản có bị khóa không
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Quản trị viên."
        )

    # 3. Tạo và trả về token nếu hợp lệ
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer", "role": user.role}

# Cấu hình Bearer token
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Không thể xác thực thông tin đăng nhập",
        headers={"WWW-Authenticate": "Bearer"},
    )
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

# 1. API LẤY THÔNG TIN CÁ NHÂN
@router.get("/me", response_model=UserResponse)
def read_users_me(current_user: models.User = Depends(get_current_user)):
    return current_user

# 2. API CẬP NHẬT THÔNG TIN CÁ NHÂN
@router.patch("/me", response_model=UserResponse)
def update_user_me(
    user_update: schemas.UserUpdate, 
    current_user: models.User = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    # Cập nhật các trường có gửi lên (không gửi thì giữ nguyên)
    update_data = user_update.model_dump(exclude_unset=True)
    
    # Không cho phép tự đổi quyền (role) ở endpoint này
    if "role" in update_data:
        del update_data["role"]
        
    for key, value in update_data.items():
        setattr(current_user, key, value)
        
    db.commit()
    db.refresh(current_user)
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

from fastapi import UploadFile, File
import os
import shutil
from pathlib import Path

UPLOAD_DIR = Path("uploads/avatars")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/me/avatar")
def upload_avatar(
    file: UploadFile = File(...),
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not file.content_type.startswith("image/"):
        raise HTTPException(400, detail="Chỉ chấp nhận file ảnh")

    # Tạo tên file duy nhất
    file_ext = file.filename.split(".")[-1].lower()
    filename = f"user_{current_user.id}_{datetime.now().strftime('%Y%m%d%H%M%S')}.{file_ext}"
    file_path = UPLOAD_DIR / filename

    # Lưu file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Cập nhật đường dẫn vào DB
    current_user.avatar_url = f"/uploads/avatars/{filename}"
    db.commit()
    db.refresh(current_user)

    return {"message": "Avatar đã được cập nhật", "avatar_url": current_user.avatar_url}