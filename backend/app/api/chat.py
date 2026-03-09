"""
Chat API Endpoints

POST /chat          → full response (non-streaming)
POST /chat/stream   → SSE streaming
GET  /chat/history/{conversation_id}  → lịch sử hội thoại
"""
from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

# from app.core.dependencies import get_current_user
from app.services.chat_service import chat, stream_chat
from app.utils.logger import logger

router = APIRouter()


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
    # user_id: str = Depends(get_current_user),
):
    """
    Hỏi đáp thông thường — trả về response đầy đủ 1 lần.
    Dùng khi không cần streaming (test, script).
    """
    try:
        result = await chat(
            question=body.question,
            conversation_id=body.conversation_id,
        )
        return ChatResponse(**result)
    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(status_code=500, detail="Lỗi khi xử lý câu hỏi")


@router.post("/stream")
async def stream_endpoint(
    body: ChatRequest,
    # user_id: str = Depends(get_current_user),
):
    """
    Streaming chat — trả về Server-Sent Events.
    Frontend dùng EventSource hoặc fetch với ReadableStream.

    Format SSE:
      data: {"type": "token", "data": "Hello"}\\n\\n
      data: {"type": "done",  "data": {...sources...}}\\n\\n
    """
    async def event_generator():
        async for event in stream_chat(
            question=body.question,
            conversation_id=body.conversation_id,
        ):
            yield f"data: {json.dumps(event, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",   # tắt buffering cho nginx
        },
    )
