"""Supabase client singleton with service-role and anon-key modes.

Connection strategy
-------------------
Supabase's Python client uses httpx under the hood for REST requests and
the realtime WS library for subscriptions.  We use lru_cache to return
a single shared instance per key type — this avoids per-request TCP
connection overhead and aligns with httpx's built-in connection pooling.

For direct PostgreSQL access (e.g., bulk writes, migrations), use the
DATABASE_URL with PgBouncer in transaction mode.  The pool limits below
are applied when DATABASE_URL is accessed via SQLAlchemy or asyncpg:

    pool_size=5         — keep 5 idle connections per worker process
    max_overflow=10     — allow 10 additional connections under burst load
    pool_timeout=30     — wait up to 30s for a free connection
    pool_recycle=1800   — recycle connections after 30 min to avoid stale TCP

These settings are intentionally conservative for the free-tier DigitalOcean
droplet (1 GB RAM) while still supporting concurrent request bursts.
"""
from functools import lru_cache

import structlog
from supabase import Client, create_client

from src.config import settings

logger = structlog.get_logger(__name__)

# Pool parameters exposed as module constants so they can be imported by any
# asyncpg / SQLAlchemy setup that needs direct DB access.
DB_POOL_SIZE = 5
DB_MAX_OVERFLOW = 10
DB_POOL_TIMEOUT = 30
DB_POOL_RECYCLE = 1800  # seconds


@lru_cache(maxsize=1)
def get_supabase_client() -> Client:
    """Return the Supabase anon-key client (user-facing requests, respects RLS)."""
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)
    logger.debug("supabase_client_created", mode="anon")
    return client


@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    """Return the Supabase service-role client (admin operations, bypasses RLS)."""
    client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    logger.debug("supabase_client_created", mode="service_role")
    return client
