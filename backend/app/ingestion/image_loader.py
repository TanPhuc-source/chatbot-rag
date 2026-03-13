"""
Image Loader — Load ảnh thành LoadedChunk cho pipeline RAG.

Flow:
  1. Tiền xử lý ảnh (image_preprocessor)
  2. EasyOCR đọc full text (body text)
  3. Table extractor tìm và đọc bảng
  4. Gộp lại thành chunks: [text chunk] + [table chunks]
"""
from __future__ import annotations

import io
from pathlib import Path

from app.ingestion.loader import LoadedChunk
from app.ingestion.image_preprocessor import preprocess_for_ocr, preprocess_image_file
from app.ingestion.table_extractor import extract_tables_from_image, tables_to_text
from app.utils.logger import logger

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".tiff", ".tif", ".bmp"}


def is_image_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in IMAGE_EXTENSIONS


async def load_image_bytes(
    image_bytes: bytes,
    filename: str,
    extract_tables: bool = True,
) -> list[LoadedChunk]:
    """
    Load ảnh → tiền xử lý → OCR text + extract bảng → list[LoadedChunk].

    Args:
        image_bytes: Raw bytes của file ảnh
        filename: Tên file gốc (để log và metadata)
        extract_tables: Có chạy table extraction không (mặc định True)
    """
    logger.info(f"Image loader: {filename} ({len(image_bytes) // 1024}KB)")
    chunks: list[LoadedChunk] = []

    # ── Bước 1: Tiền xử lý cho OCR ──────────────────────────────────────────
    try:
        ocr_bytes, preprocess_meta = preprocess_image_file(image_bytes)
        logger.debug(f"Preprocessed: {preprocess_meta}")
    except Exception as e:
        logger.warning(f"Preprocess failed for {filename}: {e}, using original")
        ocr_bytes = image_bytes
        preprocess_meta = {}

    # ── Bước 2: OCR toàn bộ ảnh (full-text) ─────────────────────────────────
    full_text = _run_easyocr(ocr_bytes, filename)

    if full_text.strip():
        chunks.append(LoadedChunk(
            content=full_text,
            metadata={
                "mime_type": "image/ocr",
                "source_type": "image_ocr",
                "original_size": str(preprocess_meta.get("original_size", "")),
                "deskew_angle": preprocess_meta.get("deskew_angle", 0),
                "detected_languages": [],
            },
            source_file=filename,
            chunk_index=0,
            total_chunks=1,
        ))
        logger.info(f"OCR full text: {len(full_text)} chars from {filename}")

    # ── Bước 3: Extract bảng ────────────────────────────────────────────────
    if extract_tables:
        try:
            # Dùng ảnh preprocess ở mode "table" — giữ grayscale, không binarize mạnh
            table_bytes = preprocess_for_ocr(image_bytes, mode="table")
            tables = await extract_tables_from_image(table_bytes, filename=filename)

            if tables:
                table_text = tables_to_text(tables)
                chunks.append(LoadedChunk(
                    content=table_text,
                    metadata={
                        "mime_type": "image/table",
                        "source_type": "image_table",
                        "table_count": len(tables),
                        "extraction_methods": list({t.method for t in tables}),
                        "detected_languages": [],
                    },
                    source_file=filename,
                    chunk_index=len(chunks),
                    total_chunks=len(chunks) + 1,
                ))
                logger.info(f"Extracted {len(tables)} table(s) from {filename}")

        except Exception as e:
            logger.warning(f"Table extraction failed for {filename}: {e}")

    # Cập nhật total_chunks
    total = len(chunks)
    for i, c in enumerate(chunks):
        c.chunk_index = i
        c.total_chunks = total

    if not chunks:
        logger.warning(f"No content extracted from image: {filename}")

    return chunks


def _run_easyocr(image_bytes: bytes, filename: str) -> str:
    """Chạy EasyOCR trên ảnh đã preprocess, trả về full text."""
    try:
        import easyocr
        import numpy as np
        from PIL import Image

        img = Image.open(io.BytesIO(image_bytes))
        img_array = np.array(img)

        reader = easyocr.Reader(["vi", "en"], gpu=False, verbose=False)
        results = reader.readtext(img_array, detail=1, paragraph=False)

        # Lấy các kết quả có confidence > 0.3, sắp xếp theo vị trí y rồi x
        filtered = [
            (bbox, text, conf)
            for bbox, text, conf in results
            if conf > 0.3 and text.strip()
        ]

        # Sắp xếp theo dòng (y center) rồi theo x
        filtered.sort(key=lambda r: (
            (r[0][0][1] + r[0][2][1]) / 2,  # cy
            (r[0][0][0] + r[0][2][0]) / 2,  # cx
        ))

        lines = _group_into_lines(filtered)
        text = "\n".join(lines)
        return text

    except ImportError:
        logger.warning("easyocr not installed, cannot extract text from image")
        return ""
    except Exception as e:
        logger.warning(f"EasyOCR failed for {filename}: {e}")
        return ""


def _group_into_lines(ocr_results: list) -> list[str]:
    """
    Gộp các text bbox gần cùng dòng thành 1 dòng chữ.
    Tránh việc mỗi từ trên 1 dòng riêng.
    """
    if not ocr_results:
        return []

    line_groups: list[list[str]] = []
    current_line: list[str] = []
    prev_cy = None

    for bbox, text, conf in ocr_results:
        cy = (bbox[0][1] + bbox[2][1]) / 2
        h = bbox[2][1] - bbox[0][1]
        line_threshold = max(h * 0.7, 8)

        if prev_cy is None or abs(cy - prev_cy) <= line_threshold:
            current_line.append(text)
            prev_cy = cy
        else:
            if current_line:
                line_groups.append(current_line)
            current_line = [text]
            prev_cy = cy

    if current_line:
        line_groups.append(current_line)

    return [" ".join(line) for line in line_groups]