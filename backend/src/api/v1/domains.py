"""Domains API router."""
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from src.api.dependencies import CurrentUser, DomainAdminUser, RootAdminUser, get_current_user
from src.db.supabase_client import get_supabase_admin
from src.models.domain import DomainCreate, DomainUpdate, DomainResponse
from src.services.domain_service import DomainService
from src.services.user_service import UserService

router = APIRouter()


class AssignDomainRequest(BaseModel):
    domain_id: str


def _row_to_domain_response(row: dict) -> DomainResponse:
    """Map a DB domains row to DomainResponse, filling computed/aliased fields."""
    return DomainResponse(
        id=row["id"],
        name=row["name"],
        description=row.get("description", ""),
        namespace=row.get("knowledge_base_namespace", ""),
        icon_url=row.get("icon_url"),
        is_active=row.get("status") == "active",
        user_count=row.get("user_count", 0),
        template_count=row.get("template_count", 0),
        document_count=row.get("document_count", 0),
        configuration=row.get("configuration", {}),
        created_at=row["created_at"],
    )


@router.get("", response_model=List[DomainResponse])
async def list_domains() -> List[DomainResponse]:
    """List all active domains (public — no auth required for domain discovery)."""
    admin = get_supabase_admin()
    result = admin.table("domains").select(
        "id, name, description, icon_url, status, configuration, knowledge_base_namespace, created_at"
    ).eq("status", "active").execute()

    return [_row_to_domain_response(row) for row in (result.data or [])]


@router.get("/{domain_id}", response_model=DomainResponse)
async def get_domain(domain_id: str) -> DomainResponse:
    """Get domain details by ID."""
    admin = get_supabase_admin()
    result = admin.table("domains").select("*").eq("id", domain_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Domain not found"})
    return _row_to_domain_response(result.data)


@router.post("", response_model=DomainResponse, status_code=status.HTTP_201_CREATED)
async def create_domain(
    body: DomainCreate,
    _admin: RootAdminUser,
) -> DomainResponse:
    """Create a new domain (root_admin only). Auto-provisions ChromaDB collection."""
    svc = DomainService()
    return await svc.create_domain(body)


@router.patch("/{domain_id}", response_model=DomainResponse)
async def update_domain(
    domain_id: str,
    body: DomainUpdate,
    _admin: RootAdminUser,
) -> DomainResponse:
    """Update domain metadata or configuration (root_admin only)."""
    svc = DomainService()
    return await svc.update_domain(domain_id, body)


@router.delete("/{domain_id}", status_code=status.HTTP_200_OK)
async def delete_domain(
    domain_id: str,
    _admin: RootAdminUser,
) -> dict:
    """Deactivate a domain.

    Returns 409 if active users exist — deactivation is preferred over hard deletion.
    """
    svc = DomainService()
    await svc.delete_domain(domain_id)
    return {"message": "Domain deactivated successfully"}


@router.post("/assign", status_code=status.HTTP_200_OK)
async def assign_domain(
    body: AssignDomainRequest,
    current_user: CurrentUser,
) -> dict:
    """Assign the current user to a domain (immutable — can only be set once)."""
    svc = UserService()
    profile = await svc.assign_domain(current_user.id, body.domain_id)
    return {"message": "Domain assigned successfully", "domain_id": profile.domain_id}
