"""
Upload API

POST /upload          → upload 1 file
POST /upload/batch    → upload nhiều file cùng lúc
DELETE /upload/{document_id} → xoá tài liệu khỏi ChromaDB
GET  /upload/stats    → thống kê collection
"""
from __future__ import annotations

from fastapi import APIRouter, File, HTTPException, UploadFile
from pydantic import BaseModel

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
):
    """
    Upload 1 tài liệu → tự động extract, chunk và index vào ChromaDB.

    Sau khi upload thành công, tài liệu có thể được hỏi đáp ngay qua /chat.
    """
    file_bytes = await file.read()
    result = await handle_upload(file_bytes, filename=file.filename)

    if result.status == "failed":
        # Vẫn trả 200 với status failed để frontend hiển thị lỗi rõ ràng
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
):
    """
    Upload nhiều tài liệu cùng lúc (tối đa 10 file).
    Mỗi file xử lý độc lập — 1 file lỗi không ảnh hưởng file khác.
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
async def delete_file(document_id: str):
    """
    Xoá tài liệu khỏi ChromaDB theo document_id.
    Lấy document_id từ response của /upload.
    """
    await delete_document(document_id)
    return {"message": f"Đã xoá document {document_id}"}


@router.get("/stats")
async def get_stats():
    """Thống kê: tổng số chunks đang lưu trong ChromaDB."""
    return await collection_stats()
