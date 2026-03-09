"""
Chat Service — business logic layer giữa API và RAG pipeline.
Xử lý: lấy history, gọi pipeline, lưu conversation.
"""
from __future__ import annotations

import uuid
from typing import AsyncIterator

from app.rag.pipeline import RAGResponse, answer, stream_answer
from app.utils.logger import logger

# ── In-memory store tạm (thay bằng DB sau khi Người 2 làm xong) ────────────
# Key: conversation_id → list of messages
_conversations: dict[str, list[dict]] = {}


def _get_history(conversation_id: str) -> list[dict]:
    return _conversations.get(conversation_id, [])


def _save_turn(conversation_id: str, question: str, answer: str) -> None:
    if conversation_id not in _conversations:
        _conversations[conversation_id] = []
    _conversations[conversation_id].extend([
        {"role": "user", "content": question},
        {"role": "assistant", "content": answer},
    ])
    # Giới hạn lịch sử để tránh context quá dài
    if len(_conversations[conversation_id]) > 20:
        _conversations[conversation_id] = _conversations[conversation_id][-20:]


async def chat(
    question: str,
    conversation_id: str | None = None,
) -> dict:
    """
    Xử lý 1 lượt chat, trả về response đầy đủ.
    """
    conv_id = conversation_id or str(uuid.uuid4())
    history = _get_history(conv_id)

    response: RAGResponse = await answer(question, history=history)

    _save_turn(conv_id, question, response.answer)

    return {
        "conversation_id": conv_id,
        "answer": response.answer,
        "sources": [
            {
                "source_file": s.source_file,
                "first_page": s.first_page,
                "excerpt": s.excerpt,
            }
            for s in response.sources
        ],
        "chunks_used": response.chunks_used,
    }


async def stream_chat(
    question: str,
    conversation_id: str | None = None,
) -> AsyncIterator[dict]:
    """
    Streaming chat — yield SSE events.

    Event types:
    - {"type": "token", "data": "..."}  → token từ LLM
    - {"type": "done", "data": {...}}   → metadata khi xong
    - {"type": "error", "data": "..."}  → lỗi
    """
    conv_id = conversation_id or str(uuid.uuid4())
    history = _get_history(conv_id)
    full_answer = ""

    try:
        async for item in stream_answer(question, history=history):
            if isinstance(item, str):
                full_answer += item
                yield {"type": "token", "data": item}
            elif isinstance(item, RAGResponse):
                _save_turn(conv_id, question, item.answer)
                yield {
                    "type": "done",
                    "data": {
                        "conversation_id": conv_id,
                        "sources": [
                            {
                                "source_file": s.source_file,
                                "first_page": s.first_page,
                                "excerpt": s.excerpt,
                            }
                            for s in item.sources
                        ],
                        "chunks_used": item.chunks_used,
                    },
                }
    except Exception as e:
        logger.error(f"Stream error: {e}")
        yield {"type": "error", "data": str(e)}
