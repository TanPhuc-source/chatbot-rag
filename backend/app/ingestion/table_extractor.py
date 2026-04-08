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

    Pipeline:
      Layer 1 — OCR + line detection (nhanh, offline)
        → chỉ dùng kết quả nếu PASS quality check
      Layer 2 — AI Vision (chính xác hơn, tốn API)
        → fallback khi Layer 1 thất bại hoặc kết quả kém chất lượng

    Returns:
        list[ExtractedTable] — có thể rỗng nếu không tìm thấy bảng
    """
    logger.info(f"Table extraction: {filename}")

    # Layer 1: OCR + line detection
    tables = _extract_with_ocr_lines(image_bytes)

    if tables:
        # Kiểm tra chất lượng trước khi chấp nhận kết quả Layer 1
        if _ocr_tables_pass_quality_check(tables):
            logger.info(f"OCR line method: found {len(tables)} table(s) in {filename}")
            return tables
        else:
            logger.info(
                f"OCR line method found tables but quality check failed "
                f"(likely colored-background table without clear borders) — "
                f"falling back to AI vision for {filename}"
            )

    # Layer 2: AI Vision fallback
    if use_ai_fallback:
        logger.info(f"Trying AI vision for {filename}")
        tables = await _extract_with_ai_vision(image_bytes, filename)

    if not tables:
        logger.info(f"No tables found in {filename}")

    return tables


def _ocr_tables_pass_quality_check(tables: list[ExtractedTable]) -> bool:
    """
    Kiểm tra chất lượng kết quả Layer 1 (OCR line detection).

    Bảng có chất lượng tốt khi:
    1. Mỗi ô chỉ chứa 1 giá trị đơn (không phải nhiều giá trị gộp lại)
    2. Số hàng hợp lý (không quá ít — dấu hiệu merge hàng sai)
    3. Số cột nhất quán giữa các hàng

    Bảng dạng colored-background (không có border line) thường fail vì:
    - OpenCV không detect được cell boundary → text bị gộp theo bbox tự do
    - Các ô header multi-line bị collapse không đúng cách
    """
    if not tables:
        return False

    for table in tables:
        cells = table.raw_cells
        if not cells:
            continue

        max_row = max(c.row for c in cells)
        max_col = max(c.col for c in cells)

        # Check 0: Phải có ít nhất 2 cột — bảng 1 cột thường là bullet list
        # bị OCR nhận sai cấu trúc, tên lớp/mục sẽ bị mất → fallback AI Vision
        if max_col < 1:
            logger.debug("Quality check FAIL: only 1 column detected (likely bullet list misread as table)")
            return False

        # Check 1: Phải có ít nhất 2 hàng (header + 1 data row)
        if max_row < 1:
            logger.debug("Quality check FAIL: only 1 row detected")
            return False

        # Check 2: Tỉ lệ ô có nhiều từ (> 5 từ) không quá cao
        # Ô bình thường: ngày tháng, tên tháng, số thứ tự → ngắn
        # Ô bị gộp sai: "Tháng 01 Tháng 02 Tháng 03" → nhiều từ
        long_cells = [c for c in cells if len(c.text.split()) > 5]
        long_ratio = len(long_cells) / len(cells)
        if long_ratio > 0.25:  # Hơn 25% ô có text dài bất thường
            logger.debug(
                f"Quality check FAIL: {long_ratio:.0%} cells have >5 words "
                f"(likely merged incorrectly)"
            )
            return False

        # Check 3: Số cột mỗi hàng phải tương đối nhất quán
        rows: dict[int, list] = {}
        for c in cells:
            rows.setdefault(c.row, []).append(c)
        col_counts = [len(v) for v in rows.values()]
        if col_counts:
            max_cols = max(col_counts)
            # Số hàng có < 50% số cột so với hàng đầy đủ nhất
            sparse_rows = sum(1 for n in col_counts if n < max_cols * 0.5)
            sparse_ratio = sparse_rows / len(col_counts)
            if sparse_ratio > 0.5:  # Hơn 50% hàng bị thiếu cột
                logger.debug(
                    f"Quality check FAIL: {sparse_ratio:.0%} rows have <50% expected columns"
                )
                return False

    return True


def tables_to_text(tables: list[ExtractedTable]) -> str:
    """
    Gộp tất cả bảng thành text có ngữ nghĩa để index vào ChromaDB.

    Xử lý 2 trường hợp:
    - AI Vision trả về prose trực tiếp (flag __PROSE__): dùng luôn, không parse lại
    - OCR Layer 1 trả về Markdown: convert từng hàng thành câu văn xuôi
      dạng "Tên bảng — Cột A: val; Cột B: val."
    """
    if not tables:
        return ""

    parts = []
    for t in tables:
        table_label = f"Bảng {t.table_index + 1}"

        # Trường hợp AI Vision đã trả về prose sẵn
        if t.markdown.startswith("__PROSE__\n"):
            prose = t.markdown[len("__PROSE__\n"):]
            parts.append(prose.strip())
            continue

        # Trường hợp Markdown table từ OCR Layer 1
        prose = _markdown_table_to_prose(t.markdown, table_label)
        if prose:
            parts.append(prose)
        else:
            # Fallback cuối cùng: giữ nguyên markdown
            parts.append(f"[BẢNG {t.table_index + 1}]\n{t.markdown}")

    return "\n\n".join(parts)


def _markdown_table_to_prose(markdown: str, table_label: str) -> str:
    """
    Parse Markdown table và convert sang văn xuôi có cấu trúc.

    Mỗi hàng dữ liệu → 1 đoạn text:
        "[table_label] Hàng 1 — Cột A: val; Cột B: val; ..."

    Xử lý được:
    - Cột merge (ô rỗng → giữ giá trị cột trước hoặc bỏ qua)
    - Header gồm nhiều dòng (dòng đầu làm tên cột chính)
    - Ô có dấu | đã được escape (\\|)
    """
    import re

    lines = [l.strip() for l in markdown.strip().splitlines() if l.strip()]
    if not lines:
        return ""

    # Tách các hàng pipe
    table_lines = [l for l in lines if l.startswith("|")]
    if len(table_lines) < 2:
        return ""

    def parse_row(line: str) -> list[str]:
        # Bỏ | đầu và cuối, tách theo | (giữ escape \|)
        inner = line.strip("|")
        cells = re.split(r"(?<!\\)\|", inner)
        return [c.replace("\\|", "|").strip() for c in cells]

    # Dòng separator (---) không phải dữ liệu
    def is_separator(line: str) -> bool:
        return bool(re.match(r"^\|[\s\|\-:]+\|$", line))

    # Lấy header (dòng đầu tiên không phải separator)
    header_cells: list[str] = []
    data_rows: list[list[str]] = []

    found_header = False
    # Tính số cột kỳ vọng = max số cell trong 1 hàng
    all_parsed = [parse_row(l) for l in table_lines if not is_separator(l)]
    if not all_parsed:
        return ""
    expected_col_count = max(len(r) for r in all_parsed)

    for line in table_lines:
        if is_separator(line):
            continue
        cells = parse_row(line)
        while cells and not cells[-1]:
            cells.pop()
        if not cells:
            continue
        if not found_header:
            header_cells = cells
            found_header = True
        else:
            # Nếu hàng này có ít cột hơn kỳ vọng VÀ header chưa đủ cột
            # → có thể là phần còn lại của multi-line header → gộp vào header
            if len(header_cells) < expected_col_count and len(cells) <= len(header_cells):
                # Gộp text vào ô header tương ứng theo vị trí
                for col_idx, cell_text in enumerate(cells):
                    if col_idx < len(header_cells):
                        if cell_text and header_cells[col_idx]:
                            header_cells[col_idx] += " " + cell_text
                        elif cell_text:
                            header_cells[col_idx] = cell_text
                continue
            data_rows.append(cells)

    if not header_cells or not data_rows:
        return ""

    # Làm sạch tên cột: bỏ ô rỗng ở header (merged header)
    # Nếu header có ô rỗng, dùng tên cột trước đó
    clean_headers: list[str] = []
    last_header = ""
    for h in header_cells:
        if h:
            last_header = h
        clean_headers.append(last_header if last_header else f"Cột {len(clean_headers)+1}")

    # Build prose cho từng hàng dữ liệu
    row_texts: list[str] = []
    for row_idx, row in enumerate(data_rows):
        # Bỏ hàng toàn rỗng
        if not any(c for c in row):
            continue

        pairs: list[str] = []
        for col_idx, header in enumerate(clean_headers):
            val = row[col_idx].strip() if col_idx < len(row) else ""
            if val and val != "-" and val != "—":
                pairs.append(f"{header}: {val}")

        if pairs:
            row_text = f"{table_label} — " + "; ".join(pairs) + "."
            row_texts.append(row_text)

    return "\n".join(row_texts)


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
        # Sau đó merge các hàng liền kề có cùng vị trí x (multi-line header cells)
        sorted_row_groups: list[list[dict]] = []
        for group in row_groups:
            group.sort(key=lambda i: i["cx"])
            sorted_row_groups.append(group)

        # Gộp các "hàng" mà thực ra là text wrap trong cùng 1 ô header
        # Nhận biết: 2 hàng liền nhau có số lượng item ít (< avg_cols/2)
        # và cx của chúng overlap với hàng kề → cùng 1 ô
        merged_row_groups = _merge_multiline_header_rows(sorted_row_groups)

        cells: list[TableCell] = []
        for row_idx, group in enumerate(merged_row_groups):
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


def _merge_multiline_header_rows(row_groups: list[list[dict]]) -> list[list[dict]]:
    """
    Gộp các hàng liền kề mà thực ra là text wrap trong cùng 1 ô (multi-line cell).

    Vấn đề: EasyOCR phát hiện "ĐÁNH GIÁ", "NĂNG LỰC", "NGOẠI NGỮ" thành 3 bbox
    riêng biệt → 3 hàng → header bị vỡ, col mapping sai.

    Giải pháp: Nếu hàng kề nhau có số item bằng nhau VÀ các item có cx gần nhau
    (overlap theo chiều x) → gộp text của chúng lại vào hàng trước.

    Áp dụng cho toàn bộ bảng (không chỉ header) để handle merged cells.
    """
    if not row_groups:
        return row_groups

    # Đếm số cột kỳ vọng = max số item trong 1 hàng
    expected_cols = max(len(g) for g in row_groups)

    merged: list[list[dict]] = []
    i = 0
    while i < len(row_groups):
        current = row_groups[i]
        # Thử gộp với hàng tiếp theo nếu cả 2 đều có số item <= expected_cols
        # và các cx của chúng match nhau (cùng cột)
        while i + 1 < len(row_groups):
            nxt = row_groups[i + 1]
            # Chỉ gộp nếu cả 2 hàng đều ít hơn expected_cols
            # (hàng đầy đủ cột = hàng data, không cần gộp)
            if len(current) > expected_cols * 0.6 and len(nxt) > expected_cols * 0.6:
                break
            # Kiểm tra cx overlap: với mỗi item trong nxt, tìm item gần nhất trong current
            if not _rows_have_matching_cols(current, nxt, expected_cols):
                break
            # Gộp: nối text của nxt vào current theo cột gần nhất
            current = _merge_two_rows(current, nxt)
            i += 1
        merged.append(current)
        i += 1

    return merged


def _rows_have_matching_cols(row_a: list[dict], row_b: list[dict], expected_cols: int) -> bool:
    """Kiểm tra xem 2 hàng có cùng layout cột không (cx gần nhau)."""
    if not row_a or not row_b:
        return False
    # Lấy tập cx của cả 2 hàng
    xs_a = [item["cx"] for item in row_a]
    xs_b = [item["cx"] for item in row_b]
    # Ước tính độ rộng trung bình 1 cột
    if len(xs_a) < 2 and len(xs_b) < 2:
        return True
    all_xs = xs_a + xs_b
    col_width_estimate = (max(all_xs) - min(all_xs)) / max(expected_cols - 1, 1)
    tolerance = max(col_width_estimate * 0.5, 30)
    # Mỗi item trong row_b phải có item match trong row_a (hoặc ngược lại)
    matches = 0
    for xb in xs_b:
        if any(abs(xb - xa) <= tolerance for xa in xs_a):
            matches += 1
    return matches >= min(len(xs_b), len(xs_a)) * 0.5


def _merge_two_rows(base: list[dict], extra: list[dict]) -> list[dict]:
    """Nối text của extra vào base theo cột gần nhất."""
    result = [dict(item) for item in base]  # shallow copy
    xs_base = [item["cx"] for item in result]

    for ex_item in extra:
        # Tìm item trong base có cx gần nhất
        if not xs_base:
            result.append(dict(ex_item))
            continue
        closest_idx = min(range(len(xs_base)), key=lambda i: abs(xs_base[i] - ex_item["cx"]))
        # Nối text, mở rộng bbox
        result[closest_idx]["text"] += " " + ex_item["text"]
        result[closest_idx]["y2"] = max(result[closest_idx]["y2"], ex_item["y2"])

    return result


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

    prompt = """Phân tích ảnh này. Trích xuất TẤT CẢ thông tin có cấu trúc — bao gồm cả bảng có đường kẻ, danh sách có đầu mục (bullet list), danh sách học phí, danh sách mục tiêu, v.v.

ĐỊNH DẠNG OUTPUT (bắt buộc):
Với mỗi mục dữ liệu, viết 1 dòng theo cú pháp:
[Tiêu đề hoặc chủ đề chung] — Tên mục: giá trị; Thuộc tính khác: giá trị.

QUY TẮC:
- Với danh sách học phí/bullet list: mỗi dòng là 1 mục. Ví dụ "Học phí Tin học cơ bản: 1.680.000" → "[Tên phần] — Lớp: Tin học cơ bản; Học phí: 1.680.000."
- KHÔNG được bỏ sót tên lớp / tên mục — đây là thông tin quan trọng nhất
- Với bảng có merged cells: gộp header thành 1 tên cột duy nhất
- Ô trống → bỏ qua cặp đó
- Trích xuất CẢ văn bản thường (ghi chú, hướng dẫn bên dưới bảng) vào cuối output, mỗi câu 1 dòng

VÍ DỤ 1 — Bảng lịch thi:
Kế hoạch thi năm 2026 — KỲ THI: Tháng 01; ĐÁNH GIÁ NĂNG LỰC NGOẠI NGỮ: 17/01/2026; VSTEP: 24,25/01/2026.
Kế hoạch thi năm 2026 — KỲ THI: Tháng 02; ĐÁNH GIÁ NĂNG LỰC NGOẠI NGỮ: 07/02/2026; VSTEP: 28/02/2026.

VÍ DỤ 2 — Danh sách học phí (bullet list):
Học phí các lớp — Lớp: Tin học cơ bản; Học phí: 1.680.000.
Học phí các lớp — Lớp: Ôn Tin học cơ bản; Học phí: 1.120.000.
Học phí các lớp — Lớp: Ngoại ngữ 1; Học phí: 1.440.000.
Học phí các lớp — Lớp: Ngoại ngữ 2; Học phí: 1.440.000.
Học phí các lớp — Lớp: Ngoại ngữ 3; Học phí: 1.920.000.

Nếu ảnh hoàn toàn không có thông tin có cấu trúc: KHÔNG_CÓ_BẢNG
Chỉ trả về các dòng dữ liệu theo định dạng trên, không giải thích thêm."""

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

    Với prompt mới, AI trả về các dòng prose dạng:
        "Tên bảng — Cột A: val; Cột B: val."
    thay vì Markdown table. Hàm này nhận diện cả 2 format.
    """
    if not response_text or "KHÔNG_CÓ_BẢNG" in response_text:
        return []

    import re

    # ── Format mới: prose với dấu " — " (ưu tiên) ──────────────────────────
    # Nhận ra khi có ít nhất 1 dòng chứa pattern "tên — key: val; key: val."
    prose_lines = [
        l.strip() for l in response_text.splitlines()
        if " — " in l and ":" in l and l.strip()
    ]

    if prose_lines:
        # Gộp tất cả dòng prose thành 1 bảng duy nhất (đã là văn xuôi sẵn)
        prose_text = "\n".join(prose_lines)
        return [ExtractedTable(
            table_index=0,
            method="ai_vision",
            # Lưu vào markdown field nhưng đánh dấu đây là prose
            markdown=f"__PROSE__\n{prose_text}",
            confidence=0.95,
        )]

    # ── Format cũ fallback: Markdown table ──────────────────────────────────
    sections = re.split(r'\[BẢNG\s*\d+\]', response_text)
    sections = [s.strip() for s in sections if s.strip()]

    tables: list[ExtractedTable] = []
    for idx, section in enumerate(sections):
        lines = [l for l in section.split("\n") if l.strip().startswith("|")]
        if lines:
            tables.append(ExtractedTable(
                table_index=idx,
                method="ai_vision",
                markdown="\n".join(lines),
                confidence=0.85,
            ))
        elif "|" in section:
            tables.append(ExtractedTable(
                table_index=idx,
                method="ai_vision",
                markdown=section,
                confidence=0.6,
            ))

    if not tables and "|" in response_text:
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