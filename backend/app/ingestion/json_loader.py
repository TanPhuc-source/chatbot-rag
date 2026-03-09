"""
JSON Loader — đọc file JSON có cấu trúc:

  [{ "id": "...", "content": "...", "metadata": {...} }, ...]

Không dùng Kreuzberg vì JSON không phải văn bản thông thường.
Mỗi object trong mảng → 1 LoadedChunk, giữ nguyên metadata gốc.
"""
from __future__ import annotations

import json

from app.ingestion.loader import LoadedChunk
from app.utils.logger import logger


def load_json_bytes(data: bytes, filename: str) -> list[LoadedChunk]:
    """
    Parse JSON bytes → list LoadedChunk.

    Hỗ trợ 2 format:
    - Mảng: [{"id": ..., "content": ..., "metadata": ...}, ...]   ← format của bạn
    - Object đơn: {"id": ..., "content": ..., "metadata": ...}
    """
    try:
        raw = json.loads(data.decode("utf-8"))
    except (json.JSONDecodeError, UnicodeDecodeError) as e:
        raise ValueError(f"File JSON không hợp lệ: {e}")

    # Chuẩn hoá về dạng list
    items: list[dict] = raw if isinstance(raw, list) else [raw]

    if not items:
        raise ValueError("File JSON rỗng, không có dữ liệu nào.")

    # Validate item đầu tiên có đúng format không
    _validate_format(items[0], filename)

    chunks: list[LoadedChunk] = []
    skipped = 0

    for i, item in enumerate(items):
        content = item.get("content", "").strip()

        if not content:
            logger.warning(f"[{filename}] Bỏ qua item #{i} (id={item.get('id', '?')}): content rỗng")
            skipped += 1
            continue

        metadata = item.get("metadata", {})

        # Thêm id gốc vào metadata để dễ trace sau này
        if "id" in item:
            metadata["original_id"] = item["id"]

        chunks.append(
            LoadedChunk(
                content=content,
                metadata=metadata,
                source_file=filename,
                chunk_index=i,
                total_chunks=len(items),
            )
        )

    if skipped:
        logger.warning(f"[{filename}] Bỏ qua {skipped}/{len(items)} items do content rỗng")

    logger.info(f"[{filename}] Parsed {len(chunks)} chunks từ JSON")
    return chunks


def _validate_format(item: dict, filename: str) -> None:
    """Kiểm tra item có đúng format {id, content, metadata} không."""
    if not isinstance(item, dict):
        raise ValueError(
            f"[{filename}] Sai format. Mỗi item phải là object JSON.\n"
            f"Ví dụ đúng: {{\"id\": \"...\", \"content\": \"...\", \"metadata\": {{...}}}}"
        )
    if "content" not in item:
        raise ValueError(
            f"[{filename}] Thiếu field 'content'. "
            f"Các field hiện có: {list(item.keys())}"
        )
