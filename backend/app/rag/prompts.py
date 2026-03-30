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
- KHÔNG trích dẫn tên file, số trang hay nguồn tài liệu trong câu trả lời.
- Trình bày rõ ràng, tự nhiên, dùng gạch đầu dòng hoặc đánh số khi liệt kê."""

# Cache nhẹ trong memory — refresh mỗi 60s
import time
_settings_cache: dict = {"prompt": None, "temperature": 0.3, "max_tokens": 1024, "ts": 0.0}
_CACHE_TTL = 60.0


def _refresh_cache() -> None:
    """Load tất cả settings từ DB vào cache."""
    try:
        from app.db.database import SessionLocal
        db = SessionLocal()
        try:
            from app.db import models
            s = db.query(models.BotSettings).filter(models.BotSettings.id == 1).first()
            _settings_cache["prompt"] = s.system_prompt if s else _DEFAULT_SYSTEM
            _settings_cache["temperature"] = s.temperature if s else 0.3
            _settings_cache["max_tokens"] = s.max_tokens if s else 1024
        finally:
            db.close()
    except Exception:
        _settings_cache["prompt"] = _DEFAULT_SYSTEM
        _settings_cache["temperature"] = 0.3
        _settings_cache["max_tokens"] = 1024
    _settings_cache["ts"] = time.time()


def get_system_prompt() -> str:
    """Lấy system prompt từ DB với cache 60 giây."""
    now = time.time()
    if _settings_cache["prompt"] and now - _settings_cache["ts"] < _CACHE_TTL:
        return _settings_cache["prompt"]
    _refresh_cache()
    return _settings_cache["prompt"]


def get_llm_params() -> dict:
    """Lấy temperature và max_tokens từ DB với cache 60 giây."""
    now = time.time()
    if _settings_cache["prompt"] and now - _settings_cache["ts"] < _CACHE_TTL:
        return {"temperature": _settings_cache["temperature"], "max_tokens": _settings_cache["max_tokens"]}
    _refresh_cache()
    return {"temperature": _settings_cache["temperature"], "max_tokens": _settings_cache["max_tokens"]}


def invalidate_settings_cache():
    """Gọi sau khi admin lưu settings để prompt cập nhật ngay."""
    _settings_cache["ts"] = 0.0


# ── Forms cache ────────────────────────────────────────────────────────────

_forms_cache: dict = {"text": None, "ts": 0.0}


def invalidate_forms_cache():
    """Gọi sau khi admin thêm/xóa/ẩn form để bot cập nhật ngay."""
    _forms_cache["ts"] = 0.0


def _get_active_forms_text() -> str:
    """Lấy danh sách biểu mẫu đang active từ DB, cache 60 giây."""
    now = time.time()
    if _forms_cache["text"] is not None and now - _forms_cache["ts"] < _CACHE_TTL:
        return _forms_cache["text"]
    try:
        from app.db.database import SessionLocal
        from app.db import models as _models
        db = SessionLocal()
        try:
            forms = (
                db.query(_models.FormTemplate)
                .filter(_models.FormTemplate.is_active == True)
                .order_by(_models.FormTemplate.id)
                .all()
            )
            if not forms:
                _forms_cache["text"] = ""
            else:
                lines = [
                    "DANH SÁCH BIỂU MẪU / ĐƠN TỪ có thể cung cấp cho người dùng "
                    "(CHỈ dùng link này, KHÔNG tạo link từ tài liệu RAG):"
                ]
                for f in forms:
                    desc = f" — {f.description}" if f.description else ""
                    lines.append(
                        f"- [{f.display_name}](http://localhost:8000/forms/{f.id}/download){desc}"
                    )
                _forms_cache["text"] = "\n".join(lines)
        finally:
            db.close()
    except Exception:
        _forms_cache["text"] = ""
    _forms_cache["ts"] = time.time()
    return _forms_cache["text"]


import re as _re

# Pattern loại bỏ các dòng trích nguồn có sẵn trong nội dung chunk
_CITATION_RE = _re.compile(
    r"\[(?:Nguồn|nguồn|Source|source)\s*\d*\s*:?[^\]]*\]"   # [Nguồn 1: file.docx, trang 2]
    r"|(?:Nguồn|nguồn|Source|source)\s*\d*\s*:.*$"           # Nguồn: file.docx, trang 2
    r"|\((?:Nguồn|nguồn|Source|source)[^)]*\)",               # (Nguồn: file.docx)
    _re.MULTILINE,
)


def _clean_chunk(text: str) -> str:
    """Xóa các trích dẫn nguồn có sẵn trong nội dung chunk trước khi đưa vào prompt."""
    cleaned = _CITATION_RE.sub("", text)
    # Xóa dòng trống thừa sau khi remove
    cleaned = _re.sub(r"\n{3,}", "\n\n", cleaned)
    return cleaned.strip()


def _format_context(chunks: list[RetrievedChunk]) -> str:
    parts: list[str] = []
    for i, chunk in enumerate(chunks, 1):
        page_info = f", trang {chunk.first_page}" if chunk.first_page else ""
        clean_content = _clean_chunk(chunk.content)
        parts.append(f"[Nguồn {i}: {chunk.source_file}{page_info}]\n{clean_content}")
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
    Tự động inject danh sách biểu mẫu active vào system prompt.
    """
    context = _format_context(chunks)
    system = get_system_prompt()

    # Inject danh sách biểu mẫu — bot biết link nào được phép trả
    forms_text = _get_active_forms_text()
    if forms_text:
        system = (
            system
            + "\n\n"
            + forms_text
            + "\n\nQuy tắc về biểu mẫu: Khi người dùng hỏi về đơn từ, biểu mẫu hoặc "
              "thủ tục cần nộp giấy tờ, hãy dùng đúng định dạng markdown link từ danh sách trên. "
              "Ví dụ: [Đơn xin đổi lịch học](http://...) — KHÔNG viết link URL ra ngoài. "
              "KHÔNG bao giờ tự tạo ra link tải file từ tài liệu RAG."
        )

    if faq_answer:
        context = f"{faq_answer}\n\n---\n\n{context}"

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