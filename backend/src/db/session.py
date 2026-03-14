"""Database session management with async Supabase client."""
from typing import AsyncGenerator
from supabase import Client
from backend.src.db.supabase_client import supabase


async def get_db() -> AsyncGenerator[Client, None]:
    """Dependency for getting database session.

    Yields:
        Client: Supabase client instance
    """
    try:
        yield supabase
    finally:
        # Supabase client handles connection pooling internally
        pass
