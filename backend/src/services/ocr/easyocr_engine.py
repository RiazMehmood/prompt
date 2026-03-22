"""EasyOCR fallback engine for pages where Tesseract confidence < 70%.

EasyOCR supports Arabic script and is used as fallback only (slower but more
accurate on difficult/hand-photographed images).

HuggingFace model cache is stored at: /media/riaz/New Volume/zero-cost setup/hf_cache
"""
import os
from typing import Any, Optional

import structlog

from src.services.ocr.tesseract_engine import OCRPageResult

logger = structlog.get_logger(__name__)

# Use the external drive for EasyOCR model cache (same as HuggingFace cache)
_MODEL_CACHE = "/media/riaz/New Volume/zero-cost setup/hf_cache"

# EasyOCR language code mapping
_LANG_MAP = {
    "urdu": ["ar"],      # EasyOCR uses Arabic model for Urdu/Sindhi
    "sindhi": ["ar"],
    "english": ["en"],
    "mixed": ["ar", "en"],
}

_reader_cache: dict = {}


def _get_reader(languages: list) -> Any:
    """Get or create an EasyOCR reader (cached per language combination)."""
    key = ",".join(sorted(languages))
    if key not in _reader_cache:
        try:
            import easyocr
            os.makedirs(_MODEL_CACHE, exist_ok=True)
            _reader_cache[key] = easyocr.Reader(
                languages,
                model_storage_directory=_MODEL_CACHE,
                gpu=False,  # CPU mode for compatibility
            )
            logger.info("easyocr_reader_created", languages=languages)
        except ImportError:
            logger.error("easyocr_not_installed")
            return None
    return _reader_cache.get(key)


class EasyOCREngine:
    """Fallback OCR engine using EasyOCR.

    Invoked only when Tesseract confidence < settings.OCR_CONFIDENCE_THRESHOLD (0.70).
    """

    def extract(
        self,
        image: Any,  # PIL.Image.Image
        language: str = "urdu",
        page_num: int = 0,
    ) -> OCRPageResult:
        """Extract text using EasyOCR.

        Returns OCRPageResult. If EasyOCR is unavailable, returns empty result.
        """
        lang_codes = _LANG_MAP.get(language, ["ar", "en"])
        reader = _get_reader(lang_codes)

        if reader is None:
            return OCRPageResult(
                page_num=page_num, text="", confidence=0.0,
                language=language, engine="easyocr",
            )

        try:
            import numpy as np
            img_array = np.array(image)
            results = reader.readtext(img_array, detail=1, paragraph=True)

            # Concatenate text blocks; average confidence scores
            texts = []
            confidences = []
            for (_bbox, text, conf) in results:
                texts.append(text)
                confidences.append(conf)

            full_text = " ".join(texts)
            avg_conf = sum(confidences) / len(confidences) if confidences else 0.0

            logger.debug(
                "easyocr_page_complete",
                page=page_num,
                confidence=round(avg_conf, 3),
                text_length=len(full_text),
            )
            return OCRPageResult(
                page_num=page_num,
                text=full_text.strip(),
                confidence=avg_conf,
                language=language,
                engine="easyocr",
            )
        except Exception as exc:
            logger.error("easyocr_extraction_failed", page=page_num, error=str(exc))
            return OCRPageResult(
                page_num=page_num, text="", confidence=0.0,
                language=language, engine="easyocr",
            )
