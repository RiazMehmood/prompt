"""ProvenanceTracker: log source attribution for every template slot populated via RAG."""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import structlog

logger = structlog.get_logger(__name__)


@dataclass
class SlotProvenance:
    """Provenance record for a single template slot."""
    slot_name: str
    source: str  # 'rag_retrieval' or 'user_input'
    source_doc_id: Optional[str] = None
    chunk_text: Optional[str] = None
    confidence: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "slot_name": self.slot_name,
            "source": self.source,
            "source_doc_id": self.source_doc_id,
            "chunk_text": self.chunk_text[:200] if self.chunk_text else None,
            "confidence": self.confidence,
            "metadata": self.metadata,
        }


class ProvenanceTracker:
    """Accumulates provenance records during document generation.

    Ensures every template slot is traceable to its source.
    Used by ValidationEngine to verify no hallucinated content.
    """

    def __init__(self) -> None:
        self._records: List[SlotProvenance] = []

    def record_rag_slot(
        self,
        slot_name: str,
        source_doc_id: Optional[str],
        chunk_text: str,
        confidence: float,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> None:
        """Record that a slot was filled from RAG retrieval."""
        record = SlotProvenance(
            slot_name=slot_name,
            source="rag_retrieval",
            source_doc_id=source_doc_id,
            chunk_text=chunk_text,
            confidence=confidence,
            metadata=metadata or {},
        )
        self._records.append(record)
        logger.debug(
            "slot_provenance_rag",
            slot=slot_name,
            doc_id=source_doc_id,
            confidence=confidence,
        )

    def record_user_input_slot(
        self,
        slot_name: str,
        value_preview: Optional[str] = None,
    ) -> None:
        """Record that a slot was filled from user-provided input."""
        self._records.append(SlotProvenance(
            slot_name=slot_name,
            source="user_input",
            chunk_text=value_preview,
        ))

    def get_report(self) -> List[Dict[str, Any]]:
        """Return the full provenance report as a list of dicts."""
        return [r.to_dict() for r in self._records]

    def get_rag_sources_summary(self) -> List[Dict[str, Any]]:
        """Return a compact list of RAG sources for the GeneratedDocument.retrieved_sources field."""
        return [
            {
                "source_id": r.source_doc_id,
                "text": r.chunk_text,
                "confidence": r.confidence,
                "page": r.metadata.get("page_num"),
            }
            for r in self._records
            if r.source == "rag_retrieval"
        ]

    def has_ungrounded_slots(self, required_rag_slots: List[str]) -> bool:
        """Return True if any required RAG slot is missing from the provenance log."""
        filled_rag = {r.slot_name for r in self._records if r.source == "rag_retrieval"}
        missing = set(required_rag_slots) - filled_rag
        if missing:
            logger.warning("ungrounded_slots", missing=list(missing))
        return bool(missing)

    def min_confidence(self) -> Optional[float]:
        """Return the minimum confidence score among all RAG slots."""
        confidences = [r.confidence for r in self._records if r.confidence is not None]
        return min(confidences) if confidences else None
