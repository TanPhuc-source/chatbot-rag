"""
Bot Settings API
GET  /settings        — lấy config hiện tại (public, dùng cho chat UI)
PUT  /settings        — admin cập nhật config
POST /settings/reset  — admin reset về mặc định
"""
from __future__ import annotations
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.db.database import get_db
from app.rag.prompts import invalidate_settings_cache
from app.db import models
from app.core.db_dependencies import get_admin_user

router = APIRouter()

DEFAULT_PROMPT = """Bạn là trợ lý học thuật thông minh, hỗ trợ sinh viên và giáo viên.
Nhiệm vụ: trả lời câu hỏi DỰA TRÊN tài liệu được cung cấp bên dưới.

Nguyên tắc:
- Chỉ trả lời dựa trên nội dung trong tài liệu. Không bịa đặt.
- Nếu tài liệu không đủ thông tin, hãy nói rõ điều đó.
- Trả lời bằng ngôn ngữ của câu hỏi (tiếng Việt hoặc tiếng Anh).
- Trích dẫn rõ nguồn (tên file, số trang nếu có) sau mỗi thông tin quan trọng.
- Trình bày rõ ràng, dùng gạch đầu dòng hoặc đánh số khi liệt kê."""


class SettingsOut(BaseModel):
    id: int
    bot_name: str
    system_prompt: str
    temperature: float
    max_tokens: int
    updated_at: datetime
    class Config: from_attributes = True


class SettingsIn(BaseModel):
    bot_name: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


def get_or_create_settings(db: Session) -> models.BotSettings:
    s = db.query(models.BotSettings).filter(models.BotSettings.id == 1).first()
    if not s:
        s = models.BotSettings(id=1)
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


@router.get("", response_model=SettingsOut)
def get_settings_endpoint(db: Session = Depends(get_db)):
    return get_or_create_settings(db)


@router.put("", response_model=SettingsOut)
def update_settings(
    body: SettingsIn,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    s = get_or_create_settings(db)
    if body.bot_name is not None: s.bot_name = body.bot_name
    if body.system_prompt is not None: s.system_prompt = body.system_prompt
    if body.temperature is not None: s.temperature = max(0.0, min(2.0, body.temperature))
    if body.max_tokens is not None: s.max_tokens = max(128, min(4096, body.max_tokens))
    db.commit()
    db.refresh(s)
    invalidate_settings_cache()
    return s


@router.post("/reset", response_model=SettingsOut)
def reset_settings(
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    s = get_or_create_settings(db)
    s.bot_name = "Trợ lý ĐH Đồng Tháp"
    s.system_prompt = DEFAULT_PROMPT
    s.temperature = 0.3
    s.max_tokens = 1024
    db.commit()
    db.refresh(s)
    return s