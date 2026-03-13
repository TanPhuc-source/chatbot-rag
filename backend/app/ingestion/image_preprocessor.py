"""
Image Preprocessor — Tiền xử lý ảnh trước khi OCR / AI table extraction.

Pipeline:
  1. Convert sang grayscale
  2. Deskew (xoay thẳng) — phát hiện góc lệch bằng Hough Transform
  3. Tăng tương phản (CLAHE)
  4. Denoise (Non-local Means)
  5. Adaptive threshold (chuẩn hóa về ảnh đen-trắng rõ nét)
  6. Resize nếu DPI thấp (đảm bảo tối thiểu 300 DPI tương đương)

Thư viện: OpenCV (cv2), NumPy — nhẹ, không cần GPU.
"""
from __future__ import annotations

import io
import math
from typing import Literal

import cv2
import numpy as np
from PIL import Image

from app.utils.logger import logger

# ── Constants ──────────────────────────────────────────────────────────────
MIN_OCR_WIDTH = 1500        # px — resize nếu ảnh nhỏ hơn
MAX_OCR_WIDTH = 4000        # px — thu nhỏ nếu ảnh quá to
CLAHE_CLIP_LIMIT = 2.5
CLAHE_TILE_GRID = (8, 8)
DESKEW_ANGLE_THRESHOLD = 0.5   # bỏ qua nếu góc lệch nhỏ hơn 0.5°
DESKEW_MAX_ANGLE = 30.0         # chỉ xoay nếu góc hợp lý (tránh lật ảnh)


# ── Public API ──────────────────────────────────────────────────────────────

def preprocess_for_ocr(image_bytes: bytes, mode: Literal["ocr", "table"] = "ocr") -> bytes:
    """
    Tiền xử lý ảnh từ bytes → trả về PNG bytes đã được chuẩn hóa.

    Args:
        image_bytes: Raw bytes của ảnh gốc (JPEG, PNG, TIFF, WEBP...)
        mode: "ocr" → binarize mạnh hơn | "table" → giữ grayscale để AI thấy đường kẻ
    """
    img = _bytes_to_cv2(image_bytes)

    # 1. Resize để đảm bảo đủ độ phân giải
    img = _resize_for_ocr(img)

    # 2. Convert grayscale
    gray = _to_grayscale(img)

    # 3. Deskew — xoay thẳng
    gray = _deskew(gray)

    # 4. Tăng tương phản (CLAHE)
    gray = _enhance_contrast(gray)

    # 5. Denoise
    gray = _denoise(gray)

    if mode == "ocr":
        # 6a. Binarize → đen trắng rõ nét cho Tesseract/EasyOCR
        gray = _binarize(gray)
    # mode="table" → giữ grayscale để AI thấy đường kẻ bảng

    return _cv2_to_bytes(gray)


def preprocess_image_file(image_bytes: bytes) -> tuple[bytes, dict]:
    """
    Tiền xử lý và trả về cả metadata (kích thước trước/sau, góc xoay...).
    Dùng cho logging và debug.
    """
    img_orig = _bytes_to_cv2(image_bytes)
    h_orig, w_orig = img_orig.shape[:2]

    img = _resize_for_ocr(img_orig)
    gray = _to_grayscale(img)
    gray, angle = _deskew(gray, return_angle=True)
    gray = _enhance_contrast(gray)
    gray = _denoise(gray)
    gray = _binarize(gray)

    h_new, w_new = gray.shape[:2]
    result_bytes = _cv2_to_bytes(gray)

    meta = {
        "original_size": (w_orig, h_orig),
        "processed_size": (w_new, h_new),
        "deskew_angle": round(angle, 2),
        "output_bytes": len(result_bytes),
    }

    logger.debug(f"Image preprocessed: {w_orig}x{h_orig} → {w_new}x{h_new}, angle={angle:.2f}°")
    return result_bytes, meta


# ── Internal helpers ────────────────────────────────────────────────────────

def _bytes_to_cv2(image_bytes: bytes) -> np.ndarray:
    """Bytes → OpenCV ndarray (BGR)."""
    pil_img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img = np.array(pil_img)
    return cv2.cvtColor(img, cv2.COLOR_RGB2BGR)


def _cv2_to_bytes(img: np.ndarray, fmt: str = ".png") -> bytes:
    """OpenCV ndarray → PNG bytes."""
    success, buf = cv2.imencode(fmt, img)
    if not success:
        raise RuntimeError("Không thể encode ảnh thành PNG")
    return buf.tobytes()


def _to_grayscale(img: np.ndarray) -> np.ndarray:
    if len(img.shape) == 2:
        return img
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def _resize_for_ocr(img: np.ndarray) -> np.ndarray:
    h, w = img.shape[:2]
    if w < MIN_OCR_WIDTH:
        scale = MIN_OCR_WIDTH / w
        new_w = int(w * scale)
        new_h = int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_CUBIC)
        logger.debug(f"Upscale: {w}x{h} → {new_w}x{new_h}")
    elif w > MAX_OCR_WIDTH:
        scale = MAX_OCR_WIDTH / w
        new_w = int(w * scale)
        new_h = int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        logger.debug(f"Downscale: {w}x{h} → {new_w}x{new_h}")
    return img


def _deskew(gray: np.ndarray, return_angle: bool = False):
    """
    Phát hiện góc lệch bằng Hough Transform và xoay thẳng.
    Nếu không phát hiện được góc rõ ràng → giữ nguyên.
    """
    # Edge detection
    edges = cv2.Canny(gray, 50, 150, apertureSize=3)

    # Hough transform
    lines = cv2.HoughLinesP(edges, 1, np.pi / 180, threshold=100,
                             minLineLength=100, maxLineGap=10)

    angle = 0.0
    if lines is not None and len(lines) > 0:
        angles = []
        for line in lines:
            x1, y1, x2, y2 = line[0]
            if x2 - x1 != 0:
                a = math.degrees(math.atan2(y2 - y1, x2 - x1))
                # Chỉ lấy góc gần ngang (±45°)
                if abs(a) < 45:
                    angles.append(a)

        if angles:
            angle = float(np.median(angles))

    # Chỉ xoay nếu góc đủ lớn và hợp lý
    if DESKEW_ANGLE_THRESHOLD < abs(angle) < DESKEW_MAX_ANGLE:
        h, w = gray.shape[:2]
        center = (w // 2, h // 2)
        M = cv2.getRotationMatrix2D(center, angle, 1.0)
        gray = cv2.warpAffine(
            gray, M, (w, h),
            flags=cv2.INTER_CUBIC,
            borderMode=cv2.BORDER_REPLICATE,
        )
        logger.debug(f"Deskewed: {angle:.2f}°")

    if return_angle:
        return gray, angle
    return gray


def _enhance_contrast(gray: np.ndarray) -> np.ndarray:
    """CLAHE — cải thiện tương phản cục bộ, không bị overexpose."""
    clahe = cv2.createCLAHE(
        clipLimit=CLAHE_CLIP_LIMIT,
        tileGridSize=CLAHE_TILE_GRID,
    )
    return clahe.apply(gray)


def _denoise(gray: np.ndarray) -> np.ndarray:
    """Non-local Means Denoising — xử lý nhiễu mà không mờ chữ."""
    return cv2.fastNlMeansDenoising(gray, h=10, templateWindowSize=7, searchWindowSize=21)


def _binarize(gray: np.ndarray) -> np.ndarray:
    """
    Adaptive threshold — binarize thông minh theo từng vùng.
    Tốt hơn global threshold khi ánh sáng không đều.
    """
    binary = cv2.adaptiveThreshold(
        gray, 255,
        cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
        cv2.THRESH_BINARY,
        blockSize=31,
        C=10,
    )
    return binary