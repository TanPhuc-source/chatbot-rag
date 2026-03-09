"""
RAG Pipeline — kết nối toàn bộ luồng:

  Query → Hybrid Search → Rerank → Prompt → LLM → Response
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import AsyncIterator

from app.config import get_settings
from app.rag.embeddings import get_embedding_provider
from app.rag.llm_provider import get_llm_provider
from app.rag.prompts import (
    build_qa_prompt,
    build_explain_prompt,
    build_summarize_prompt,
    build_out_of_scope_response,
)
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
    """Bước 1+2: Retrieve → Rerank."""
    settings = get_settings()

    # Hybrid search
    chunks = await hybrid_search(query, collection_name=collection_name)

    if not chunks:
        return []

    # Lọc chunks quá kém
    chunks = [c for c in chunks if c.score >= RELEVANCE_THRESHOLD]

    if not chunks:
        logger.info(f"Không có chunk đủ liên quan cho query: '{query[:60]}'")
        return []

    # Rerank
    reranked = await rerank(query, chunks, top_n=settings.RERANKER_TOP_N)
    return reranked


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
