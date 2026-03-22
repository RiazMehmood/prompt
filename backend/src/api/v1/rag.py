"""RAG / Document Generation API router."""
import asyncio
import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse

from src.api.dependencies import DomainAssignedUser
from src.models.generated_document import (
    DocumentDetail,
    GenerateRequest,
    GenerateResponse,
    RagSource,
)
from src.services.workflows.document_generation import DocumentGenerationWorkflow
from src.db.supabase_client import get_supabase_admin

router = APIRouter()
logger = structlog.get_logger(__name__)

_workflow = DocumentGenerationWorkflow()


@router.post("/generate", response_model=GenerateResponse, status_code=status.HTTP_202_ACCEPTED)
async def generate_document(
    body: GenerateRequest,
    current_user: DomainAssignedUser,
    background_tasks: BackgroundTasks,
) -> GenerateResponse:
    """Trigger RAG-based document generation.

    Returns immediately with a document ID. Poll GET /generate/{id} for status.
    """
    thread_id = str(uuid.uuid4())
    admin = get_supabase_admin()

    # Pre-create a placeholder document row with 'pending' status
    result = admin.table("generated_documents").insert({
        "user_id": current_user.id,
        "template_id": body.template_id,
        "domain_id": current_user.domain_id,
        "input_parameters": body.input_parameters,
        "retrieved_sources": [],
        "output_content": "",
        "output_language": body.output_language.value,
        "output_format": body.output_format.value,
        "validation_status": "pending",
    }).execute()

    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create document record")

    doc_id = result.data[0]["id"]

    async def run_workflow() -> None:
        try:
            initial_state = {
                "user_id": current_user.id,
                "domain_id": current_user.domain_id,
                "domain_namespace": current_user.domain_namespace or "",
                "template_id": body.template_id,
                "input_parameters": body.input_parameters,
                "output_language": body.output_language.value,
                "output_format": body.output_format.value,
            }
            final_state = await _workflow.run(initial_state, thread_id=thread_id)

            # Update the pre-created document with workflow results
            if final_state.get("generated_doc_id"):
                # Workflow already persisted a new row; delete the placeholder
                admin.table("generated_documents").delete().eq("id", doc_id).execute()
            else:
                admin.table("generated_documents").update({
                    "output_content": final_state.get("rendered_content", ""),
                    "retrieved_sources": final_state.get("provenance_report", []),
                    "validation_status": final_state.get("validation_status", "invalid"),
                    "validation_errors": (
                        {"errors": final_state.get("validation_errors", [])}
                        if final_state.get("validation_errors")
                        else None
                    ),
                }).eq("id", doc_id).execute()
        except Exception as exc:
            logger.error("workflow_background_failed", doc_id=doc_id, error=str(exc))
            admin.table("generated_documents").update({
                "validation_status": "invalid",
                "validation_errors": {"errors": [str(exc)]},
            }).eq("id", doc_id).execute()

    background_tasks.add_task(run_workflow)
    return GenerateResponse(id=doc_id, status="pending", message="Document generation started")


@router.get("/generate/{doc_id}", response_model=DocumentDetail)
async def get_generated_document(
    doc_id: str,
    current_user: DomainAssignedUser,
) -> DocumentDetail:
    """Poll generated document status and retrieve content when complete."""
    admin = get_supabase_admin()
    result = admin.table("generated_documents").select("*").eq("id", doc_id).eq(
        "user_id", current_user.id
    ).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail={"code": "NOT_FOUND", "message": "Document not found"})
    data = result.data
    return DocumentDetail(
        id=data["id"],
        template_id=data["template_id"],
        domain_id=data["domain_id"],
        output_content=data.get("output_content", ""),
        output_language=data.get("output_language", "english"),
        output_format=data.get("output_format", "in_app"),
        validation_status=data.get("validation_status", "pending"),
        validation_errors=data.get("validation_errors"),
        retrieved_sources=[RagSource(**s) for s in (data.get("retrieved_sources") or [])],
        created_at=data["created_at"],
    )


@router.get("/generate/{doc_id}/export")
async def export_document(
    doc_id: str,
    format: str,
    current_user: DomainAssignedUser,
) -> Response:
    """Export a generated document as PDF or DOCX."""
    if format not in ("pdf", "docx"):
        raise HTTPException(status_code=400, detail="format must be 'pdf' or 'docx'")

    admin = get_supabase_admin()
    result = admin.table("generated_documents").select("*").eq("id", doc_id).eq(
        "user_id", current_user.id
    ).single().execute()
    if not result.data or result.data.get("validation_status") != "valid":
        raise HTTPException(status_code=404, detail="Document not found or not yet valid")

    data = result.data
    content = data.get("output_content", "")
    output_language = data.get("output_language", "english")

    if format == "pdf":
        from src.services.documents.pdf_export import PDFExportService
        file_bytes = PDFExportService().export(content, output_language=output_language)
        media_type = "application/pdf"
        filename = f"document-{doc_id[:8]}.pdf"
    else:
        from src.services.documents.docx_export import DOCXExportService
        file_bytes = DOCXExportService().export(content, output_language=output_language)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        filename = f"document-{doc_id[:8]}.docx"

    return Response(
        content=file_bytes,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
