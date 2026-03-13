"""
Scanned PDF Loader — xử lý PDF không có text layer (ảnh scan).

Vấn đề: Kreuzberg/PyMuPDF không extract được text từ PDF scan
vì các trang là ảnh thuần, không có text layer.

Giải pháp:
  1. Phát hiện PDF scan (page.get_text() == "")
  2. Render từng trang thành ảnh PNG ở 300 DPI
  3. Tiền xử lý ảnh (image_preprocessor)
  4. OCR bằng EasyOCR
  5. Extract bảng nếu có (table_extractor)
  6. Trả về list[LoadedChunk] như loader thông thường
"""
from __future__ import annotations

import io
from pathlib import Path

from app.ingestion.loader import LoadedChunk
from app.utils.logger import logger

# Ngưỡng: trang có ít hơn N ký tự → coi là ảnh scan
SCAN_TEXT_THRESHOLD = 50


def is_scanned_pdf(file_bytes: bytes) -> bool:
    """
    Kiểm tra PDF có phải scan không.
    Trả về True nếu TOÀN BỘ các trang đều thiếu text layer.
    """
    try:
        import fitz
        doc = fitz.open(stream=file_bytes, filetype="pdf")
        if len(doc) == 0:
            return False
        scanned_pages = sum(
            1 for page in doc
            if len(page.get_text().strip()) < SCAN_TEXT_THRESHOLD
        )
        ratio = scanned_pages / len(doc)
        logger.debug(f"Scanned page ratio: {scanned_pages}/{len(doc)} = {ratio:.0%}")
        return ratio >= 0.8  # 80% trang trở lên là scan → coi là scanned PDF
    except Exception as e:
        logger.warning(f"Cannot check scanned PDF: {e}")
        return False


async def load_scanned_pdf(
    file_bytes: bytes,
    filename: str,
    dpi: int = 300,
    extract_tables: bool = True,
) -> list[LoadedChunk]:
    """
    Load scanned PDF → render từng trang thành ảnh → OCR + table extract.

    Args:
        file_bytes: Raw PDF bytes
        filename: Tên file gốc
        dpi: Độ phân giải render (300 DPI là chuẩn OCR)
        extract_tables: Có extract bảng không

    Returns:
        list[LoadedChunk] — mỗi trang là 1-2 chunks (text + tables)
    """
    try:
        import fitz
    except ImportError:
        raise ImportError("Cần cài pymupdf: pip install pymupdf")

    logger.info(f"Scanned PDF loader: {filename}")
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    total_pages = len(doc)
    all_chunks: list[LoadedChunk] = []

    for page_num in range(total_pages):
        page = doc[page_num]
        logger.debug(f"Processing page {page_num + 1}/{total_pages}")

        # Render trang → PNG bytes
        page_image_bytes = _render_page_to_png(page, dpi=dpi)

        # Gọi image_loader để OCR + extract bảng
        try:
            from app.ingestion.image_loader import load_image_bytes
            page_filename = f"{Path(filename).stem}_p{page_num + 1}.png"
            page_chunks = await load_image_bytes(
                page_image_bytes,
                filename=page_filename,
                extract_tables=extract_tables,
            )

            # Gắn thêm metadata trang vào từng chunk
            for chunk in page_chunks:
                chunk.first_page = page_num + 1
                chunk.last_page = page_num + 1
                chunk.metadata["pdf_filename"] = filename
                chunk.metadata["pdf_page"] = page_num + 1
                chunk.metadata["pdf_total_pages"] = total_pages

            all_chunks.extend(page_chunks)
            logger.debug(f"Page {page_num + 1}: {len(page_chunks)} chunk(s)")

        except Exception as e:
            logger.error(f"Failed to process page {page_num + 1} of {filename}: {e}")
            continue

    # Cập nhật lại chunk_index và total_chunks sau khi gộp
    total = len(all_chunks)
    for i, chunk in enumerate(all_chunks):
        chunk.chunk_index = i
        chunk.total_chunks = total
        chunk.source_file = filename  # source là file PDF gốc

    logger.info(f"Scanned PDF done: {filename} → {total} chunks từ {total_pages} trang")
    return all_chunks


def _render_page_to_png(page, dpi: int = 300) -> bytes:
    """Render 1 trang PDF thành PNG bytes ở DPI chỉ định."""
    import fitz
    scale = dpi / 72.0  # 72 DPI là mặc định của PDF
    mat = fitz.Matrix(scale, scale)
    pix = page.get_pixmap(matrix=mat, colorspace=fitz.csRGB)
    return pix.tobytes("png")