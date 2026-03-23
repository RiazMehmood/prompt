"""Staff management — create staff accounts and assign permission scopes."""
from __future__ import annotations

import hashlib
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from src.api.dependencies import AuthenticatedUser, get_current_user, require_root_admin
from src.db.supabase_client import get_supabase_admin

router = APIRouter()

# All recognized permission scopes
VALID_PERMISSIONS = {
    "manage_all_users",       # see/edit every user regardless of domain
    "manage_domain_users",    # see/edit users in an assigned domain (requires domain_id)
    "approve_documents",      # approve/reject document uploads
    "manage_payments",        # view payment queries and subscription issues
    "manage_institutes",      # create/edit/delete institutes
    "view_analytics",         # read-only access to analytics dashboards
    "manage_subscriptions",   # change user subscription tiers
    "manage_templates",       # create/edit document templates
}


class CreateStaffRequest(BaseModel):
    email: str
    password: str
    permissions: list[dict]
    # Each permission entry: {"permission": "manage_domain_users", "domain_id": "<uuid>"}
    # For global permissions: {"permission": "manage_all_users", "domain_id": null}


class AddPermissionRequest(BaseModel):
    permission: str
    domain_id: Optional[str] = None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("")
async def list_staff(
    _admin: AuthenticatedUser = Depends(require_root_admin),
):
    """List all staff accounts with their assigned permissions."""
    supabase = get_supabase_admin()

    staff = supabase.table("profiles").select(
        "id, email, role, created_at, last_login_at"
    ).eq("role", "staff").execute()

    if not staff.data:
        return []

    staff_ids = [s["id"] for s in staff.data]

    # Fetch all permissions for these staff members
    perms = supabase.table("staff_permissions").select(
        "staff_id, permission, domain_id, domains(name)"
    ).in_("staff_id", staff_ids).execute()

    # Group permissions by staff_id
    perm_map: dict = {}
    for p in (perms.data or []):
        sid = p["staff_id"]
        if sid not in perm_map:
            perm_map[sid] = []
        perm_map[sid].append({
            "permission": p["permission"],
            "domain_id": p.get("domain_id"),
            "domain_name": (p.get("domains") or {}).get("name"),
        })

    for s in staff.data:
        s["permissions"] = perm_map.get(s["id"], [])

    return staff.data


@router.post("", status_code=201)
async def create_staff(
    body: CreateStaffRequest,
    _admin: AuthenticatedUser = Depends(require_root_admin),
):
    """Create a staff account and assign initial permissions. Root admin only."""
    supabase = get_supabase_admin()

    # Validate permissions
    for p in body.permissions:
        if p.get("permission") not in VALID_PERMISSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown permission '{p.get('permission')}'. Valid: {sorted(VALID_PERMISSIONS)}"
            )
        if p.get("permission") == "manage_domain_users" and not p.get("domain_id"):
            raise HTTPException(status_code=400, detail="manage_domain_users requires a domain_id")

    # Check email not taken
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
        raise HTTPException(status_code=500, detail=f"Auth user creation failed: {exc}")

    new_id = auth_resp.user.id
    password_hash = hashlib.sha256(body.password.encode()).hexdigest()

    # Create profile
    profile = {
        "id": new_id,
        "email": body.email,
        "password_hash": password_hash,
        "role": "staff",
        "subscription_tier": "basic",
    }
    supabase.table("profiles").upsert(profile).execute()

    # Assign permissions
    perm_rows = [
        {
            "staff_id": new_id,
            "permission": p["permission"],
            "domain_id": p.get("domain_id"),
        }
        for p in body.permissions
    ]
    if perm_rows:
        supabase.table("staff_permissions").insert(perm_rows).execute()

    return {
        "message": "Staff account created",
        "user_id": new_id,
        "email": body.email,
        "permissions": body.permissions,
    }


@router.get("/{staff_id}/permissions")
async def get_staff_permissions(
    staff_id: str,
    current_user: AuthenticatedUser = Depends(get_current_user),
):
    """Get permission scopes for a staff member.

    Staff can only fetch their own permissions; root_admin can fetch any.
    """
    if current_user.role != "root_admin" and current_user.id != staff_id:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Cannot view another staff member's permissions"},
        )
    supabase = get_supabase_admin()
    resp = supabase.table("staff_permissions").select(
        "id, permission, domain_id, created_at, domains(name)"
    ).eq("staff_id", staff_id).execute()
    return resp.data or []


@router.post("/{staff_id}/permissions")
async def add_staff_permission(
    staff_id: str,
    body: AddPermissionRequest,
    _admin: AuthenticatedUser = Depends(require_root_admin),
):
    """Add a permission scope to a staff member."""
    if body.permission not in VALID_PERMISSIONS:
        raise HTTPException(status_code=400, detail=f"Unknown permission: {body.permission}")

    supabase = get_supabase_admin()

    # Confirm staff member exists
    profile = supabase.table("profiles").select("id, role").eq("id", staff_id).single().execute()
    if not profile.data:
        raise HTTPException(status_code=404, detail="Staff member not found")
    if profile.data["role"] != "staff":
        raise HTTPException(status_code=400, detail="User is not a staff member")

    try:
        supabase.table("staff_permissions").insert({
            "staff_id": staff_id,
            "permission": body.permission,
            "domain_id": body.domain_id,
        }).execute()
    except Exception as exc:
        if "unique" in str(exc).lower():
            raise HTTPException(status_code=409, detail="Permission already assigned")
        raise HTTPException(status_code=500, detail=str(exc))

    return {"message": "Permission added", "staff_id": staff_id, "permission": body.permission}


@router.delete("/{staff_id}/permissions/{permission}")
async def remove_staff_permission(
    staff_id: str,
    permission: str,
    domain_id: Optional[str] = Query(default=None),
    _admin: AuthenticatedUser = Depends(require_root_admin),
):
    """Remove a specific permission from a staff member."""
    supabase = get_supabase_admin()
    q = supabase.table("staff_permissions").delete().eq("staff_id", staff_id).eq("permission", permission)
    if domain_id:
        q = q.eq("domain_id", domain_id)
    q.execute()
    return {"message": "Permission removed"}


@router.delete("/{staff_id}")
async def delete_staff(
    staff_id: str,
    _admin: AuthenticatedUser = Depends(require_root_admin),
):
    """Delete a staff account. Permissions cascade-delete automatically."""
    supabase = get_supabase_admin()
    existing = supabase.table("profiles").select("id, email, role").eq("id", staff_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Staff member not found")
    if existing.data["role"] != "staff":
        raise HTTPException(status_code=400, detail="User is not a staff member")

    supabase.table("profiles").delete().eq("id", staff_id).execute()
    return {"message": f"Staff account {existing.data['email']} deleted"}
