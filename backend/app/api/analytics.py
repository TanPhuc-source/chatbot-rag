"""
Analytics API
GET /admin/analytics/summary   — tổng quan
GET /admin/analytics/popular   — câu hỏi phổ biến
GET /admin/analytics/hourly    — phân bố theo giờ
GET /admin/analytics/feedback  — tỷ lệ feedback
GET /admin/analytics/export    — export CSV
"""
from __future__ import annotations
import csv
import io
from datetime import datetime, timedelta
from typing import Optional
from collections import Counter

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.db.database import get_db
from app.db import models
from app.core.db_dependencies import get_admin_user

router = APIRouter()


class SummaryOut(BaseModel):
    total_sessions: int
    total_messages: int
    total_users: int
    sessions_today: int
    messages_today: int
    thumbs_up: int
    thumbs_down: int
    feedback_rate: float     # % tin nhắn bot có feedback


class PopularQuestion(BaseModel):
    question: str
    count: int


class HourlyStats(BaseModel):
    hour: int
    count: int


class FeedbackStat(BaseModel):
    date: str
    thumbs_up: int
    thumbs_down: int


@router.get("/summary", response_model=SummaryOut)
def get_summary(
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    today = datetime.utcnow().date()
    today_start = datetime(today.year, today.month, today.day)

    total_sessions = db.query(func.count(models.ChatSession.id)).scalar()
    total_messages = db.query(func.count(models.ChatMessage.id)).scalar()
    total_users = db.query(func.count(func.distinct(models.ChatSession.user_id))).filter(
        models.ChatSession.user_id.isnot(None)
    ).scalar()

    sessions_today = db.query(func.count(models.ChatSession.id)).filter(
        models.ChatSession.created_at >= today_start
    ).scalar()
    messages_today = db.query(func.count(models.ChatMessage.id)).filter(
        models.ChatMessage.created_at >= today_start
    ).scalar()

    thumbs_up = db.query(func.count(models.MessageFeedback.id)).filter(
        models.MessageFeedback.rating == "up"
    ).scalar()
    thumbs_down = db.query(func.count(models.MessageFeedback.id)).filter(
        models.MessageFeedback.rating == "down"
    ).scalar()

    bot_messages = db.query(func.count(models.ChatMessage.id)).filter(
        models.ChatMessage.role == "assistant"
    ).scalar() or 1

    return SummaryOut(
        total_sessions=total_sessions,
        total_messages=total_messages,
        total_users=total_users,
        sessions_today=sessions_today,
        messages_today=messages_today,
        thumbs_up=thumbs_up,
        thumbs_down=thumbs_down,
        feedback_rate=round((thumbs_up + thumbs_down) / bot_messages * 100, 1),
    )


@router.get("/popular", response_model=list[PopularQuestion])
def get_popular_questions(
    limit: int = 20,
    days: int = 30,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    user_msgs = db.query(models.ChatMessage.content).filter(
        models.ChatMessage.role == "user",
        models.ChatMessage.created_at >= since,
    ).all()

    # Đếm tần suất, chuẩn hóa về lowercase và cắt bớt
    counter: Counter = Counter()
    for (content,) in user_msgs:
        key = content.strip().lower()[:120]
        counter[key] += 1

    return [
        PopularQuestion(question=q, count=c)
        for q, c in counter.most_common(limit)
    ]


@router.get("/hourly", response_model=list[HourlyStats])
def get_hourly_distribution(
    days: int = 7,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    rows = db.query(
        func.extract("hour", models.ChatSession.created_at).label("hour"),
        func.count(models.ChatSession.id).label("count"),
    ).filter(
        models.ChatSession.created_at >= since
    ).group_by("hour").order_by("hour").all()

    hour_map = {int(r.hour): r.count for r in rows}
    return [HourlyStats(hour=h, count=hour_map.get(h, 0)) for h in range(24)]


@router.get("/feedback-trend", response_model=list[FeedbackStat])
def get_feedback_trend(
    days: int = 14,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    since = datetime.utcnow() - timedelta(days=days)
    rows = db.query(
        func.date(models.MessageFeedback.created_at).label("date"),
        models.MessageFeedback.rating,
        func.count(models.MessageFeedback.id).label("count"),
    ).filter(
        models.MessageFeedback.created_at >= since
    ).group_by("date", models.MessageFeedback.rating).all()

    data: dict[str, dict] = {}
    for row in rows:
        d = str(row.date)
        if d not in data:
            data[d] = {"thumbs_up": 0, "thumbs_down": 0}
        if row.rating == "up":
            data[d]["thumbs_up"] = row.count
        else:
            data[d]["thumbs_down"] = row.count

    return [
        FeedbackStat(date=d, thumbs_up=v["thumbs_up"], thumbs_down=v["thumbs_down"])
        for d, v in sorted(data.items())
    ]


@router.get("/export")
def export_chat_history(
    days: Optional[int] = None,
    current_user: models.User = Depends(get_admin_user),
    db: Session = Depends(get_db),
):
    """Export toàn bộ lịch sử chat ra CSV."""
    q = db.query(
        models.ChatMessage.id,
        models.ChatMessage.role,
        models.ChatMessage.content,
        models.ChatMessage.created_at,
        models.ChatSession.title,
        models.ChatSession.user_id,
        models.User.username,
    ).join(
        models.ChatSession, models.ChatMessage.session_id == models.ChatSession.id
    ).outerjoin(
        models.User, models.ChatSession.user_id == models.User.id
    )

    if days:
        since = datetime.utcnow() - timedelta(days=days)
        q = q.filter(models.ChatMessage.created_at >= since)

    rows = q.order_by(models.ChatMessage.created_at).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Role", "Content", "Created At", "Session Title", "User ID", "Username"])
    for r in rows:
        writer.writerow([r.id, r.role, r.content, r.created_at, r.title, r.user_id or "", r.username or "Ẩn danh"])

    output.seek(0)
    filename = f"chat_history_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    return StreamingResponse(
        io.BytesIO(output.getvalue().encode("utf-8-sig")),  # utf-8-sig cho Excel
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )