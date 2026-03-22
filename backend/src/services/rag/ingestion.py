"""EmbeddingIngestionService: chunk → embed → store in ChromaDB for an approved document."""
from typing import Any, Dict, List

import structlog

from src.db.chromadb_client import get_or_create_domain_collection
from src.db.supabase_client import get_supabase_admin
from src.services.rag.chunking import DocumentChunkingService
from src.services.rag.embeddings import EmbeddingService

logger = structlog.get_logger(__name__)


class EmbeddingIngestionService:
    """Process an approved document into RAG-ready vector embeddings.

    Pipeline:
    1. Load extracted page texts from the document
    2. Chunk pages with overlap
    3. Batch embed chunks using multilingual-e5-base
    4. Store in ChromaDB with domain namespace + language + is_ocr_derived metadata
    5. Store chunk metadata in the embeddings Supabase table (for audit/provenance)
    """

    def __init__(self) -> None:
        self._chunker = DocumentChunkingService()
        self._embedder = EmbeddingService()
        self._admin = get_supabase_admin()

    async def ingest_document(
        self,
        document_id: str,
        domain_namespace: str,
        pages: List[Dict[str, Any]],
    ) -> int:
        """Ingest all pages of an approved document into the vector store.

        Args:
            document_id: ID of the approved Document record
            domain_namespace: ChromaDB collection namespace
            pages: List of page dicts from TextExtractionService

        Returns:
            Number of chunks successfully indexed
        """
        # Chunk all pages
        all_chunks = self._chunker.chunk_pages(
            pages=pages,
            document_id=document_id,
            domain_namespace=domain_namespace,
        )

        if not all_chunks:
            logger.warning("no_chunks_produced", document_id=document_id)
            return 0

        # Batch embed
        texts = [c["chunk_text"] for c in all_chunks]
        vectors = self._embedder.embed_passages(texts, batch_size=32, show_progress=True)

        # Store in ChromaDB
        collection = get_or_create_domain_collection(domain_namespace)
        chunk_ids = [f"{document_id}_{i}" for i in range(len(all_chunks))]
        metadatas = [
            {
                "document_id": c["document_id"],
                "chunk_index": c["chunk_index"],
                "domain_namespace": c["domain_namespace"],
                "language": c["language"],
                "is_ocr_derived": c["is_ocr_derived"],
                **(c.get("metadata") or {}),
            }
            for c in all_chunks
        ]

        collection.add(
            ids=chunk_ids,
            embeddings=vectors,
            documents=texts,
            metadatas=metadatas,
        )

        # Persist chunk metadata to Supabase embeddings table
        embedding_rows = [
            {
                "document_id": c["document_id"],
                "chunk_text": c["chunk_text"],
                "chunk_index": c["chunk_index"],
                "embedding_vector": vectors[i],
                "metadata": c.get("metadata") or {},
                "domain_namespace": domain_namespace,
                "language": c["language"],
                "is_ocr_derived": c["is_ocr_derived"],
            }
            for i, c in enumerate(all_chunks)
        ]
        # Batch insert in chunks of 100
        for batch_start in range(0, len(embedding_rows), 100):
            batch = embedding_rows[batch_start : batch_start + 100]
            self._admin.table("embeddings").insert(batch).execute()

        logger.info(
            "document_ingested",
            document_id=document_id,
            chunk_count=len(all_chunks),
            domain_namespace=domain_namespace,
        )
        return len(all_chunks)

    async def delete_document_vectors(self, document_id: str, domain_namespace: str) -> None:
        """Remove all vectors for a document (called on document deletion/rejection)."""
        collection = get_or_create_domain_collection(domain_namespace)
        collection.delete(where={"document_id": document_id})
        self._admin.table("embeddings").delete().eq("document_id", document_id).execute()
        logger.info("document_vectors_deleted", document_id=document_id)
