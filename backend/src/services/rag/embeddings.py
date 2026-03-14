"""Text embeddings service using Gemini."""
from backend.src.services.ai.gemini import gemini_client


class EmbeddingsService:
    """Text embeddings service for RAG."""

    @staticmethod
    async def generate_embedding(text: str) -> list[float]:
        """Generate embedding for single text.

        Args:
            text: Text to embed

        Returns:
            768-dimensional embedding vector
        """
        return await gemini_client.generate_embeddings(text)

    @staticmethod
    async def generate_embeddings_batch(texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts.

        Args:
            texts: List of texts to embed

        Returns:
            List of embedding vectors
        """
        embeddings = []
        for text in texts:
            embedding = await gemini_client.generate_embeddings(text)
            embeddings.append(embedding)

        return embeddings
