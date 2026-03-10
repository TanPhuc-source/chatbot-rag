"""
Query Transformations — Sinh nhiều biến thể câu hỏi, search song song, merge kết quả.

Tại sao cần?
- User Việt hay viết tắt, hỏi mơ hồ, hoặc dùng từ khác với từ trong tài liệu.
  Ví dụ: "OOP" vs "lập trình hướng đối tượng", "thầy dạy gì" vs "nội dung bài giảng".
- Sinh 3-4 cách hỏi khác nhau → search song song → merge + deduplicate chunks
  → coverage tốt hơn nhiều so với search 1 lần.

Pipeline:
  Query gốc → LLM sinh N biến thể → hybrid_search song song (asyncio.gather)
  → merge tất cả chunks → deduplicate → sắp xếp theo score → top-K
"""
from __future__ import annotations

import asyncio
import json
import re

from app.rag.llm_provider import get_llm_provider
from app.rag.retriever import RetrievedChunk, hybrid_search
from app.utils.logger import logger


_TRANSFORM_SYSTEM = """Bạn là chuyên gia tìm kiếm thông tin.
Nhiệm vụ: từ câu hỏi gốc, tạo ra ĐÚNG 3 cách hỏi khác nhau để tìm kiếm tài liệu.

Yêu cầu:
- Dùng từ ngữ, góc nhìn, hoặc cách diễn đạt khác nhau.
- Giữ nguyên ý nghĩa gốc, KHÔNG thêm thông tin mới.
- Trả về JSON array: ["câu hỏi 1", "câu hỏi 2", "câu hỏi 3"]
- CHỈ trả về JSON, không có text nào khác."""


async def generate_query_variants(query: str, n: int = 3) -> list[str]:
    """
    Dùng LLM tạo N biến thể của query gốc.
    Luôn bao gồm query gốc trong kết quả (dù LLM có lỗi hay không).
    """
    try:
        llm = get_llm_provider()
        messages = [
            {"role": "system", "content": _TRANSFORM_SYSTEM},
            {"role": "user", "content": f"Câu hỏi gốc: {query}"},
        ]
        response = await llm.chat(messages, temperature=0.4, max_tokens=300)
        response = response.strip()

        # Parse JSON — xử lý trường hợp LLM bọc trong ```json ... ```
        clean = re.sub(r"```json|```", "", response).strip()
        variants: list[str] = json.loads(clean)

        if not isinstance(variants, list):
            raise ValueError("Không phải list")

        # Lọc trùng với query gốc và đảm bảo query gốc luôn có mặt
        unique = [query] + [v for v in variants if v.strip() and v.strip() != query]
        result = unique[:n + 1]  # query gốc + tối đa n biến thể

        logger.debug(f"Query variants ({len(result)}): {result}")
        return result

    except Exception as e:
        logger.warning(f"Query transform thất bại ({e}), chỉ dùng query gốc")
        return [query]


def _merge_and_deduplicate(
    all_chunks: list[list[RetrievedChunk]],
    top_k: int,
) -> list[RetrievedChunk]:
    """
    Gộp chunks từ nhiều lượt search, giữ score cao nhất cho mỗi nội dung trùng,
    trả về top_k chunk sắp xếp theo score giảm dần.
    """
    seen: dict[str, RetrievedChunk] = {}  # key = content hash ngắn

    for chunk_list in all_chunks:
        for chunk in chunk_list:
            # Dùng 100 ký tự đầu làm key nhận dạng (tránh chunk bị trim khác nhau 1 chút)
            key = chunk.content[:100].strip()
            if key not in seen or chunk.score > seen[key].score:
                seen[key] = chunk

    merged = sorted(seen.values(), key=lambda c: c.score, reverse=True)
    logger.debug(f"Merged {sum(len(cl) for cl in all_chunks)} → {len(merged)} unique chunks")
    return merged[:top_k]


async def multi_query_search(
    query: str,
    top_k: int = 10,
    collection_name: str | None = None,
) -> list[RetrievedChunk]:
    """
    Tạo nhiều biến thể query → search song song → merge kết quả.

    Dùng thay cho hybrid_search() đơn thuần khi muốn coverage cao hơn.
    """
    variants = await generate_query_variants(query)

    # Search tất cả biến thể song song
    tasks = [
        hybrid_search(v, top_k=top_k, collection_name=collection_name)
        for v in variants
    ]
    results: list[list[RetrievedChunk]] = await asyncio.gather(*tasks)

    merged = _merge_and_deduplicate(list(results), top_k=top_k)
    logger.info(
        f"Multi-query search: {len(variants)} variants → {len(merged)} unique chunks"
    )
    return merged