"""Templates API router — list, retrieve, and update domain-specific document templates."""
import os
import uuid
from datetime import datetime
from typing import Annotated, Any, Dict, List, Optional

import structlog
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel

from src.api.dependencies import CurrentUser, ManageTemplatesUser, require_root_admin
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
    domain_id: Optional[str] = None,
) -> List[TemplateResponse]:
    """List templates for the current user's domain.

    Admins may pass ?domain_id=<uuid> to fetch templates for any domain.
    Filters to only active templates unless `include_inactive=true` is passed.
    Returns an empty list when the user has no domain assigned.
    """
    # Admins can query any domain; regular users are locked to their own domain
    is_admin = current_user.role in ("root_admin", "domain_admin", "staff")
    effective_domain_id = domain_id if (is_admin and domain_id) else current_user.domain_id

    if not effective_domain_id:
        return []

    admin = get_supabase_admin()
    query = admin.table("templates").select(
        "id, name, domain_id, description, content, slot_definitions, "
        "formatting_rules, version, is_active, created_at"
    ).eq("domain_id", effective_domain_id)

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


class SlotUpdate(BaseModel):
    name: str
    type: str
    required: bool
    data_source: str          # user_input | rag_retrieval | auto
    rag_query_hint: Optional[str] = None   # custom RAG query for this slot
    label: Optional[str] = None           # display label shown to user


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    is_active: Optional[bool] = None
    slot_definitions: Optional[List[Dict[str, Any]]] = None


@router.patch("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    body: TemplateUpdate,
    _: ManageTemplatesUser,
) -> TemplateResponse:
    """Update a template's slots, content, or active status (root_admin only)."""
    admin = get_supabase_admin()

    # Verify exists
    existing = admin.table("templates").select("id, domain_id").eq("id", template_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Template not found")

    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        admin.table("templates")
        .update(updates)
        .eq("id", template_id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Update failed")

    # Return full updated template
    full = (
        admin.table("templates")
        .select("id, name, domain_id, description, content, slot_definitions, formatting_rules, version, is_active, created_at")
        .eq("id", template_id)
        .single()
        .execute()
    )
    return TemplateResponse(**full.data)


@router.post("/{template_id}/sample")
async def upload_sample(
    template_id: str,
    _: ManageTemplatesUser,
    file: UploadFile = File(...),
) -> dict:
    """Upload a sample/reference document for a template (root_admin only).

    The file is stored on disk and its path is recorded in the template's
    ``formatting_rules`` JSON under the key ``sample_file_path``.
    """
    admin = get_supabase_admin()

    # Verify template exists
    existing = admin.table("templates").select("id, formatting_rules").eq("id", template_id).single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Template not found")

    _SAMPLE_ALLOWED = {"application/pdf", "image/jpeg", "image/png"}
    if file.content_type not in _SAMPLE_ALLOWED:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    contents = await file.read()
    sample_dir = "./data/uploads/samples"
    os.makedirs(sample_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    file_path = f"{sample_dir}/{file_id}_{file.filename}"
    with open(file_path, "wb") as f:
        f.write(contents)

    # Merge into existing formatting_rules
    rules = existing.data.get("formatting_rules") or {}
    rules["sample_file_path"] = file_path
    rules["sample_filename"] = file.filename

    admin.table("templates").update({"formatting_rules": rules}).eq("id", template_id).execute()
    logger.info("sample_uploaded", template_id=template_id, filename=file.filename)
    return {"message": "Sample uploaded", "sample_filename": file.filename}


# ── Template Submissions (user/institute → admin review) ──────────────────────

class SubmissionCreate(BaseModel):
    name: str
    description: str = ""
    content: str
    slot_definitions: List[Dict[str, Any]] = []


class SubmissionResponse(BaseModel):
    id: str
    name: str
    description: str | None
    status: str
    review_notes: str | None
    created_at: datetime
    template_id: str | None = None


@router.post("/submissions", response_model=SubmissionResponse)
async def submit_template(body: SubmissionCreate, current_user: CurrentUser) -> SubmissionResponse:
    """Submit a custom template for admin review. Any authenticated domain user may submit."""
    if not current_user.domain_id:
        raise HTTPException(status_code=400, detail="You must be assigned to a domain first.")
    admin = get_supabase_admin()
    row = {
        "domain_id":       current_user.domain_id,
        "submitted_by":    current_user.id,
        "institute_id":    current_user.institute_id,
        "name":            body.name,
        "description":     body.description,
        "content":         body.content,
        "slot_definitions": body.slot_definitions,
        "status":          "pending",
    }
    res = admin.table("template_submissions").insert(row).execute()
    data = res.data[0]
    logger.info("template_submitted", submission_id=data["id"], user=current_user.id)
    return SubmissionResponse(**{k: data.get(k) for k in SubmissionResponse.model_fields})


@router.get("/submissions", response_model=List[SubmissionResponse])
async def list_submissions(current_user: CurrentUser) -> List[SubmissionResponse]:
    """List template submissions. Admins see all in their domain; users see own."""
    admin = get_supabase_admin()
    q = admin.table("template_submissions").select("*")
    if current_user.role in ("root_admin", "domain_admin", "staff"):
        if current_user.domain_id and current_user.role != "root_admin":
            q = q.eq("domain_id", current_user.domain_id)
    else:
        q = q.eq("submitted_by", current_user.id)
    res = q.order("created_at", desc=True).execute()
    return [SubmissionResponse(**{k: r.get(k) for k in SubmissionResponse.model_fields}) for r in (res.data or [])]


class SubmissionReview(BaseModel):
    action: str   # "approve" or "reject"
    review_notes: str = ""


@router.patch("/submissions/{submission_id}/review")
async def review_submission(
    submission_id: str,
    body: SubmissionReview,
    current_user: ManageTemplatesUser,
) -> dict:
    """Approve or reject a template submission. On approval, creates live template."""
    admin = get_supabase_admin()
    sub = admin.table("template_submissions").select("*").eq("id", submission_id).single().execute().data
    if not sub:
        raise HTTPException(status_code=404, detail="Submission not found.")
    if sub["status"] != "pending":
        raise HTTPException(status_code=400, detail="Submission already reviewed.")

    if body.action == "approve":
        # Create live template from submission
        tpl = admin.table("templates").insert({
            "domain_id":       sub["domain_id"],
            "name":            sub["name"],
            "description":     sub["description"] or "",
            "content":         sub["content"],
            "slot_definitions": sub["slot_definitions"],
            "formatting_rules": {},
            "version":         "1.0.0",
            "is_active":       True,
            "created_by":      sub["submitted_by"],
        }).execute().data[0]
        admin.table("template_submissions").update({
            "status":      "approved",
            "reviewed_by": current_user.id,
            "reviewed_at": "now()",
            "review_notes": body.review_notes,
            "template_id": tpl["id"],
        }).eq("id", submission_id).execute()
        logger.info("template_submission_approved", submission_id=submission_id, template_id=tpl["id"])
        return {"status": "approved", "template_id": tpl["id"]}

    # Reject
    admin.table("template_submissions").update({
        "status":      "rejected",
        "reviewed_by": current_user.id,
        "reviewed_at": "now()",
        "review_notes": body.review_notes,
    }).eq("id", submission_id).execute()
    logger.info("template_submission_rejected", submission_id=submission_id)
    return {"status": "rejected"}
