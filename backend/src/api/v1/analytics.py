"""Analytics router — overview, subscriptions, documents, domains, tokens."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, Query

from src.api.dependencies import RootAdminUser
from src.services.analytics_service import AnalyticsService

router = APIRouter()
_service = AnalyticsService()

OptDate = Annotated[Optional[str], Query()]
OptDomain = Annotated[Optional[str], Query()]


def _default_dates() -> tuple[str, str]:
    """Default: last 30 days."""
    now = datetime.now(timezone.utc)
    return (
        (now - timedelta(days=30)).strftime("%Y-%m-%d"),
        now.strftime("%Y-%m-%d"),
    )


@router.get("/overview")
async def overview(
    _admin: RootAdminUser,
    from_date: OptDate = None,
    to_date: OptDate = None,
    domain_id: OptDomain = None,
):
    d_from, d_to = _default_dates()
    return await _service.get_overview(from_date or d_from, to_date or d_to, domain_id)


@router.get("/subscriptions")
async def subscriptions(
    _admin: RootAdminUser,
    from_date: OptDate = None,
    to_date: OptDate = None,
    domain_id: OptDomain = None,
):
    d_from, d_to = _default_dates()
    return await _service.get_subscription_stats(from_date or d_from, to_date or d_to, domain_id)


@router.get("/documents")
async def documents(
    _admin: RootAdminUser,
    from_date: OptDate = None,
    to_date: OptDate = None,
    domain_id: OptDomain = None,
):
    d_from, d_to = _default_dates()
    return await _service.get_document_stats(from_date or d_from, to_date or d_to, domain_id)


@router.get("/domains")
async def domains(
    _admin: RootAdminUser,
    from_date: OptDate = None,
    to_date: OptDate = None,
):
    d_from, d_to = _default_dates()
    return await _service.get_domain_stats(from_date or d_from, to_date or d_to)


@router.get("/tokens")
async def tokens(
    _admin: RootAdminUser,
    from_date: OptDate = None,
    to_date: OptDate = None,
):
    d_from, d_to = _default_dates()
    return await _service.get_token_stats(from_date or d_from, to_date or d_to)
