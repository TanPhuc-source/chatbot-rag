"""
Indexer — đẩy LoadedChunks vào ChromaDB.

Dùng PersistentClient — lưu data vào thư mục local, không cần server riêng.
Data được lưu tại: ./chroma_data (cùng cấp với thư mục chạy uvicorn)
"""
from __future__ import annotations

import hashlib
import json
from functools import lru_cache
from typing import Any

import chromadb

from app.config import get_settings
from app.ingestion.loader import LoadedChunk
from app.rag.embeddings import get_embedding_provider
from app.utils.logger import logger

CHROMA_PATH = "./chroma_data"


@lru_cache(maxsize=1)
def _get_chroma_client() -> chromadb.PersistentClient:
    """
    Singleton PersistentClient.
    Tự động tạo thư mục chroma_data nếu chưa có.
    Không cần chạy server riêng.
    """
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    logger.info(f"ChromaDB PersistentClient initialized at: {CHROMA_PATH}")
    return client


def _get_collection(collection_name: str | None = None):
    """Lấy hoặc tạo collection trong ChromaDB."""
    client = _get_chroma_client()
    settings = get_settings()
    name = collection_name or settings.CHROMA_COLLECTION

    collection = client.get_or_create_collection(
        name=name,
        metadata={"hnsw:space": "cosine"},
    )
    return collection


def _make_chunk_id(source_file: str, chunk_index: int) -> str:
    raw = f"{source_file}::{chunk_index}"
    return hashlib.md5(raw.encode()).hexdigest()


async def index_chunks(
    chunks: list[LoadedChunk],
    document_id: str,
    collection_name: str | None = None,
    batch_size: int = 64,
) -> int:
    if not chunks:
        logger.warning("Không có chunk nào để index")
        return 0

    collection = _get_collection(collection_name)
    embedder = get_embedding_provider()
    total_indexed = 0

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        texts = [c.content for c in batch]

        logger.debug(f"Embedding batch {i // batch_size + 1}: {len(texts)} chunks")
        embeddings = embedder.embed_documents(texts)

        ids = [_make_chunk_id(c.source_file, c.chunk_index) for c in batch]
        metadatas = [
            {
                "document_id": document_id,
                "source_file": c.source_file,
                "chunk_index": c.chunk_index,
                "total_chunks": c.total_chunks,
                "first_page": c.first_page or -1,
                "last_page": c.last_page or -1,
                **{k: (json.dumps(v) if isinstance(v, list) else v or "")
                   for k, v in c.metadata.items()},
            }
            for c in batch
        ]

        collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=texts,
            metadatas=metadatas,
        )
        total_indexed += len(batch)

    logger.info(f"Indexed {total_indexed} chunks cho document_id={document_id}")
    return total_indexed


async def delete_document(document_id: str, collection_name: str | None = None) -> None:
    collection = _get_collection(collection_name)
    collection.delete(where={"document_id": document_id})
    logger.info(f"Deleted all chunks của document_id={document_id}")


async def collection_stats(collection_name: str | None = None) -> dict[str, Any]:
    collection = _get_collection(collection_name)
    count = collection.count()
    return {"collection": collection.name, "total_chunks": count}
