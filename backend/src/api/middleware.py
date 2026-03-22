"""Global HTTP error taxonomy and middleware registration."""
import time
import uuid
from collections import defaultdict
from typing import Any

import structlog
from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

logger = structlog.get_logger(__name__)

# ── In-process rate limiter (token bucket per key) ────────────────────────────
# For production, replace with Redis-backed sliding window.
_rate_buckets: dict[str, list[float]] = defaultdict(list)

# (max_requests, window_seconds)
_FREE_TIER_LIMIT = (60, 60)    # 60 req/min for free tier
_PAID_TIER_LIMIT = (300, 60)   # 300 req/min for paid tiers
_ADMIN_TIER_LIMIT = (600, 60)  # 600 req/min for admins (no practical limit)
_AUTH_IP_LIMIT = (100, 3600)   # 100 req/hour per IP for auth endpoints

_AUTH_PATHS = {"/auth/login", "/auth/register", "/auth/verify", "/auth/refresh"}


def _is_rate_limited(key: str, max_requests: int, window_seconds: float) -> bool:
    """Sliding window rate check. Returns True if the request should be blocked."""
    now = time.monotonic()
    window_start = now - window_seconds
    bucket = _rate_buckets[key]
    # Evict expired timestamps
    while bucket and bucket[0] < window_start:
        bucket.pop(0)
    if len(bucket) >= max_requests:
        return True
    bucket.append(now)
    return False


def _error_response(
    status_code: int,
    code: str,
    message: str,
    details: Any = None,
    request_id: str | None = None,
) -> JSONResponse:
    body: dict[str, Any] = {
        "error": {
            "code": code,
            "message": message,
            "request_id": request_id,
        }
    }
    if details is not None:
        body["error"]["details"] = details
    return JSONResponse(status_code=status_code, content=body)


def register_exception_handlers(app: FastAPI) -> None:
    """Attach global exception handlers to the FastAPI app."""

    @app.middleware("http")
    async def request_id_middleware(request: Request, call_next: Any) -> Any:
        request_id = str(uuid.uuid4())
        structlog.contextvars.clear_contextvars()
        structlog.contextvars.bind_contextvars(
            request_id=request_id,
            method=request.method,
            path=request.url.path,
        )
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

    @app.middleware("http")
    async def rate_limit_middleware(request: Request, call_next: Any) -> Any:
        """Apply per-tenant and per-IP rate limits.

        - Auth endpoints: 100 req/hour per IP
        - Free tier users: 10 req/min (resolved from Authorization JWT sub)
        - Paid/admin users: 100 req/min
        Falls back to IP-based limiting if no JWT present.
        """
        client_ip = request.client.host if request.client else "unknown"
        path = request.url.path

        # Auth endpoint rate limit (IP-based)
        if path in _AUTH_PATHS:
            if _is_rate_limited(f"auth:{client_ip}", *_AUTH_IP_LIMIT):
                logger.warning("rate_limited_auth", ip=client_ip, path=path)
                return JSONResponse(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    content={
                        "error": {
                            "code": "RATE_LIMITED",
                            "message": "Too many authentication attempts. Try again later.",
                        }
                    },
                    headers={"Retry-After": "3600"},
                )

        # Per-user rate limit (uses JWT sub as key; fallback to IP)
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            from jose import jwt as _jwt
            from src.config import settings
            try:
                token = auth_header.removeprefix("Bearer ").strip()
                payload = _jwt.decode(
                    token,
                    settings.JWT_SECRET,
                    algorithms=[settings.JWT_ALGORITHM],
                    options={"verify_aud": False, "verify_exp": False},
                )
                user_id = payload.get("sub", client_ip)
                tier = payload.get("subscription_tier", "basic")
                role = payload.get("role", "user")
            except Exception:
                user_id = client_ip
                tier = "basic"
                role = "user"
        else:
            user_id = client_ip
            tier = "basic"
            role = "user"

        if role in ("root_admin", "domain_admin"):
            limit = _ADMIN_TIER_LIMIT
        elif tier in ("basic", None):
            limit = _FREE_TIER_LIMIT
        else:
            limit = _PAID_TIER_LIMIT
        if _is_rate_limited(f"user:{user_id}", *limit):
            logger.warning("rate_limited_user", user_id=user_id, tier=tier, path=path)
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={
                    "error": {
                        "code": "RATE_LIMITED",
                        "message": "Request rate limit exceeded. Please slow down.",
                    }
                },
                headers={"Retry-After": "60"},
            )

        return await call_next(request)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        logger.warning("validation_error", errors=exc.errors())
        return _error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="VALIDATION_ERROR",
            message="Request validation failed",
            details=exc.errors(),
        )

    @app.exception_handler(ValidationError)
    async def pydantic_error_handler(
        request: Request, exc: ValidationError
    ) -> JSONResponse:
        logger.warning("pydantic_error", errors=exc.errors())
        return _error_response(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            code="SCHEMA_ERROR",
            message="Schema validation failed",
            details=exc.errors(),
        )

    @app.exception_handler(PermissionError)
    async def permission_error_handler(
        request: Request, exc: PermissionError
    ) -> JSONResponse:
        logger.warning("permission_denied", detail=str(exc))
        return _error_response(
            status_code=status.HTTP_403_FORBIDDEN,
            code="FORBIDDEN",
            message=str(exc) or "Access denied",
        )

    @app.exception_handler(ValueError)
    async def value_error_handler(request: Request, exc: ValueError) -> JSONResponse:
        logger.warning("value_error", detail=str(exc))
        return _error_response(
            status_code=status.HTTP_400_BAD_REQUEST,
            code="BAD_REQUEST",
            message=str(exc),
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("unhandled_error", error=str(exc), exc_info=True)
        return _error_response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            code="INTERNAL_ERROR",
            message="An unexpected error occurred",
        )
