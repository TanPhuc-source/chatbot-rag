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

DEFAULT_PROMPT = """Bạn là tư vấn viên thân thiện của Trung tâm Ngoại ngữ và Tin học, Trường Đại học Đồng Tháp.

Hãy trả lời như một người tư vấn thật sự — tự nhiên, gần gũi, dễ hiểu. Không cứng nhắc, không liệt kê máy móc khi không cần thiết.

Nguyên tắc:
- Chỉ trả lời dựa trên nội dung trong tài liệu. Nếu không có thông tin, nói thẳng một cách nhẹ nhàng.
- Trả lời bằng ngôn ngữ của người hỏi (tiếng Việt hoặc tiếng Anh).
- KHÔNG trích dẫn tên file, số trang hay nguồn tài liệu trong câu trả lời.
- Dùng "bạn" khi xưng hô, giữ giọng điệu ấm áp và hỗ trợ.
- Khi liệt kê nhiều mục thì dùng gạch đầu dòng, nhưng nếu câu trả lời ngắn thì viết thành câu tự nhiên, không cần bullet.
- Khi trả lời có nhiều bước hoặc mục, dùng số thứ tự (1. 2. 3.) hoặc gạch đầu dòng (-).
- Thông tin quan trọng như số tiền, thời hạn, địa chỉ nên in đậm (**như thế này**).
- Các đường link website viết dạng markdown: [tên hiển thị](url).
- Có thể thêm câu hỏi ngược lại cuối câu trả lời nếu cần làm rõ thêm.
- Nếu các tài liệu cung cấp thông tin mâu thuẫn nhau, hãy trình bày cả hai quan điểm rõ ràng và khuyên người dùng xác nhận lại trực tiếp với bộ phận liên quan để có thông tin chính xác nhất."""


# ── Schemas ────────────────────────────────────────────────────────────────

class SettingsOut(BaseModel):
    id: int
    bot_name: str
    system_prompt: str
    temperature: float
    max_tokens: int
    updated_at: datetime
    class Config: from_attributes = True

# Thêm Schema mới chỉ chứa dữ liệu an toàn để public
class PublicSettingsOut(BaseModel):
    bot_name: str
    class Config: from_attributes = True

class SettingsIn(BaseModel):
    bot_name: Optional[str] = None
    system_prompt: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None


# ── Helpers ────────────────────────────────────────────────────────────────

def get_or_create_settings(db: Session) -> models.BotSettings:
    s = db.query(models.BotSettings).filter(models.BotSettings.id == 1).first()
    if not s:
        s = models.BotSettings(
            id=1,
            bot_name="Trợ lý ĐH Đồng Tháp",
            system_prompt=DEFAULT_PROMPT,
            temperature=0.3,
            max_tokens=1024,
        )
        db.add(s)
        db.commit()
        db.refresh(s)
    return s


# ── Endpoints ──────────────────────────────────────────────────────────────

# 1. Endpoint Public (Ai cũng gọi được, nhưng thông tin bị giới hạn)
@router.get("/public", response_model=PublicSettingsOut)
def get_public_settings(db: Session = Depends(get_db)):
    """API dùng cho Frontend Chat UI để hiển thị tên Bot."""
    return get_or_create_settings(db)


# 2. Endpoint Admin (Chỉ Admin mới xem được System Prompt & LLM Config)
@router.get("", response_model=SettingsOut)
def get_settings_endpoint(
    current_user: models.User = Depends(get_admin_user), 
    db: Session = Depends(get_db)
):
    """API dùng cho Admin Dashboard xem cấu hình chi tiết."""
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