"""
Feedback API
POST /feedback/{message_id}   — gửi 👍👎
GET  /feedback/{message_id}   — xem feedback của 1 tin nhắn
GET  /admin/feedback           — admin xem tất cả feedback
"""
from __future__ import annotations
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime

from app.db.database import get_db
from app.db import models
from app.core.db_dependencies import get_admin_user

router = APIRouter()


class FeedbackIn(BaseModel):
    rating: str          # "up" | "down"
    comment: Optional[str] = None


class FeedbackOut(BaseModel):
    id: int
    message_id: int
    rating: str
    comment: Optional[str]
    created_at: datetime
    class Config: from_attributes = True


class FeedbackDetail(BaseModel):
    id: int
    message_id: int
    rating: str
    comment: Optional[str]
    created_at: datetime
    question: Optional[str] = None   # câu hỏi của user (message trước đó)
    answer: Optional[str] = None     # câu trả lời bot bị feedback
    session_title: Optional[str] = None


@router.post("/{message_id}", response_model=FeedbackOut)
def submit_feedback(
    message_id: int,
    body: FeedbackIn,
    db: Session = Depends(get_db),
):
    if body.rating not in ("up", "down"):
        raise HTTPException(status_code=400, detail="rating phải là 'up' hoặc 'down'")

    msg = db.query(models.ChatMessage).filter(models.ChatMessage.id == message_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Không tìm thấy tin nhắn")

    # Upsert — nếu đã có thì cập nhật
    fb = db.query(models.MessageFeedback).filter(models.MessageFeedback.message_id == message_id).first()
    if fb:
        fb.rating = body.rating
        fb.comment = body.comment
    else:
        fb = models.MessageFeedback(message_id=message_id, rating=body.rating, comment=body.comment)
        db.add(fb)

    db.commit()
    db.refresh(fb)
    return fb


@router.get("/{message_id}", response_model=Optional[FeedbackOut])
def get_feedback(message_id: int, db: Session = Depends(get_db)):
    return db.query(models.MessageFeedback).filter(
        models.MessageFeedback.message_id == message_id
    ).first()


@router.get("", response_model=list[FeedbackDetail])
def admin_list_feedback(
    skip: int = 0,
    limit: int = 100,
    rating: Optional[str] = None,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    q = db.query(models.MessageFeedback).order_by(models.MessageFeedback.created_at.desc())
    if rating:
        q = q.filter(models.MessageFeedback.rating == rating)
    feedbacks = q.offset(skip).limit(limit).all()

    result = []
    for fb in feedbacks:
        answer_msg = db.query(models.ChatMessage).filter(models.ChatMessage.id == fb.message_id).first()
        question_text = None
        session_title = None
        if answer_msg:
            # Lấy tin nhắn user ngay trước tin nhắn bot này
            prev = db.query(models.ChatMessage).filter(
                models.ChatMessage.session_id == answer_msg.session_id,
                models.ChatMessage.id < fb.message_id,
                models.ChatMessage.role == "user",
            ).order_by(models.ChatMessage.id.desc()).first()
            if prev:
                question_text = prev.content
            session = db.query(models.ChatSession).filter(
                models.ChatSession.id == answer_msg.session_id
            ).first()
            if session:
                session_title = session.title

        result.append(FeedbackDetail(
            id=fb.id,
            message_id=fb.message_id,
            rating=fb.rating,
            comment=fb.comment,
            created_at=fb.created_at,
            question=question_text,
            answer=answer_msg.content if answer_msg else None,
            session_title=session_title,
        ))
    return result