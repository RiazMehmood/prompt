"""JWT authentication and rate limiting middleware."""
from typing import Callable
from fastapi import Request, HTTPException, status
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
import time
from backend.src.db.redis import redis_client
from backend.src.config import settings


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware using Upstash Redis Free (10k commands/day)."""

    async def dispatch(self, request: Request, call_next: Callable):
        """Apply rate limiting per IP address.

        Args:
            request: Incoming request
            call_next: Next middleware/handler

        Returns:
            Response or rate limit error
        """
        # Skip rate limiting for health check
        if request.url.path == "/health":
            return await call_next(request)

        client_ip = request.client.host
        rate_limit_key = f"rate_limit:{client_ip}"

        try:
            # Get current request count
            current_count = await redis_client.get(rate_limit_key)

            if current_count is None:
                # First request in this minute
                await redis_client.setex(rate_limit_key, 60, 1)
            elif int(current_count) >= settings.RATE_LIMIT_PER_MINUTE:
                # Rate limit exceeded
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": "RATE_LIMIT_EXCEEDED",
                        "message": f"Rate limit exceeded. Max {settings.RATE_LIMIT_PER_MINUTE} requests per minute.",
                        "retry_after": 60
                    }
                )
            else:
                # Increment counter
                await redis_client.incr(rate_limit_key)

        except Exception as e:
            # If Redis fails, allow request (fail open)
            print(f"Rate limit check failed: {e}")

        response = await call_next(request)
        return response
