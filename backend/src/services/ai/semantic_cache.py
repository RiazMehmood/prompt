"""Semantic cache: query → ChromaDB similarity lookup → return cached response.

Cache key: query embedding compared against cached query embeddings using cosine
similarity. If similarity ≥ settings.SEMANTIC_CACHE_THRESHOLD (default 0.92),
the cached response is returned without calling the LLM.

This is the primary cost-reduction mechanism — expected 40–60% cache hit rate
for domain Q&A patterns.
"""
import hashlib
import json
from typing import Optional

import structlog

from src.config import settings
from src.db.chromadb_client import get_chromadb_client, _get_embedding_function

logger = structlog.get_logger(__name__)

_CACHE_COLLECTION_NAME = "semantic_cache"


class SemanticCacheService:
    """Query-level semantic cache using ChromaDB cosine similarity.

    Usage:
        cache = SemanticCacheService()
        # Before LLM call:
        hit = cache.get(query, domain_namespace)
        if hit:
            return hit
        # After LLM call:
        cache.set(query, domain_namespace, response)
    """

    def __init__(self) -> None:
        self._threshold = settings.SEMANTIC_CACHE_THRESHOLD
        client = get_chromadb_client()
        self._collection = client.get_or_create_collection(
            name=_CACHE_COLLECTION_NAME,
            embedding_function=_get_embedding_function(),
            metadata={"hnsw:space": "cosine"},
        )

    def get(self, query: str, domain_namespace: str) -> Optional[str]:
        """Return cached response if a semantically similar query exists, else None."""
        try:
            results = self._collection.query(
                query_texts=[query],  # ONNX auto-embeds
                n_results=1,
                where={"domain_namespace": domain_namespace},
                include=["metadatas", "distances"],
            )
            if not results["ids"] or not results["ids"][0]:
                return None

            distance = results["distances"][0][0]
            # ChromaDB cosine distance = 1 - similarity
            similarity = 1.0 - distance
            if similarity >= self._threshold:
                cached_response = results["metadatas"][0][0].get("response")
                logger.info(
                    "semantic_cache_hit",
                    similarity=round(similarity, 4),
                    domain=domain_namespace,
                )
                return cached_response
            return None
        except Exception as exc:
            logger.warning("semantic_cache_get_failed", error=str(exc))
            return None

    def set(self, query: str, domain_namespace: str, response: str) -> None:
        """Cache a query→response pair."""
        try:
            cache_id = hashlib.sha256(
                f"{domain_namespace}:{query}".encode()
            ).hexdigest()
            self._collection.upsert(
                ids=[cache_id],
                documents=[query],  # ONNX auto-embeds
                metadatas=[{
                    "domain_namespace": domain_namespace,
                    "query_preview": query[:200],
                    "response": response,
                }],
            )
            logger.debug("semantic_cache_set", domain=domain_namespace)
        except Exception as exc:
            logger.warning("semantic_cache_set_failed", error=str(exc))

    def invalidate_domain(self, domain_namespace: str) -> None:
        """Remove all cached entries for a domain (called when knowledge base is updated)."""
        try:
            self._collection.delete(where={"domain_namespace": domain_namespace})
            logger.info("semantic_cache_domain_invalidated", domain=domain_namespace)
        except Exception as exc:
            logger.warning(
                "semantic_cache_invalidate_failed",
                domain=domain_namespace,
                error=str(exc),
            )
