"""DocumentIngestionWorkflow: LangGraph pipeline for PDF upload → OCR → embedding → pending."""
from typing import Any, Dict, List, Optional, TypedDict

import structlog
from langgraph.graph import END, StateGraph

from src.services.workflows.base_workflow import BaseWorkflow

logger = structlog.get_logger(__name__)


class DocumentIngestionState(TypedDict, total=False):
    # Inputs
    document_id: str
    file_path: str
    domain_id: str
    domain_namespace: str
    hint_language: str

    # Extraction outputs
    pages: List[Dict[str, Any]]
    has_image_pages: bool
    ocr_confidence_avg: Optional[float]
    ocr_flagged_pages: List[Dict[str, Any]]

    # Indexing outputs
    chunk_count: int

    # Final status
    status: str  # 'pending' (waiting for admin review) | 'failed'
    error: Optional[str]


class DocumentIngestionWorkflow(BaseWorkflow):
    """Process uploaded documents: extract text, OCR if needed, chunk, embed, set pending."""

    @property
    def state_schema(self) -> type:
        return DocumentIngestionState

    def build_graph(self, graph: StateGraph) -> None:
        graph.add_node("extract_text", self._extract_text_node)
        graph.add_node("evaluate_ocr", self._evaluate_ocr_node)
        graph.add_node("update_document", self._update_document_node)

        graph.set_entry_point("extract_text")
        graph.add_edge("extract_text", "evaluate_ocr")
        graph.add_edge("evaluate_ocr", "update_document")
        graph.add_edge("update_document", END)

    async def _extract_text_node(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Extract text from all pages (text-native + OCR for image pages)."""
        from src.services.documents.text_extraction import TextExtractionService
        svc = TextExtractionService()
        try:
            pages = svc.extract_pdf(
                state["file_path"],
                hint_language=state.get("hint_language", "urdu"),
            )
            has_image = any(p["is_ocr"] for p in pages)
            logger.info(
                "text_extraction_complete",
                doc_id=state["document_id"],
                pages=len(pages),
                image_pages=sum(1 for p in pages if p["is_ocr"]),
            )
            return {**state, "pages": pages, "has_image_pages": has_image}
        except Exception as exc:
            logger.error("text_extraction_failed", doc_id=state["document_id"], error=str(exc))
            return {**state, "pages": [], "status": "failed", "error": str(exc)}

    async def _evaluate_ocr_node(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate OCR confidence and flag low-confidence pages."""
        pages = state.get("pages", [])
        if not state.get("has_image_pages"):
            return {**state, "ocr_confidence_avg": 1.0, "ocr_flagged_pages": []}

        from src.services.ocr.confidence_evaluator import ConfidenceEvaluator
        from src.services.ocr.tesseract_engine import OCRPageResult

        # Convert page dicts to OCRPageResult-like objects for evaluator
        class _FakeResult:
            def __init__(self, page: dict):
                self.page_num = page["page_num"]
                self.confidence = page["confidence"]
                self.engine = "tesseract"

        ocr_pages = [_FakeResult(p) for p in pages if p.get("is_ocr")]
        evaluator = ConfidenceEvaluator()
        evaluation = evaluator.evaluate(ocr_pages)

        return {
            **state,
            "ocr_confidence_avg": evaluation["ocr_confidence_avg"],
            "ocr_flagged_pages": evaluation["ocr_flagged_pages"],
        }

    async def _update_document_node(self, state: Dict[str, Any]) -> Dict[str, Any]:
        """Update the Document record with OCR results and status."""
        if state.get("status") == "failed":
            return state

        from src.db.supabase_client import get_supabase_admin
        admin = get_supabase_admin()

        admin.table("documents").update({
            "ocr_processed": state.get("has_image_pages", False),
            "ocr_confidence_avg": state.get("ocr_confidence_avg"),
            "ocr_flagged_pages": state.get("ocr_flagged_pages") or None,
        }).eq("id", state["document_id"]).execute()

        logger.info(
            "document_record_updated",
            doc_id=state["document_id"],
            ocr_avg=state.get("ocr_confidence_avg"),
        )
        return {**state, "status": "pending"}
