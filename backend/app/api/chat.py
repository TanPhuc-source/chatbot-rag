"""
Chat API Endpoints

POST /chat        → full response (non-streaming)
POST /chat/stream → SSE streaming

Auth là tùy chọn — user chưa đăng nhập vẫn chat được,
nhưng nếu có token thì lưu session vào DB gắn với user đó.
"""
from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import get_settings
from app.db.database import get_db
from app.db import models
from app.services.chat_service import chat, stream_chat
from app.utils.logger import logger

router = APIRouter()

oauth2_optional = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)


def get_optional_user(
    token: str | None = Depends(oauth2_optional),
    db: Session = Depends(get_db),
) -> models.User | None:
    """Trả về User nếu có token hợp lệ, None nếu không có hoặc token lỗi."""
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


# ── Schemas ────────────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    question: str
    conversation_id: Optional[str] = None


class SourceInfo(BaseModel):
    source_file: str
    first_page: Optional[int] = None
    excerpt: str


class ChatResponse(BaseModel):
    conversation_id: str
    answer: str
    sources: list[SourceInfo]
    chunks_used: int


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("", response_model=ChatResponse)
async def chat_endpoint(
    body: ChatRequest,
    current_user: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    try:
        result = await chat(
            question=body.question,
            conversation_id=body.conversation_id,
            db=db,
            user_id=current_user.id if current_user else None,
        )
        return ChatResponse(**result)
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Lỗi khi xử lý câu hỏi")


@router.post("/stream")
async def stream_endpoint(
    body: ChatRequest,
    current_user: models.User | None = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """
    Streaming chat — Server-Sent Events.
    Lưu session vào DB nếu user đã đăng nhập, ẩn danh nếu chưa.
    """
    async def event_generator():
        async for event in stream_chat(
            question=body.question,
            conversation_id=body.conversation_id,
            db=db,
            user_id=current_user.id if current_user else None,
        ):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )