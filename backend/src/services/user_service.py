"""UserService: profile management, domain assignment, usage counters."""
from datetime import datetime, timezone
from typing import Optional

import structlog

from src.db.supabase_client import get_supabase_admin
from src.models.user import UserProfile

logger = structlog.get_logger(__name__)


class UserService:
    """Manages user profile data and domain assignment.

    Domain assignment is immutable after first assignment — enforced here and
    documented in data-model.md.
    """

    def __init__(self) -> None:
        self._admin = get_supabase_admin()

    async def get_profile(self, user_id: str) -> UserProfile:
        """Load a user's profile by ID."""
        result = self._admin.table("profiles").select("*").eq("id", user_id).single().execute()
        if not result.data:
            raise ValueError(f"Profile not found: {user_id}")
        d = result.data
        return UserProfile(
            id=d["id"],
            email=d.get("email"),
            phone=d.get("phone"),
            domain_id=d.get("domain_id"),
            subscription_tier=d.get("subscription_tier", "basic"),
            role=d.get("role", "user"),
            document_generation_count=d.get("document_generation_count", 0),
            upload_count=d.get("upload_count", 0),
            created_at=d["created_at"],
            last_login_at=d.get("last_login_at"),
        )

    async def assign_domain(self, user_id: str, domain_id: str) -> UserProfile:
        """Assign a domain to a user. IMMUTABLE — raises if already assigned."""
        profile = await self.get_profile(user_id)
        if profile.domain_id is not None:
            raise ValueError(
                f"Domain already assigned to user {user_id}. "
                "Domain assignment is permanent and cannot be changed."
            )
        # Verify domain exists and is active
        domain = self._admin.table("domains").select("id, status").eq(
            "id", domain_id
        ).single().execute()
        if not domain.data or domain.data.get("status") != "active":
            raise ValueError(f"Domain {domain_id} does not exist or is not active")

        self._admin.table("profiles").update({"domain_id": domain_id}).eq(
            "id", user_id
        ).execute()
        logger.info("domain_assigned", user_id=user_id, domain_id=domain_id)
        return await self.get_profile(user_id)

    async def increment_generation_count(self, user_id: str) -> None:
        """Increment the daily document generation counter for a user."""
        self._admin.rpc(
            "increment_counter",
            {"user_id_param": user_id, "column_name": "document_generation_count"},
        ).execute()

    async def increment_upload_count(self, user_id: str) -> None:
        """Increment the daily document upload counter for a user."""
        self._admin.rpc(
            "increment_counter",
            {"user_id_param": user_id, "column_name": "upload_count"},
        ).execute()

    async def check_generation_limit(self, user_id: str, tier_limits: dict) -> bool:
        """Return True if user is within their tier's daily generation limit."""
        profile = await self.get_profile(user_id)
        tier = profile.subscription_tier.value
        limit = tier_limits.get(tier, tier_limits.get("basic", 5))
        return profile.document_generation_count < limit
