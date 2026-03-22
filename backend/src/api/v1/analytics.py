"""Analytics router — overview, subscriptions, documents, domains, tokens."""
from __future__ import annotations

from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, Query

from src.api.dependencies import require_admin
from src.services.analytics_service import AnalyticsService

router = APIRouter()
_service = AnalyticsService()


def _default_dates() -> tuple[str, str]:
    """Default: last 30 days."""
    now = datetime.now(timezone.utc)
    return (
        (now - timedelta(days=30)).strftime("%Y-%m-%d"),
        now.strftime("%Y-%m-%d"),
    )


@router.get("/overview")
async def overview(
    from_date: Optional[str] = Query(default=None),
    to_date: Optional[str] = Query(default=None),
    domain_id: Optional[str] = Query(default=None),
    _admin: dict = Depends(require_admin),
):
    d_from, d_to = _default_dates()
    return await _service.get_overview(from_date or d_from, to_date or d_to, domain_id)


@router.get("/subscriptions")
async def subscriptions(
    from_date: Optional[str] = Query(default=None),
    to_date: Optional[str] = Query(default=None),
    domain_id: Optional[str] = Query(default=None),
    _admin: dict = Depends(require_admin),
):
    d_from, d_to = _default_dates()
    return await _service.get_subscription_stats(from_date or d_from, to_date or d_to, domain_id)


@router.get("/documents")
async def documents(
    from_date: Optional[str] = Query(default=None),
    to_date: Optional[str] = Query(default=None),
    domain_id: Optional[str] = Query(default=None),
    _admin: dict = Depends(require_admin),
):
    d_from, d_to = _default_dates()
    return await _service.get_document_stats(from_date or d_from, to_date or d_to, domain_id)


@router.get("/domains")
async def domains(
    from_date: Optional[str] = Query(default=None),
    to_date: Optional[str] = Query(default=None),
    _admin: dict = Depends(require_admin),
):
    d_from, d_to = _default_dates()
    return await _service.get_domain_stats(from_date or d_from, to_date or d_to)


@router.get("/tokens")
async def tokens(
    from_date: Optional[str] = Query(default=None),
    to_date: Optional[str] = Query(default=None),
    _admin: dict = Depends(require_admin),
):
    d_from, d_to = _default_dates()
    return await _service.get_token_stats(from_date or d_from, to_date or d_to)
