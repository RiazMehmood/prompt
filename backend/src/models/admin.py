"""Admin model for administrative users."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Admin(BaseModel):
    """Admin model for users with administrative privileges."""

    admin_id: Optional[str] = Field(None, description="UUID primary key")
    user_id: str = Field(..., description="Foreign key to users table")
    admin_type: str = Field("root", description="Admin type: root|domain|support")
    permissions: dict = Field(
        default_factory=dict,
        description="JSON object with permission flags"
    )
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    is_active: bool = Field(True, description="Admin status flag")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "uuid-user",
                "admin_type": "root",
                "permissions": {
                    "manage_roles": True,
                    "approve_documents": True,
                    "manage_users": True
                },
                "is_active": True
            }
        }
