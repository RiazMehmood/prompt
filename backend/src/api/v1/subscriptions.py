"""Subscription router: current tier, usage, and tier catalog."""
from __future__ import annotations

from fastapi import APIRouter, Depends

from src.api.dependencies import CurrentUser
from src.models.subscription import SubscriptionDetail, TierDetail, UsageResponse
from src.services.subscriptions.subscription_service import TIER_CATALOG, SubscriptionService

router = APIRouter()
_service = SubscriptionService()


@router.get("/current", response_model=SubscriptionDetail)
async def get_current_subscription(current_user: CurrentUser):
    """Return the authenticated user's active subscription and today's usage counters."""
    return await _service.get_current(current_user.id)


@router.get("/tiers", response_model=list[TierDetail])
async def list_tiers():
    """Return all subscription tiers with pricing and feature lists (public endpoint)."""
    return TIER_CATALOG


@router.get("/usage", response_model=UsageResponse)
async def get_usage(current_user: CurrentUser):
    """Return today's usage counters and remaining quota for the authenticated user."""
    return await _service.get_usage(current_user.id)
