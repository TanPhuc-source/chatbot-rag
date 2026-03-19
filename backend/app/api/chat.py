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
from app.api import schemas
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

router.get("/sessions", response_model=list[schemas.ChatSessionResponse])
def get_user_sessions(
    current_user: models.User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Lấy danh sách các cuộc trò chuyện của user đang đăng nhập."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập để xem lịch sử")
    
    sessions = db.query(models.ChatSession)\
                 .filter(models.ChatSession.user_id == current_user.id)\
                 .order_by(models.ChatSession.created_at.desc())\
                 .all()
    return sessions

@router.get("/sessions/{session_id}/messages", response_model=list[schemas.ChatMessageResponse])
def get_session_messages(
    session_id: str,
    current_user: models.User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Khôi phục nội dung tin nhắn của một cuộc trò chuyện cụ thể."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập")
        
    # Xác thực session thuộc về user này
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc trò chuyện")

    messages = db.query(models.ChatMessage)\
                 .filter(models.ChatMessage.session_id == session_id)\
                 .order_by(models.ChatMessage.created_at.asc())\
                 .all()
    return messages

@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: str,
    current_user: models.User = Depends(get_optional_user),
    db: Session = Depends(get_db),
):
    """Xóa một cuộc trò chuyện."""
    if not current_user:
        raise HTTPException(status_code=401, detail="Vui lòng đăng nhập")
        
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy cuộc trò chuyện")

    db.delete(session)
    db.commit()
    return {"message": "Đã xóa cuộc trò chuyện thành công"}