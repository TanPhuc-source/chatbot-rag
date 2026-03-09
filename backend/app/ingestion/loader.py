"""
Document Loader — dùng Kreuzberg v4.4.x

Hỗ trợ: PDF, DOCX, PPTX, TXT, HTML, EPUB, Excel, ...
Kreuzberg lo toàn bộ: extract text + metadata + chunking.
"""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from kreuzberg import (
    ExtractionConfig,
    ChunkingConfig,
    LanguageDetectionConfig,
    extract_file,
    extract_bytes,
)

from app.config import get_settings
from app.utils.logger import logger


@dataclass
class LoadedChunk:
    """Một đoạn text sau khi extract + chunk."""
    content: str
    metadata: dict[str, Any]
    source_file: str
    chunk_index: int
    total_chunks: int
    first_page: int | None = None
    last_page: int | None = None


def _build_extraction_config(settings=None) -> ExtractionConfig:
    if settings is None:
        settings = get_settings()

    return ExtractionConfig(
        chunking=ChunkingConfig(
            max_chars=settings.CHUNK_MAX_CHARS,
            max_overlap=settings.CHUNK_MAX_OVERLAP,
        ),
        language_detection=LanguageDetectionConfig(
            enabled=True,
            detect_multiple=True,   # tài liệu có thể trộn Việt + Anh
        ),
        # Tự động OCR khi native extraction thất bại (ảnh, scan)
        use_cache=True,
        enable_quality_processing=True,
    )


async def load_file(file_path: str | Path) -> list[LoadedChunk]:
    """
    Load và chunk 1 file từ đường dẫn.
    Trả về list LoadedChunk sẵn sàng để embed + index.
    """
    path = Path(file_path)
    if not path.exists():
        raise FileNotFoundError(f"File không tồn tại: {file_path}")

    logger.info(f"Loading file: {path.name}")
    config = _build_extraction_config()

    result = await extract_file(path, config=config)
    chunks = _parse_result(result, source_file=path.name)

    logger.info(f"Extracted {len(chunks)} chunks từ {path.name}")
    return chunks


async def load_bytes(
    data: bytes,
    filename: str,
    mime_type: str = "application/octet-stream",
) -> list[LoadedChunk]:
    """
    Load và chunk từ bytes (dùng khi nhận file upload qua API).
    """
    logger.info(f"Loading from bytes: {filename} ({len(data)} bytes)")
    config = _build_extraction_config()

    result = await extract_bytes(data, mime_type=mime_type, config=config)
    chunks = _parse_result(result, source_file=filename)

    logger.info(f"Extracted {len(chunks)} chunks từ {filename}")
    return chunks


async def load_batch(file_paths: list[str | Path]) -> list[LoadedChunk]:
    """
    Load nhiều file song song.
    Dùng cho lần đầu index toàn bộ thư mục tài liệu.
    """
    tasks = [load_file(p) for p in file_paths]
    results = await asyncio.gather(*tasks, return_exceptions=True)

    all_chunks: list[LoadedChunk] = []
    for path, result in zip(file_paths, results):
        if isinstance(result, Exception):
            logger.error(f"Lỗi khi load {path}: {result}")
        else:
            all_chunks.extend(result)

    logger.info(f"Batch load xong: {len(all_chunks)} chunks từ {len(file_paths)} files")
    return all_chunks


def _parse_result(result: Any, source_file: str) -> list[LoadedChunk]:
    """Parse ExtractionResult của Kreuzberg thành list LoadedChunk."""
    if not result.chunks:
        # Fallback: không có chunks → dùng toàn bộ content làm 1 chunk
        logger.warning(f"Không có chunks từ {source_file}, dùng full content")
        return [
            LoadedChunk(
                content=result.content,
                metadata={"mime_type": result.mime_type},
                source_file=source_file,
                chunk_index=0,
                total_chunks=1,
            )
        ]

    total = len(result.chunks)
    chunks: list[LoadedChunk] = []

    for i, chunk in enumerate(result.chunks):
        meta = chunk.metadata or {}
        chunks.append(
            LoadedChunk(
                content=chunk.content,
                metadata={
                    "mime_type": result.mime_type,
                    "byte_start": meta.get("byte_start"),
                    "byte_end": meta.get("byte_end"),
                    "token_count": meta.get("token_count"),
                    "detected_languages": result.detected_languages or [],
                },
                source_file=source_file,
                chunk_index=i,
                total_chunks=total,
                first_page=meta.get("first_page"),
                last_page=meta.get("last_page"),
            )
        )

    return chunks
