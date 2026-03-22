"""RAGRetrievalService: query ChromaDB with domain namespace + confidence threshold."""
from typing import Any, Dict, List, Optional

import structlog

from src.config import settings
from src.db.chromadb_client import get_or_create_domain_collection

logger = structlog.get_logger(__name__)


class RAGRetrievalService:
    """Retrieve semantically similar chunks from the domain's vector store.

    Key guarantees:
    - All results filtered to `domain_namespace` (prevents cross-domain leakage)
    - Results below `min_confidence` (default 0.75) are excluded
    - Returns empty list rather than guessing when no sufficient matches exist
    - Embedding is handled by ChromaDB's ONNX function (no PyTorch at query time)
    """

    def __init__(self) -> None:
        self._min_confidence = settings.RAG_MIN_CONFIDENCE

    async def retrieve(
        self,
        query: str,
        domain_namespace: str,
        top_k: int = 5,
        language_filter: Optional[str] = None,
        min_confidence: Optional[float] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieve top-k relevant chunks for a query within a domain.

        Args:
            query: User query text (will be embedded with query prefix)
            domain_namespace: Domain namespace for vector isolation
            top_k: Max chunks to return
            language_filter: Optional — filter by language ('english'/'urdu'/'sindhi')
            min_confidence: Override default minimum confidence threshold

        Returns:
            List of dicts with keys: chunk_text, confidence, document_id, metadata
        """
        threshold = min_confidence if min_confidence is not None else self._min_confidence

        collection = get_or_create_domain_collection(domain_namespace)

        where_filter: Dict[str, Any] = {}
        if language_filter:
            where_filter["language"] = language_filter

        try:
            results = collection.query(
                query_texts=[query],  # ChromaDB auto-embeds via ONNX function
                n_results=top_k * 2,  # fetch extra, then filter by confidence
                where=where_filter if where_filter else None,
                include=["documents", "metadatas", "distances"],
            )
        except Exception as exc:
            logger.error(
                "chromadb_query_failed",
                domain=domain_namespace,
                error=str(exc),
            )
            return []

        if not results["ids"] or not results["ids"][0]:
            return []

        passages = []
        for doc_text, meta, distance in zip(
            results["documents"][0],
            results["metadatas"][0],
            results["distances"][0],
        ):
            # ChromaDB cosine distance → similarity
            confidence = 1.0 - distance
            if confidence < threshold:
                continue
            passages.append({
                "chunk_text": doc_text,
                "confidence": round(confidence, 4),
                "document_id": meta.get("document_id") or None,
                "metadata": meta,
                "language": meta.get("language", "english"),
                "is_ocr_derived": meta.get("is_ocr_derived", False),
            })

        # Sort by confidence descending, return top_k
        passages.sort(key=lambda x: x["confidence"], reverse=True)
        passages = passages[:top_k]

        logger.info(
            "rag_retrieval_complete",
            domain=domain_namespace,
            query_len=len(query),
            total_candidates=len(results["ids"][0]),
            returned=len(passages),
            min_confidence=threshold,
        )
        return passages

    async def retrieve_for_slot(
        self,
        slot_name: str,
        query: str,
        domain_namespace: str,
        top_k: int = 3,
    ) -> List[Dict[str, Any]]:
        """Retrieve chunks specifically for a template slot.

        Uses slot_name as context prefix for better retrieval precision.
        """
        enriched_query = f"{slot_name}: {query}"
        return await self.retrieve(enriched_query, domain_namespace, top_k=top_k)
