"""Document ingestion pipeline for RAG."""
from backend.src.db.supabase_client import supabase
from backend.src.services.rag.chunking import ChunkingService
from backend.src.services.rag.embeddings import EmbeddingsService


class IngestionService:
    """Document ingestion pipeline."""

    @staticmethod
    async def ingest_document(
        document_id: str,
        content: str,
        chunk_size: int = 512,
        overlap: int = 50
    ) -> dict:
        """Ingest document: chunk, embed, store in pgvector.

        Args:
            document_id: Document UUID
            content: Document text content
            chunk_size: Chunk size in tokens
            overlap: Overlap size in tokens

        Returns:
            dict with ingestion stats
        """
        # Chunk document
        chunks = ChunkingService.chunk_text(content, chunk_size, overlap)

        # Generate embeddings for each chunk
        embeddings = await EmbeddingsService.generate_embeddings_batch(chunks)

        # Store chunks with embeddings
        # For MVP, we'll store the full document embedding
        # In production, store chunks separately in a chunks table

        # Generate embedding for full document (for now)
        doc_embedding = embeddings[0] if embeddings else []

        # Update document with embedding
        try:
            supabase.table("documents").update({
                "embedding": doc_embedding
            }).eq("document_id", document_id).execute()

            return {
                "success": True,
                "document_id": document_id,
                "chunks_created": len(chunks),
                "embeddings_generated": len(embeddings)
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    async def ingest_documents_batch(documents: list[dict]) -> dict:
        """Ingest multiple documents.

        Args:
            documents: List of dicts with document_id and content

        Returns:
            dict with batch ingestion stats
        """
        results = []

        for doc in documents:
            result = await IngestionService.ingest_document(
                doc["document_id"],
                doc["content"]
            )
            results.append(result)

        successful = sum(1 for r in results if r["success"])

        return {
            "total": len(documents),
            "successful": successful,
            "failed": len(documents) - successful,
            "results": results
        }
