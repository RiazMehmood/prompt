"""OCROrchestrator: detect image pages → classify script → run Tesseract → EasyOCR fallback."""
from typing import Any, Dict, List, Tuple

import structlog

from src.config import settings
from src.services.language.detection import detect_language
from src.services.ocr.confidence_evaluator import ConfidenceEvaluator
from src.services.ocr.easyocr_engine import EasyOCREngine
from src.services.ocr.rtl_preprocessor import RTLPreprocessor
from src.services.ocr.tesseract_engine import OCRPageResult, TesseractEngine

logger = structlog.get_logger(__name__)

_MIN_TEXT_CHARS = 50  # Pages with fewer extractable chars are treated as image pages


class OCROrchestrator:
    """Orchestrate multi-engine OCR for a document.

    Pipeline per page:
    1. Detect if page is image-only (< 50 extractable chars from pdfplumber)
    2. If image page: detect script language
    3. Run Tesseract (primary, fast, free)
    4. If Tesseract confidence < threshold: run EasyOCR (fallback)
    5. RTL post-process extracted Urdu/Sindhi text
    6. Return per-page results with confidence metadata
    """

    def __init__(self) -> None:
        self._tesseract = TesseractEngine()
        self._easyocr = EasyOCREngine()
        self._rtl = RTLPreprocessor()
        self._evaluator = ConfidenceEvaluator()
        self._threshold = settings.OCR_CONFIDENCE_THRESHOLD

    def process_image(
        self,
        image: Any,  # PIL.Image.Image
        page_num: int,
        hint_language: str = "urdu",
    ) -> OCRPageResult:
        """Process a single page image through the OCR cascade.

        Args:
            image: PIL Image of a PDF page
            page_num: Page number (0-indexed)
            hint_language: Language hint from document metadata (default: urdu)

        Returns:
            Best OCRPageResult from Tesseract or EasyOCR fallback
        """
        # Step 1: Tesseract primary extraction
        primary = self._tesseract.extract(image, language=hint_language, page_num=page_num)

        # Step 2: Detect language from Tesseract output (may override hint)
        if primary.text:
            detected = detect_language(primary.text)
            if detected != "english":
                primary.language = detected

        # Step 3: EasyOCR fallback if Tesseract confidence is below threshold
        if primary.confidence < self._threshold and settings.OCR_FALLBACK_ENABLED:
            logger.info(
                "tesseract_below_threshold_using_easyocr",
                page=page_num,
                tesseract_confidence=round(primary.confidence, 3),
                threshold=self._threshold,
            )
            fallback = self._easyocr.extract(image, language=hint_language, page_num=page_num)
            if fallback.confidence > primary.confidence:
                best = fallback
            else:
                best = primary
        else:
            best = primary

        # Step 4: RTL post-processing for Arabic-script languages
        if best.language in ("urdu", "sindhi") and best.text:
            best.text = self._rtl.process(best.text)

        logger.info(
            "page_ocr_complete",
            page=page_num,
            engine=best.engine,
            confidence=round(best.confidence, 3),
            language=best.language,
            text_len=len(best.text),
        )
        return best

    def process_pdf_pages(
        self,
        images: List[Any],
        hint_language: str = "urdu",
    ) -> List[OCRPageResult]:
        """Process all image pages from a PDF.

        Args:
            images: List of PIL Images (from pdf2image.convert_from_path)
            hint_language: Language hint for OCR engine selection
        """
        results = []
        for i, image in enumerate(images):
            result = self.process_image(image, page_num=i, hint_language=hint_language)
            results.append(result)
        return results

    def is_image_page(self, page_text: str) -> bool:
        """Return True if the page has too little extractable text (image-based)."""
        return len(page_text.strip()) < _MIN_TEXT_CHARS
