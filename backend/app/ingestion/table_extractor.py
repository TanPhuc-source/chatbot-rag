"""
Table Extractor — Phát hiện và trích xuất bảng từ ảnh.

Pipeline 2 lớp:
  Layer 1 — EasyOCR + OpenCV:
    • Phát hiện đường kẻ bảng (line detection)
    • Extract text theo vị trí để xây dựng cấu trúc hàng/cột
    • Nhanh, chạy offline, không tốn API

  Layer 2 — AI Vision (Groq / Anthropic fallback):
    • Dùng khi Layer 1 thất bại (ảnh không có đường kẻ rõ, bảng phức tạp)
    • Gửi ảnh đã preprocess lên LLM multimodal
    • AI tự nhận biết cấu trúc bảng và trả về Markdown

Output: list[ExtractedTable] → mỗi bảng là text Markdown + metadata vị trí
"""
from __future__ import annotations

import asyncio
import base64
import io
import json
from dataclasses import dataclass, field

import cv2
import numpy as np
from PIL import Image

from app.utils.logger import logger


# ── Data classes ────────────────────────────────────────────────────────────

@dataclass
class TableCell:
    row: int
    col: int
    text: str
    bbox: tuple[int, int, int, int]  # x1, y1, x2, y2


@dataclass
class ExtractedTable:
    table_index: int
    method: str                       # "ocr_lines" | "ai_vision"
    markdown: str                     # bảng dạng Markdown
    raw_cells: list[TableCell] = field(default_factory=list)
    bbox: tuple[int, int, int, int] | None = None  # vùng bảng trong ảnh gốc
    confidence: float = 0.0


# ── Public API ───────────────────────────────────────────────────────────────

async def extract_tables_from_image(
    image_bytes: bytes,
    filename: str = "image",
    use_ai_fallback: bool = True,
) -> list[ExtractedTable]:
    """
    Extract tất cả bảng từ 1 ảnh.

    Returns:
        list[ExtractedTable] — có thể rỗng nếu không tìm thấy bảng
    """
    logger.info(f"Table extraction: {filename}")

    # Layer 1: OCR + line detection
    tables = _extract_with_ocr_lines(image_bytes)

    if tables:
        logger.info(f"OCR line method: found {len(tables)} table(s) in {filename}")
        return tables

    # Layer 2: AI Vision fallback
    if use_ai_fallback:
        logger.info(f"OCR line method failed, trying AI vision for {filename}")
        tables = await _extract_with_ai_vision(image_bytes, filename)

    if not tables:
        logger.info(f"No tables found in {filename}")

    return tables


def tables_to_text(tables: list[ExtractedTable]) -> str:
    """
    Gộp tất cả bảng thành text phẳng để index vào ChromaDB.
    Mỗi bảng được bọc trong header để RAG dễ nhận biết.
    """
    if not tables:
        return ""

    parts = []
    for t in tables:
        header = f"[BẢNG {t.table_index + 1}]"
        parts.append(f"{header}\n{t.markdown}")

    return "\n\n".join(parts)


# ── Layer 1: OCR + OpenCV line detection ────────────────────────────────────

def _extract_with_ocr_lines(image_bytes: bytes) -> list[ExtractedTable]:
    """
    Dùng OpenCV để phát hiện đường kẻ bảng, sau đó dùng EasyOCR để đọc từng ô.
    Phù hợp với bảng có border rõ ràng.
    """
    try:
        img = _bytes_to_cv2(image_bytes)
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY) if len(img.shape) == 3 else img

        # Tìm các vùng bảng
        table_regions = _detect_table_regions(gray)
        if not table_regions:
            return []

        # Extract text từng vùng bảng bằng EasyOCR
        tables: list[ExtractedTable] = []
        for idx, (x1, y1, x2, y2) in enumerate(table_regions):
            region = img[y1:y2, x1:x2]
            cells = _extract_cells_from_region(region, offset=(x1, y1))
            if cells:
                markdown = _cells_to_markdown(cells)
                tables.append(ExtractedTable(
                    table_index=idx,
                    method="ocr_lines",
                    markdown=markdown,
                    raw_cells=cells,
                    bbox=(x1, y1, x2, y2),
                    confidence=0.8,
                ))

        return tables

    except Exception as e:
        logger.warning(f"OCR line extraction failed: {e}")
        return []


def _detect_table_regions(gray: np.ndarray) -> list[tuple[int, int, int, int]]:
    """
    Phát hiện vùng bảng dựa trên đường kẻ ngang/dọc.
    Trả về list (x1, y1, x2, y2) của các vùng bảng tìm được.
    """
    # Threshold → binary
    _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)

    h, w = gray.shape[:2]

    # Phát hiện đường ngang
    horizontal_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (max(20, w // 40), 1))
    horizontal_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, horizontal_kernel)

    # Phát hiện đường dọc
    vertical_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (1, max(20, h // 40)))
    vertical_lines = cv2.morphologyEx(binary, cv2.MORPH_OPEN, vertical_kernel)

    # Gộp đường ngang + dọc
    table_mask = cv2.add(horizontal_lines, vertical_lines)

    # Dilate để nối các đường gần nhau
    dilate_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (10, 10))
    table_mask = cv2.dilate(table_mask, dilate_kernel, iterations=2)

    # Tìm contours — mỗi contour là 1 vùng bảng
    contours, _ = cv2.findContours(table_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    regions = []
    min_area = (h * w) * 0.01  # ít nhất 1% diện tích ảnh

    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area < min_area:
            continue
        rx, ry, rw, rh = cv2.boundingRect(cnt)
        # Đảm bảo vùng có tỉ lệ hợp lý (không quá hẹp/cao)
        if rw > 50 and rh > 30:
            padding = 10
            x1 = max(0, rx - padding)
            y1 = max(0, ry - padding)
            x2 = min(w, rx + rw + padding)
            y2 = min(h, ry + rh + padding)
            regions.append((x1, y1, x2, y2))

    return regions


def _extract_cells_from_region(region: np.ndarray, offset: tuple[int, int] = (0, 0)) -> list[TableCell]:
    """
    Dùng EasyOCR để đọc text trong vùng bảng, sau đó phân loại theo hàng/cột.
    """
    try:
        import easyocr
    except ImportError:
        logger.warning("easyocr not installed, skipping cell extraction")
        return []

    try:
        reader = easyocr.Reader(["vi", "en"], gpu=False, verbose=False)
        results = reader.readtext(region)

        if not results:
            return []

        # results: list of ([bbox_points], text, confidence)
        raw_items = []
        for bbox_points, text, conf in results:
            if conf < 0.3 or not text.strip():
                continue
            # bbox_points: [[x1,y1],[x2,y1],[x2,y2],[x1,y2]]
            pts = np.array(bbox_points)
            x1, y1 = int(pts[:, 0].min()), int(pts[:, 1].min())
            x2, y2 = int(pts[:, 0].max()), int(pts[:, 1].max())
            raw_items.append({
                "text": text.strip(),
                "cx": (x1 + x2) // 2,
                "cy": (y1 + y2) // 2,
                "x1": x1 + offset[0],
                "y1": y1 + offset[1],
                "x2": x2 + offset[0],
                "y2": y2 + offset[1],
                "h": y2 - y1,
            })

        if not raw_items:
            return []

        # Phân loại hàng theo vị trí y (cluster theo khoảng cách)
        avg_h = np.mean([item["h"] for item in raw_items])
        row_threshold = avg_h * 0.7

        raw_items.sort(key=lambda i: i["cy"])
        row_groups: list[list[dict]] = []
        current_group = [raw_items[0]]

        for item in raw_items[1:]:
            if abs(item["cy"] - current_group[-1]["cy"]) <= row_threshold:
                current_group.append(item)
            else:
                row_groups.append(current_group)
                current_group = [item]
        row_groups.append(current_group)

        # Sắp xếp từng hàng theo x
        cells: list[TableCell] = []
        for row_idx, group in enumerate(row_groups):
            group.sort(key=lambda i: i["cx"])
            for col_idx, item in enumerate(group):
                cells.append(TableCell(
                    row=row_idx,
                    col=col_idx,
                    text=item["text"],
                    bbox=(item["x1"], item["y1"], item["x2"], item["y2"]),
                ))

        return cells

    except Exception as e:
        logger.warning(f"EasyOCR cell extraction error: {e}")
        return []


def _cells_to_markdown(cells: list[TableCell]) -> str:
    """Chuyển list TableCell thành bảng Markdown."""
    if not cells:
        return ""

    max_row = max(c.row for c in cells)
    max_col = max(c.col for c in cells)

    # Khởi tạo grid
    grid: list[list[str]] = [[""] * (max_col + 1) for _ in range(max_row + 1)]
    for cell in cells:
        grid[cell.row][cell.col] = cell.text

    lines = []
    for r, row in enumerate(grid):
        line = "| " + " | ".join(cell.replace("|", "\\|") for cell in row) + " |"
        lines.append(line)
        if r == 0:
            # Header separator
            sep = "| " + " | ".join("---" for _ in row) + " |"
            lines.append(sep)

    return "\n".join(lines)


# ── Layer 2: AI Vision fallback ──────────────────────────────────────────────

async def _extract_with_ai_vision(image_bytes: bytes, filename: str) -> list[ExtractedTable]:
    """
    Gửi ảnh đến AI Vision để nhận biết bảng.
    Thử Groq trước (vision model), fallback sang Anthropic nếu có.
    """
    # Nén ảnh xuống để tiết kiệm token
    compressed = _compress_for_vision(image_bytes)
    b64 = base64.standard_b64encode(compressed).decode()

    prompt = """Hãy phân tích ảnh này và trích xuất TẤT CẢ các bảng bạn thấy.

Với mỗi bảng:
1. Xác định tiêu đề cột (hàng đầu tiên)
2. Đọc dữ liệu từng hàng
3. Trả về dưới dạng Markdown table

Nếu có nhiều bảng, đánh số: [BẢNG 1], [BẢNG 2]...
Nếu không có bảng nào, trả về: KHÔNG_CÓ_BẢNG

Chỉ trả về nội dung bảng, không cần giải thích thêm."""

    # Thử Groq vision
    result = await _try_groq_vision(b64, prompt)
    if result:
        return _parse_ai_table_response(result)

    # Thử Anthropic
    result = await _try_anthropic_vision(b64, prompt)
    if result:
        return _parse_ai_table_response(result)

    return []


async def _try_groq_vision(b64_image: str, prompt: str) -> str | None:
    """Gọi Groq vision model (llama-4 Scout / llava)."""
    try:
        from app.config import get_settings
        from groq import AsyncGroq

        settings = get_settings()
        if not settings.GROQ_API_KEY:
            return None

        client = AsyncGroq(api_key=settings.GROQ_API_KEY)

        # Dùng model có vision support
        vision_model = getattr(settings, "GROQ_VISION_MODEL", "meta-llama/llama-4-scout-17b-16e-instruct")

        response = await client.chat.completions.create(
            model=vision_model,
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64_image}"},
                    },
                    {"type": "text", "text": prompt},
                ],
            }],
        )
        return response.choices[0].message.content

    except Exception as e:
        logger.warning(f"Groq vision failed: {e}")
        return None


async def _try_anthropic_vision(b64_image: str, prompt: str) -> str | None:
    """Gọi Anthropic Claude Vision (claude-3-haiku — rẻ nhất)."""
    try:
        import anthropic
        from app.config import get_settings

        settings = get_settings()
        api_key = getattr(settings, "ANTHROPIC_API_KEY", None)
        if not api_key:
            return None

        client = anthropic.AsyncAnthropic(api_key=api_key)
        message = await client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=2000,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": "image/png",
                            "data": b64_image,
                        },
                    },
                    {"type": "text", "text": prompt},
                ],
            }],
        )
        return message.content[0].text

    except Exception as e:
        logger.warning(f"Anthropic vision failed: {e}")
        return None


def _parse_ai_table_response(response_text: str) -> list[ExtractedTable]:
    """
    Parse response từ AI thành list[ExtractedTable].
    AI trả về 1 hoặc nhiều bảng Markdown.
    """
    if not response_text or "KHÔNG_CÓ_BẢNG" in response_text:
        return []

    # Tách bảng bằng header [BẢNG N] hoặc lấy toàn bộ
    import re
    sections = re.split(r'\[BẢNG\s*\d+\]', response_text)
    sections = [s.strip() for s in sections if s.strip()]

    tables: list[ExtractedTable] = []
    for idx, section in enumerate(sections):
        # Tìm block Markdown table trong section
        lines = [l for l in section.split("\n") if l.strip().startswith("|")]
        if lines:
            markdown = "\n".join(lines)
            tables.append(ExtractedTable(
                table_index=idx,
                method="ai_vision",
                markdown=markdown,
                confidence=0.85,
            ))
        elif "|" in section:
            # Đôi khi AI không format chuẩn, giữ nguyên
            tables.append(ExtractedTable(
                table_index=idx,
                method="ai_vision",
                markdown=section,
                confidence=0.6,
            ))

    if not tables and "|" in response_text:
        # Fallback: lấy toàn bộ response nếu có pipe character
        tables.append(ExtractedTable(
            table_index=0,
            method="ai_vision",
            markdown=response_text.strip(),
            confidence=0.6,
        ))

    return tables


# ── Helpers ─────────────────────────────────────────────────────────────────

def _bytes_to_cv2(image_bytes: bytes) -> np.ndarray:
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = np.array(pil_img)
    return cv2.cvtColor(img, cv2.COLOR_RGB2BGR)


def _compress_for_vision(image_bytes: bytes, max_width: int = 1600) -> bytes:
    """Thu nhỏ ảnh trước khi gửi lên AI để tiết kiệm token."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    w, h = img.size
    if w > max_width:
        ratio = max_width / w
        img = img.resize((max_width, int(h * ratio)), Image.LANCZOS)
    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()