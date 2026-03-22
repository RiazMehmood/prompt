"""Redis-based response cache for identical generate requests (idempotency key matching)."""
from __future__ import annotations

import hashlib
import json
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

_redis_client = None


def _get_redis():
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        import redis.asyncio as aioredis
        from src.config import settings
        if settings.REDIS_URL:
            _redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            logger.info("Redis response cache connected")
        return _redis_client
    except Exception as exc:
        logger.warning("Redis unavailable for response cache: %s", exc)
        return None


class ResponseCacheService:
    """
    Caches generate request responses in Redis with TTL.
    Key: SHA256(domain_id + template_id + output_language + sorted(output_parameters))
    TTL: 1 hour by default (generated documents don't change for same inputs).
    """

    DEFAULT_TTL = 3600  # seconds

    async def get(self, cache_key: str) -> Optional[dict]:
        """Return cached response dict or None."""
        redis = _get_redis()
        if not redis:
            return None
        try:
            raw = await redis.get(f"gen_cache:{cache_key}")
            return json.loads(raw) if raw else None
        except Exception as exc:
            logger.debug("Cache get failed: %s", exc)
            return None

    async def set(self, cache_key: str, response: dict, ttl: int = DEFAULT_TTL) -> None:
        """Store response in cache with TTL."""
        redis = _get_redis()
        if not redis:
            return
        try:
            await redis.setex(
                f"gen_cache:{cache_key}",
                ttl,
                json.dumps(response, default=str),
            )
        except Exception as exc:
            logger.debug("Cache set failed: %s", exc)

    async def invalidate_domain(self, domain_id: str) -> int:
        """Invalidate all cache entries for a domain (e.g., after knowledge base update)."""
        redis = _get_redis()
        if not redis:
            return 0
        try:
            keys = await redis.keys(f"gen_cache:*{domain_id}*")
            if keys:
                return await redis.delete(*keys)
            return 0
        except Exception as exc:
            logger.debug("Cache invalidation failed: %s", exc)
            return 0

    @staticmethod
    def build_key(
        domain_id: str,
        template_id: str,
        output_language: str,
        output_parameters: dict,
    ) -> str:
        """Build a deterministic cache key for a generation request."""
        canonical = json.dumps(
            {
                "domain_id": domain_id,
                "template_id": template_id,
                "output_language": output_language,
                "output_parameters": dict(sorted(output_parameters.items())),
            },
            sort_keys=True,
        )
        return hashlib.sha256(canonical.encode()).hexdigest()
