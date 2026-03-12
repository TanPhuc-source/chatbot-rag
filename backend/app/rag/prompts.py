"""
Prompt Templates cho RAG Giáo dục.
System prompt được load từ DB (BotSettings) nếu có, fallback về default.
"""
from __future__ import annotations

from app.rag.retriever import RetrievedChunk


# ── Default system prompt (fallback khi DB chưa có) ───────────────────────
_DEFAULT_SYSTEM = """Bạn là trợ lý học thuật thông minh, hỗ trợ sinh viên và giáo viên.
Nhiệm vụ: trả lời câu hỏi DỰA TRÊN tài liệu được cung cấp bên dưới.

Nguyên tắc:
- Chỉ trả lời dựa trên nội dung trong tài liệu. Không bịa đặt.
- Nếu tài liệu không đủ thông tin, hãy nói rõ điều đó.
- Trả lời bằng ngôn ngữ của câu hỏi (tiếng Việt hoặc tiếng Anh).
- Trích dẫn rõ nguồn (tên file, số trang nếu có) sau mỗi thông tin quan trọng.
- Trình bày rõ ràng, dùng gạch đầu dòng hoặc đánh số khi liệt kê."""

# Cache nhẹ trong memory — refresh mỗi 60s
import time
_settings_cache: dict = {"prompt": None, "ts": 0.0}
_CACHE_TTL = 60.0


def get_system_prompt() -> str:
    """Lấy system prompt từ DB với cache 60 giây."""
    now = time.time()
    if _settings_cache["prompt"] and now - _settings_cache["ts"] < _CACHE_TTL:
        return _settings_cache["prompt"]
    try:
        from app.db.database import SessionLocal
        db = SessionLocal()
        try:
            from app.db import models
            s = db.query(models.BotSettings).filter(models.BotSettings.id == 1).first()
            prompt = s.system_prompt if s else _DEFAULT_SYSTEM
        finally:
            db.close()
    except Exception:
        prompt = _DEFAULT_SYSTEM
    _settings_cache["prompt"] = prompt
    _settings_cache["ts"] = now
    return prompt


def invalidate_settings_cache():
    """Gọi sau khi admin lưu settings để prompt cập nhật ngay."""
    _settings_cache["ts"] = 0.0


def _format_context(chunks: list[RetrievedChunk]) -> str:
    parts: list[str] = []
    for i, chunk in enumerate(chunks, 1):
        page_info = f", trang {chunk.first_page}" if chunk.first_page else ""
        parts.append(f"[Nguồn {i}: {chunk.source_file}{page_info}]\n{chunk.content}")
    return "\n\n---\n\n".join(parts)


# ── Prompt builders ────────────────────────────────────────────────────────

def build_qa_prompt(
    question: str,
    chunks: list[RetrievedChunk],
    history: list[dict] | None = None,
    faq_answer: str | None = None,
) -> list[dict]:
    """
    Prompt hỏi đáp tổng quát.
    Nếu có faq_answer, đưa vào context ưu tiên đầu tiên.
    """
    context = _format_context(chunks)
    system = get_system_prompt()

    if faq_answer:
        context = f"[FAQ - Câu trả lời ưu tiên]\n{faq_answer}\n\n---\n\n{context}"

    messages = [{"role": "system", "content": system}]
    if history:
        messages.extend(history[-6:])
    messages.append({
        "role": "user",
        "content": f"Tài liệu tham khảo:\n\n{context}\n\n---\n\nCâu hỏi: {question}",
    })
    return messages


def build_explain_prompt(concept: str, chunks: list[RetrievedChunk]) -> list[dict]:
    context = _format_context(chunks)
    system = get_system_prompt() + "\nHãy giải thích theo kiểu từ đơn giản đến phức tạp. Dùng ví dụ nếu có thể."
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": f"Tài liệu tham khảo:\n\n{context}\n\n---\n\nHãy giải thích khái niệm: **{concept}**"},
    ]


def build_summarize_prompt(chunks: list[RetrievedChunk], topic: str = "") -> list[dict]:
    context = _format_context(chunks)
    topic_part = f" về chủ đề '{topic}'" if topic else ""
    system = get_system_prompt() + "\nTóm tắt ngắn gọn, súc tích. Giữ lại các ý chính và số liệu quan trọng."
    return [
        {"role": "system", "content": system},
        {"role": "user", "content": f"Tài liệu cần tóm tắt{topic_part}:\n\n{context}\n\n---\n\nHãy tóm tắt nội dung trên."},
    ]


def build_out_of_scope_response() -> str:
    return (
        "Tôi không tìm thấy thông tin liên quan đến câu hỏi của bạn trong tài liệu hiện có. "
        "Vui lòng thử:\n"
        "- Đặt câu hỏi theo cách khác\n"
        "- Kiểm tra xem tài liệu liên quan đã được tải lên chưa\n"
        "- Liên hệ giáo viên hoặc tra cứu thêm tài liệu bên ngoài"
    )