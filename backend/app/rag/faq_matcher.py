"""
FAQ Matcher — tìm câu hỏi FAQ tương tự với query của user.

Dùng embedding cosine similarity để match, không cần exact match.
Cache FAQ embeddings trong memory để tránh tính lại mỗi request.

Luồng:
  1. Load tất cả FAQ active từ DB
  2. Embed câu hỏi của user
  3. So sánh cosine similarity với từng FAQ question embedding
  4. Nếu similarity >= threshold → trả về FAQ answer
"""
from __future__ import annotations

import time
import math
from dataclasses import dataclass

from app.utils.logger import logger

# Ngưỡng similarity — câu hỏi giống FAQ trên 75% thì dùng FAQ
FAQ_SIMILARITY_THRESHOLD = 0.75

# Cache FAQ embeddings trong memory, refresh mỗi 120s (khi admin thêm/sửa FAQ)
_faq_cache: dict = {
    "items": [],      # list[dict]: {id, question, answer, embedding}
    "ts": 0.0,
}
_CACHE_TTL = 120.0


@dataclass
class FAQMatch:
    faq_id: int
    question: str
    answer: str
    similarity: float


def _cosine_similarity(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def invalidate_faq_cache() -> None:
    """Gọi sau khi admin thêm/sửa/xóa FAQ để cache được refresh ngay."""
    _faq_cache["ts"] = 0.0


def _load_faq_with_embeddings() -> list[dict]:
    """Load FAQ từ DB và tính embedding cho từng câu hỏi."""
    from app.db.database import SessionLocal
    from app.db import models
    from app.rag.embeddings import get_embedding_provider

    db = SessionLocal()
    try:
        faqs = db.query(models.FAQ).filter(models.FAQ.is_active == True).all()
        if not faqs:
            return []

        embedder = get_embedding_provider()
        questions = [f.question for f in faqs]
        embeddings = embedder.embed_documents(questions)

        return [
            {
                "id": f.id,
                "question": f.question,
                "answer": f.answer,
                "embedding": emb,
            }
            for f, emb in zip(faqs, embeddings)
        ]
    except Exception as e:
        logger.error(f"FAQ cache load error: {e}")
        return []
    finally:
        db.close()


def _get_cached_faqs() -> list[dict]:
    """Lấy FAQ embeddings từ cache, tự động refresh nếu cần."""
    now = time.time()
    if now - _faq_cache["ts"] < _CACHE_TTL:
        return _faq_cache["items"]

    logger.debug("Refreshing FAQ embedding cache...")
    items = _load_faq_with_embeddings()
    _faq_cache["items"] = items
    _faq_cache["ts"] = now
    logger.debug(f"FAQ cache loaded: {len(items)} items")
    return items


def find_matching_faq(query: str) -> FAQMatch | None:
    """
    Tìm FAQ có câu hỏi tương tự nhất với query.
    Trả về FAQMatch nếu similarity >= threshold, None nếu không tìm thấy.
    """
    faqs = _get_cached_faqs()
    if not faqs:
        return None

    try:
        from app.rag.embeddings import get_embedding_provider
        embedder = get_embedding_provider()
        query_embedding = embedder.embed_query(query)
    except Exception as e:
        logger.error(f"FAQ matching embed error: {e}")
        return None

    best: FAQMatch | None = None
    for faq in faqs:
        sim = _cosine_similarity(query_embedding, faq["embedding"])
        if sim >= FAQ_SIMILARITY_THRESHOLD:
            if best is None or sim > best.similarity:
                best = FAQMatch(
                    faq_id=faq["id"],
                    question=faq["question"],
                    answer=faq["answer"],
                    similarity=sim,
                )

    if best:
        logger.info(f"FAQ match found: '{best.question[:60]}' (similarity={best.similarity:.3f})")

    return best