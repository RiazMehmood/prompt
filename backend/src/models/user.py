"""User Pydantic models for auth request/response validation."""
from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, EmailStr, Field, field_validator


class SubscriptionTier(str, Enum):
    free_trial = "free_trial"
    basic = "basic"
    pro = "pro"
    premium = "premium"
    institutional = "institutional"
    standard = "standard"


class UserRole(str, Enum):
    user = "user"
    domain_admin = "domain_admin"
    root_admin = "root_admin"
    staff = "staff"
    institute_admin = "institute_admin"


# ============================================================
# Request models
# ============================================================

class UserRegistration(BaseModel):
    """Registration with email OR phone (at least one required)."""
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, pattern=r"^\+[1-9]\d{7,14}$")
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("phone", "email")
    @classmethod
    def strip_whitespace(cls, v: Optional[str]) -> Optional[str]:
        return v.strip() if v else v

    def model_post_init(self, __context: object) -> None:
        if not self.email and not self.phone:
            raise ValueError("Either email or phone is required")


class UserLogin(BaseModel):
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: str

    def model_post_init(self, __context: object) -> None:
        if not self.email and not self.phone:
            raise ValueError("Either email or phone is required")


class VerifyEmailRequest(BaseModel):
    email: EmailStr
    code: str = Field(..., min_length=4, max_length=10)


class VerifyPhoneRequest(BaseModel):
    phone: str = Field(..., pattern=r"^\+[1-9]\d{7,14}$")
    code: str = Field(..., min_length=4, max_length=10)


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class DomainAssignRequest(BaseModel):
    domain_id: str


# ============================================================
# Response models
# ============================================================

class UserProfile(BaseModel):
    id: str
    email: Optional[str] = None
    phone: Optional[str] = None
    domain_id: Optional[str] = None
    subscription_tier: SubscriptionTier
    role: UserRole
    document_generation_count: int
    upload_count: int
    created_at: datetime
    last_login_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds
    user: UserProfile
