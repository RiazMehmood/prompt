"""Admin utility endpoints — free-tier usage dashboard, health, diagnostics, user management."""
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr

from src.api.dependencies import AuthenticatedUser, ManageSubsUser, ManageUsersUser, require_admin, require_root_admin
from src.config import settings
from src.db.supabase_client import get_supabase_admin

router = APIRouter()


# ── Pydantic models ────────────────────────────────────────────────────────────

class CreateAdminRequest(BaseModel):
    email: str
    password: str
    role: str = "domain_admin"  # "domain_admin" or "root_admin"
    domain_id: Optional[str] = None


class CreateUserRequest(BaseModel):
    email: str
    password: str
    domain_id: Optional[str] = None
    institute_id: Optional[str] = None
    subscription_tier: str = "basic"


class UpdateUserRequest(BaseModel):
    role: Optional[str] = None
    domain_id: Optional[str] = None
    institute_id: Optional[str] = None
    subscription_tier: Optional[str] = None
    is_active: Optional[bool] = None

_ALERT_THRESHOLD = 0.80  # Alert at 80% of any free-tier limit


@router.get("/admin/free-tier-usage")
async def free_tier_usage(_admin: dict = Depends(require_admin)):
    """
    Dashboard endpoint for tracking free-tier resource consumption.
    Alerts at 80% of any limit.
    Resources tracked:
    - Supabase DB rows (via table counts)
    - ChromaDB disk usage
    - External drive disk usage
    """
    alerts = []
    metrics = {}

    # ── ChromaDB / external drive disk usage ─────────────────────────────────
    chroma_path = Path(settings.CHROMADB_PATH)
    if chroma_path.exists():
        drive_usage = shutil.disk_usage(chroma_path)
        drive_pct = drive_usage.used / drive_usage.total if drive_usage.total else 0
        metrics["external_drive"] = {
            "used_gb": round(drive_usage.used / 1e9, 2),
            "total_gb": round(drive_usage.total / 1e9, 2),
            "pct": round(drive_pct * 100, 1),
        }
        if drive_pct >= _ALERT_THRESHOLD:
            alerts.append({
                "resource": "external_drive",
                "message": f"External drive at {round(drive_pct*100, 1)}% capacity",
                "severity": "warning",
            })

    # ── Supabase row counts ───────────────────────────────────────────────────
    supabase = get_supabase_admin()
    for table in ["profiles", "generated_documents", "documents", "embeddings"]:
        try:
            resp = supabase.table(table).select("id", count="exact").execute()
            metrics[f"supabase_{table}_count"] = resp.count or 0
        except Exception:
            metrics[f"supabase_{table}_count"] = None

    # ── Root disk usage ───────────────────────────────────────────────────────
    root_usage = shutil.disk_usage("/")
    root_pct = root_usage.used / root_usage.total if root_usage.total else 0
    metrics["root_disk"] = {
        "used_gb": round(root_usage.used / 1e9, 2),
        "total_gb": round(root_usage.total / 1e9, 2),
        "pct": round(root_pct * 100, 1),
    }
    if root_pct >= _ALERT_THRESHOLD:
        alerts.append({
            "resource": "root_disk",
            "message": f"Root partition at {round(root_pct*100, 1)}% — consider moving data to external drive",
            "severity": "critical",
        })

    return {
        "metrics": metrics,
        "alerts": alerts,
        "alert_threshold_pct": _ALERT_THRESHOLD * 100,
        "chromadb_path": str(settings.CHROMADB_PATH),
    }


@router.post("/admin/reingest/{doc_id}")
async def reingest_document(
    doc_id: str,
    background_tasks: BackgroundTasks,
    _admin: AuthenticatedUser = Depends(require_root_admin),
):
    """Re-trigger OCR + embedding ingestion for an already-approved document.

    Safe to call when the server is already running — ingestion runs inside the
    server process so the embedding model is not loaded a second time.
    """
    supabase = get_supabase_admin()
    doc = supabase.table("documents").select(
        "id, filename, file_path, domain_id, status"
    ).eq("id", doc_id).single().execute()

    if not doc.data:
        raise HTTPException(status_code=404, detail="Document not found")

    if doc.data["status"] not in ("approved", "indexed", "ingestion_failed"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot reingest document with status '{doc.data['status']}'. Must be approved/indexed/ingestion_failed.",
        )

    domain_id = doc.data["domain_id"]
    domain_resp = supabase.table("domains").select("knowledge_base_namespace").eq(
        "id", domain_id
    ).single().execute()
    namespace = (domain_resp.data or {}).get("knowledge_base_namespace") or domain_id

    # Reset status so progress is visible
    supabase.table("documents").update({"status": "approved"}).eq("id", doc_id).execute()

    from src.api.v1.documents import _run_ingestion
    background_tasks.add_task(_run_ingestion, doc_id, doc.data["file_path"], namespace)

    return {
        "message": f"Re-ingestion queued for '{doc.data['filename']}'",
        "doc_id": doc_id,
        "namespace": namespace,
    }


# ── User Management ────────────────────────────────────────────────────────────

@router.get("/admin/users")
async def list_users(
    _admin: ManageUsersUser,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    domain_id: Optional[str] = Query(default=None),
    role: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
):
    """List all users with pagination, filtering by domain/role, and search by email."""
    supabase = get_supabase_admin()

    query = supabase.table("profiles").select(
        "id, email, phone, role, domain_id, subscription_tier, created_at, last_login_at, "
        "domains(name)"
    )

    # Domain admins and staff with manage_domain_users are scoped to their domain
    if _admin.role in ("domain_admin", "staff") and _admin.domain_id:
        query = query.eq("domain_id", _admin.domain_id)
    elif domain_id:
        query = query.eq("domain_id", domain_id)

    if role:
        query = query.eq("role", role)

    if search:
        query = query.ilike("email", f"%{search}%")

    offset = (page - 1) * page_size
    resp = query.order("created_at", desc=True).range(offset, offset + page_size - 1).execute()

    # Count total
    count_query = supabase.table("profiles").select("id", count="exact")
    if _admin.role in ("domain_admin", "staff") and _admin.domain_id:
        count_query = count_query.eq("domain_id", _admin.domain_id)
    elif domain_id:
        count_query = count_query.eq("domain_id", domain_id)
    if role:
        count_query = count_query.eq("role", role)
    if search:
        count_query = count_query.ilike("email", f"%{search}%")
    count_resp = count_query.execute()

    return {
        "users": resp.data or [],
        "total": count_resp.count or 0,
        "page": page,
        "page_size": page_size,
    }


@router.get("/admin/users/{user_id}")
async def get_user(
    user_id: str,
    _admin: ManageUsersUser,
):
    """Get full profile details for a specific user."""
    supabase = get_supabase_admin()
    resp = supabase.table("profiles").select(
        "id, email, phone, role, domain_id, subscription_tier, subscription_start_date, "
        "subscription_expiry_date, document_generation_count, upload_count, "
        "created_at, updated_at, last_login_at, domains(name)"
    ).eq("id", user_id).single().execute()

    if not resp.data:
        raise HTTPException(status_code=404, detail="User not found")

    # Domain admin and domain-scoped staff can only view users in their domain
    if _admin.role in ("domain_admin", "staff") and _admin.domain_id:
        if resp.data.get("domain_id") != _admin.domain_id:
            raise HTTPException(status_code=403, detail="Access denied")

    return resp.data


@router.patch("/admin/users/{user_id}")
async def update_user(
    user_id: str,
    body: UpdateUserRequest,
    _admin: ManageUsersUser,
):
    """Update user role, domain, subscription tier, or active status.

    - root_admin: can update any field for any user
    - domain_admin: can only update users in their domain; cannot change roles to root_admin
    """
    supabase = get_supabase_admin()

    # Fetch existing user
    existing = supabase.table("profiles").select("id, role, domain_id").eq("id", user_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="User not found")

    # Domain admin scope check
    if _admin.role == "domain_admin":
        if existing.data.get("domain_id") != _admin.domain_id:
            raise HTTPException(status_code=403, detail="Access denied")
        if body.role == "root_admin":
            raise HTTPException(status_code=403, detail="Cannot promote to root_admin")

    updates: dict = {}
    if body.role is not None:
        if body.role not in ("user", "domain_admin", "root_admin"):
            raise HTTPException(status_code=400, detail="Invalid role")
        updates["role"] = body.role
    if body.domain_id is not None:
        updates["domain_id"] = body.domain_id
    if body.subscription_tier is not None:
        updates["subscription_tier"] = body.subscription_tier
    if body.is_active is not None:
        # We store deactivation by setting a sentinel email-like flag
        # In practice, deactivated users have their Supabase auth banned
        # Here we record it in a metadata field; full auth ban requires Supabase Admin API
        updates["_deactivated"] = not body.is_active  # convention via app-layer check

    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    resp = supabase.table("profiles").update(updates).eq("id", user_id).execute()
    return {"message": "User updated", "user_id": user_id, "updated": updates}


@router.delete("/admin/users/{user_id}")
async def delete_user(
    user_id: str,
    _admin: AuthenticatedUser = Depends(require_root_admin),
):
    """Permanently delete a user account (root_admin only)."""
    supabase = get_supabase_admin()
    existing = supabase.table("profiles").select("id, email").eq("id", user_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete from profiles (cascades to auth.users due to FK)
    supabase.table("profiles").delete().eq("id", user_id).execute()
    return {"message": f"User {existing.data['email']} deleted", "user_id": user_id}


# ── Admin Creation ─────────────────────────────────────────────────────────────

@router.post("/admin/create-admin")
async def create_admin_user(
    body: CreateAdminRequest,
    _admin: AuthenticatedUser = Depends(require_root_admin),
):
    """Create a new admin account (root_admin or domain_admin). Root admin only.

    Creates the Supabase auth user + profile in one operation.
    """
    if body.role not in ("domain_admin", "root_admin"):
        raise HTTPException(status_code=400, detail="Role must be domain_admin or root_admin")
    if body.role == "domain_admin" and not body.domain_id:
        raise HTTPException(status_code=400, detail="domain_id required for domain_admin role")

    supabase = get_supabase_admin()

    # Check email not already used
    existing = supabase.table("profiles").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered")

    import hashlib

    # Step 1: Create Supabase auth user (handles auth.users FK)
    try:
        auth_resp = supabase.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,  # skip email verification for admin-created accounts
        })
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Auth user creation failed: {exc}")

    new_user_id = auth_resp.user.id
    password_hash = hashlib.sha256(body.password.encode()).hexdigest()

    # Step 2: Insert/upsert profile with admin role
    profile_data: dict = {
        "id": new_user_id,
        "email": body.email,
        "password_hash": password_hash,
        "role": body.role,
        "subscription_tier": "basic",
    }
    if body.domain_id:
        profile_data["domain_id"] = body.domain_id

    # Upsert in case trigger already created a profile row
    resp = supabase.table("profiles").upsert(profile_data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create admin profile")

    return {
        "message": f"{body.role} account created",
        "user_id": new_user_id,
        "email": body.email,
        "role": body.role,
        "domain_id": body.domain_id,
    }


# ── Direct User Creation (root_admin) ─────────────────────────────────────────

@router.post("/admin/create-user")
async def create_user(
    body: CreateUserRequest,
    _admin: AuthenticatedUser = Depends(require_root_admin),
):
    """Create a regular user account directly (no email verification required). Root admin only."""
    import hashlib

    supabase = get_supabase_admin()

    # Check email not taken
    existing = supabase.table("profiles").select("id").eq("email", body.email).execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="Email already registered")

    try:
        auth_resp = supabase.auth.admin.create_user({
            "email": body.email,
            "password": body.password,
            "email_confirm": True,
        })
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Auth user creation failed: {exc}")

    new_user_id = auth_resp.user.id
    password_hash = hashlib.sha256(body.password.encode()).hexdigest()

    profile_data: dict = {
        "id": new_user_id,
        "email": body.email,
        "password_hash": password_hash,
        "role": "user",
        "subscription_tier": body.subscription_tier,
    }
    if body.domain_id:
        profile_data["domain_id"] = body.domain_id
    if body.institute_id:
        profile_data["institute_id"] = body.institute_id

    resp = supabase.table("profiles").upsert(profile_data).execute()
    if not resp.data:
        raise HTTPException(status_code=500, detail="Failed to create user profile")

    return {
        "message": "User account created",
        "user_id": new_user_id,
        "email": body.email,
        "role": "user",
        "domain_id": body.domain_id,
        "institute_id": body.institute_id,
    }
