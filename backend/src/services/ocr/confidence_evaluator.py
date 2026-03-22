"""OCR Confidence Evaluator: flag low-confidence pages for admin review."""
from typing import Any, Dict, List, Optional

import structlog

from src.config import settings

logger = structlog.get_logger(__name__)


class ConfidenceEvaluator:
    """Evaluate and aggregate OCR confidence scores across document pages.

    Pages below the threshold are flagged for admin review.
    The Document.ocr_flagged_pages JSONB field stores the flagged page list.
    """

    def __init__(self, threshold: Optional[float] = None) -> None:
        self._threshold = threshold or settings.OCR_CONFIDENCE_THRESHOLD

    def evaluate(
        self, page_results: List[Any]  # List[OCRPageResult]
    ) -> Dict[str, Any]:
        """Evaluate all page results and produce an evaluation summary.

        Returns:
            {
                ocr_confidence_avg: float,
                ocr_flagged_pages: [...],  # empty if all pages pass
                all_pages_above_threshold: bool,
            }
        """
        if not page_results:
            return {
                "ocr_confidence_avg": 0.0,
                "ocr_flagged_pages": [],
                "all_pages_above_threshold": False,
            }

        flagged = []
        total_confidence = 0.0
        page_count = len(page_results)

        for result in page_results:
            total_confidence += result.confidence
            if result.confidence < self._threshold:
                flagged.append({
                    "page_num": result.page_num,
                    "confidence": round(result.confidence, 3),
                    "engine": result.engine,
                    "reason": (
                        f"Confidence {result.confidence:.1%} below threshold "
                        f"{self._threshold:.1%}"
                    ),
                })

        avg_confidence = total_confidence / page_count
        all_pass = len(flagged) == 0

        if flagged:
            logger.warning(
                "ocr_pages_below_threshold",
                flagged_count=len(flagged),
                avg_confidence=round(avg_confidence, 3),
                threshold=self._threshold,
            )

        return {
            "ocr_confidence_avg": round(avg_confidence, 4),
            "ocr_flagged_pages": flagged,
            "all_pages_above_threshold": all_pass,
        }

    def blocks_auto_approval(self, evaluation: Dict[str, Any]) -> bool:
        """Return True if flagged pages should block automatic document approval."""
        return len(evaluation.get("ocr_flagged_pages", [])) > 0
