"""Query cache service using Upstash Redis."""
import hashlib
import json
from backend.src.db.redis import redis_client


class CacheService:
    """Query cache service for RAG responses."""

    @staticmethod
    def _generate_cache_key(query: str, role_id: str) -> str:
        """Generate cache key from query and role.

        Args:
            query: User query
            role_id: Role ID

        Returns:
            Cache key
        """
        # Create hash of query + role_id
        content = f"{query}:{role_id}"
        hash_key = hashlib.sha256(content.encode()).hexdigest()
        return f"rag_cache:{hash_key}"

    @staticmethod
    async def get_cached_response(query: str, role_id: str) -> dict | None:
        """Get cached RAG response.

        Args:
            query: User query
            role_id: Role ID

        Returns:
            Cached response or None
        """
        cache_key = CacheService._generate_cache_key(query, role_id)

        try:
            cached = await redis_client.get(cache_key)
            if cached:
                return json.loads(cached)
            return None

        except Exception:
            return None

    @staticmethod
    async def cache_response(
        query: str,
        role_id: str,
        response: dict,
        ttl: int = 604800  # 7 days
    ) -> bool:
        """Cache RAG response.

        Args:
            query: User query
            role_id: Role ID
            response: Response data to cache
            ttl: Time to live in seconds (default: 7 days)

        Returns:
            True if cached successfully
        """
        cache_key = CacheService._generate_cache_key(query, role_id)

        try:
            await redis_client.setex(
                cache_key,
                ttl,
                json.dumps(response)
            )
            return True

        except Exception:
            return False
