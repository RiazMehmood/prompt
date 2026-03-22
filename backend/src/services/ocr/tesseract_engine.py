"""Tesseract OCR engine wrapper for Urdu and Sindhi text extraction.

Language packs required:
  sudo apt-get install tesseract-ocr tesseract-ocr-urd tesseract-ocr-snd tesseract-ocr-eng
"""
import os
from dataclasses import dataclass
from typing import Any, Dict, Optional

import structlog

from src.config import settings

logger = structlog.get_logger(__name__)

# Script to Tesseract language code mapping
_SCRIPT_TO_LANG = {
    "urdu": "urd",
    "sindhi": "snd",
    "english": "eng",
    "mixed": "urd+snd+eng",
}


@dataclass
class OCRPageResult:
    page_num: int
    text: str
    confidence: float  # 0.0–1.0
    language: str
    engine: str  # 'tesseract' | 'easyocr'
    is_image_page: bool = True


class TesseractEngine:
    """Primary OCR engine using Tesseract 4.x LSTM.

    Configured for Arabic-script languages (Urdu, Sindhi) with RTL support.
    """

    def __init__(self) -> None:
        import pytesseract
        pytesseract.pytesseract.tesseract_cmd = settings.TESSERACT_CMD
        self._pytesseract = pytesseract
        self._lang_path = settings.TESSERACT_LANG_PATH
        self._verified = self._verify_installation()

    def _verify_installation(self) -> bool:
        try:
            version = self._pytesseract.get_tesseract_version()
            logger.info("tesseract_available", version=str(version))
            return True
        except Exception as exc:
            logger.error("tesseract_not_available", error=str(exc))
            return False

    def extract(
        self,
        image: Any,  # PIL.Image.Image
        language: str = "urdu",
        page_num: int = 0,
    ) -> OCRPageResult:
        """Extract text from a PIL Image using Tesseract.

        Args:
            image: PIL Image (from pdf2image or camera photo)
            language: 'urdu', 'sindhi', 'english', or 'mixed'
            page_num: Page number (for metadata)

        Returns:
            OCRPageResult with text and confidence score
        """
        if not self._verified:
            return OCRPageResult(
                page_num=page_num,
                text="",
                confidence=0.0,
                language=language,
                engine="tesseract",
            )

        lang_code = _SCRIPT_TO_LANG.get(language, "urd+eng")
        config = (
            f"--oem 1 "  # LSTM only
            f"--psm 3 "  # Fully automatic page segmentation
        )
        if self._lang_path:
            config += f"--tessdata-dir {self._lang_path}"

        try:
            # Get both text and confidence data
            data = self._pytesseract.image_to_data(
                image,
                lang=lang_code,
                config=config,
                output_type=self._pytesseract.Output.DICT,
            )
            text = self._pytesseract.image_to_string(
                image, lang=lang_code, config=config
            )

            # Calculate average confidence from word-level scores
            confidences = [
                c for c in data["conf"]
                if isinstance(c, (int, float)) and c >= 0
            ]
            avg_confidence = (
                sum(confidences) / (len(confidences) * 100)  # normalize to 0.0–1.0
                if confidences else 0.0
            )

            logger.debug(
                "tesseract_page_complete",
                page=page_num,
                confidence=round(avg_confidence, 3),
                text_length=len(text),
            )
            return OCRPageResult(
                page_num=page_num,
                text=text.strip(),
                confidence=min(1.0, avg_confidence),
                language=language,
                engine="tesseract",
            )
        except Exception as exc:
            logger.error("tesseract_extraction_failed", page=page_num, error=str(exc))
            return OCRPageResult(
                page_num=page_num,
                text="",
                confidence=0.0,
                language=language,
                engine="tesseract",
            )
