"""AnalyticsService — aggregate metrics across subscriptions, documents, and tokens."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from src.db.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)


class AnalyticsService:
    """
    Computes analytics metrics from raw Supabase data.
    All queries are read-only against the service-role client.
    Filters: date range (from_date, to_date) and optional domain_id.
    """

    async def get_overview(
        self,
        from_date: str,
        to_date: str,
        domain_id: Optional[str] = None,
    ) -> dict:
        """Top-level KPIs: total users, docs generated, subscriptions, active tokens."""
        supabase = get_supabase_admin()

        users_q = supabase.table("profiles").select("id", count="exact")
        if domain_id:
            users_q = users_q.eq("domain_id", domain_id)
        users_resp = users_q.execute()

        docs_q = (
            supabase.table("generated_documents")
            .select("id", count="exact")
            .gte("created_at", from_date)
            .lte("created_at", to_date)
        )
        if domain_id:
            docs_q = docs_q.eq("domain_id", domain_id)
        docs_resp = docs_q.execute()

        sub_q = supabase.table("subscriptions").select("id, tier", count="exact").eq("status", "active")
        sub_resp = sub_q.execute()

        tokens_q = (
            supabase.table("token_usage")
            .select("id", count="exact")
            .gte("redemption_date", from_date)
            .lte("redemption_date", to_date)
        )
        tokens_resp = tokens_q.execute()

        return {
            "total_users": users_resp.count or 0,
            "docs_generated": docs_resp.count or 0,
            "active_subscriptions": sub_resp.count or 0,
            "token_redemptions": tokens_resp.count or 0,
            "from_date": from_date,
            "to_date": to_date,
        }

    async def get_subscription_stats(
        self, from_date: str, to_date: str, domain_id: Optional[str] = None
    ) -> dict:
        """Subscription tier distribution and churn estimate."""
        supabase = get_supabase_admin()

        all_subs = supabase.table("subscriptions").select("tier, status, expiry_date").execute()
        rows = all_subs.data or []

        tier_counts: dict[str, int] = {}
        expired_count = 0
        now = datetime.now(timezone.utc)

        for row in rows:
            tier = row.get("tier", "basic")
            tier_counts[tier] = tier_counts.get(tier, 0) + 1
            expires = row.get("expiry_date")
            if expires:
                exp_dt = datetime.fromisoformat(expires).replace(tzinfo=timezone.utc)
                if exp_dt < now and row.get("status") != "active":
                    expired_count += 1

        total = len(rows) or 1
        churn_rate = round(expired_count / total * 100, 1)

        return {
            "tier_distribution": [
                {"tier": k, "count": v} for k, v in tier_counts.items()
            ],
            "churn_rate_pct": churn_rate,
            "total_subscriptions": len(rows),
            "expired_not_renewed": expired_count,
        }

    async def get_document_stats(
        self, from_date: str, to_date: str, domain_id: Optional[str] = None
    ) -> dict:
        """Document generation volume by date."""
        supabase = get_supabase_admin()

        q = (
            supabase.table("generated_documents")
            .select("created_at, validation_status, domain_id")
            .gte("created_at", from_date)
            .lte("created_at", to_date)
        )
        if domain_id:
            q = q.eq("domain_id", domain_id)

        resp = q.execute()
        rows = resp.data or []

        # Aggregate by date
        by_date: dict[str, int] = {}
        status_counts: dict[str, int] = {}
        for row in rows:
            date = row["created_at"][:10]
            by_date[date] = by_date.get(date, 0) + 1
            st = row.get("validation_status", "unknown")
            status_counts[st] = status_counts.get(st, 0) + 1

        return {
            "total": len(rows),
            "by_date": [{"date": d, "count": c} for d, c in sorted(by_date.items())],
            "by_status": [{"status": s, "count": c} for s, c in status_counts.items()],
        }

    async def get_domain_stats(
        self, from_date: str, to_date: str
    ) -> dict:
        """Per-domain: active users, docs generated, top templates."""
        supabase = get_supabase_admin()

        domains_resp = supabase.table("domains").select("id, name").eq("status", "active").execute()
        domains = domains_resp.data or []

        result = []
        for domain in domains:
            did = domain["id"]

            users_resp = (
                supabase.table("profiles")
                .select("id", count="exact")
                .eq("domain_id", did)
                .execute()
            )
            docs_resp = (
                supabase.table("generated_documents")
                .select("id", count="exact")
                .eq("domain_id", did)
                .gte("created_at", from_date)
                .lte("created_at", to_date)
                .execute()
            )

            result.append({
                "domain_id": did,
                "domain_name": domain["name"],
                "active_users": users_resp.count or 0,
                "docs_generated": docs_resp.count or 0,
            })

        return {"domains": result}

    async def get_token_stats(
        self, from_date: str, to_date: str
    ) -> dict:
        """Token redemption rates and revenue impact."""
        supabase = get_supabase_admin()

        tokens_resp = (
            supabase.table("promotional_tokens")
            .select("*, domain:domains(name)")
            .execute()
        )
        tokens = tokens_resp.data or []

        result = []
        for token in tokens:
            usage_resp = (
                supabase.table("token_usage")
                .select("id", count="exact")
                .eq("token_id", token["id"])
                .gte("used_at", from_date)
                .lte("used_at", to_date)
                .execute()
            )
            period_uses = usage_resp.count or 0
            redemption_rate = round(
                period_uses / max(token["max_uses"], 1) * 100, 1
            )

            result.append({
                "code": token["code"],
                "discount_type": token["discount_type"],
                "discount_value": token["discount_value"],
                "total_uses": token.get("used_count", 0),
                "period_uses": period_uses,
                "remaining_uses": token["max_uses"] - token.get("used_count", 0),
                "redemption_rate_pct": redemption_rate,
                "domain_name": (token.get("domain") or {}).get("name"),
                "valid_until": token["valid_until"],
            })

        return {"tokens": result, "total_redemptions_in_period": sum(t["period_uses"] for t in result)}
