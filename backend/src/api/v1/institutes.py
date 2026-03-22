"""Institutes router — bulk-subscription organizations (schools, law firms, hospitals)."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from src.api.dependencies import AuthenticatedUser, require_admin, require_root_admin
from src.db.supabase_client import get_supabase_admin

router = APIRouter()


# ── Pydantic models ────────────────────────────────────────────────────────────

class InstituteCreate(BaseModel):
    name: str
    domain_id: str
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    subscription_plan: str = "bulk"
    discount_pct: int = 0
    max_users: int = 50
    notes: Optional[str] = None


class InstituteUpdate(BaseModel):
    name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    address: Optional[str] = None
    subscription_plan: Optional[str] = None
    discount_pct: Optional[int] = None
    max_users: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None


class CreateInstituteAdminRequest(BaseModel):
    email: str
    password: str
    institute_id: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_institutes(
    domain_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _admin: AuthenticatedUser = Depends(require_admin),
):
    """List institutes with optional domain/status filters."""
    supabase = get_supabase_admin()
    query = supabase.table("institutes").select(
        "*, domains(name)"
    )

    # domain_admin: only their domain
    if _admin.role == "domain_admin":
        query = query.eq("domain_id", _admin.domain_id)
    elif domain_id:
        query = query.eq("domain_id", domain_id)

    if status:
        query = query.eq("status", status)
    if search:
        query = query.ilike("name", f"%{search}%")

    offset = (page - 1) * page_size
    resp = query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()

    # Count
    cq = supabase.table("institutes").select("id", count="exact")
    if _admin.role == "domain_admin":
        cq = cq.eq("domain_id", _admin.domain_id)
    elif domain_id:
        cq = cq.eq("domain_id", domain_id)
    if status:
        cq = cq.eq("status", status)
    if search:
        cq = cq.ilike("name", f"%{search}%")
    count_resp = cq.execute()

    return {
        "institutes": resp.data or [],
        "total": count_resp.count or 0,
        "page": page,
        "page_size": page_size,
    }


@router.post("", status_code=201)
async def create_institute(
    body: InstituteCreate,
    _admin: AuthenticatedUser = Depends(require_root_admin),
):
    """Create a new institute. Root admin only."""
    supabase = get_supabase_admin()

    # Verify domain exists
    domain = supabase.table("domains").select("id, name").eq("id", body.domain_id).single().execute()
    if not domain.data:
        raise HTTPException(status_code=404, detail="Domain not found")

    data = body.model_dump()
    resp = supabase.table("institutes").insert(data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create institute")

    return resp.data[0]


@router.get("/{institute_id}")
async def get_institute(
    institute_id: str,
    _admin: AuthenticatedUser = Depends(require_admin),
):
    """Get institute details including user count."""
    supabase = get_supabase_admin()
    resp = supabase.table("institutes").select("*, domains(name)").eq("id", institute_id).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Institute not found")

    # Scope check for domain_admin
    if _admin.role == "domain_admin" and resp.data.get("domain_id") != _admin.domain_id:
        raise HTTPException(status_code=403, detail="Access denied")

    # User count for this institute
    user_count = supabase.table("profiles").select("id", count="exact").eq("institute_id", institute_id).execute()
    resp.data["user_count"] = user_count.count or 0

    return resp.data


@router.patch("/{institute_id}")
async def update_institute(
    institute_id: str,
    body: InstituteUpdate,
    _admin: AuthenticatedUser = Depends(require_admin),
):
    """Update institute details."""
    supabase = get_supabase_admin()
    existing = supabase.table("institutes").select("id, domain_id").eq("id", institute_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Institute not found")

    if _admin.role == "domain_admin" and existing.data.get("domain_id") != _admin.domain_id:
        raise HTTPException(status_code=403, detail="Access denied")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    supabase.table("institutes").update(updates).eq("id", institute_id).execute()
    return {"message": "Institute updated", "institute_id": institute_id}


@router.delete("/{institute_id}")
async def delete_institute(
    institute_id: str,
    _admin: AuthenticatedUser = Depends(require_root_admin),
):
    """Delete institute. Root admin only. Users' institute_id will be set to NULL."""
    supabase = get_supabase_admin()
    existing = supabase.table("institutes").select("id, name").eq("id", institute_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Institute not found")

    supabase.table("institutes").delete().eq("id", institute_id).execute()
    return {"message": f"Institute '{existing.data['name']}' deleted"}


@router.get("/{institute_id}/users")
async def list_institute_users(
    institute_id: str,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    _admin: AuthenticatedUser = Depends(require_admin),
):
    """List users belonging to an institute."""
    supabase = get_supabase_admin()
    existing = supabase.table("institutes").select("id, domain_id").eq("id", institute_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Institute not found")

    if _admin.role == "domain_admin" and existing.data.get("domain_id") != _admin.domain_id:
        raise HTTPException(status_code=403, detail="Access denied")

    offset = (page - 1) * page_size
    resp = supabase.table("profiles").select(
        "id, email, phone, role, subscription_tier, created_at, last_login_at"
    ).eq("institute_id", institute_id).order("created_at", desc=True).range(offset, offset + page_size - 1).execute()

    count_resp = supabase.table("profiles").select("id", count="exact").eq("institute_id", institute_id).execute()

    return {
        "users": resp.data or [],
        "total": count_resp.count or 0,
        "page": page,
        "page_size": page_size,
    }


@router.post("/{institute_id}/create-admin")
async def create_institute_admin(
    institute_id: str,
    body: CreateInstituteAdminRequest,
    _admin: AuthenticatedUser = Depends(require_root_admin),
):
    """Create an institute_admin account for the given institute. Root admin only."""
    import hashlib

    supabase = get_supabase_admin()
    institute = supabase.table("institutes").select("id, name, domain_id").eq("id", institute_id).single().execute()
    if not institute.data:
        raise HTTPException(status_code=404, detail="Institute not found")

    # Check email not taken
    existing = supabase.table("profiles").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create auth user
    try:
        auth_resp = supabase.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
        })
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Auth user creation failed: {exc}")

    password_hash = hashlib.sha256(body.password.encode()).hexdigest()
    profile_data = {
        "id": auth_resp.user.id,
        "email": body.email,
        "password_hash": password_hash,
        "role": "institute_admin",
        "subscription_tier": "basic",
        "domain_id": institute.data["domain_id"],
        "institute_id": institute_id,
    }

    resp = supabase.table("profiles").upsert(profile_data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create institute admin profile")

    return {
        "message": f"Institute admin created for '{institute.data['name']}'",
        "user_id": auth_resp.user.id,
        "email": body.email,
        "institute_id": institute_id,
    }
