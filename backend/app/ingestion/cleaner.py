"""
cleaner.py — Làm sạch LoadedChunk trước khi embed + index vào ChromaDB.

Pipeline:
  loader.py → [cleaner.py] → indexer.py

Tại sao cần bước này?
  Kreuzberg lo việc extract text từ file, nhưng output vẫn có thể chứa:
  - Header/footer lặp lại trên mỗi trang (tên trường, số trang...)
  - Khoảng trắng / newline thừa từ layout PDF
  - Ký tự Unicode rác (\x00, \ufeff) từ encoding lỗi
  - Chunk quá ngắn hoặc toàn ký tự đặc biệt (bảng vỡ, trang trắng)
  - OCR noise: số/chữ bị nhận sai do scan kém chất lượng

Nếu không làm sạch, các chunk rác này vẫn được embed và lưu vào
ChromaDB → chiếm slot retrieval → reranker có thể để lọt chunk vô nghĩa
vào top-4 → LLM trả lời kém chất lượng.
"""
from __future__ import annotations

import re
import unicodedata
from dataclasses import replace

from app.ingestion.loader import LoadedChunk
from app.utils.logger import logger


# ── Cấu hình ngưỡng lọc ───────────────────────────────────────────────────

# Chunk ngắn hơn ngưỡng này thường là header/footer/số trang → bỏ qua
MIN_CHUNK_LENGTH = 80

# Nếu tỉ lệ ký tự "có nghĩa" (chữ + số) thấp hơn ngưỡng này → chunk rác
MIN_ALPHANUMERIC_RATIO = 0.40

# Nếu chunk chứa ít hơn ngưỡng này từ có nghĩa (len > 1) → quá sparse
MIN_MEANINGFUL_WORDS = 5

# Pattern header/footer phổ biến trong tài liệu học thuật tiếng Việt
_HEADER_FOOTER_PATTERNS = [
    # Số trang đơn lẻ: "1", "- 2 -", "Trang 3"
    r"^\s*[-–—]?\s*[Tt]rang\s+\d+\s*[-–—]?\s*$",
    r"^\s*\d{1,3}\s*$",
    # Header trường đại học
    r"^.*[Tt]rường\s+[Đđ]ại\s+[Hh]ọc.*$",
    r"^.*[Tt]rung\s+[Tt]âm\s+[Nn]goại\s+[Nn]gữ.*$",
    # Dấu phân cách trang
    r"^[\s\-_=*\.]{3,}$",
    # "Tiếp theo", "(Continued)"
    r"^\s*[\(\[]\s*[Tt]iếp\s+theo\s*[\)\]]\s*$",
    r"^\s*[\(\[]\s*[Cc]ontinued\s*[\)\]]\s*$",
]

_COMPILED_PATTERNS = [re.compile(p, re.MULTILINE) for p in _HEADER_FOOTER_PATTERNS]


# ── Các hàm làm sạch ──────────────────────────────────────────────────────

def _normalize_whitespace(text: str) -> str:
    """
    Chuẩn hóa khoảng trắng và xuống dòng.
    - 3+ newline liên tiếp → 2 newline (giữ cấu trúc đoạn văn)
    - Tab và space thừa trên cùng 1 dòng → 1 space
    - Trim đầu/cuối
    """
    # Chuẩn hóa line endings (Windows \r\n → \n)
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    # 3+ newline → 2
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Tab và multiple space trong 1 dòng → 1 space
    text = re.sub(r"[ \t]{2,}", " ", text)
    # Xóa space thừa ở đầu/cuối mỗi dòng
    lines = [line.strip() for line in text.split("\n")]
    text = "\n".join(lines)
    return text.strip()


def _remove_garbage_unicode(text: str) -> str:
    """
    Xóa ký tự Unicode rác thường gặp trong PDF extract:
    - Null bytes, BOM markers
    - Private Use Area (PUA) — font encoding lỗi trong PDF cũ
    - Soft hyphen (ký tự ngắt dòng ẩn trong Word)
    """
    # Null byte và BOM
    text = text.replace("\x00", "").replace("\ufeff", "").replace("\ufffe", "")
    # Soft hyphen
    text = text.replace("\xad", "")
    # Lọc ký tự control (trừ newline và tab)
    text = "".join(
        ch for ch in text
        if unicodedata.category(ch) not in ("Cc", "Cf") or ch in ("\n", "\t")
    )
    return text


def _remove_repeated_headers(text: str) -> str:
    """
    Xóa các dòng khớp với pattern header/footer.
    Áp dụng cho từng dòng trong chunk.
    """
    lines = text.split("\n")
    cleaned_lines = []
    for line in lines:
        is_header = any(p.match(line.strip()) for p in _COMPILED_PATTERNS)
        if not is_header:
            cleaned_lines.append(line)
    return "\n".join(cleaned_lines)


def _is_garbage_chunk(text: str) -> bool:
    """
    Trả về True nếu chunk không có giá trị semantic:
    1. Quá ngắn
    2. Tỉ lệ ký tự có nghĩa quá thấp (toàn ký tự đặc biệt, bảng vỡ)
    3. Quá ít từ có nghĩa
    """
    if len(text) < MIN_CHUNK_LENGTH:
        return True

    # Tỉ lệ alphanumeric (chữ + số) trong toàn bộ text
    alphanum_count = sum(1 for ch in text if ch.isalnum())
    ratio = alphanum_count / len(text)
    if ratio < MIN_ALPHANUMERIC_RATIO:
        return True

    # Đếm từ có độ dài > 1 (loại trừ ký tự đơn lẻ)
    words = text.split()
    meaningful_words = [w for w in words if len(w) > 1 and any(c.isalpha() for c in w)]
    if len(meaningful_words) < MIN_MEANINGFUL_WORDS:
        return True

    return False


def clean_text(text: str) -> str:
    """
    Áp dụng toàn bộ bước làm sạch cho 1 chuỗi text.
    Dùng được độc lập (ví dụ: test unit).
    """
    text = _remove_garbage_unicode(text)
    text = _remove_repeated_headers(text)
    text = _normalize_whitespace(text)
    return text


# ── Hàm chính ─────────────────────────────────────────────────────────────

def clean_chunks(chunks: list[LoadedChunk]) -> list[LoadedChunk]:
    """
    Làm sạch toàn bộ danh sách LoadedChunk.

    Gọi hàm này trong upload_handler.py sau khi load_bytes() / load_file():

        chunks = await load_bytes(file_bytes, filename=filename, mime_type=mime_type)
        chunks = clean_chunks(chunks)   # ← thêm dòng này
        total_indexed = await index_chunks(chunks, document_id=document_id)

    Returns:
        Danh sách chunk đã làm sạch, bỏ đi các chunk rác.
    """
    if not chunks:
        return []

    original_count = len(chunks)
    cleaned: list[LoadedChunk] = []
    skipped_short = 0
    skipped_garbage = 0

    for chunk in chunks:
        # 1. Làm sạch text
        clean_content = clean_text(chunk.content)

        # 2. Kiểm tra sau khi làm sạch có còn đủ nội dung không
        if not clean_content:
            skipped_short += 1
            continue

        if _is_garbage_chunk(clean_content):
            skipped_garbage += 1
            continue

        # 3. Tạo chunk mới với content đã được làm sạch (immutable dataclass)
        cleaned.append(replace(chunk, content=clean_content))

    kept = len(cleaned)
    skipped_total = original_count - kept

    if skipped_total > 0:
        logger.info(
            f"[cleaner] {chunk.source_file}: "
            f"{original_count} chunks → {kept} giữ lại "
            f"({skipped_short} quá ngắn, {skipped_garbage} là rác)"
        )
    else:
        logger.debug(f"[cleaner] {chunk.source_file}: Tất cả {kept} chunks đều sạch")

    return cleaned