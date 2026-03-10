"""
Admin API — quản lý tài liệu và users
GET    /admin/documents
DELETE /admin/documents/{id}
GET    /admin/users
PATCH  /admin/users/{id}
PATCH  /admin/users/{id}/role
PATCH  /admin/users/{id}/toggle-status
"""
from __future__ import annotations

import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime

from app.db.database import get_db
from app.db import models
from app.api.auth import UserResponse
from app.core.db_dependencies import get_admin_user

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class DocumentResponse(BaseModel):
    id: int
    filename: str
    status: str
    uploaded_by: int
    created_at: datetime

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    gender: Optional[str] = None
    date_of_birth: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    role: Optional[str] = None

class UserRoleUpdate(BaseModel):
    role: str


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/documents", response_model=list[DocumentResponse])
def get_all_documents(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    return db.query(models.Document)\
             .order_by(models.Document.created_at.desc())\
             .offset(skip).limit(limit).all()


@router.delete("/documents/{document_id}")
def delete_document(
    document_id: int,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")

    if os.path.exists(doc.file_path):
        os.remove(doc.file_path)

    db.delete(doc)
    db.commit()
    return {"message": f"Đã xóa tài liệu {doc.filename} thành công"}


@router.get("/users", response_model=list[UserResponse])
def get_all_users(
    skip: int = 0,
    limit: int = 100,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    return db.query(models.User)\
             .order_by(models.User.created_at.desc())\
             .offset(skip).limit(limit).all()


@router.patch("/users/{user_id}", response_model=UserResponse)
def update_user(
    user_id: int,
    user_update: UserUpdate,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")

    if user_update.email and user_update.email != user.email:
        if db.query(models.User).filter(
            models.User.email == user_update.email,
            models.User.id != user_id
        ).first():
            raise HTTPException(status_code=400, detail="Email đã được sử dụng")

    for key, value in user_update.model_dump(exclude_unset=True).items():
        setattr(user, key, value)

    db.commit()
    db.refresh(user)
    return user


@router.patch("/users/{user_id}/role")
def update_user_role(
    user_id: int,
    role_update: UserRoleUpdate,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    if role_update.role not in ["user", "admin"]:
        raise HTTPException(status_code=400, detail="Role không hợp lệ")

    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy user")

    user.role = role_update.role
    db.commit()
    return {"message": f"Đã cập nhật quyền của {user.username} thành {user.role}"}


@router.patch("/users/{user_id}/toggle-status")
def toggle_user_status(
    user_id: int,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài khoản này")

    if user.id == current_user.id:
        raise HTTPException(status_code=400, detail="Bạn không thể tự khóa tài khoản của mình!")

    user.is_active = not user.is_active
    db.commit()

    action = "Mở khóa" if user.is_active else "Khóa"
    return {"message": f"Đã {action} tài khoản {user.username} thành công!"}