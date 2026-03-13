from __future__ import annotations

import mimetypes
import uuid
from dataclasses import dataclass
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import get_settings
from app.ingestion.cleaner import clean_chunks
from app.ingestion.indexer import index_chunks, delete_document
from app.ingestion.json_loader import load_json_bytes
from app.ingestion.loader import load_bytes
from app.ingestion.image_loader import load_image_bytes, is_image_file
from app.ingestion.scanned_pdf_loader import is_scanned_pdf, load_scanned_pdf
from app.rag.contextual_headers import enrich_chunks_with_headers
from app.utils.logger import logger

ALLOWED_EXTENSIONS = {
    ".pdf", ".docx", ".doc", ".txt", ".pptx", ".xlsx", ".html", ".epub", ".json",
    ".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif", ".bmp",
}
MAX_FILE_SIZE_MB = 50


@dataclass
class UploadResult:
    document_id: str
    filename: str
    chunks_indexed: int
    status: str   # "indexed" | "failed"
    error: str | None = None


async def handle_upload(
    file_bytes: bytes,
    filename: str,
    db: Session | None = None,
    uploaded_by: int | None = None,
) -> UploadResult:

    # 1. Validate extension
    suffix = Path(filename).suffix.lower()
    if suffix not in ALLOWED_EXTENSIONS:
        return UploadResult(
            document_id="", filename=filename, chunks_indexed=0, status="failed",
            error=f"Định dạng '{suffix}' không được hỗ trợ. Chấp nhận: {', '.join(sorted(ALLOWED_EXTENSIONS))}",
        )

    # 2. Validate size
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > MAX_FILE_SIZE_MB:
        return UploadResult(
            document_id="", filename=filename, chunks_indexed=0, status="failed",
            error=f"File quá lớn ({size_mb:.1f}MB). Tối đa {MAX_FILE_SIZE_MB}MB.",
        )

    document_id = str(uuid.uuid4())
    mime_type = mimetypes.guess_type(filename)[0] or "application/octet-stream"
    settings = get_settings()

    # 3. Lưu Document vào PostgreSQL (status = "processing")
    db_doc = None
    if db is not None:
        from app.db.models import Document
        db_doc = Document(
            id=document_id,
            filename=filename,
            file_path="",
            status="processing",
            uploaded_by=uploaded_by,
        )
        db.add(db_doc)
        db.commit()
        db.refresh(db_doc)
        logger.info(f"Saved Document record: id={document_id}, filename={filename}")

    try:
        logger.info(f"Processing upload: {filename} ({size_mb:.2f}MB) → doc_id={document_id}")

        # 4. Extract + chunk
        if suffix == ".json":
            chunks = load_json_bytes(file_bytes, filename=filename)
        elif is_image_file(filename):
            chunks = await load_image_bytes(file_bytes, filename=filename, extract_tables=True)
        elif suffix == ".pdf" and is_scanned_pdf(file_bytes):
            logger.info(f"Detected scanned PDF: {filename}, switching to OCR pipeline")
            chunks = await load_scanned_pdf(file_bytes, filename=filename, extract_tables=True)
        else:
            chunks = await load_bytes(file_bytes, filename=filename, mime_type=mime_type)

        if not chunks:
            if db_doc is not None:
                db_doc.status = "error"
                db.commit()
            return UploadResult(
                document_id=document_id, filename=filename, chunks_indexed=0, status="failed",
                error="Không trích xuất được nội dung từ file.",
            )

        # 5. Làm sạch
        chunks = clean_chunks(chunks)

        if not chunks:
            if db_doc is not None:
                db_doc.status = "error"
                db.commit()
            return UploadResult(
                document_id=document_id, filename=filename, chunks_indexed=0, status="failed",
                error="Sau khi làm sạch, không còn nội dung hữu ích.",
            )

        # 6. Contextual Headers (tùy chọn)
        if settings.ENABLE_CONTEXTUAL_HEADERS:
            logger.info(f"Enriching chunks with contextual headers: {filename}")
            chunks = await enrich_chunks_with_headers(
                chunks,
                max_chunks=settings.CONTEXTUAL_HEADERS_MAX_CHUNKS,
            )

        # 7. Embed + index vào ChromaDB
        total_indexed = await index_chunks(chunks, document_id=document_id)

        # 8. Cập nhật status → "indexed"
        if db_doc is not None:
            db_doc.status = "indexed"
            db.commit()

        logger.info(f"✅ Upload success: {filename} → {total_indexed} chunks indexed")
        return UploadResult(
            document_id=document_id,
            filename=filename,
            chunks_indexed=total_indexed,
            status="indexed",
        )

    except Exception as e:
        logger.error(f"Upload failed for {filename}: {e}")
        await delete_document(document_id)
        if db_doc is not None:
            db_doc.status = "error"
            db.commit()
        return UploadResult(
            document_id=document_id, filename=filename, chunks_indexed=0, status="failed",
            error=str(e),
        )