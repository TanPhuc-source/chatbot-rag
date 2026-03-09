"""
Retriever — Hybrid Search: Vector + BM25
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from rank_bm25 import BM25Okapi

from app.config import get_settings
from app.ingestion.indexer import _get_collection
from app.rag.embeddings import get_embedding_provider
from app.utils.logger import logger


@dataclass
class RetrievedChunk:
    content: str
    metadata: dict[str, Any]
    score: float
    source_file: str
    first_page: int | None = None


async def vector_search(
    query: str,
    top_k: int | None = None,
    collection_name: str | None = None,
) -> list[RetrievedChunk]:
    settings = get_settings()
    k = top_k or settings.RETRIEVER_TOP_K

    embedder = get_embedding_provider()
    query_embedding = embedder.embed_query(query)

    collection = _get_collection(collection_name)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=k,
        include=["documents", "metadatas", "distances"],
    )

    chunks: list[RetrievedChunk] = []
    if not results["documents"] or not results["documents"][0]:
        return chunks

    for doc, meta, dist in zip(
        results["documents"][0],
        results["metadatas"][0],
        results["distances"][0],
    ):
        chunks.append(
            RetrievedChunk(
                content=doc,
                metadata=meta,
                score=1.0 - dist,
                source_file=meta.get("source_file", ""),
                first_page=meta.get("first_page") if meta.get("first_page", -1) != -1 else None,
            )
        )

    return chunks


async def hybrid_search(
    query: str,
    top_k: int | None = None,
    collection_name: str | None = None,
    vector_weight: float = 0.7,
    bm25_weight: float = 0.3,
) -> list[RetrievedChunk]:
    settings = get_settings()
    k = top_k or settings.RETRIEVER_TOP_K

    vector_chunks = await vector_search(query, top_k=k * 2, collection_name=collection_name)

    if not vector_chunks:
        return []

    corpus = [c.content for c in vector_chunks]
    tokenized_corpus = [doc.lower().split() for doc in corpus]
    bm25 = BM25Okapi(tokenized_corpus)
    bm25_scores = bm25.get_scores(query.lower().split())

    max_bm25 = max(bm25_scores) if max(bm25_scores) > 0 else 1.0
    bm25_scores_norm = [s / max_bm25 for s in bm25_scores]

    combined: list[tuple[float, RetrievedChunk]] = []
    for i, chunk in enumerate(vector_chunks):
        final_score = vector_weight * chunk.score + bm25_weight * bm25_scores_norm[i]
        combined.append((final_score, chunk))

    combined.sort(key=lambda x: x[0], reverse=True)
    top_chunks = [chunk for score, chunk in combined[:k]]

    for (score, _), chunk in zip(combined[:k], top_chunks):
        chunk.score = score

    logger.debug(f"Hybrid search '{query[:50]}': {len(top_chunks)} chunks")
    return top_chunks
