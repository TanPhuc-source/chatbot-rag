"""
Embedding Provider — dễ chuyển đổi qua .env

EMBEDDING_PROVIDER=local  → sentence-transformers multilingual (mặc định)
"""
from __future__ import annotations

from functools import lru_cache
from typing import Protocol, runtime_checkable

from app.config import get_settings
from app.utils.logger import logger


@runtime_checkable
class EmbeddingProvider(Protocol):
    """Interface chung cho mọi embedding provider."""

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        ...

    def embed_query(self, text: str) -> list[float]:
        ...


# ── Local (sentence-transformers) ──────────────────────────────────────────
class LocalEmbedding:
    """
    Dùng intfloat/multilingual-e5-large — tốt nhất cho tiếng Việt + tiếng Anh.
    Chạy hoàn toàn offline, không tốn API.
    """

    def __init__(self, model_name: str) -> None:
        from sentence_transformers import SentenceTransformer

        logger.info(f"Loading embedding model: {model_name}")
        self._model = SentenceTransformer(model_name)
        logger.info("Embedding model loaded ✓")

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        # Prefix "passage:" theo yêu cầu của multilingual-e5
        prefixed = [f"passage: {t}" for t in texts]
        return self._model.encode(prefixed, normalize_embeddings=True).tolist()

    def embed_query(self, text: str) -> list[float]:
        # Prefix "query:" cho câu hỏi
        return self._model.encode(f"query: {text}", normalize_embeddings=True).tolist()


# ── Factory ────────────────────────────────────────────────────────────────
@lru_cache(maxsize=1)
def get_embedding_provider() -> EmbeddingProvider:
    """
    Singleton — chỉ load model 1 lần duy nhất.
    Gọi get_embedding_provider() ở bất kỳ đâu để lấy instance.
    """
    settings = get_settings()

    if settings.EMBEDDING_PROVIDER == "local":
        return LocalEmbedding(settings.EMBEDDING_MODEL)

    raise ValueError(f"Unknown embedding provider: {settings.EMBEDDING_PROVIDER}")
