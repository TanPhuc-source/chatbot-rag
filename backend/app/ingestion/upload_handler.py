from __future__ import annotations

import mimetypes
import uuid
from dataclasses import dataclass
from pathlib import Path

from app.ingestion.cleaner import clean_chunks
from app.ingestion.indexer import index_chunks, delete_document
from app.ingestion.json_loader import load_json_bytes
from app.ingestion.loader import load_bytes
from app.utils.logger import logger

# Định dạng được phép upload
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".doc", ".txt", ".pptx", ".xlsx", ".html", ".epub", ".json"}
MAX_FILE_SIZE_MB = 50


@dataclass
class UploadResult:
    document_id: str
    filename: str
    chunks_indexed: int
    status: str   # "success" | "failed"
    error: str | None = None


async def handle_upload(
    file_bytes: bytes,
    filename: str,
) -> UploadResult:
    # 1. Validate
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        return UploadResult(
            document_id="",
            filename=filename,
            chunks_indexed=0,
            status="failed",
            error=f"Định dạng '{suffix}' không được hỗ trợ. Chấp nhận: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        return UploadResult(
            document_id="",
            filename=filename,
            chunks_indexed=0,
            status="failed",
            error=f"File quá lớn ({size_mb:.1f}MB). Tối đa {MAX_FILE_SIZE_MB}MB.",
        )

    document_id = str(uuid.uuid4())
    mime_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"

    try:
        logger.info(f"Processing upload: {filename} ({size_mb:.2f}MB) → doc_id={document_id}")

        # 2. Extract + chunk — JSON dùng json_loader, file khác dùng Kreuzberg
        if suffix == ".json":
            chunks = load_json_bytes(file_bytes, filename=filename)
        else:
            chunks = await load_bytes(file_bytes, filename=filename, mime_type=mime_type)

        if not chunks:
            return UploadResult(
                document_id=document_id,
                filename=filename,
                chunks_indexed=0,
                status="failed",
                error="Không trích xuất được nội dung từ file. File có thể bị lỗi hoặc chỉ chứa ảnh scan.",
            )

        # 3. Làm sạch dữ liệu: xóa rác, chuẩn hóa whitespace, lọc chunk vô nghĩa
        chunks = clean_chunks(chunks)

        if not chunks:
            return UploadResult(
                document_id=document_id,
                filename=filename,
                chunks_indexed=0,
                status="failed",
                error="Sau khi làm sạch, không còn nội dung hữu ích. File có thể chứa toàn header/footer hoặc ký tự rác.",
            )

        # 4. Embed + index
        total_indexed = await index_chunks(chunks, document_id=document_id)

        logger.info(f"✅ Upload success: {filename} → {total_indexed} chunks indexed")
        return UploadResult(
            document_id=document_id,
            filename=filename,
            chunks_indexed=total_indexed,
            status="success",
        )

    except Exception as e:
        logger.error(f"Upload failed for {filename}: {e}")
        # Dọn dẹp nếu đã index 1 phần
        await delete_document(document_id)
        return UploadResult(
            document_id=document_id,
            filename=filename,
            chunks_indexed=0,
            status="failed",
            error=str(e),
        )