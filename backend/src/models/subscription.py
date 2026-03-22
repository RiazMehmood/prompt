"""Subscription Pydantic models for billing and usage limits."""
from __future__ import annotations

from enum import Enum
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SubscriptionTier(str, Enum):
    basic = "basic"
    pro = "pro"
    premium = "premium"
    institutional = "institutional"


class UsageLimits(BaseModel):
    """Daily usage limits per subscription tier."""

    doc_generations_per_day: int = Field(
        ..., description="Max document generations per calendar day (UTC)"
    )
    uploads_per_day: int = Field(..., description="Max document uploads per calendar day")
    conversation_messages_per_day: int = Field(
        ..., description="Max conversation API calls per day"
    )
    max_active_documents: int = Field(
        ..., description="Max documents in personal knowledge base"
    )

    @classmethod
    def for_tier(cls, tier: SubscriptionTier) -> "UsageLimits":
        limits = {
            SubscriptionTier.basic: cls(
                doc_generations_per_day=5,
                uploads_per_day=2,
                conversation_messages_per_day=20,
                max_active_documents=10,
            ),
            SubscriptionTier.pro: cls(
                doc_generations_per_day=50,
                uploads_per_day=20,
                conversation_messages_per_day=200,
                max_active_documents=100,
            ),
            SubscriptionTier.premium: cls(
                doc_generations_per_day=200,
                uploads_per_day=100,
                conversation_messages_per_day=1000,
                max_active_documents=500,
            ),
            SubscriptionTier.institutional: cls(
                doc_generations_per_day=10000,
                uploads_per_day=1000,
                conversation_messages_per_day=50000,
                max_active_documents=10000,
            ),
        }
        return limits[tier]


class TierFeature(BaseModel):
    name: str
    included: bool
    note: Optional[str] = None


class TierDetail(BaseModel):
    """Public tier information shown on subscription screens."""

    tier: SubscriptionTier
    display_name: str
    price_pkr_monthly: Optional[int] = None  # None = free
    limits: UsageLimits
    features: list[TierFeature]
    is_available: bool = True  # False = "Coming Soon"
    highlight: bool = False  # Recommended badge


class SubscriptionDetail(BaseModel):
    """Current user subscription state."""

    id: str
    user_id: str
    tier: SubscriptionTier
    limits: UsageLimits
    started_at: datetime
    expires_at: Optional[datetime] = None
    is_trial: bool = False

    # Today's usage counters (reset at midnight UTC)
    docs_generated_today: int = 0
    uploads_today: int = 0
    conversations_today: int = 0

    # Remaining today
    docs_remaining: int = 0
    uploads_remaining: int = 0
    conversations_remaining: int = 0


class UsageResponse(BaseModel):
    """Usage stats for the current billing period."""

    tier: SubscriptionTier
    period_start: datetime
    period_end: Optional[datetime]
    docs_generated_today: int
    uploads_today: int
    conversations_today: int
    limits: UsageLimits
    docs_remaining: int
    uploads_remaining: int
    conversations_remaining: int


class UpgradePrompt(BaseModel):
    """Returned when a 429 usage limit is hit."""

    current_tier: SubscriptionTier
    limit_type: str  # "doc_generations" | "uploads" | "conversations"
    limit_reached: int
    upgrade_available: bool = False  # False = "Coming Soon"
    message: str
