from __future__ import annotations

import os
import shutil
import uuid
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status, Request
from jose import jwt, JWTError
from app.config import get_settings
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db_dependencies import get_admin_user
from app.db.database import get_db
from app.db import models


router = APIRouter()

FORMS_DIR = Path("static/forms")
FORMS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".xlsx", ".xls", ".pptx"}


# ── Schemas ───────────────────────────────────────────────────────────────

class FormResponse(BaseModel):
    id: int
    display_name: str
    description: Optional[str]
    filename: str
    file_type: str
    is_active: bool
    download_url: str
    created_at: str

    class Config:
        from_attributes = True


class FormUpdate(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


# ── Helpers ───────────────────────────────────────────────────────────────

def get_optional_user(request: Request, db: Session = Depends(get_db)) -> Optional[models.User]:
    """Đọc token từ HttpOnly Cookie để xác định user mà không bắt buộc đăng nhập."""
    token = request.cookies.get("access_token")
    if not token:
        return None
    try:
        settings = get_settings()
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            return None
        return db.query(models.User).filter(models.User.username == username).first()
    except JWTError:
        return None

def _get_base_url(request: Request) -> str:
    """Lấy base URL đúng kể cả khi đi qua ngrok/reverse proxy."""
    # Ngrok và proxy gửi header X-Forwarded-Proto + Host
    proto = request.headers.get("x-forwarded-proto") or request.url.scheme
    host = request.headers.get("x-forwarded-host") or request.headers.get("host") or request.url.netloc
    return f"{proto}://{host}"


def _to_response(form: models.FormTemplate, request: Request) -> FormResponse:
    base_url = _get_base_url(request)
    return FormResponse(
        id=form.id,
        display_name=form.display_name,
        description=form.description,
        filename=form.filename,
        file_type=form.file_type,
        is_active=form.is_active,
        download_url=f"{base_url}/forms/{form.id}/download",
        created_at=form.created_at.isoformat(),
    )


def _get_file_type(filename: str) -> str:
    ext = Path(filename).suffix.lower()
    mapping = {
        ".pdf": "pdf", ".docx": "docx", ".doc": "docx",
        ".xlsx": "xlsx", ".xls": "xlsx", ".pptx": "pptx",
    }
    return mapping.get(ext, "other")


# ── Endpoints ─────────────────────────────────────────────────────────────

@router.get("", response_model=list[FormResponse])
def list_forms(
    request: Request, # Thêm Request để slowapi hoặc helper có thể đọc cookie
    include_inactive: bool = False,
    current_user: Optional[models.User] = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    if include_inactive:
        if not current_user or current_user.role != "admin":
            include_inactive = False  # Âm thầm ép về False

    q = db.query(models.FormTemplate)
    if not include_inactive:
        q = q.filter(models.FormTemplate.is_active == True)
        
    forms = q.order_by(models.FormTemplate.created_at.desc()).all()
    return [_to_response(f, request) for f in forms]




@router.post("/upload", response_model=FormResponse, status_code=status.HTTP_201_CREATED)
async def upload_form(
    request: Request,
    display_name: str = Form(...),
    file: UploadFile = File(...),
    description: Optional[str] = Form(None),
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Upload biểu mẫu mới — chỉ admin."""
    suffix = Path(file.filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Chỉ hỗ trợ: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    unique_filename = f"{uuid.uuid4().hex}_{file.filename}"
    file_path = FORMS_DIR / unique_filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    form = models.FormTemplate(
        display_name=display_name.strip(),
        description=description,
        filename=file.filename,
        file_path=str(file_path),
        file_type=_get_file_type(file.filename),
        uploaded_by=current_user.id,
    )
    db.add(form)
    db.commit()
    db.refresh(form)
    return _to_response(form, request)


@router.patch("/{form_id}", response_model=FormResponse)
def update_form(
    form_id: int,
    body: FormUpdate,
    request: Request,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Đổi tên hiển thị / mô tả / ẩn-hiện — chỉ admin."""
    form = db.query(models.FormTemplate).filter(models.FormTemplate.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Không tìm thấy biểu mẫu")

    update_data = body.model_dump(exclude_unset=True)
    for key, val in update_data.items():
        setattr(form, key, val)

    db.commit()
    db.refresh(form)
    return _to_response(form, request)


@router.delete("/{form_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_form(
    form_id: int,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Xóa biểu mẫu + file vật lý — chỉ admin."""
    form = db.query(models.FormTemplate).filter(models.FormTemplate.id == form_id).first()
    if not form:
        raise HTTPException(status_code=404, detail="Không tìm thấy biểu mẫu")

    # Xóa file vật lý
    try:
        if os.path.exists(form.file_path):
            os.remove(form.file_path)
    except OSError:
        pass  # không fail nếu file đã mất

    db.delete(form)
    db.commit()


@router.get("/{form_id}/download")
def download_form(
    form_id: int,
    db: Session = Depends(get_db),
):
    """
    Public download — người dùng chat nhận link này, click là tải được.
    Không cần đăng nhập.
    """
    form = db.query(models.FormTemplate).filter(
        models.FormTemplate.id == form_id,
        models.FormTemplate.is_active == True,
    ).first()
    if not form:
        raise HTTPException(status_code=404, detail="Biểu mẫu không tồn tại hoặc đã bị ẩn")
    if not os.path.exists(form.file_path):
        raise HTTPException(status_code=404, detail="File không tồn tại trên server")

    return FileResponse(
        path=form.file_path,
        filename=form.filename,
        media_type="application/octet-stream",
    )