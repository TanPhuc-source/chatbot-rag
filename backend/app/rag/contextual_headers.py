"""
Contextual Chunk Headers — Thêm tiêu đề ngữ cảnh vào đầu mỗi chunk trước khi index.

Vấn đề với chunking thông thường:
  Một chunk như "Phương trình này có nghiệm kép khi Δ = 0"
  khi tách ra khỏi tài liệu mất hoàn toàn ngữ cảnh:
  - Đây là chương gì? Bài nào? Phương trình gì?
  Embedding của chunk rời rạc này rất kém → retrieval miss.

Giải pháp:
  Dùng LLM tóm tắt vị trí của chunk trong tài liệu,
  rồi prepend header đó vào chunk content trước khi embed.

  Chunk gốc: "Phương trình này có nghiệm kép khi Δ = 0"
  Chunk sau khi thêm header:
    "[Chương 2: Phương trình bậc 2 — Phân tích delta và điều kiện nghiệm]
    Phương trình này có nghiệm kép khi Δ = 0"

Kết quả: embedding giàu ngữ cảnh hơn → retrieval chính xác hơn.

Kỹ thuật này áp dụng ở INGESTION TIME (khi upload/index tài liệu),
không phải query time.
"""
from __future__ import annotations

from app.ingestion.loader import LoadedChunk
from app.rag.llm_provider import get_llm_provider
from app.utils.logger import logger
import asyncio


_HEADER_SYSTEM = """Bạn là trợ lý tạo tiêu đề ngữ cảnh cho đoạn văn bản.
Nhiệm vụ: viết 1 dòng tiêu đề ngắn (tối đa 15 từ) mô tả NỘI DUNG và VỊ TRÍ
của đoạn văn trong tài liệu.

Ví dụ output: "Chương 3: Cơ sở dữ liệu — Khái niệm khoá ngoại và ràng buộc tham chiếu"

CHỈ trả về dòng tiêu đề, không có gì khác."""


async def generate_chunk_header(
    chunk_content: str,
    source_file: str,
    chunk_index: int,
    total_chunks: int,
    surrounding_context: str = "",
) -> str:
    """
    Dùng LLM sinh tiêu đề ngữ cảnh cho 1 chunk.

    Args:
        chunk_content: Nội dung chunk cần thêm header.
        source_file: Tên file gốc (dùng làm gợi ý cho LLM).
        chunk_index: Vị trí chunk trong tài liệu.
        total_chunks: Tổng số chunks (để biết chunk ở đầu/giữa/cuối).
        surrounding_context: Vài câu đầu của chunk trước/sau để LLM hiểu ngữ cảnh.

    Returns:
        Dòng header string, hoặc "" nếu lỗi (không làm hỏng pipeline).
    """
    try:
        position_hint = ""
        if total_chunks > 1:
            pct = int((chunk_index / total_chunks) * 100)
            position_hint = f"(khoảng {pct}% tài liệu)"

        context_part = ""
        if surrounding_context:
            context_part = f"\nNgữ cảnh xung quanh: {surrounding_context[:200]}"

        prompt = (
            f"File: {source_file} {position_hint}{context_part}\n\n"
            f"Đoạn văn:\n{chunk_content[:500]}"
        )

        llm = get_llm_provider()
        messages = [
            {"role": "system", "content": _HEADER_SYSTEM},
            {"role": "user", "content": prompt},
        ]
        header = await llm.chat(messages, temperature=0.2, max_tokens=60)
        return header.strip()

    except Exception as e:
        logger.warning(f"Chunk header generation failed for {source_file}[{chunk_index}]: {e}")
        return ""


def prepend_header(chunk: LoadedChunk, header: str) -> LoadedChunk:
    """
    Tạo LoadedChunk mới với header được prepend vào content.
    Giữ nguyên metadata gốc + lưu header vào metadata để debug.
    """
    if not header:
        return chunk

    enriched_content = f"[{header}]\n{chunk.content}"

    from dataclasses import replace
    return replace(
        chunk,
        content=enriched_content,
        metadata={**chunk.metadata, "contextual_header": header},
    )


async def enrich_chunks_with_headers(
    chunks: list[LoadedChunk],
    batch_size: int = 5,
    max_chunks: int = 200,
) -> list[LoadedChunk]:
    """
    Thêm contextual header cho toàn bộ danh sách chunks.

    Args:
        chunks: Danh sách chunks từ loader.
        batch_size: Số chunk xử lý song song mỗi lượt (tránh rate limit).
        max_chunks: Giới hạn số chunk được enrich (tiết kiệm LLM calls).
                    Các chunk vượt quá ngưỡng giữ nguyên không có header.

    Returns:
        Danh sách chunks đã được enrich.
    """
    if not chunks:
        return chunks

    total = len(chunks)
    to_enrich = chunks[:max_chunks]
    rest = chunks[max_chunks:]  # Không enrich chunk vượt ngưỡng

    logger.info(f"Enriching {len(to_enrich)}/{total} chunks with contextual headers...")
    enriched: list[LoadedChunk] = []

    for i in range(0, len(to_enrich), batch_size):
        batch = to_enrich[i: i + batch_size]

        # Build surrounding context: lấy đầu chunk kề trước (nếu có)
        async def _process(idx: int, chunk: LoadedChunk) -> LoadedChunk:
            prev_context = ""
            abs_idx = i + idx
            if abs_idx > 0 and abs_idx - 1 < len(to_enrich):
                prev_context = to_enrich[abs_idx - 1].content[:150]

            header = await generate_chunk_header(
                chunk_content=chunk.content,
                source_file=chunk.source_file,
                chunk_index=chunk.chunk_index,
                total_chunks=chunk.total_chunks,
                surrounding_context=prev_context,
            )
            return prepend_header(chunk, header)

        tasks = [_process(idx, chunk) for idx, chunk in enumerate(batch)]
        batch_results = await asyncio.gather(*tasks)
        enriched.extend(batch_results)

        logger.debug(f"Header enrichment: {i + len(batch)}/{len(to_enrich)} done")

    result = enriched + rest
    logger.info(f"Contextual headers added: {len(enriched)} chunks enriched")
    return result