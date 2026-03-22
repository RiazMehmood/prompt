"""AnalyticsAgent LangGraph node — aggregates platform metrics for the analytics dashboard."""
from __future__ import annotations

from datetime import date, timedelta
from typing import Any, Dict, Optional

import structlog

from src.db.supabase_client import get_supabase_admin

logger = structlog.get_logger(__name__)


async def analytics_agent_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """LangGraph node that aggregates usage metrics from Supabase tables.

    Reads: state["from_date"], state["to_date"], state["domain_id"] (optional)
    Writes: state["analytics_result"] with aggregated metrics.

    All aggregation runs directly against Supabase (no separate OLAP store).
    """
    from_date: str = state.get("from_date") or str(date.today() - timedelta(days=30))
    to_date: str = state.get("to_date") or str(date.today())
    domain_id: Optional[str] = state.get("domain_id")

    logger.info("analytics_agent_start", from_date=from_date, to_date=to_date, domain_id=domain_id)

    admin = get_supabase_admin()

    # ── Active users ──────────────────────────────────────────────────────────
    profile_q = admin.table("profiles").select("id", count="exact").gte(
        "last_login_at", from_date
    ).lte("last_login_at", to_date + "T23:59:59Z")
    if domain_id:
        profile_q = profile_q.eq("domain_id", domain_id)
    active_users = (profile_q.execute().count or 0)

    # ── Total registered users ────────────────────────────────────────────────
    total_users_q = admin.table("profiles").select("id", count="exact")
    if domain_id:
        total_users_q = total_users_q.eq("domain_id", domain_id)
    total_users = (total_users_q.execute().count or 0)

    # ── Generation volume ─────────────────────────────────────────────────────
    gen_q = admin.table("generated_documents").select("id", count="exact").gte(
        "created_at", from_date
    ).lte("created_at", to_date + "T23:59:59Z")
    if domain_id:
        gen_q = gen_q.eq("domain_id", domain_id)
    generation_count = (gen_q.execute().count or 0)

    # ── Upload volume ─────────────────────────────────────────────────────────
    upload_q = admin.table("documents").select("id", count="exact").gte(
        "created_at", from_date
    ).lte("created_at", to_date + "T23:59:59Z")
    if domain_id:
        upload_q = upload_q.eq("domain_id", domain_id)
    upload_count = (upload_q.execute().count or 0)

    # ── Subscription tier breakdown ───────────────────────────────────────────
    tier_data: Dict[str, int] = {}
    for tier in ("basic", "pro", "premium", "institutional"):
        t_q = admin.table("profiles").select("id", count="exact").eq("subscription_tier", tier)
        if domain_id:
            t_q = t_q.eq("domain_id", domain_id)
        tier_data[tier] = t_q.execute().count or 0

    # ── Churn estimate (subscriptions expired, not renewed in window) ─────────
    churn_q = admin.table("subscriptions").select("id", count="exact").eq(
        "status", "expired"
    ).gte("updated_at", from_date).lte("updated_at", to_date + "T23:59:59Z")
    churn_count = (churn_q.execute().count or 0)
    churn_rate = round((churn_count / max(total_users, 1)) * 100, 2)

    # ── Token redemptions ─────────────────────────────────────────────────────
    token_q = admin.table("token_usage").select("id", count="exact").gte(
        "used_at", from_date
    ).lte("used_at", to_date + "T23:59:59Z")
    token_redemptions = (token_q.execute().count or 0)

    result = {
        "period": {"from": from_date, "to": to_date},
        "active_users": active_users,
        "total_users": total_users,
        "generation_count": generation_count,
        "upload_count": upload_count,
        "tier_distribution": tier_data,
        "churn_count": churn_count,
        "churn_rate_pct": churn_rate,
        "token_redemptions": token_redemptions,
    }

    logger.info("analytics_agent_complete", result_keys=list(result.keys()))
    return {**state, "analytics_result": result}
