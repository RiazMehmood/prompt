"""Role model for domain-specific user roles."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Role(BaseModel):
    """Role model representing domain-specific user roles (lawyer, doctor, etc.)."""

    role_id: Optional[str] = Field(None, description="UUID primary key")
    role_name: str = Field(..., description="Unique role identifier (e.g., 'lawyer')")
    display_name: str = Field(..., description="Human-readable name (e.g., 'Lawyer')")
    category: str = Field("professional", description="Role category")
    ai_persona_prompt: str = Field(
        ...,
        description="AI persona instructions for this role"
    )
    sidebar_features: list[str] = Field(
        default_factory=list,
        description="List of enabled sidebar features"
    )
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "role_name": "lawyer",
                "display_name": "Lawyer",
                "category": "professional",
                "ai_persona_prompt": "You are a legal assistant specializing in Pakistani law...",
                "sidebar_features": ["documents", "chat", "case_analysis"]
            }
        }
