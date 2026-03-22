"""EmbeddingService: wraps multilingual-e5-base with batch processing and error handling.

Model: intfloat/multilingual-e5-base (768-dim)
Supports: English, Urdu (Nastaliq), Sindhi — all in one model.
"""
from typing import List, Optional

import structlog
from sentence_transformers import SentenceTransformer

from src.config import settings

logger = structlog.get_logger(__name__)

# Module-level singleton — load once, reuse everywhere
_MODEL: Optional[SentenceTransformer] = None

# multilingual-e5 models expect a query prefix for asymmetric retrieval:
# - Documents: "passage: <text>"
# - Queries:   "query: <text>"
_PASSAGE_PREFIX = "passage: "
_QUERY_PREFIX = "query: "

EMBEDDING_DIM = 768  # multilingual-e5-base output dimension


def _get_model() -> SentenceTransformer:
    global _MODEL
    if _MODEL is None:
        logger.info("loading_embedding_model", model=settings.CHROMADB_EMBEDDING_MODEL)
        _MODEL = SentenceTransformer(
            settings.CHROMADB_EMBEDDING_MODEL,
            cache_folder=None,  # uses HuggingFace default cache
        )
        logger.info("embedding_model_loaded", dim=EMBEDDING_DIM)
    return _MODEL


class EmbeddingService:
    """Service for generating sentence embeddings using multilingual-e5-base.

    Usage:
        svc = EmbeddingService()
        # For indexing knowledge base chunks:
        vectors = svc.embed_passages(["text1", "text2"])
        # For embedding user queries:
        vector  = svc.embed_query("what is bail?")
    """

    def __init__(self) -> None:
        self._model = _get_model()

    def embed_passages(
        self,
        texts: List[str],
        batch_size: int = 32,
        show_progress: bool = False,
    ) -> List[List[float]]:
        """Embed document passages (knowledge base chunks) with passage prefix.

        Returns a list of 768-dim float vectors.
        """
        if not texts:
            return []
        prefixed = [_PASSAGE_PREFIX + t for t in texts]
        try:
            vectors = self._model.encode(
                prefixed,
                batch_size=batch_size,
                show_progress_bar=show_progress,
                normalize_embeddings=True,
                convert_to_numpy=True,
            )
            logger.debug("passages_embedded", count=len(texts))
            return [v.tolist() for v in vectors]
        except Exception as exc:
            logger.error("embed_passages_failed", count=len(texts), error=str(exc))
            raise

    def embed_query(self, text: str) -> List[float]:
        """Embed a single user query with query prefix.

        Returns a single 768-dim float vector.
        """
        if not text.strip():
            raise ValueError("Query text cannot be empty")
        prefixed = _QUERY_PREFIX + text
        try:
            vector = self._model.encode(
                prefixed,
                normalize_embeddings=True,
                convert_to_numpy=True,
            )
            logger.debug("query_embedded", length=len(text))
            return vector.tolist()
        except Exception as exc:
            logger.error("embed_query_failed", error=str(exc))
            raise

    def embed_queries(self, texts: List[str], batch_size: int = 32) -> List[List[float]]:
        """Embed multiple queries in batch."""
        if not texts:
            return []
        prefixed = [_QUERY_PREFIX + t for t in texts]
        vectors = self._model.encode(
            prefixed,
            batch_size=batch_size,
            normalize_embeddings=True,
            convert_to_numpy=True,
        )
        return [v.tolist() for v in vectors]
