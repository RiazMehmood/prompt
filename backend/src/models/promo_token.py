"""Promotional token Pydantic models."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class DiscountType(str, Enum):
    percentage = "percentage"
    flat_pkr = "flat_pkr"
    free_tier_upgrade = "free_tier_upgrade"  # Temp tier upgrade for N days


class TokenCreate(BaseModel):
    code: str = Field(
        ...,
        min_length=4,
        max_length=30,
        pattern=r"^[A-Z0-9_\-]+$",
        description="Uppercase alphanumeric code (e.g. LEGAL30)",
    )
    discount_type: DiscountType
    discount_value: float = Field(..., gt=0, description="Percentage (0-100) or PKR amount or days")
    max_uses: int = Field(..., gt=0, description="Total redemption limit across all users")
    max_uses_per_user: int = Field(default=1, ge=1)
    domain_id: Optional[str] = Field(default=None, description="Restrict to specific domain; None = all domains")
    valid_from: datetime
    valid_until: datetime
    description: str = Field(default="", max_length=200)

    @field_validator("code")
    @classmethod
    def uppercase_code(cls, v: str) -> str:
        return v.upper()

    @field_validator("discount_value")
    @classmethod
    def validate_percentage(cls, v: float, info) -> float:
        if info.data.get("discount_type") == DiscountType.percentage and v > 100:
            raise ValueError("Percentage discount cannot exceed 100")
        return v


class TokenValidation(BaseModel):
    """Preview the benefit before applying the token."""
    code: str
    domain_id: Optional[str] = None  # User's current domain for restriction check


class TokenValidationResult(BaseModel):
    """Result of validating (previewing) a token — no usage recorded."""
    valid: bool
    code: str
    discount_type: Optional[DiscountType] = None
    discount_value: Optional[float] = None
    description: Optional[str] = None
    error: Optional[str] = None  # Reason if invalid
    already_used: bool = False
    remaining_uses: Optional[int] = None


class TokenApplicationResult(BaseModel):
    """Result after applying the token — usage counter incremented."""
    success: bool
    code: str
    benefit_applied: str  # Human-readable description
    error: Optional[str] = None


class PromoTokenResponse(BaseModel):
    """Admin-facing token detail."""
    id: str
    code: str
    discount_type: DiscountType
    discount_value: float
    max_uses: int
    used_count: int
    remaining_uses: int
    max_uses_per_user: int
    domain_id: Optional[str]
    domain_name: Optional[str]
    valid_from: datetime
    valid_until: datetime
    description: str
    is_active: bool
    created_at: datetime
