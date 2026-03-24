"""Institutes router — bulk-subscription organizations (schools, law firms, hospitals)."""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from src.api.dependencies import AuthenticatedUser, CurrentUser, ManageInstitutesUser, require_admin, require_root_admin
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


class UpdateInstituteAdminRequest(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None


class AddMemberRequest(BaseModel):
    email: str
    password: str


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_institutes(
    _admin: ManageInstitutesUser,
    domain_id: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
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


# ── Institute Admin self-service endpoints (must be before /{institute_id}) ────

@router.get("/my")
async def get_my_institute(current_user: CurrentUser):
    """Get the institute managed by the current institute_admin."""
    if current_user.role != "institute_admin" or not current_user.institute_id:
        raise HTTPException(status_code=403, detail="Institute admin access required")

    supabase = get_supabase_admin()
    resp = supabase.table("institutes").select("*, domains(name)").eq(
        "id", current_user.institute_id
    ).single().execute()
    if not resp.data:
        raise HTTPException(status_code=404, detail="Institute not found")

    user_count = supabase.table("profiles").select("id", count="exact").eq(
        "institute_id", current_user.institute_id
    ).execute()
    resp.data["user_count"] = user_count.count or 0
    return resp.data


@router.get("/my/users")
async def list_my_institute_users(
    current_user: CurrentUser,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
):
    """List users in the institute_admin's institute."""
    if current_user.role != "institute_admin" or not current_user.institute_id:
        raise HTTPException(status_code=403, detail="Institute admin access required")

    supabase = get_supabase_admin()
    offset = (page - 1) * page_size
    resp = supabase.table("profiles").select(
        "id, email, phone, role, subscription_tier, document_generation_count, upload_count, created_at, last_login_at"
    ).eq("institute_id", current_user.institute_id).eq("role", "user").order(
        "created_at", desc=True
    ).range(offset, offset + page_size - 1).execute()

    count_resp = supabase.table("profiles").select("id", count="exact").eq(
        "institute_id", current_user.institute_id
    ).eq("role", "user").execute()

    return {
        "users": resp.data or [],
        "total": count_resp.count or 0,
        "page": page,
        "page_size": page_size,
    }


@router.post("/my/users", status_code=201)
async def add_member(body: AddMemberRequest, current_user: CurrentUser):
    """Institute admin: create a new user account and add them to this institute."""
    if current_user.role != "institute_admin" or not current_user.institute_id:
        raise HTTPException(status_code=403, detail="Institute admin access required")

    supabase = get_supabase_admin()

    # Derive subscription tier from institute's plan
    _PLAN_TO_TIER = {"bulk": "basic", "basic": "basic", "standard": "standard", "premium": "premium", "institutional": "institutional"}

    # Check quota
    institute = supabase.table("institutes").select("max_users, name, domain_id, subscription_plan").eq(
        "id", current_user.institute_id
    ).single().execute()
    if not institute.data:
        raise HTTPException(status_code=404, detail="Institute not found")

    count_resp = supabase.table("profiles").select("id", count="exact").eq(
        "institute_id", current_user.institute_id
    ).execute()
    current_count = count_resp.count or 0
    if current_count >= institute.data["max_users"]:
        raise HTTPException(
            status_code=409,
            detail=f"Seat quota full ({current_count}/{institute.data['max_users']}). Contact platform admin to increase limit.",
        )

    # Check email not already taken
    existing = supabase.table("profiles").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered")

    # Create Supabase auth user
    try:
        auth_resp = supabase.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
        })
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to create auth user: {exc}")

    import hashlib
    profile_data = {
        "id": auth_resp.user.id,
        "email": body.email,
        "password_hash": hashlib.sha256(body.password.encode()).hexdigest(),
        "role": "user",
        "subscription_tier": _PLAN_TO_TIER.get(institute.data.get("subscription_plan", ""), "basic"),
        "domain_id": institute.data["domain_id"],
        "institute_id": current_user.institute_id,
    }
    result = supabase.table("profiles").upsert(profile_data).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create member profile")

    return {
        "message": "Member added",
        "user_id": auth_resp.user.id,
        "email": body.email,
        "institute_id": current_user.institute_id,
    }


@router.delete("/my/users/{user_id}", status_code=200)
async def remove_member(user_id: str, current_user: CurrentUser):
    """Institute admin: remove a user from this institute (unlinks them, does not delete account)."""
    if current_user.role != "institute_admin" or not current_user.institute_id:
        raise HTTPException(status_code=403, detail="Institute admin access required")

    supabase = get_supabase_admin()

    # Verify user belongs to this institute
    profile = supabase.table("profiles").select("id, email, role").eq("id", user_id).eq(
        "institute_id", current_user.institute_id
    ).single().execute()
    if not profile.data:
        raise HTTPException(status_code=404, detail="Member not found in your institute")

    # Prevent removing another institute_admin
    if profile.data.get("role") == "institute_admin":
        raise HTTPException(status_code=403, detail="Cannot remove an institute admin account")

    supabase.table("profiles").update({"institute_id": None}).eq("id", user_id).execute()
    return {"message": "Member removed from institute", "user_id": user_id}


@router.get("/{institute_id}")
async def get_institute(
    institute_id: str,
    _admin: ManageInstitutesUser,
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
    _admin: ManageInstitutesUser,
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
    _admin: ManageInstitutesUser,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
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


@router.patch("/{institute_id}/admin")
async def update_institute_admin(
    institute_id: str,
    body: UpdateInstituteAdminRequest,
    _admin: AuthenticatedUser = Depends(require_root_admin),
):
    """Update email and/or password for the institute_admin of this institute. Root admin only."""
    if not body.email and not body.password:
        raise HTTPException(status_code=400, detail="Provide email or password to update")

    supabase = get_supabase_admin()

    existing = supabase.table("profiles").select("id, email").eq(
        "institute_id", institute_id
    ).eq("role", "institute_admin").execute()

    if not existing.data:
        raise HTTPException(
            status_code=404,
            detail="No institute admin found — create one first via POST /{institute_id}/create-admin",
        )

    admin_profile = existing.data[0]
    auth_user_id = admin_profile["id"]

    auth_updates: dict = {}
    if body.email:
        auth_updates["email"] = body.email
        auth_updates["email_confirm"] = True
    if body.password:
        auth_updates["password"] = body.password

    try:
        supabase.auth.admin.update_user_by_id(auth_user_id, auth_updates)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Auth update failed: {exc}")

    profile_updates: dict = {}
    if body.email:
        profile_updates["email"] = body.email
    if body.password:
        import hashlib
        profile_updates["password_hash"] = hashlib.sha256(body.password.encode()).hexdigest()
    if profile_updates:
        supabase.table("profiles").update(profile_updates).eq("id", auth_user_id).execute()

    return {
        "message": "Institute admin credentials updated",
        "user_id": auth_user_id,
        "email": body.email or admin_profile["email"],
        "institute_id": institute_id,
    }

