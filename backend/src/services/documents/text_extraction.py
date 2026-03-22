"""TextExtractionService: pdfplumber for text pages + OCROrchestrator for image pages."""
from pathlib import Path
from typing import Any, Dict, List

import structlog

logger = structlog.get_logger(__name__)

_MIN_TEXT_CHARS = 50  # Minimum chars to consider a page as "text-searchable"


class TextExtractionService:
    """Extract text from PDFs using a hybrid approach:

    - Text-searchable pages: pdfplumber (fast, accurate, preserves structure)
    - Image-only pages (< 50 chars extractable): OCROrchestrator (Tesseract + EasyOCR)

    Results per page include: page_num, text, language, is_ocr, confidence.
    """

    def extract_pdf(
        self,
        file_path: str,
        hint_language: str = "urdu",
    ) -> List[Dict[str, Any]]:
        """Extract text from all pages of a PDF.

        Returns a list of dicts per page:
        {
            page_num: int,
            text: str,
            language: str,
            is_ocr: bool,
            confidence: float,
        }
        """
        pages = []
        try:
            import pdfplumber
            with pdfplumber.open(file_path) as pdf:
                for page_num, page in enumerate(pdf.pages):
                    extractable_text = page.extract_text() or ""
                    if len(extractable_text.strip()) >= _MIN_TEXT_CHARS:
                        # Text-searchable page — use pdfplumber result directly
                        from src.services.language.detection import detect_language
                        lang = detect_language(extractable_text)
                        pages.append({
                            "page_num": page_num,
                            "text": extractable_text,
                            "language": lang,
                            "is_ocr": False,
                            "confidence": 1.0,  # Native text, full confidence
                        })
                    else:
                        # Image page — delegate to OCR
                        ocr_result = self._ocr_page(
                            file_path=file_path,
                            page_num=page_num,
                            hint_language=hint_language,
                        )
                        pages.append({
                            "page_num": page_num,
                            "text": ocr_result.get("text", ""),
                            "language": ocr_result.get("language", hint_language),
                            "is_ocr": True,
                            "confidence": ocr_result.get("confidence", 0.0),
                        })
        except Exception as exc:
            logger.error("pdf_extraction_failed", path=file_path, error=str(exc))
            raise

        logger.info(
            "pdf_extracted",
            path=Path(file_path).name,
            total_pages=len(pages),
            ocr_pages=sum(1 for p in pages if p["is_ocr"]),
        )
        return pages

    def _ocr_page(
        self,
        file_path: str,
        page_num: int,
        hint_language: str,
    ) -> Dict[str, Any]:
        """Run OCR on a single PDF page by converting it to an image first."""
        try:
            from pdf2image import convert_from_path
            images = convert_from_path(
                file_path,
                first_page=page_num + 1,
                last_page=page_num + 1,
                dpi=300,  # Higher DPI = better OCR accuracy for photographed books
            )
            if not images:
                return {"text": "", "language": hint_language, "confidence": 0.0}

            from src.services.ocr.orchestrator import OCROrchestrator
            orchestrator = OCROrchestrator()
            result = orchestrator.process_image(
                images[0], page_num=page_num, hint_language=hint_language
            )
            return {
                "text": result.text,
                "language": result.language,
                "confidence": result.confidence,
            }
        except Exception as exc:
            logger.error("page_ocr_failed", page=page_num, error=str(exc))
            return {"text": "", "language": hint_language, "confidence": 0.0}
