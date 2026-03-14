"""User model for authentication and profile management."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field, EmailStr


class User(BaseModel):
    """User model with multi-auth support (email/phone/Google)."""

    user_id: Optional[str] = Field(None, description="UUID primary key")
    tenant_id: Optional[str] = Field(None, description="Multi-tenancy support")
    email: Optional[EmailStr] = Field(None, description="Email address (nullable)")
    password_hash: Optional[str] = Field(None, description="Hashed password (nullable)")
    phone_number: Optional[str] = Field(None, description="Phone number (nullable)")
    auth_method: str = Field(..., description="Authentication method: email|phone|google")
    google_id: Optional[str] = Field(None, description="Google OAuth ID (nullable)")
    full_name: str = Field(..., description="User's full name")
    role_id: str = Field(..., description="Foreign key to roles table")
    account_status: str = Field("active", description="Account status: active|suspended|deleted")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "email": "lawyer@example.com",
                "full_name": "Ahmed Khan",
                "auth_method": "email",
                "role_id": "uuid-lawyer-role",
                "account_status": "active"
            }
        }
