"""Documents API router — knowledge base upload, listing, approval workflow."""
import os
import shutil
import uuid
from typing import Annotated, List, Optional

import structlog
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from src.api.dependencies import CurrentUser, DomainAdminUser, DomainAssignedUser
from src.config import settings
from src.db.supabase_client import get_supabase_admin

router = APIRouter()
logger = structlog.get_logger(__name__)

_ALLOWED_MIMES = {"application/pdf", "image/jpeg", "image/png", "image/tiff"}


class DocumentResponse(BaseModel):
    id: str
    filename: str
    file_size_bytes: int
    mime_type: str
    domain_id: str
    document_type: str
    status: str
    ocr_processed: bool
    ocr_confidence_avg: Optional[float] = None
    created_at: str


class ApproveRequest(BaseModel):
    notes: Optional[str] = None


class RejectRequest(BaseModel):
    reason: str


@router.post("/upload", status_code=status.HTTP_202_ACCEPTED)
async def upload_document(
    file: UploadFile,
    document_type: Annotated[str, Form()],
    current_user: DomainAssignedUser,
) -> dict:
    """Upload a knowledge base document (PDF or image) for OCR and approval pipeline."""
    if file.content_type not in _ALLOWED_MIMES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {file.content_type}. Allowed: {_ALLOWED_MIMES}",
        )

    contents = await file.read()
    size_mb = len(contents) / (1024 * 1024)
    if size_mb > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large: {size_mb:.1f}MB (max {settings.MAX_UPLOAD_SIZE_MB}MB)",
        )

    # Store file locally (production: use object storage like S3/Supabase Storage)
    upload_dir = "./data/uploads"
    os.makedirs(upload_dir, exist_ok=True)
    file_id = str(uuid.uuid4())
    file_path = f"{upload_dir}/{file_id}_{file.filename}"
    with open(file_path, "wb") as f:
        f.write(contents)

    admin = get_supabase_admin()
    result = admin.table("documents").insert({
        "filename": file.filename,
        "file_path": file_path,
        "file_size_bytes": len(contents),
        "mime_type": file.content_type,
        "domain_id": current_user.domain_id,
        "document_type": document_type,
        "metadata": {},
        "status": "pending",
        "uploaded_by": current_user.id,
        "ocr_processed": False,
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create document record")

    doc_id = result.data[0]["id"]
    logger.info("document_uploaded", doc_id=doc_id, filename=file.filename, size_mb=round(size_mb, 2))

    # Trigger background OCR + ingestion pipeline
    from fastapi import BackgroundTasks
    # TODO T082: trigger DocumentIngestionWorkflow in background
    # background_tasks.add_task(ingest_document, doc_id)

    return {"id": doc_id, "status": "pending", "message": "Document uploaded and queued for review"}


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    current_user: DomainAssignedUser,
    doc_status: Optional[str] = None,
) -> List[DocumentResponse]:
    """List documents for the current user's domain."""
    admin = get_supabase_admin()
    query = admin.table("documents").select(
        "id, filename, file_size_bytes, mime_type, domain_id, document_type, "
        "status, ocr_processed, ocr_confidence_avg, created_at"
    ).eq("domain_id", current_user.domain_id)
    if doc_status:
        query = query.eq("status", doc_status)
    result = query.execute()
    return [DocumentResponse(**row) for row in (result.data or [])]


@router.get("/{doc_id}", response_model=DocumentResponse)
async def get_document(
    doc_id: str,
    current_user: DomainAssignedUser,
) -> DocumentResponse:
    """Get document details by ID."""
    admin = get_supabase_admin()
    result = admin.table("documents").select("*").eq("id", doc_id).eq(
        "domain_id", current_user.domain_id
    ).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Document not found")
    return DocumentResponse(**result.data)


@router.patch("/{doc_id}/approve", status_code=status.HTTP_200_OK)
async def approve_document(
    doc_id: str,
    body: ApproveRequest,
    admin_user: DomainAdminUser,
) -> dict:
    """Approve a pending document (triggers embedding ingestion)."""
    supabase_admin = get_supabase_admin()
    from datetime import datetime, timezone
    supabase_admin.table("documents").update({
        "status": "approved",
        "approved_by": admin_user.id,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "approval_notes": body.notes,
    }).eq("id", doc_id).execute()
    # TODO T084: trigger EmbeddingIngestionService in background
    logger.info("document_approved", doc_id=doc_id, by=admin_user.id)
    return {"message": "Document approved and queued for embedding ingestion"}


@router.patch("/{doc_id}/reject", status_code=status.HTTP_200_OK)
async def reject_document(
    doc_id: str,
    body: RejectRequest,
    admin_user: DomainAdminUser,
) -> dict:
    """Reject a pending document with a reason."""
    supabase_admin = get_supabase_admin()
    supabase_admin.table("documents").update({
        "status": "rejected",
        "approval_notes": body.reason,
    }).eq("id", doc_id).execute()
    logger.info("document_rejected", doc_id=doc_id, reason=body.reason[:50])
    return {"message": "Document rejected"}
