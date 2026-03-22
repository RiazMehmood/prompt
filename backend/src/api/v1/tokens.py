"""Promotional token router."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query

from src.api.dependencies import get_current_user, require_admin
from src.models.promo_token import (
    PromoTokenResponse,
    TokenApplicationResult,
    TokenCreate,
    TokenValidation,
    TokenValidationResult,
)
from src.services.token_service import TokenService

router = APIRouter()
_service = TokenService()


@router.post("/tokens/validate", response_model=TokenValidationResult)
async def validate_token(
    body: TokenValidation,
    current_user: dict = Depends(get_current_user),
):
    """Preview the benefit of a token without recording usage."""
    return await _service.validate(
        code=body.code,
        user_id=current_user["user_id"],
        user_domain_id=current_user.get("domain_id"),
    )


@router.post("/tokens/apply", response_model=TokenApplicationResult)
async def apply_token(
    body: TokenValidation,
    current_user: dict = Depends(get_current_user),
):
    """Apply a token and record usage. Atomic — idempotent per user per token."""
    return await _service.apply(
        code=body.code,
        user_id=current_user["user_id"],
        user_domain_id=current_user.get("domain_id"),
    )


# ── Admin endpoints ───────────────────────────────────────────────────────────

@router.get("/admin/tokens", response_model=list[PromoTokenResponse])
async def list_tokens(current_user: dict = Depends(require_admin)):
    return await _service.list_tokens()


@router.post("/admin/tokens", response_model=PromoTokenResponse)
async def create_token(
    data: TokenCreate,
    current_user: dict = Depends(require_admin),
):
    return await _service.create_token(data)
