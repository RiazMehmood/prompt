"""Templates API router — list and retrieve domain-specific document templates."""
from datetime import datetime
from typing import Annotated, Any, Dict, List, Optional

import structlog
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from src.api.dependencies import CurrentUser
from src.db.supabase_client import get_supabase_admin

router = APIRouter()
logger = structlog.get_logger(__name__)


class TemplateResponse(BaseModel):
    id: str
    name: str
    domain_id: str
    description: str
    content: str
    slot_definitions: List[Dict[str, Any]]
    formatting_rules: Dict[str, Any]
    version: str
    is_active: bool
    created_at: datetime


@router.get("", response_model=List[TemplateResponse])
async def list_templates(
    current_user: CurrentUser,
    include_inactive: bool = False,
) -> List[TemplateResponse]:
    """List templates for the current user's domain.

    Filters to only active templates unless `include_inactive=true` is passed.
    Returns an empty list when the user has no domain assigned.
    """
    if not current_user.domain_id:
        return []

    admin = get_supabase_admin()
    query = admin.table("templates").select(
        "id, name, domain_id, description, content, slot_definitions, "
        "formatting_rules, version, is_active, created_at"
    ).eq("domain_id", current_user.domain_id)

    if not include_inactive:
        query = query.eq("is_active", True)

    result = query.execute()
    return [TemplateResponse(**row) for row in (result.data or [])]


@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    current_user: CurrentUser,
) -> TemplateResponse:
    """Get a single template by ID.

    Returns 404 if the template does not exist or does not belong to the
    current user's domain.
    """
    if not current_user.domain_id:
        raise HTTPException(status_code=404, detail="Template not found")

    admin = get_supabase_admin()
    result = (
        admin.table("templates")
        .select(
            "id, name, domain_id, description, content, slot_definitions, "
            "formatting_rules, version, is_active, created_at"
        )
        .eq("id", template_id)
        .eq("domain_id", current_user.domain_id)
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Template not found")

    return TemplateResponse(**result.data)
