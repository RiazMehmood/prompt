"""Documents API router — knowledge base upload, listing, approval workflow."""
import os
import uuid
from typing import Annotated, List, Optional

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel

from src.api.dependencies import ApproveDocumentsUser, CurrentUser, DomainAdminUser, DomainAssignedUser
from src.config import settings
from src.db.supabase_client import get_supabase_admin

router = APIRouter()
logger = structlog.get_logger(__name__)

_ALLOWED_MIMES = {"application/pdf", "image/jpeg", "image/png", "image/tiff"}


async def _run_ingestion(doc_id: str, file_path: str, domain_namespace: str) -> None:
    """Background task: extract text + embed document into ChromaDB after approval."""
    admin = get_supabase_admin()
    try:
        from src.services.documents.text_extraction import TextExtractionService
        from src.services.rag.ingestion import EmbeddingIngestionService

        pages = TextExtractionService().extract_pdf(file_path)
        chunk_count = await EmbeddingIngestionService().ingest_document(doc_id, domain_namespace, pages)

        ocr_pages = [p for p in pages if p.get("is_ocr")]
        ocr_avg = (
            sum(p.get("confidence", 1.0) for p in ocr_pages) / len(ocr_pages)
            if ocr_pages
            else 1.0
        )
        admin.table("documents").update({
            "ocr_processed": bool(ocr_pages),
            "ocr_confidence_avg": round(ocr_avg, 4),
            "status": "indexed",
        }).eq("id", doc_id).execute()

        logger.info("ingestion_complete", doc_id=doc_id, chunks=chunk_count, namespace=domain_namespace)
    except Exception as exc:
        logger.error("ingestion_failed", doc_id=doc_id, error=str(exc))
        admin.table("documents").update({"status": "ingestion_failed"}).eq("id", doc_id).execute()


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
    current_user: DomainAssignedUser,
    file: UploadFile = File(...),
    document_type: str = Form(...),
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

    return {"id": doc_id, "status": "pending", "message": "Document uploaded and queued for review"}


@router.get("", response_model=List[DocumentResponse])
async def list_documents(
    current_user: DomainAssignedUser,
    doc_status: Optional[str] = None,
    domain_id: Optional[str] = None,
) -> List[DocumentResponse]:
    """List documents for the current user's domain.

    Admins may pass ?domain_id=<uuid> to list documents for any domain.
    """
    is_admin = current_user.role in ("root_admin", "domain_admin", "staff")
    effective_domain_id = domain_id if (is_admin and domain_id) else current_user.domain_id

    admin = get_supabase_admin()
    query = admin.table("documents").select(
        "id, filename, file_size_bytes, mime_type, domain_id, document_type, "
        "status, ocr_processed, ocr_confidence_avg, created_at"
    ).eq("domain_id", effective_domain_id)
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
    background_tasks: BackgroundTasks,
    admin_user: ApproveDocumentsUser,
) -> dict:
    """Approve a pending document and trigger OCR + ChromaDB embedding in the background."""
    from datetime import datetime, timezone
    supabase_admin = get_supabase_admin()

    doc_resp = supabase_admin.table("documents").select("file_path, domain_id").eq("id", doc_id).single().execute()
    if not doc_resp.data:
        raise HTTPException(status_code=404, detail="Document not found")

    file_path = doc_resp.data["file_path"]
    domain_id = doc_resp.data["domain_id"]

    domain_resp = supabase_admin.table("domains").select("knowledge_base_namespace").eq("id", domain_id).single().execute()
    namespace = (domain_resp.data or {}).get("knowledge_base_namespace") or domain_id

    supabase_admin.table("documents").update({
        "status": "approved",
        "approved_by": admin_user.id,
        "approved_at": datetime.now(timezone.utc).isoformat(),
        "approval_notes": body.notes,
    }).eq("id", doc_id).execute()

    background_tasks.add_task(_run_ingestion, doc_id, file_path, namespace)
    logger.info("document_approved", doc_id=doc_id, by=admin_user.id, namespace=namespace)
    return {"message": "Document approved and queued for embedding ingestion"}


@router.post("/extract-fields")
async def extract_fields(
    current_user: DomainAssignedUser,
    file: UploadFile = File(...),
    template_id: str = Form(default=None),
) -> dict:
    """Extract slot field values from an uploaded document using OCR + Gemini.

    Accepts a PDF or image file. If `template_id` is provided, the slot
    definitions from that template are used to guide extraction. Returns
    ``{extracted_fields: {slot_name: value}, raw_text: str}``.
    """
    if file.content_type not in _ALLOWED_MIMES:
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {file.content_type}")

    contents = await file.read()
    if len(contents) / (1024 * 1024) > settings.MAX_UPLOAD_SIZE_MB:
        raise HTTPException(status_code=413, detail="File too large")

    # Save temporarily
    upload_dir = "./data/uploads/tmp"
    os.makedirs(upload_dir, exist_ok=True)
    tmp_path = f"{upload_dir}/{uuid.uuid4()}_{file.filename}"
    with open(tmp_path, "wb") as f:
        f.write(contents)

    raw_text = ""
    try:
        if file.content_type == "application/pdf":
            from src.services.documents.text_extraction import TextExtractionService
            pages = TextExtractionService().extract_pdf(tmp_path)
            raw_text = "\n\n".join(p["text"] for p in pages if p.get("text"))
        else:
            # Image file — run OCR directly
            from PIL import Image as PILImage
            from src.services.ocr.orchestrator import OCROrchestrator
            img = PILImage.open(tmp_path)
            result = OCROrchestrator().process_image(img, page_num=0, hint_language="english")
            raw_text = result.text
    finally:
        try:
            os.remove(tmp_path)
        except OSError:
            pass

    if not raw_text.strip():
        return {"extracted_fields": {}, "raw_text": ""}

    # Load slot definitions from template if provided
    slot_descs = ""
    if template_id:
        try:
            admin = get_supabase_admin()
            tpl_resp = admin.table("templates").select("slot_definitions").eq("id", template_id).single().execute()
            slots = (tpl_resp.data or {}).get("slot_definitions") or []
            if slots:
                slot_descs = "\n".join(
                    f'- "{s["name"]}": {s.get("label") or s["name"].replace("_", " ").title()} ({s.get("type", "text")})'
                    for s in slots
                    if s.get("data_source", "user_input") == "user_input"
                )
        except Exception:
            pass

    if not slot_descs:
        slot_descs = (
            "- \"accused_name\": Full name of the accused (text)\n"
            "- \"fir_number\": FIR number (text)\n"
            "- \"sections\": Sections/charges mentioned (text)\n"
            "- \"court_name\": Name of the court (text)\n"
            "- \"applicant_name\": Name of the applicant/lawyer (text)\n"
            "- \"application_date\": Date of application (date)\n"
            "- \"police_station\": Police station name (text)"
        )

    import json as _json
    import re as _re
    import google.generativeai as genai
    from src.config import settings as cfg
    from src.services.ai.key_rotator import get_key_rotator

    rotator = get_key_rotator()
    api_key = rotator.get_key()
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(cfg.GEMINI_MODEL)

    prompt = (
        f"Extract the following fields from this legal document text.\n\n"
        f"Document text:\n{raw_text[:4000]}\n\n"
        f"Fields to extract:\n{slot_descs}\n\n"
        f"Return a JSON object with these exact keys. Use null for fields not found. "
        f"For dates, use YYYY-MM-DD format. Return ONLY valid JSON, no explanation."
    )
    try:
        response = model.generate_content(prompt)
        match = _re.search(r"\{.*\}", response.text, _re.DOTALL)
        extracted = _json.loads(match.group()) if match else {}
    except Exception as exc:
        logger.warning("field_extraction_gemini_failed", error=str(exc))
        extracted = {}

    # Remove null values
    extracted_fields = {k: v for k, v in extracted.items() if v is not None}
    logger.info("fields_extracted", fields=list(extracted_fields.keys()), template_id=template_id)
    return {"extracted_fields": extracted_fields, "raw_text": raw_text[:2000]}


@router.patch("/{doc_id}/reject", status_code=status.HTTP_200_OK)
async def reject_document(
    doc_id: str,
    body: RejectRequest,
    admin_user: ApproveDocumentsUser,
) -> dict:
    """Reject a pending document with a reason."""
    supabase_admin = get_supabase_admin()
    supabase_admin.table("documents").update({
        "status": "rejected",
        "approval_notes": body.reason,
    }).eq("id", doc_id).execute()
    logger.info("document_rejected", doc_id=doc_id, reason=body.reason[:50])
    return {"message": "Document rejected"}
