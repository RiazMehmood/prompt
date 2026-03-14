"""RAG retrieval service with pgvector similarity search."""
from backend.src.db.supabase_client import supabase
from backend.src.services.rag.embeddings import EmbeddingsService


class RetrievalService:
    """RAG retrieval service using pgvector."""

    @staticmethod
    async def search_similar_documents(
        query: str,
        role_id: str,
        top_k: int = 5,
        confidence_threshold: float = 0.75
    ) -> dict:
        """Search for similar documents using vector similarity.

        Args:
            query: User query text
            role_id: Role ID to filter documents
            top_k: Number of results to return
            confidence_threshold: Minimum similarity score

        Returns:
            dict with results and metadata
        """
        # Generate query embedding
        query_embedding = await EmbeddingsService.generate_embedding(query)

        # Search using pgvector cosine similarity
        # Note: Supabase Python client doesn't have native vector search yet
        # For MVP, we'll use RPC call to a custom function
        try:
            # For now, fetch all approved documents and do similarity in Python
            # In production, use pgvector's native similarity search
            response = supabase.table("documents").select("*").eq(
                "role_id", role_id
            ).eq("status", "approved").execute()

            documents = response.data

            # Calculate cosine similarity for each document
            results = []
            for doc in documents:
                if doc.get("embedding"):
                    similarity = RetrievalService._cosine_similarity(
                        query_embedding,
                        doc["embedding"]
                    )

                    if similarity >= confidence_threshold:
                        results.append({
                            "document_id": doc["document_id"],
                            "title": doc["title"],
                            "content": doc["content"],
                            "metadata": doc.get("metadata", {}),
                            "similarity": similarity
                        })

            # Sort by similarity and take top_k
            results.sort(key=lambda x: x["similarity"], reverse=True)
            results = results[:top_k]

            return {
                "success": True,
                "results": results,
                "count": len(results),
                "query": query
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "results": [],
                "count": 0
            }

    @staticmethod
    def _cosine_similarity(vec1: list[float], vec2: list[float]) -> float:
        """Calculate cosine similarity between two vectors.

        Args:
            vec1: First vector
            vec2: Second vector

        Returns:
            Similarity score (0-1)
        """
        import math

        # Dot product
        dot_product = sum(a * b for a, b in zip(vec1, vec2))

        # Magnitudes
        magnitude1 = math.sqrt(sum(a * a for a in vec1))
        magnitude2 = math.sqrt(sum(b * b for b in vec2))

        if magnitude1 == 0 or magnitude2 == 0:
            return 0.0

        return dot_product / (magnitude1 * magnitude2)
