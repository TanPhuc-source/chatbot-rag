"""
UI Settings API
GET  /ui-settings        — lấy cấu hình giao diện chatbot (public)
PUT  /ui-settings        — admin cập nhật
POST /ui-settings/reset  — admin reset về mặc định
"""
from __future__ import annotations
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import Column, Integer, String
from sqlalchemy.orm import Session
from typing import Optional

from app.db.database import get_db, Base
from app.core.db_dependencies import get_admin_user
from app.db import models

router = APIRouter()

# ── Model ──────────────────────────────────────────────────────────────────────

class UISettings(Base):
    """Cấu hình giao diện chatbot — singleton (id=1)."""
    __tablename__ = "ui_settings"

    id          = Column(Integer, primary_key=True, default=1)
    themeColor  = Column(String, default="#1a5fb4")
    welcomeTitle    = Column(String, default="Xin chào! 👋")
    welcomeSubtitle = Column(String, default="Tôi có thể giúp gì cho bạn?")
    schoolName  = Column(String, default="Trường Đại Học Đồng Tháp")
    schoolDept  = Column(String, default="Trung Tâm Ngoại Ngữ Và Tin Học")
    faq1 = Column(String, default="Thủ tục đăng ký thi VSTEP như thế nào?")
    faq2 = Column(String, default="Học phí của các khóa học ngoại ngữ là bao nhiêu?")
    faq3 = Column(String, default="Trung tâm có các chứng chỉ tiếng Anh nào?")
    faq4 = Column(String, default="Lịch khai giảng các khóa học mới?")


# ── Schemas ────────────────────────────────────────────────────────────────────

class UISettingsOut(BaseModel):
    themeColor: str
    welcomeTitle: str
    welcomeSubtitle: str
    schoolName: str
    schoolDept: str
    faq1: str
    faq2: str
    faq3: str
    faq4: str
    class Config: from_attributes = True


class UISettingsIn(BaseModel):
    themeColor: Optional[str] = None
    welcomeTitle: Optional[str] = None
    welcomeSubtitle: Optional[str] = None
    schoolName: Optional[str] = None
    schoolDept: Optional[str] = None
    faq1: Optional[str] = None
    faq2: Optional[str] = None
    faq3: Optional[str] = None
    faq4: Optional[str] = None


# ── Helpers ────────────────────────────────────────────────────────────────────

def get_or_create(db: Session) -> UISettings:
    s = db.query(UISettings).filter(UISettings.id == 1).first()
    if not s:
        s = UISettings(
            id=1,
            themeColor="#1a5fb4",
            welcomeTitle="Xin chào! 👋",
            welcomeSubtitle="Tôi có thể giúp gì cho bạn?",
            schoolName="Trường Đại Học Đồng Tháp",
            schoolDept="Trung Tâm Ngoại Ngữ Và Tin Học",
            faq1="Thủ tục đăng ký thi VSTEP như thế nào?",
            faq2="Học phí của các khóa học ngoại ngữ là bao nhiêu?",
            faq3="Trung tâm có các chứng chỉ tiếng Anh nào?",
            faq4="Lịch khai giảng các khóa học mới?",
        )
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


# ── Routes ─────────────────────────────────────────────────────────────────────

@router.get("", response_model=UISettingsOut)
def get_ui_settings(db: Session = Depends(get_db)):
    return get_or_create(db)


@router.put("", response_model=UISettingsOut)
def update_ui_settings(
    body: UISettingsIn,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    s = get_or_create(db)
    for field, value in body.dict(exclude_none=True).items():
        setattr(s, field, value)
    db.commit()
    db.refresh(s)
    return s


@router.post("/reset", response_model=UISettingsOut)
def reset_ui_settings(
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    s = get_or_create(db)
    s.themeColor     = "#1a5fb4"
    s.welcomeTitle   = "Xin chào! 👋"
    s.welcomeSubtitle = "Tôi có thể giúp gì cho bạn?"
    s.schoolName     = "Trường Đại Học Đồng Tháp"
    s.schoolDept     = "Trung Tâm Ngoại Ngữ Và Tin Học"
    s.faq1 = "Thủ tục đăng ký thi VSTEP như thế nào?"
    s.faq2 = "Học phí của các khóa học ngoại ngữ là bao nhiêu?"
    s.faq3 = "Trung tâm có các chứng chỉ tiếng Anh nào?"
    s.faq4 = "Lịch khai giảng các khóa học mới?"
    db.commit()
    db.refresh(s)
    return s