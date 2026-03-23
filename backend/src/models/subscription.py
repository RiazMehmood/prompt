"""Subscription Pydantic models for billing and usage limits."""
from __future__ import annotations

from enum import Enum
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class SubscriptionTier(str, Enum):
    free_trial = "free_trial"
    basic = "basic"
    pro = "pro"
    premium = "premium"
    institutional = "institutional"


class UsageLimits(BaseModel):
    """Usage limits per subscription tier. Period is 'weekly' or 'daily'."""

    doc_generations_per_day: int = Field(
        ..., description="Max document generations per period"
    )
    uploads_per_day: int = Field(..., description="Max document uploads per period")
    conversation_messages_per_day: int = Field(
        ..., description="Max conversation messages per period"
    )
    max_active_documents: int = Field(
        ..., description="Max documents in personal knowledge base"
    )
    limit_period: str = Field(default="daily", description="'daily' or 'weekly'")
    languages: list[str] = Field(default_factory=lambda: ["english", "urdu", "sindhi"])
    max_pages_per_generation: Optional[int] = Field(
        default=None, description="Max pages per document generation (None = unlimited)"
    )

    @classmethod
    def for_tier(cls, tier: SubscriptionTier) -> "UsageLimits":
        limits = {
            SubscriptionTier.free_trial: cls(
                doc_generations_per_day=2,
                uploads_per_day=2,
                conversation_messages_per_day=20,
                max_active_documents=5,
                limit_period="weekly",
                languages=["english"],
                max_pages_per_generation=5,
            ),
            SubscriptionTier.basic: cls(
                doc_generations_per_day=5,
                uploads_per_day=2,
                conversation_messages_per_day=20,
                max_active_documents=10,
                limit_period="daily",
                languages=["english", "urdu", "sindhi"],
            ),
            SubscriptionTier.pro: cls(
                doc_generations_per_day=50,
                uploads_per_day=20,
                conversation_messages_per_day=200,
                max_active_documents=100,
                limit_period="daily",
                languages=["english", "urdu", "sindhi"],
            ),
            SubscriptionTier.premium: cls(
                doc_generations_per_day=200,
                uploads_per_day=100,
                conversation_messages_per_day=1000,
                max_active_documents=500,
                limit_period="daily",
                languages=["english", "urdu", "sindhi"],
            ),
            SubscriptionTier.institutional: cls(
                doc_generations_per_day=10000,
                uploads_per_day=1000,
                conversation_messages_per_day=50000,
                max_active_documents=10000,
                limit_period="daily",
                languages=["english", "urdu", "sindhi"],
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
