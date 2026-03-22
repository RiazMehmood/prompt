"""SubscriptionService — tier resolution, usage enforcement, counter management."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from src.db.supabase_client import get_supabase_admin
from src.models.subscription import (
    SubscriptionDetail,
    SubscriptionTier,
    TierDetail,
    TierFeature,
    UpgradePrompt,
    UsageLimits,
    UsageResponse,
)

logger = logging.getLogger(__name__)

# All tier definitions (paid tiers show "Coming Soon" — upgrade_available = False)
TIER_CATALOG: list[TierDetail] = [
    TierDetail(
        tier=SubscriptionTier.basic,
        display_name="Basic (Free)",
        price_pkr_monthly=None,
        limits=UsageLimits.for_tier(SubscriptionTier.basic),
        features=[
            TierFeature(name="5 document generations/day", included=True),
            TierFeature(name="2 uploads/day", included=True),
            TierFeature(name="20 conversations/day", included=True),
            TierFeature(name="PDF & DOCX export", included=True),
            TierFeature(name="Urdu/Sindhi support", included=True),
            TierFeature(name="Priority processing", included=False),
            TierFeature(name="Voice input", included=False),
        ],
        is_available=True,
        highlight=False,
    ),
    TierDetail(
        tier=SubscriptionTier.pro,
        display_name="Pro",
        price_pkr_monthly=1500,
        limits=UsageLimits.for_tier(SubscriptionTier.pro),
        features=[
            TierFeature(name="50 document generations/day", included=True),
            TierFeature(name="20 uploads/day", included=True),
            TierFeature(name="200 conversations/day", included=True),
            TierFeature(name="Priority processing", included=True),
            TierFeature(name="Voice input (Whisper)", included=True),
            TierFeature(name="Full voice conversation", included=False),
        ],
        is_available=False,  # Coming Soon
        highlight=True,
    ),
    TierDetail(
        tier=SubscriptionTier.premium,
        display_name="Premium",
        price_pkr_monthly=3500,
        limits=UsageLimits.for_tier(SubscriptionTier.premium),
        features=[
            TierFeature(name="200 document generations/day", included=True),
            TierFeature(name="All Pro features", included=True),
            TierFeature(name="Full voice conversation", included=True),
            TierFeature(name="Custom templates (5)", included=True),
        ],
        is_available=False,
        highlight=False,
    ),
    TierDetail(
        tier=SubscriptionTier.institutional,
        display_name="Institutional",
        price_pkr_monthly=None,  # Contact sales
        limits=UsageLimits.for_tier(SubscriptionTier.institutional),
        features=[
            TierFeature(name="Unlimited generations", included=True),
            TierFeature(name="Multi-admin panel", included=True),
            TierFeature(name="Custom domain configuration", included=True),
            TierFeature(name="SLA support", included=True),
        ],
        is_available=False,
        highlight=False,
    ),
]


class SubscriptionService:
    """Manages subscription tier resolution and usage limit enforcement."""

    async def get_current(self, user_id: str) -> SubscriptionDetail:
        """Return the user's current subscription with today's usage counters."""
        supabase = get_supabase_admin()
        today = self._today_utc()

        # Fetch subscription row
        sub_resp = (
            supabase.table("subscriptions")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        sub_data = sub_resp.data[0] if sub_resp.data else None
        tier = SubscriptionTier(sub_data["tier"]) if sub_data else SubscriptionTier.basic
        limits = UsageLimits.for_tier(tier)

        # Fetch today's usage counters from usage_logs
        usage = await self._get_today_usage(user_id, today)

        started = (
            datetime.fromisoformat(sub_data["created_at"])
            if sub_data
            else datetime.now(timezone.utc)
        )
        expires = (
            datetime.fromisoformat(sub_data["expiry_date"])
            if sub_data and sub_data.get("expiry_date")
            else None
        )

        docs_gen = usage.get("doc_generations", 0)
        uploads = usage.get("uploads", 0)
        convs = usage.get("conversations", 0)

        return SubscriptionDetail(
            id=sub_data["id"] if sub_data else "free",
            user_id=user_id,
            tier=tier,
            limits=limits,
            started_at=started,
            expires_at=expires,
            is_trial=sub_data.get("is_trial", False) if sub_data else False,
            docs_generated_today=docs_gen,
            uploads_today=uploads,
            conversations_today=convs,
            docs_remaining=max(0, limits.doc_generations_per_day - docs_gen),
            uploads_remaining=max(0, limits.uploads_per_day - uploads),
            conversations_remaining=max(
                0, limits.conversation_messages_per_day - convs
            ),
        )

    async def check_limit(
        self, user_id: str, action: str
    ) -> Optional[UpgradePrompt]:
        """
        Check if the user has remaining quota for `action`.
        Returns UpgradePrompt if the limit is reached, None if quota is available.
        action: 'doc_generation' | 'upload' | 'conversation'
        """
        sub = await self.get_current(user_id)
        today = self._today_utc()

        if action == "doc_generation":
            if sub.docs_generated_today >= sub.limits.doc_generations_per_day:
                return UpgradePrompt(
                    current_tier=sub.tier,
                    limit_type="doc_generations",
                    limit_reached=sub.limits.doc_generations_per_day,
                    upgrade_available=False,
                    message=(
                        f"You've used all {sub.limits.doc_generations_per_day} "
                        f"document generations for today. Limit resets at midnight UTC."
                    ),
                )
        elif action == "upload":
            if sub.uploads_today >= sub.limits.uploads_per_day:
                return UpgradePrompt(
                    current_tier=sub.tier,
                    limit_type="uploads",
                    limit_reached=sub.limits.uploads_per_day,
                    upgrade_available=False,
                    message=(
                        f"You've reached today's upload limit "
                        f"({sub.limits.uploads_per_day} files). Resets at midnight UTC."
                    ),
                )
        elif action == "conversation":
            if sub.conversations_today >= sub.limits.conversation_messages_per_day:
                return UpgradePrompt(
                    current_tier=sub.tier,
                    limit_type="conversations",
                    limit_reached=sub.limits.conversation_messages_per_day,
                    upgrade_available=False,
                    message=(
                        f"You've reached today's conversation limit "
                        f"({sub.limits.conversation_messages_per_day} messages). Resets at midnight UTC."
                    ),
                )
        return None

    async def increment(self, user_id: str, action: str) -> None:
        """Increment usage counter for `action` in usage_logs table."""
        supabase = get_supabase_admin()
        today = self._today_utc()
        await self._upsert_usage(supabase, user_id, today, action)

    async def get_usage(self, user_id: str) -> UsageResponse:
        sub = await self.get_current(user_id)
        today = self._today_utc()
        usage = await self._get_today_usage(user_id, today)
        docs_gen = usage.get("doc_generations", 0)
        uploads = usage.get("uploads", 0)
        convs = usage.get("conversations", 0)
        return UsageResponse(
            tier=sub.tier,
            period_start=datetime.now(timezone.utc).replace(
                hour=0, minute=0, second=0, microsecond=0
            ),
            period_end=sub.expires_at,
            docs_generated_today=docs_gen,
            uploads_today=uploads,
            conversations_today=convs,
            limits=sub.limits,
            docs_remaining=max(0, sub.limits.doc_generations_per_day - docs_gen),
            uploads_remaining=max(0, sub.limits.uploads_per_day - uploads),
            conversations_remaining=max(
                0, sub.limits.conversation_messages_per_day - convs
            ),
        )

    # ── Helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _today_utc() -> str:
        return datetime.now(timezone.utc).strftime("%Y-%m-%d")

    @staticmethod
    async def _get_today_usage(user_id: str, today: str) -> dict[str, int]:
        supabase = get_supabase_admin()
        resp = (
            supabase.table("usage_logs")
            .select("action_type")
            .eq("user_id", user_id)
            .gte("timestamp", f"{today}T00:00:00Z")
            .lte("timestamp", f"{today}T23:59:59Z")
            .execute()
        )
        rows = resp.data or []
        counts: dict[str, int] = {}
        for row in rows:
            action = row.get("action_type", "")
            counts[action] = counts.get(action, 0) + 1
        # Map action_type values to usage keys
        return {
            "doc_generations": counts.get("doc_generation", 0),
            "uploads": counts.get("upload", 0),
            "conversations": counts.get("conversation", 0),
        }

    @staticmethod
    async def _upsert_usage(supabase, user_id: str, today: str, action: str) -> None:
        """Insert a usage event into usage_logs."""
        # Fetch user's domain_id (required NOT NULL in usage_logs)
        profile_resp = (
            supabase.table("profiles").select("domain_id").eq("id", user_id).single().execute()
        )
        domain_id = (profile_resp.data or {}).get("domain_id")
        if not domain_id:
            return  # can't log without a domain assignment
        supabase.table("usage_logs").insert({
            "user_id": user_id,
            "action_type": action,
            "domain_id": domain_id,
            "details": {},
        }).execute()
