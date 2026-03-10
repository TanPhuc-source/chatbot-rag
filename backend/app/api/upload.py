"""
Upload API — chỉ admin mới được upload / xoá / xem stats

POST   /upload          → upload 1 file         [admin only]
POST   /upload/batch    → upload nhiều file      [admin only]
DELETE /upload/{id}     → xoá tài liệu           [admin only]
GET    /upload/stats    → thống kê collection    [admin only]
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from app.core.db_dependencies import get_admin_user
from app.db import models
from app.ingestion.indexer import collection_stats, delete_document
from app.ingestion.upload_handler import handle_upload
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


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.post("", response_model=UploadResponse)
async def upload_file(
    file: UploadFile = File(..., description="File PDF, DOCX, TXT, PPTX... tối đa 50MB"),
    current_user: models.User = Depends(get_admin_user),
):
    """
    Upload 1 tài liệu → tự động extract, chunk và index vào ChromaDB.
    **Yêu cầu quyền admin.**
    """
    file_bytes = await file.read()
    result = await handle_upload(file_bytes, filename=file.filename)

    if result.status == "failed":
        logger.warning(f"Upload failed: {file.filename} — {result.error}")

    return UploadResponse(
        document_id=result.document_id,
        filename=result.filename,
        chunks_indexed=result.chunks_indexed,
        status=result.status,
        error=result.error,
    )


@router.post("/batch", response_model=BatchUploadResponse)
async def upload_batch(
    files: list[UploadFile] = File(..., description="Upload nhiều file cùng lúc"),
    current_user: models.User = Depends(get_admin_user),
):
    """
    Upload nhiều tài liệu cùng lúc (tối đa 10 file).
    **Yêu cầu quyền admin.**
    """
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Tối đa 10 file mỗi lần upload")

    results: list[UploadResponse] = []

    for file in files:
        file_bytes = await file.read()
        result = await handle_upload(file_bytes, filename=file.filename)
        results.append(
            UploadResponse(
                document_id=result.document_id,
                filename=result.filename,
                chunks_indexed=result.chunks_indexed,
                status=result.status,
                error=result.error,
            )
        )

    success_count = sum(1 for r in results if r.status == "success")

    return BatchUploadResponse(
        total_files=len(files),
        success=success_count,
        failed=len(files) - success_count,
        results=results,
    )


@router.delete("/{document_id}")
async def delete_file(
    document_id: str,
    current_user: models.User = Depends(get_admin_user),
):
    """
    Xoá tài liệu khỏi ChromaDB theo document_id.
    **Yêu cầu quyền admin.**
    """
    await delete_document(document_id)
    return {"message": f"Đã xoá document {document_id}"}


@router.get("/stats")
async def get_stats(
    current_user: models.User = Depends(get_admin_user),
):
    """
    Thống kê: tổng số chunks đang lưu trong ChromaDB.
    **Yêu cầu quyền admin.**
    """
    return await collection_stats()