"""Domain Pydantic models for dynamic multi-tenant domain management."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


class AgentPersona(BaseModel):
    """AI agent configuration for a domain."""
    system_prompt: str = Field(
        ..., description="Domain-specific system prompt injected into every AI call"
    )
    response_tone: str = Field(default="professional", description="formal | professional | friendly")
    max_response_length: int = Field(default=2000, ge=100, le=10000)
    language_preference: str = Field(default="english", description="Default output language if user doesn't specify")


class DomainConfig(BaseModel):
    """Domain-level configuration stored as JSONB."""
    supported_output_languages: list[str] = Field(
        default=["english"],
        description="Languages users can request output in",
    )
    document_types: list[str] = Field(
        default=[],
        description="Document categories (e.g. 'Bail Application', 'Lesson Plan')",
    )
    agent_persona: AgentPersona = Field(
        default_factory=lambda: AgentPersona(system_prompt="You are a helpful domain assistant.")
    )
    rag_confidence_threshold: float = Field(
        default=0.75, ge=0.0, le=1.0,
        description="Minimum RAG confidence required for document generation"
    )
    formatting: dict[str, Any] = Field(
        default_factory=dict,
        description="Domain-specific formatting overrides (paper_size, font_family, etc.)"
    )


class DomainCreate(BaseModel):
    """Input for creating a new domain (root_admin only)."""
    name: str = Field(..., min_length=2, max_length=100)
    description: str = Field(default="", max_length=500)
    namespace: str = Field(
        ...,
        pattern=r"^[a-z0-9_]{3,50}$",
        description="Unique slug used as ChromaDB collection prefix (e.g. legal_pk)",
    )
    icon_url: Optional[str] = Field(default=None, description="CDN URL for domain icon")
    configuration: DomainConfig = Field(default_factory=DomainConfig)

    @field_validator("namespace")
    @classmethod
    def lowercase_namespace(cls, v: str) -> str:
        return v.lower()


class DomainUpdate(BaseModel):
    """Partial update for domain metadata."""
    name: Optional[str] = Field(default=None, min_length=2, max_length=100)
    description: Optional[str] = Field(default=None, max_length=500)
    icon_url: Optional[str] = None
    is_active: Optional[bool] = None


class DomainConfigUpdate(BaseModel):
    """Update domain agent/config parameters."""
    configuration: DomainConfig


class DomainResponse(BaseModel):
    """Public domain representation."""
    id: str
    name: str
    description: str
    namespace: str
    icon_url: Optional[str]
    is_active: bool
    user_count: int = 0
    template_count: int = 0
    document_count: int = 0
    configuration: DomainConfig
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def _map_db_fields(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Map DB column names → model field names
            if "knowledge_base_namespace" in data and "namespace" not in data:
                data["namespace"] = data["knowledge_base_namespace"]
            if "status" in data and "is_active" not in data:
                data["is_active"] = data["status"] == "active"
        return data
