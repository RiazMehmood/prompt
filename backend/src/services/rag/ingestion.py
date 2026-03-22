"""EmbeddingIngestionService: chunk → embed → store in ChromaDB for an approved document."""
import gc
from typing import Any, Dict, List

import structlog

from src.db.chromadb_client import get_or_create_domain_collection
from src.services.rag.chunking import DocumentChunkingService

logger = structlog.get_logger(__name__)

# ChromaDB auto-embeds via the ONNX function attached to the collection.
# Batch of 50 keeps peak RAM well under 500 MB (ONNX model ~200 MB total).
_INSERT_BATCH_SIZE = 50


class EmbeddingIngestionService:
    """Process an approved document into RAG-ready vector embeddings.

    Pipeline:
    1. Chunk pages with overlap
    2. Pass text batches to ChromaDB — the attached ONNXMiniLM_L6_V2 function
       embeds them in-process using onnxruntime (no PyTorch, ~200 MB RAM)
    3. Insert each batch immediately, then free from memory
    """

    def __init__(self) -> None:
        self._chunker = DocumentChunkingService()

    async def ingest_document(
        self,
        document_id: str,
        domain_namespace: str,
        pages: List[Dict[str, Any]],
    ) -> int:
        """Ingest all pages of an approved document into the vector store.

        Returns:
            Number of chunks successfully indexed
        """
        all_chunks = self._chunker.chunk_pages(
            pages=pages,
            document_id=document_id,
            domain_namespace=domain_namespace,
        )

        if not all_chunks:
            logger.warning("no_chunks_produced", document_id=document_id)
            return 0

        collection = get_or_create_domain_collection(domain_namespace)
        total_indexed = 0

        for batch_start in range(0, len(all_chunks), _INSERT_BATCH_SIZE):
            batch = all_chunks[batch_start : batch_start + _INSERT_BATCH_SIZE]
            collection.add(
                ids=[f"{document_id}_{batch_start + i}" for i in range(len(batch))],
                documents=[c["chunk_text"] for c in batch],  # ChromaDB auto-embeds
                metadatas=[
                    {
                        "document_id": c["document_id"],
                        "chunk_index": batch_start + i,
                        "domain_namespace": c["domain_namespace"],
                        "language": c["language"],
                        "is_ocr_derived": c["is_ocr_derived"],
                        **(c.get("metadata") or {}),
                    }
                    for i, c in enumerate(batch)
                ],
            )
            total_indexed += len(batch)
            del batch
            gc.collect()

        logger.info(
            "document_ingested",
            document_id=document_id,
            chunk_count=total_indexed,
            domain_namespace=domain_namespace,
        )
        return total_indexed

    async def delete_document_vectors(self, document_id: str, domain_namespace: str) -> None:
        """Remove all vectors for a document (called on document deletion/rejection)."""
        from src.db.supabase_client import get_supabase_admin
        collection = get_or_create_domain_collection(domain_namespace)
        collection.delete(where={"document_id": document_id})
        get_supabase_admin().table("embeddings").delete().eq("document_id", document_id).execute()
        logger.info("document_vectors_deleted", document_id=document_id)
