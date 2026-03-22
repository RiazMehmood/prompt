"""Error tracking integration (Sentry / free-tier compatible) with tenant context."""
from __future__ import annotations

import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)

_sentry_available = False

try:
    import sentry_sdk
    from sentry_sdk.integrations.fastapi import FastApiIntegration
    from sentry_sdk.integrations.asyncio import AsyncioIntegration
    _sentry_available = True
except ImportError:
    logger.info("sentry-sdk not installed; error tracking disabled")


def init_error_tracking(dsn: Optional[str] = None, environment: str = "development") -> None:
    """
    Initialize Sentry SDK with FastAPI + asyncio integrations.
    No-op if sentry-sdk is not installed or DSN not provided.
    """
    if not _sentry_available:
        return

    effective_dsn = dsn or os.environ.get("SENTRY_DSN")
    if not effective_dsn:
        logger.info("SENTRY_DSN not set; skipping Sentry init")
        return

    sentry_sdk.init(
        dsn=effective_dsn,
        integrations=[
            FastApiIntegration(transaction_style="endpoint"),
            AsyncioIntegration(),
        ],
        environment=environment,
        traces_sample_rate=0.1,  # 10% performance traces (free tier budget)
        send_default_pii=False,  # No PII to Sentry
    )
    logger.info("Sentry initialized (env=%s)", environment)


def set_request_context(tenant_id: Optional[str], request_id: Optional[str]) -> None:
    """Attach tenant and request IDs to all events in current scope."""
    if not _sentry_available:
        return
    with sentry_sdk.configure_scope() as scope:
        if tenant_id:
            scope.set_tag("tenant_id", tenant_id)
            scope.set_user({"id": tenant_id})
        if request_id:
            scope.set_tag("request_id", request_id)


def capture_exception(exc: Exception, extra: Optional[dict[str, Any]] = None) -> None:
    """Capture an exception with optional extra context."""
    if not _sentry_available:
        logger.error("Unhandled exception: %s", exc, exc_info=True)
        return
    with sentry_sdk.push_scope() as scope:
        if extra:
            for key, value in extra.items():
                scope.set_extra(key, value)
        sentry_sdk.capture_exception(exc)


def capture_message(message: str, level: str = "info", extra: Optional[dict] = None) -> None:
    """Capture a custom message event."""
    if not _sentry_available:
        logger.log(getattr(logging, level.upper(), logging.INFO), message)
        return
    sentry_sdk.capture_message(message, level=level)
