"""TokenService — validate and apply promotional tokens with atomic usage counting."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Optional

from fastapi import HTTPException, status

from src.db.supabase_client import get_supabase_admin
from src.models.promo_token import (
    PromoTokenResponse,
    TokenApplicationResult,
    TokenCreate,
    TokenValidationResult,
)

logger = logging.getLogger(__name__)


class TokenService:
    """Handles promo token lifecycle: creation, validation preview, application."""

    async def create_token(self, data: TokenCreate) -> PromoTokenResponse:
        supabase = get_supabase_admin()

        # Duplicate code check
        existing = (
            supabase.table("promotional_tokens")
            .select("id")
            .eq("code", data.code)
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Token code '{data.code}' already exists",
            )

        row = {
            "code": data.code,
            "discount_type": data.discount_type.value,
            "discount_value": data.discount_value,
            "max_uses": data.max_uses,
            "max_uses_per_user": data.max_uses_per_user,
            "domain_id": data.domain_id,
            "valid_from": data.valid_from.isoformat(),
            "valid_until": data.valid_until.isoformat(),
            "description": data.description,
            "used_count": 0,
            "is_active": True,
        }
        resp = supabase.table("promotional_tokens").insert(row).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Token creation failed")
        return self._to_response(resp.data[0])

    async def validate(
        self, code: str, user_id: str, user_domain_id: Optional[str] = None
    ) -> TokenValidationResult:
        """Preview token benefit without recording usage."""
        supabase = get_supabase_admin()
        code = code.strip().upper()
        now = datetime.now(timezone.utc)

        # Fetch token
        resp = (
            supabase.table("promotional_tokens")
            .select("*")
            .eq("code", code)
            .limit(1)
            .execute()
        )
        if not resp.data:
            return TokenValidationResult(valid=False, code=code, error="Invalid token code")

        token = resp.data[0]

        # Check active
        if not token.get("is_active"):
            return TokenValidationResult(valid=False, code=code, error="Token is no longer active")

        # Check date range
        valid_from = datetime.fromisoformat(token["valid_from"]).replace(tzinfo=timezone.utc)
        valid_until = datetime.fromisoformat(token["valid_until"]).replace(tzinfo=timezone.utc)
        if now < valid_from:
            return TokenValidationResult(valid=False, code=code, error="Token is not yet valid")
        if now > valid_until:
            return TokenValidationResult(valid=False, code=code, error="Token has expired")

        # Check usage limit
        if token["used_count"] >= token["max_uses"]:
            return TokenValidationResult(valid=False, code=code, error="Token usage limit reached")

        # Check domain restriction
        if token.get("domain_id") and user_domain_id and token["domain_id"] != user_domain_id:
            return TokenValidationResult(
                valid=False, code=code, error="Token is not valid for your domain"
            )

        # Check per-user limit
        usage_resp = (
            supabase.table("token_usage")
            .select("id", count="exact")
            .eq("token_id", token["id"])
            .eq("user_id", user_id)
            .execute()
        )
        user_uses = usage_resp.count or 0
        if user_uses >= token["max_uses_per_user"]:
            return TokenValidationResult(
                valid=False,
                code=code,
                error="You have already used this token",
                already_used=True,
            )

        return TokenValidationResult(
            valid=True,
            code=code,
            discount_type=token["discount_type"],
            discount_value=token["discount_value"],
            description=token.get("description", ""),
            remaining_uses=token["max_uses"] - token["used_count"],
        )

    async def apply(
        self, code: str, user_id: str, user_domain_id: Optional[str] = None
    ) -> TokenApplicationResult:
        """Apply token: validate, record usage, increment counter atomically."""
        validation = await self.validate(code, user_id, user_domain_id)
        if not validation.valid:
            return TokenApplicationResult(
                success=False, code=code, benefit_applied="", error=validation.error
            )

        supabase = get_supabase_admin()

        # Fetch token id
        token_resp = (
            supabase.table("promotional_tokens")
            .select("id, used_count, max_uses")
            .eq("code", code.upper())
            .limit(1)
            .execute()
        )
        if not token_resp.data:
            return TokenApplicationResult(success=False, code=code, benefit_applied="", error="Token not found")

        token = token_resp.data[0]

        # Atomic increment via RPC
        supabase.rpc(
            "increment_token_usage",
            {"p_token_id": token["id"], "p_user_id": user_id},
        ).execute()

        # Build benefit description
        dtype = validation.discount_type
        dval = validation.discount_value
        if dtype == "percentage":
            benefit = f"{dval:.0f}% discount applied"
        elif dtype == "flat_pkr":
            benefit = f"PKR {dval:.0f} credit applied"
        else:
            benefit = f"{dval:.0f}-day tier upgrade applied"

        logger.info("Token applied: code=%s user=%s benefit=%s", code, user_id, benefit)
        return TokenApplicationResult(success=True, code=code, benefit_applied=benefit)

    async def list_tokens(self) -> list[PromoTokenResponse]:
        supabase = get_supabase_admin()
        resp = (
            supabase.table("promotional_tokens")
            .select("*, domain:domains(name)")
            .order("created_at", desc=True)
            .execute()
        )
        return [self._to_response(row) for row in (resp.data or [])]

    # ── Private ───────────────────────────────────────────────────────────────

    @staticmethod
    def _to_response(row: dict) -> PromoTokenResponse:
        domain = row.get("domain") or {}
        return PromoTokenResponse(
            id=row["id"],
            code=row["code"],
            discount_type=row["discount_type"],
            discount_value=row["discount_value"],
            max_uses=row["max_uses"],
            used_count=row.get("used_count", 0),
            remaining_uses=row["max_uses"] - row.get("used_count", 0),
            max_uses_per_user=row.get("max_uses_per_user", 1),
            domain_id=row.get("domain_id"),
            domain_name=domain.get("name"),
            valid_from=datetime.fromisoformat(row["valid_from"]),
            valid_until=datetime.fromisoformat(row["valid_until"]),
            description=row.get("description", ""),
            is_active=row.get("is_active", True),
            created_at=datetime.fromisoformat(row["created_at"]),
        )
