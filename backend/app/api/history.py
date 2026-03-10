"""
History API — lịch sử hội thoại
POST   /history/sessions
GET    /history/sessions
GET    /history/sessions/{id}/messages
DELETE /history/sessions/{id}
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from datetime import datetime

from app.db.database import get_db
from app.db import models
from app.core.db_dependencies import get_current_db_user

router = APIRouter()


# ── Schemas ────────────────────────────────────────────────────────────────

class ChatSessionCreate(BaseModel):
    title: str = "Cuộc trò chuyện mới"

class ChatSessionResponse(BaseModel):
    id: int
    title: str
    created_at: datetime

    class Config:
        from_attributes = True

class MessageResponse(BaseModel):
    id: int
    role: str
    content: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("/sessions", response_model=ChatSessionResponse)
def create_session(
    session_in: ChatSessionCreate,
    current_user: models.User = Depends(get_current_db_user),
    db: Session = Depends(get_db),
):
    new_session = models.ChatSession(
        title=session_in.title,
        user_id=current_user.id,
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


@router.get("/sessions", response_model=list[ChatSessionResponse])
def get_sessions(
    current_user: models.User = Depends(get_current_db_user),
    db: Session = Depends(get_db),
):
    return db.query(models.ChatSession)\
             .filter(models.ChatSession.user_id == current_user.id)\
             .order_by(models.ChatSession.created_at.desc())\
             .all()


@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
def get_messages(
    session_id: int,
    current_user: models.User = Depends(get_current_db_user),
    db: Session = Depends(get_db),
):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")

    return db.query(models.ChatMessage)\
             .filter(models.ChatMessage.session_id == session_id)\
             .order_by(models.ChatMessage.created_at.asc())\
             .all()


@router.delete("/sessions/{session_id}")
def delete_session(
    session_id: int,
    current_user: models.User = Depends(get_current_db_user),
    db: Session = Depends(get_db),
):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id,
    ).first()

    if not session:
        raise HTTPException(status_code=404, detail="Không tìm thấy phiên chat")

    db.delete(session)
    db.commit()
    return {"message": "Đã xóa phiên chat thành công"}