"""
Prompt Templates cho RAG Giáo dục.

Thiết kế theo kiểu function trả về list[dict] messages
để dễ dùng với bất kỳ LLM provider nào.
"""
from __future__ import annotations

from app.rag.retriever import RetrievedChunk


# ── System prompt chung ────────────────────────────────────────────────────
_BASE_SYSTEM = """Bạn là trợ lý học thuật thông minh, hỗ trợ sinh viên và giáo viên.
Nhiệm vụ: trả lời câu hỏi DỰA TRÊN tài liệu được cung cấp bên dưới.

Nguyên tắc:
- Chỉ trả lời dựa trên nội dung trong tài liệu. Không bịa đặt.
- Nếu tài liệu không đủ thông tin, hãy nói rõ điều đó.
- Trả lời bằng ngôn ngữ của câu hỏi (tiếng Việt hoặc tiếng Anh).
- Trích dẫn rõ nguồn (tên file, số trang nếu có) sau mỗi thông tin quan trọng.
- Trình bày rõ ràng, dùng gạch đầu dòng hoặc đánh số khi liệt kê.
"""


def _format_context(chunks: list[RetrievedChunk]) -> str:
    """Định dạng chunks thành context string cho prompt."""
    parts: list[str] = []
    for i, chunk in enumerate(chunks, 1):
        page_info = ""
        if chunk.first_page:
            page_info = f", trang {chunk.first_page}"
        parts.append(
            f"[Nguồn {i}: {chunk.source_file}{page_info}]\n{chunk.content}"
        )
    return "\n\n---\n\n".join(parts)


# ── Prompt builders ────────────────────────────────────────────────────────

def build_qa_prompt(
    question: str,
    chunks: list[RetrievedChunk],
    history: list[dict] | None = None,
) -> list[dict]:
    """
    Prompt hỏi đáp tổng quát.
    Dùng cho: giải thích khái niệm, tóm tắt chương, hỏi nội dung bài.
    """
    context = _format_context(chunks)

    messages = [{"role": "system", "content": _BASE_SYSTEM}]

    # Thêm lịch sử hội thoại nếu có (multi-turn)
    if history:
        messages.extend(history[-6:])  # Giới hạn 6 lượt gần nhất tránh overflow

    messages.append({
        "role": "user",
        "content": (
            f"Tài liệu tham khảo:\n\n{context}\n\n"
            f"---\n\nCâu hỏi: {question}"
        ),
    })

    return messages


def build_explain_prompt(
    concept: str,
    chunks: list[RetrievedChunk],
) -> list[dict]:
    """
    Prompt giải thích khái niệm.
    Dùng khi sinh viên hỏi "X là gì?", "Giải thích Y cho tôi".
    """
    context = _format_context(chunks)
    system = _BASE_SYSTEM + "\nHãy giải thích theo kiểu từ đơn giản đến phức tạp. Dùng ví dụ nếu có thể."

    return [
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": (
                f"Tài liệu tham khảo:\n\n{context}\n\n"
                f"---\n\nHãy giải thích khái niệm: **{concept}**"
            ),
        },
    ]


def build_summarize_prompt(
    chunks: list[RetrievedChunk],
    topic: str = "",
) -> list[dict]:
    """
    Prompt tóm tắt tài liệu hoặc chương.
    """
    context = _format_context(chunks)
    topic_part = f" về chủ đề '{topic}'" if topic else ""
    system = _BASE_SYSTEM + "\nTóm tắt ngắn gọn, súc tích. Giữ lại các ý chính và số liệu quan trọng."

    return [
        {"role": "system", "content": system},
        {
            "role": "user",
            "content": (
                f"Tài liệu cần tóm tắt{topic_part}:\n\n{context}\n\n"
                "---\n\nHãy tóm tắt nội dung trên."
            ),
        },
    ]


def build_out_of_scope_response() -> str:
    """
    Trả lời khi câu hỏi nằm ngoài phạm vi tài liệu.
    Tránh hallucination.
    """
    return (
        "Tôi không tìm thấy thông tin liên quan đến câu hỏi của bạn trong tài liệu hiện có. "
        "Vui lòng thử:\n"
        "- Đặt câu hỏi theo cách khác\n"
        "- Kiểm tra xem tài liệu liên quan đã được tải lên chưa\n"
        "- Liên hệ giáo viên hoặc tra cứu thêm tài liệu bên ngoài"
    )
