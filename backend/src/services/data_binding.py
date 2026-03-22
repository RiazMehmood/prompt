"""DataBindingEngine: fill template slots from user input or RAG (no free AI generation)."""
from typing import Any, Dict, List, Optional

import structlog

from src.config import settings
from src.models.template import DataSource, SlotDefinition, TemplateResponse
from src.services.rag.provenance import ProvenanceTracker
from src.services.rag.retrieval import RAGRetrievalService

logger = structlog.get_logger(__name__)


class DataBindingEngine:
    """Fill template slots strictly from user_input or rag_retrieval.

    CRITICAL RULE: Slots tagged `data_source=rag_retrieval` MUST be filled from
    ChromaDB. If no sufficient match (confidence < 0.75), the slot is left
    unfilled and ValidationEngine will reject the output.

    No free AI generation is permitted here — every slot value must be traceable.
    """

    def __init__(self) -> None:
        self._retrieval = RAGRetrievalService()

    async def bind(
        self,
        template: TemplateResponse,
        user_inputs: Dict[str, Any],
        domain_namespace: str,
        output_language: str = "english",
        provenance: Optional[ProvenanceTracker] = None,
    ) -> Dict[str, Any]:
        """Populate all template slots and return a slot_name→value mapping.

        Args:
            template: The template to bind slots for
            user_inputs: Values supplied directly by the user
            domain_namespace: ChromaDB namespace for RAG queries
            output_language: Desired output language for RAG queries
            provenance: Optional ProvenanceTracker (records sources for each slot)

        Returns:
            Dict mapping slot_name → populated value (or None if unresolved)
        """
        tracker = provenance or ProvenanceTracker()
        bound: Dict[str, Any] = {}

        for slot in template.slot_definitions:
            value = await self._fill_slot(
                slot=slot,
                user_inputs=user_inputs,
                domain_namespace=domain_namespace,
                output_language=output_language,
                provenance=tracker,
            )
            bound[slot.name] = value

        return bound

    async def _fill_slot(
        self,
        slot: SlotDefinition,
        user_inputs: Dict[str, Any],
        domain_namespace: str,
        output_language: str,
        provenance: ProvenanceTracker,
    ) -> Optional[Any]:
        """Fill a single slot from its designated data source."""
        if slot.data_source == DataSource.user_input:
            value = user_inputs.get(slot.name)
            if value is not None:
                provenance.record_user_input_slot(slot.name, str(value)[:100])
            elif slot.required:
                logger.warning("required_user_input_missing", slot=slot.name)
            return value

        elif slot.data_source == DataSource.rag_retrieval:
            # Build a meaningful query using the slot name as context
            query = user_inputs.get(f"{slot.name}_query") or slot.name.replace("_", " ")
            results = await self._retrieval.retrieve_for_slot(
                slot_name=slot.name,
                query=query,
                domain_namespace=domain_namespace,
                top_k=3,
            )
            if results:
                best = results[0]
                provenance.record_rag_slot(
                    slot_name=slot.name,
                    source_doc_id=best["document_id"],
                    chunk_text=best["chunk_text"],
                    confidence=best["confidence"],
                    metadata=best.get("metadata", {}),
                )
                logger.debug(
                    "slot_filled_from_rag",
                    slot=slot.name,
                    confidence=best["confidence"],
                )
                return best["chunk_text"]
            else:
                logger.warning(
                    "rag_slot_not_filled",
                    slot=slot.name,
                    domain=domain_namespace,
                )
                return None

        return None
