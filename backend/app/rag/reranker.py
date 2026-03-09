"""
Reranker — FlashRank (local, nhẹ, không cần GPU)

Tại sao rerank?
Retriever lấy top-10, nhưng không phải lúc nào chunk liên quan nhất
cũng đứng đầu. Reranker dùng cross-encoder để đánh giá lại độ liên quan
giữa query và từng chunk → chất lượng context tốt hơn rõ rệt.
"""
from __future__ import annotations

from functools import lru_cache

from flashrank import Ranker, RerankRequest

from app.config import get_settings
from app.rag.retriever import RetrievedChunk
from app.utils.logger import logger


@lru_cache(maxsize=1)
def _get_ranker() -> Ranker:
    """
    Singleton ranker.
    ms-marco-MiniLM-L-12-v2 — cân bằng tốc độ/chất lượng, chạy tốt trên CPU.
    """
    logger.info("Loading FlashRank reranker model...")
    ranker = Ranker(model_name="ms-marco-MiniLM-L-12-v2", cache_dir="/tmp/flashrank")
    logger.info("Reranker loaded ✓")
    return ranker


async def rerank(
    query: str,
    chunks: list[RetrievedChunk],
    top_n: int | None = None,
) -> list[RetrievedChunk]:
    """
    Rerank chunks dựa trên query.
    Trả về top_n chunks đã sắp xếp lại theo relevance score mới.
    """
    if not chunks:
        return []

    settings = get_settings()
    n = top_n or settings.RERANKER_TOP_N

    ranker = _get_ranker()

    # FlashRank cần list of dicts với key "id" và "text"
    passages = [
        {"id": i, "text": chunk.content}
        for i, chunk in enumerate(chunks)
    ]

    request = RerankRequest(query=query, passages=passages)
    reranked = ranker.rerank(request)

    # Map lại về RetrievedChunk với score mới
    results: list[RetrievedChunk] = []
    for item in reranked[:n]:
        original_chunk = chunks[item["id"]]
        original_chunk.score = item["score"]
        results.append(original_chunk)

    logger.debug(
        f"Reranked {len(chunks)} → {len(results)} chunks | "
        f"top score: {results[0].score:.4f}" if results else "no results"
    )
    return results
