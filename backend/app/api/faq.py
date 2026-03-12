"""
FAQ API
GET    /faq                — danh sách FAQ active (public)
POST   /admin/faq          — thêm FAQ
PUT    /admin/faq/{id}     — sửa FAQ
DELETE /admin/faq/{id}     — xóa FAQ
PATCH  /admin/faq/{id}/toggle — bật/tắt FAQ
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.db.database import get_db
from app.rag.faq_matcher import invalidate_faq_cache
from app.db import models
from app.core.db_dependencies import get_admin_user

router = APIRouter()


class FAQOut(BaseModel):
    id: int
    question: str
    answer: str
    category: Optional[str]
    is_active: bool
    created_at: datetime
    updated_at: datetime
    class Config: from_attributes = True


class FAQIn(BaseModel):
    question: str
    answer: str
    category: Optional[str] = None
    is_active: bool = True


# ── Public ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[FAQOut])
def list_faqs(db: Session = Depends(get_db)):
    return db.query(models.FAQ).filter(models.FAQ.is_active == True).order_by(models.FAQ.id).all()


# ── Admin ───────────────────────────────────────────────────────────────────

@router.get("/admin", response_model=list[FAQOut])
def admin_list_faqs(
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Admin xem tất cả FAQ kể cả inactive."""
    return db.query(models.FAQ).order_by(models.FAQ.id).all()


@router.post("/admin", response_model=FAQOut)
def create_faq(
    body: FAQIn,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    faq = models.FAQ(**body.model_dump(), created_by=current_user.id)
    db.add(faq)
    db.commit()
    db.refresh(faq)
    invalidate_faq_cache()
    return faq


@router.put("/admin/{faq_id}", response_model=FAQOut)
def update_faq(
    faq_id: int,
    body: FAQIn,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    faq = db.query(models.FAQ).filter(models.FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="Không tìm thấy FAQ")
    for k, v in body.model_dump().items():
        setattr(faq, k, v)
    db.commit()
    db.refresh(faq)
    invalidate_faq_cache()
    return faq


@router.delete("/admin/{faq_id}")
def delete_faq(
    faq_id: int,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    faq = db.query(models.FAQ).filter(models.FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="Không tìm thấy FAQ")
    db.delete(faq)
    db.commit()
    invalidate_faq_cache()
    return {"message": "Đã xóa FAQ"}


@router.patch("/admin/{faq_id}/toggle", response_model=FAQOut)
def toggle_faq(
    faq_id: int,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    faq = db.query(models.FAQ).filter(models.FAQ.id == faq_id).first()
    if not faq:
        raise HTTPException(status_code=404, detail="Không tìm thấy FAQ")
    faq.is_active = not faq.is_active
    db.commit()
    db.refresh(faq)
    invalidate_faq_cache()
    return faq