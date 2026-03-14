"""Upstash Redis Free connection module."""
import redis.asyncio as redis
from backend.src.config import settings


class RedisClient:
    """Async Redis client wrapper for Upstash Redis Free."""

    def __init__(self):
        """Initialize Redis client (lazy connection)."""
        self._client = None

    async def get_client(self) -> redis.Redis:
        """Get or create Redis client.

        Returns:
            redis.Redis: Async Redis client
        """
        if self._client is None:
            self._client = redis.from_url(
                settings.REDIS_URL,
                encoding="utf-8",
                decode_responses=True
            )
        return self._client

    async def get(self, key: str) -> str | None:
        """Get value by key.

        Args:
            key: Redis key

        Returns:
            Value or None if not found
        """
        client = await self.get_client()
        return await client.get(key)

    async def set(self, key: str, value: str) -> bool:
        """Set key-value pair.

        Args:
            key: Redis key
            value: Value to store

        Returns:
            True if successful
        """
        client = await self.get_client()
        return await client.set(key, value)

    async def setex(self, key: str, seconds: int, value: str) -> bool:
        """Set key-value pair with expiration.

        Args:
            key: Redis key
            seconds: TTL in seconds
            value: Value to store

        Returns:
            True if successful
        """
        client = await self.get_client()
        return await client.setex(key, seconds, value)

    async def incr(self, key: str) -> int:
        """Increment key value.

        Args:
            key: Redis key

        Returns:
            New value after increment
        """
        client = await self.get_client()
        return await client.incr(key)

    async def delete(self, key: str) -> int:
        """Delete key.

        Args:
            key: Redis key

        Returns:
            Number of keys deleted
        """
        client = await self.get_client()
        return await client.delete(key)

    async def health_check(self) -> bool:
        """Check Redis connection health.

        Returns:
            True if healthy
        """
        try:
            client = await self.get_client()
            await client.ping()
            return True
        except Exception:
            return False


# Global Redis client instance
redis_client = RedisClient()
