"""
Upload API — chỉ admin mới được upload / xoá / xem stats

POST   /upload          → upload 1 file         [admin only]
POST   /upload/batch    → upload nhiều file      [admin only]
DELETE /upload/{id}     → xoá tài liệu           [admin only]
GET    /upload/stats    → thống kê collection    [admin only]
GET    /upload/{id}/content           → xem chunks từ ChromaDB [admin only]
PUT    /upload/{id}/chunks/{chunk_id} → sửa nội dung chunk     [admin only]
DELETE /upload/{id}/chunks/{chunk_id} → xóa 1 chunk            [admin only]
POST   /upload/{id}/chunks/split      → tách 1 chunk thành 2   [admin only]
POST   /upload/{id}/chunks/merge      → gộp 2 chunk liên tiếp  [admin only]
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.db_dependencies import get_admin_user, get_staff_user
from app.db.database import get_db
from app.db import models
from app.ingestion.indexer import collection_stats, delete_document, _get_collection
from app.ingestion.upload_handler import handle_upload
from app.rag.embeddings import get_embedding_provider
from app.utils.logger import logger

router = APIRouter()


# ── Response schemas ───────────────────────────────────────────────────────

class UploadResponse(BaseModel):
    document_id: str
    filename: str
    chunks_indexed: int
    status: str
    error: str | None = None


class BatchUploadResponse(BaseModel):
    total_files: int
    success: int
    failed: int
    results: list[UploadResponse]


class UpdateChunkRequest(BaseModel):
    text: str


class SplitChunkRequest(BaseModel):
    chunk_id: str
    split_at: int   # vị trí ký tự để tách


class MergeChunksRequest(BaseModel):
    chunk_id_a: str
    chunk_id_b: str


# ── Helper: re-embed & upsert ──────────────────────────────────────────────

async def _upsert_chunk(chunk_id: str, text: str, metadata: dict) -> None:
    """Re-embed văn bản mới và upsert vào ChromaDB."""
    embedder = get_embedding_provider()
    embeddings = embedder.embed_documents([text])
    collection = _get_collection()
    collection.upsert(
        ids=[chunk_id],
        embeddings=embeddings,
        documents=[text],
        metadatas=[metadata],
    )


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/{document_id}/download")
async def download_original_file(
    document_id: str,
    current_user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db),
):
    """Tải về file gốc đã upload."""
    from pathlib import Path
    from fastapi.responses import FileResponse
    import mimetypes

    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Không tìm thấy tài liệu")
    if not doc.file_path:
        raise HTTPException(status_code=404, detail="Tài liệu này không có file gốc")

    file = Path(doc.file_path)
    if not file.exists():
        raise HTTPException(status_code=404, detail="File gốc không tồn tại trên server")

    media_type, _ = mimetypes.guess_type(doc.filename)
    media_type = media_type or "application/octet-stream"
    return FileResponse(path=str(file), filename=doc.filename, media_type=media_type)


@router.post("", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(..., description="File PDF, DOCX, TXT, PPTX... tối đa 50MB"),
    current_user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db),
):
    """Upload 1 tài liệu → tự động extract, chunk và index vào ChromaDB."""
    file_bytes = await file.read()
    result = await handle_upload(
        file_bytes, filename=file.filename, db=db, uploaded_by=current_user.id,
    )
    if result.status == "failed":
        logger.warning(f"Upload failed: {file.filename} — {result.error}")
    return UploadResponse(
        document_id=result.document_id, filename=result.filename,
        chunks_indexed=result.chunks_indexed, status=result.status, error=result.error,
    )


@router.post("/batch", response_model=BatchUploadResponse)
async def upload_batch(
    files: list[UploadFile] = File(..., description="Upload nhiều file cùng lúc"),
    current_user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db),
):
    """Upload nhiều tài liệu cùng lúc (tối đa 10 file)."""
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Tối đa 10 file mỗi lần upload")

    results: list[UploadResponse] = []
    for file in files:
        file_bytes = await file.read()
        result = await handle_upload(
            file_bytes, filename=file.filename, db=db, uploaded_by=current_user.id,
        )
        results.append(UploadResponse(
            document_id=result.document_id, filename=result.filename,
            chunks_indexed=result.chunks_indexed, status=result.status, error=result.error,
        ))

    success_count = sum(1 for r in results if r.status == "success")
    return BatchUploadResponse(
        total_files=len(files), success=success_count,
        failed=len(files) - success_count, results=results,
    )


@router.delete("/{document_id}")
async def delete_file(
    document_id: str,
    current_user: models.User = Depends(get_staff_user),
    db: Session = Depends(get_db),
):
    """Xoá tài liệu khỏi ChromaDB + file gốc trên disk."""
    doc = db.query(models.Document).filter(models.Document.id == document_id).first()
    if doc and doc.file_path:
        from pathlib import Path
        file = Path(doc.file_path)
        if file.exists():
            file.unlink()
            logger.info(f"Deleted file from disk: {file}")

    await delete_document(document_id)
    return {"message": f"Đã xoá document {document_id}"}


@router.get("/stats")
async def get_stats(current_user: models.User = Depends(get_staff_user)):
    """Thống kê tổng số chunks trong ChromaDB."""
    return await collection_stats()


@router.get("/{document_id}/content")
async def get_document_content(
    document_id: str,
    current_user: models.User = Depends(get_staff_user),
):
    """Lấy toàn bộ chunks của 1 tài liệu từ ChromaDB, kèm chunk_id."""
    collection = _get_collection()
    result = collection.get(
        where={"document_id": document_id},
        include=["documents", "metadatas"],
    )

    if not result["documents"]:
        raise HTTPException(status_code=404, detail="Không tìm thấy nội dung cho tài liệu này")

    combined = sorted(
        zip(result["ids"], result["documents"], result["metadatas"]),
        key=lambda x: x[2].get("chunk_index", 0),
    )

    chunks = [
        {
            "chunk_id": cid,
            "chunk_index": meta.get("chunk_index", i),
            "text": doc,
            "first_page": meta.get("first_page", -1),
            "source_file": meta.get("source_file", ""),
        }
        for i, (cid, doc, meta) in enumerate(combined)
    ]

    return {"document_id": document_id, "total_chunks": len(chunks), "chunks": chunks}


# ── Chunk editing endpoints ────────────────────────────────────────────────

@router.put("/{document_id}/chunks/{chunk_id}")
async def update_chunk(
    document_id: str,
    chunk_id: str,
    body: UpdateChunkRequest,
    current_user: models.User = Depends(get_staff_user),
):
    """Sửa nội dung text của 1 chunk, re-embed và lưu lại ChromaDB."""
    if not body.text.strip():
        raise HTTPException(status_code=400, detail="Nội dung chunk không được để trống")

    collection = _get_collection()
    result = collection.get(ids=[chunk_id], include=["metadatas"])
    if not result["ids"]:
        raise HTTPException(status_code=404, detail="Không tìm thấy chunk")

    meta = result["metadatas"][0]
    if meta.get("document_id") != document_id:
        raise HTTPException(status_code=403, detail="Chunk không thuộc tài liệu này")

    await _upsert_chunk(chunk_id, body.text.strip(), meta)
    logger.info(f"Updated chunk {chunk_id} of document {document_id}")
    return {"message": "Đã cập nhật chunk", "chunk_id": chunk_id}


@router.delete("/{document_id}/chunks/{chunk_id}")
async def delete_chunk(
    document_id: str,
    chunk_id: str,
    current_user: models.User = Depends(get_staff_user),
):
    """Xóa 1 chunk khỏi ChromaDB."""
    collection = _get_collection()
    result = collection.get(ids=[chunk_id], include=["metadatas"])
    if not result["ids"]:
        raise HTTPException(status_code=404, detail="Không tìm thấy chunk")

    meta = result["metadatas"][0]
    if meta.get("document_id") != document_id:
        raise HTTPException(status_code=403, detail="Chunk không thuộc tài liệu này")

    collection.delete(ids=[chunk_id])
    logger.info(f"Deleted chunk {chunk_id} of document {document_id}")
    return {"message": "Đã xóa chunk", "chunk_id": chunk_id}


@router.post("/{document_id}/chunks/split")
async def split_chunk(
    document_id: str,
    body: SplitChunkRequest,
    current_user: models.User = Depends(get_staff_user),
):
    """Tách 1 chunk thành 2 tại vị trí ký tự split_at."""
    collection = _get_collection()
    result = collection.get(ids=[body.chunk_id], include=["documents", "metadatas"])
    if not result["ids"]:
        raise HTTPException(status_code=404, detail="Không tìm thấy chunk")

    meta = result["metadatas"][0]
    if meta.get("document_id") != document_id:
        raise HTTPException(status_code=403, detail="Chunk không thuộc tài liệu này")

    original_text = result["documents"][0]
    if body.split_at <= 0 or body.split_at >= len(original_text):
        raise HTTPException(status_code=400, detail=f"split_at phải nằm trong (0, {len(original_text)})")

    text_a = original_text[:body.split_at].strip()
    text_b = original_text[body.split_at:].strip()
    if not text_a or not text_b:
        raise HTTPException(status_code=400, detail="Mỗi phần sau tách không được rỗng")

    import hashlib, time
    original_index = meta.get("chunk_index", 0)
    new_id = hashlib.md5(f"{body.chunk_id}:split:{time.time()}".encode()).hexdigest()
    meta_b = {**meta, "chunk_index": original_index + 0.5}

    await _upsert_chunk(body.chunk_id, text_a, meta)
    await _upsert_chunk(new_id, text_b, meta_b)

    logger.info(f"Split chunk {body.chunk_id} → {body.chunk_id} + {new_id}")
    return {
        "message": "Đã tách chunk",
        "chunk_a": {"chunk_id": body.chunk_id, "text": text_a},
        "chunk_b": {"chunk_id": new_id, "text": text_b},
    }


@router.post("/{document_id}/chunks/merge")
async def merge_chunks(
    document_id: str,
    body: MergeChunksRequest,
    current_user: models.User = Depends(get_staff_user),
):
    """Gộp 2 chunk thành 1. Chunk có index nhỏ hơn được giữ lại, chunk kia bị xóa."""
    if body.chunk_id_a == body.chunk_id_b:
        raise HTTPException(status_code=400, detail="Hai chunk phải khác nhau")

    collection = _get_collection()
    result = collection.get(
        ids=[body.chunk_id_a, body.chunk_id_b],
        include=["documents", "metadatas"],
    )

    if len(result["ids"]) != 2:
        raise HTTPException(status_code=404, detail="Không tìm thấy đủ 2 chunk")

    for meta in result["metadatas"]:
        if meta.get("document_id") != document_id:
            raise HTTPException(status_code=403, detail="Chunk không thuộc tài liệu này")

    pairs = sorted(
        zip(result["ids"], result["documents"], result["metadatas"]),
        key=lambda x: x[2].get("chunk_index", 0),
    )
    id_first, text_first, meta_first = pairs[0]
    id_second, text_second, _ = pairs[1]

    merged_text = text_first.rstrip() + "\n\n" + text_second.lstrip()
    await _upsert_chunk(id_first, merged_text, meta_first)
    collection.delete(ids=[id_second])

    logger.info(f"Merged chunks {body.chunk_id_a} + {body.chunk_id_b} → {id_first}")
    return {
        "message": "Đã gộp 2 chunk",
        "merged_chunk_id": id_first,
        "deleted_chunk_id": id_second,
        "merged_text": merged_text,
    }