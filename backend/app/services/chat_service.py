"""
Chat Service — business logic layer giữa API và RAG pipeline.
Lưu ChatSession + ChatMessage vào PostgreSQL.
"""
from __future__ import annotations

import uuid
from typing import AsyncIterator

from sqlalchemy.orm import Session

from app.db import models
from app.rag.pipeline import RAGResponse, answer, stream_answer
from app.utils.logger import logger


# ── Helpers DB ─────────────────────────────────────────────────────────────

def _get_or_create_session(
    db: Session,
    conversation_id: str | None,
    title: str,
    user_id: int | None,
) -> models.ChatSession:
    if conversation_id:
        try:
            session = db.query(models.ChatSession).filter(
                models.ChatSession.id == int(conversation_id)
            ).first()
            if session:
                return session
        except (ValueError, TypeError):
            pass

    session = models.ChatSession(title=title[:100], user_id=user_id)
    db.add(session)
    db.commit()
    db.refresh(session)
    return session


def _get_history_from_db(db: Session, session_id: int) -> list[dict]:
    msgs = (
        db.query(models.ChatMessage)
        .filter(models.ChatMessage.session_id == session_id)
        .order_by(models.ChatMessage.created_at.desc())
        .limit(20)
        .all()
    )
    return [{"role": m.role, "content": m.content} for m in reversed(msgs)]


def _save_messages(db: Session, session_id: int, question: str, answer_text: str) -> None:
    db.add(models.ChatMessage(session_id=session_id, role="user", content=question))
    db.add(models.ChatMessage(session_id=session_id, role="assistant", content=answer_text))
    db.commit()


# ── Public API ──────────────────────────────────────────────────────────────

async def chat(
    question: str,
    conversation_id: str | None = None,
    db: Session | None = None,
    user_id: int | None = None,
) -> dict:
    if db is None:
        return await _chat_inmemory(question, conversation_id)

    session = _get_or_create_session(db, conversation_id, question[:80], user_id)
    history = _get_history_from_db(db, session.id)
    response: RAGResponse = await answer(question, history=history)
    _save_messages(db, session.id, question, response.answer)

    return {
        "conversation_id": str(session.id),
        "answer": response.answer,
        "sources": [
            {"source_file": s.source_file, "first_page": s.first_page, "excerpt": s.excerpt}
            for s in response.sources
        ],
        "chunks_used": response.chunks_used,
    }


async def stream_chat(
    question: str,
    conversation_id: str | None = None,
    db: Session | None = None,
    user_id: int | None = None,
) -> AsyncIterator[dict]:
    if db is None:
        async for event in _stream_chat_inmemory(question, conversation_id):
            yield event
        return

    session = _get_or_create_session(db, conversation_id, question[:80], user_id)
    history = _get_history_from_db(db, session.id)

    try:
        async for item in stream_answer(question, history=history):
            if isinstance(item, str):
                yield {"type": "token", "data": item}
            elif isinstance(item, RAGResponse):
                _save_messages(db, session.id, question, item.answer)
                yield {
                    "type": "done",
                    "data": {
                        "conversation_id": str(session.id),
                        "sources": [
                            {"source_file": s.source_file, "first_page": s.first_page, "excerpt": s.excerpt}
                            for s in item.sources
                        ],
                        "chunks_used": item.chunks_used,
                    },
                }
    except Exception as e:
        logger.error(f"Stream error: {e}")
        yield {"type": "error", "data": str(e)}


# ── Fallback in-memory ──────────────────────────────────────────────────────

_conversations: dict[str, list[dict]] = {}


async def _chat_inmemory(question: str, conversation_id: str | None) -> dict:
    conv_id = conversation_id or str(uuid.uuid4())
    history = _conversations.get(conv_id, [])
    response: RAGResponse = await answer(question, history=history)
    _conversations.setdefault(conv_id, []).extend([
        {"role": "user", "content": question},
        {"role": "assistant", "content": response.answer},
    ])
    return {
        "conversation_id": conv_id,
        "answer": response.answer,
        "sources": [
            {"source_file": s.source_file, "first_page": s.first_page, "excerpt": s.excerpt}
            for s in response.sources
        ],
        "chunks_used": response.chunks_used,
    }


async def _stream_chat_inmemory(question: str, conversation_id: str | None) -> AsyncIterator[dict]:
    conv_id = conversation_id or str(uuid.uuid4())
    history = _conversations.get(conv_id, [])
    try:
        async for item in stream_answer(question, history=history):
            if isinstance(item, str):
                yield {"type": "token", "data": item}
            elif isinstance(item, RAGResponse):
                _conversations.setdefault(conv_id, []).extend([
                    {"role": "user", "content": question},
                    {"role": "assistant", "content": item.answer},
                ])
                yield {
                    "type": "done",
                    "data": {
                        "conversation_id": conv_id,
                        "sources": [
                            {"source_file": s.source_file, "first_page": s.first_page, "excerpt": s.excerpt}
                            for s in item.sources
                        ],
                        "chunks_used": item.chunks_used,
                    },
                }
    except Exception as e:
        logger.error(f"Stream error: {e}")
        yield {"type": "error", "data": str(e)}