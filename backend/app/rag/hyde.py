"""
HyDE — Hypothetical Document Embedding

Ý tưởng: thay vì embed câu hỏi ngắn ("RAG là gì?"),
ta yêu cầu LLM *viết ra một đoạn văn trả lời giả định*,
rồi embed đoạn văn đó để search.

Tại sao hiệu quả hơn?
- Câu hỏi và đoạn trả lời nằm ở "không gian ngữ nghĩa" khác nhau.
  Câu hỏi thường ngắn, thiếu từ khóa. Đoạn văn trả lời giả định
  phong phú hơn → vector gần với các chunk thật hơn.
- Đặc biệt hiệu quả với tiếng Việt khi user hỏi ngắn gọn/tắt.

Pipeline:
  Query → LLM viết hypothetical answer → embed → vector search
  (thay vì embed query trực tiếp)
"""
from __future__ import annotations

from app.rag.llm_provider import get_llm_provider
from app.utils.logger import logger


_HYDE_SYSTEM = """Bạn là trợ lý AI. Nhiệm vụ: viết một đoạn văn ngắn (3-5 câu)
như thể bạn đang TRẢ LỜI câu hỏi dưới đây, dựa trên kiến thức của bạn.
Đây chỉ là đoạn văn dùng để tìm kiếm tài liệu — KHÔNG cần chính xác 100%.
Trả về ĐÚNG đoạn văn, không có giải thích hay tiêu đề thêm vào."""


async def generate_hypothetical_document(query: str) -> str:
    """
    Dùng LLM sinh ra một câu trả lời giả định cho query.
    Đoạn văn này sẽ được dùng để embed thay cho query gốc.

    Nếu LLM lỗi → fallback về query gốc để không làm hỏng pipeline.
    """
    try:
        llm = get_llm_provider()
        messages = [
            {"role": "system", "content": _HYDE_SYSTEM},
            {"role": "user", "content": query},
        ]
        hypothetical = await llm.chat(messages, temperature=0.5, max_tokens=300)
        hypothetical = hypothetical.strip()

        if not hypothetical:
            logger.warning("HyDE: LLM trả về rỗng, fallback về query gốc")
            return query

        logger.debug(f"HyDE generated ({len(hypothetical)} chars): {hypothetical[:80]}...")
        return hypothetical

    except Exception as e:
        logger.warning(f"HyDE thất bại ({e}), fallback về query gốc")
        return query