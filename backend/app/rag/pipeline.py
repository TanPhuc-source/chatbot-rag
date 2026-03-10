"""
RAG Pipeline — kết nối toàn bộ luồng:

  Query → [HyDE] → [Query Transform] → Hybrid Search → Rerank → Prompt → LLM → Response

Các kỹ thuật nâng cao (bật/tắt qua .env):
  - HyDE: embed hypothetical answer thay cho query gốc → vector search chính xác hơn
  - Query Transform: sinh nhiều biến thể query → search song song → merge chunks
  - Contextual Headers: áp dụng lúc ingestion (xem upload_handler.py)
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import AsyncIterator

from app.config import get_settings
from app.rag.embeddings import get_embedding_provider
from app.rag.hyde import generate_hypothetical_document
from app.rag.llm_provider import get_llm_provider
from app.rag.prompts import (
    build_qa_prompt,
    build_explain_prompt,
    build_summarize_prompt,
    build_out_of_scope_response,
)
from app.rag.query_transform import multi_query_search
from app.rag.reranker import rerank
from app.rag.retriever import RetrievedChunk, hybrid_search
from app.utils.logger import logger


# Ngưỡng score tối thiểu — chunk dưới ngưỡng này bị bỏ qua
RELEVANCE_THRESHOLD = 0.15


@dataclass
class RAGResponse:
    answer: str
    sources: list[SourceInfo]
    chunks_used: int


@dataclass
class SourceInfo:
    source_file: str
    first_page: int | None
    excerpt: str          # đoạn trích ngắn để hiển thị ở frontend


def _extract_sources(chunks: list[RetrievedChunk]) -> list[SourceInfo]:
    """Rút gọn chunks thành sources để trả về client."""
    seen: set[str] = set()
    sources: list[SourceInfo] = []

    for chunk in chunks:
        key = f"{chunk.source_file}:{chunk.first_page}"
        if key not in seen:
            seen.add(key)
            sources.append(
                SourceInfo(
                    source_file=chunk.source_file,
                    first_page=chunk.first_page,
                    excerpt=chunk.content[:200] + "..." if len(chunk.content) > 200 else chunk.content,
                )
            )

    return sources


async def _retrieve_and_rerank(
    query: str,
    collection_name: str | None = None,
) -> list[RetrievedChunk]:
    """
    Bước 1+2: Retrieve → Rerank.

    Áp dụng theo thứ tự ưu tiên:
      1. Nếu ENABLE_QUERY_TRANSFORM=True → multi_query_search (bao gồm HyDE nếu bật)
      2. Nếu chỉ ENABLE_HYDE=True → hybrid_search với hypothetical embed_text
      3. Fallback: hybrid_search thông thường
    """
    settings = get_settings()

    # ── Bước 1: Retrieve ──────────────────────────────────────────────────
    if settings.ENABLE_QUERY_TRANSFORM:
        # Query Transform tự gọi hybrid_search nhiều lần → nó handle HyDE nội bộ
        # Ta inject HyDE vào từng variant search bên trong multi_query_search
        # bằng cách patch embed_text nếu HyDE bật
        logger.debug("Using Query Transform retrieval")
        chunks = await _multi_query_with_hyde(query, collection_name)

    elif settings.ENABLE_HYDE:
        logger.debug("Using HyDE retrieval")
        hypothetical = await generate_hypothetical_document(query)
        chunks = await hybrid_search(
            query,
            collection_name=collection_name,
            embed_text=hypothetical,
        )

    else:
        logger.debug("Using standard hybrid search")
        chunks = await hybrid_search(query, collection_name=collection_name)

    if not chunks:
        return []

    # ── Bước 2: Lọc score thấp ────────────────────────────────────────────
    chunks = [c for c in chunks if c.score >= RELEVANCE_THRESHOLD]

    if not chunks:
        logger.info(f"Không có chunk đủ liên quan cho query: '{query[:60]}'")
        return []

    # ── Bước 3: Rerank ────────────────────────────────────────────────────
    reranked = await rerank(query, chunks, top_n=settings.RERANKER_TOP_N)
    return reranked


async def _multi_query_with_hyde(
    query: str,
    collection_name: str | None = None,
) -> list[RetrievedChunk]:
    """
    Query Transform + HyDE kết hợp:
    - Sinh N biến thể query
    - Nếu HyDE bật: generate hypothetical doc cho query GỐC, dùng làm 1 search nữa
    - Merge tất cả kết quả
    """
    import asyncio
    from app.rag.query_transform import generate_query_variants, _merge_and_deduplicate

    settings = get_settings()
    tasks = []

    # Search với các query variants
    variants = await generate_query_variants(query, n=settings.QUERY_TRANSFORM_N)
    for v in variants:
        tasks.append(hybrid_search(v, collection_name=collection_name))

    # Nếu HyDE bật, thêm 1 search nữa với hypothetical embed
    if settings.ENABLE_HYDE:
        hypothetical = await generate_hypothetical_document(query)
        tasks.append(
            hybrid_search(query, collection_name=collection_name, embed_text=hypothetical)
        )
        logger.debug(f"HyDE + {len(variants)} query variants → {len(tasks)} searches")
    else:
        logger.debug(f"{len(variants)} query variants → {len(tasks)} searches")

    all_results = await asyncio.gather(*tasks)
    return _merge_and_deduplicate(list(all_results), top_k=settings.RETRIEVER_TOP_K)


async def answer(
    question: str,
    history: list[dict] | None = None,
    collection_name: str | None = None,
) -> RAGResponse:
    """
    RAG pipeline đầy đủ — trả về response 1 lần.
    Dùng cho: endpoint /chat (non-streaming).
    """
    logger.info(f"RAG query: '{question[:80]}'")

    # 1. Retrieve + rerank
    chunks = await _retrieve_and_rerank(question, collection_name)

    if not chunks:
        return RAGResponse(
            answer=build_out_of_scope_response(),
            sources=[],
            chunks_used=0,
        )

    # 2. Build prompt
    messages = build_qa_prompt(question, chunks, history=history)

    # 3. LLM generate
    llm = get_llm_provider()
    answer_text = await llm.chat(messages)

    sources = _extract_sources(chunks)
    logger.info(f"RAG answered. Sources: {[s.source_file for s in sources]}")

    return RAGResponse(
        answer=answer_text,
        sources=sources,
        chunks_used=len(chunks),
    )


async def stream_answer(
    question: str,
    history: list[dict] | None = None,
    collection_name: str | None = None,
) -> AsyncIterator[str | RAGResponse]:
    """
    RAG pipeline với streaming.
    Dùng cho: endpoint /chat/stream (SSE).

    Yield:
    - str token liên tục trong khi LLM đang generate
    - RAGResponse cuối cùng (sources + metadata) sau khi xong
    """
    logger.info(f"RAG stream query: '{question[:80]}'")

    # 1. Retrieve + rerank (không stream phần này)
    chunks = await _retrieve_and_rerank(question, collection_name)

    if not chunks:
        yield build_out_of_scope_response()
        return

    # 2. Build prompt
    messages = build_qa_prompt(question, chunks, history=history)

    # 3. Stream từ LLM
    llm = get_llm_provider()
    full_answer = ""

    async for token in llm.stream(messages):
        full_answer += token
        yield token

    # 4. Yield metadata cuối cùng
    sources = _extract_sources(chunks)
    yield RAGResponse(
        answer=full_answer,
        sources=sources,
        chunks_used=len(chunks),
    )