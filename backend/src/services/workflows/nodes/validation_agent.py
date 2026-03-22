"""ValidationAgent node: run ValidationEngine, produce validation report."""
from typing import Any, Dict

import structlog

from src.db.supabase_client import get_supabase_admin
from src.models.template import DataSource, SlotDefinition, TemplateResponse
from src.services.rag.provenance import ProvenanceTracker
from src.services.validation_engine import ValidationEngine

logger = structlog.get_logger(__name__)


async def validation_agent_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Validate the generated document and persist it to the database.

    Outputs:
    - validation_status: 'valid' or 'invalid'
    - validation_errors: list of error strings
    - generated_doc_id: ID of the persisted GeneratedDocument row (if valid)
    """
    rendered_content = state.get("rendered_content", "")
    slot_values = state.get("slot_values", {})
    provenance_data = state.get("provenance_report", [])
    template_id = state.get("identified_template_id")
    domain_id = state.get("domain_id")
    user_id = state.get("user_id")
    output_language = state.get("output_language", "english")
    output_format = state.get("output_format", "in_app")

    # Reload template for validation
    admin = get_supabase_admin()
    result = admin.table("templates").select("*").eq("id", template_id).single().execute()
    if not result.data:
        return {**state, "validation_status": "invalid", "validation_errors": ["Template not found"]}

    template = TemplateResponse(**result.data)

    # Reconstruct provenance tracker from serialized report
    provenance = ProvenanceTracker()
    for record in provenance_data:
        if record.get("source") == "rag_retrieval":
            provenance.record_rag_slot(
                slot_name=record["slot_name"],
                source_doc_id=record.get("source_doc_id") or "",
                chunk_text=record.get("chunk_text") or "",
                confidence=record.get("confidence") or 0.0,
                metadata=record.get("metadata", {}),
            )
        else:
            provenance.record_user_input_slot(record["slot_name"])

    engine = ValidationEngine()
    validation_result = engine.validate(template, slot_values, rendered_content, provenance)

    # Persist generated document
    doc_id: str | None = None
    try:
        persist_result = admin.table("generated_documents").insert({
            "user_id": user_id,
            "template_id": template_id,
            "domain_id": domain_id,
            "input_parameters": state.get("input_parameters", {}),
            "retrieved_sources": provenance.get_rag_sources_summary(),
            "output_content": rendered_content,
            "output_language": output_language,
            "output_format": output_format,
            "validation_status": "valid" if validation_result.is_valid else "invalid",
            "validation_errors": {"errors": validation_result.errors} if validation_result.errors else None,
        }).execute()
        doc_id = persist_result.data[0]["id"] if persist_result.data else None
    except Exception as exc:
        logger.error("generated_doc_persist_failed", error=str(exc))

    logger.info(
        "validation_agent_complete",
        is_valid=validation_result.is_valid,
        error_count=len(validation_result.errors),
        doc_id=doc_id,
    )
    return {
        **state,
        "validation_status": "valid" if validation_result.is_valid else "invalid",
        "validation_errors": validation_result.errors,
        "validation_warnings": validation_result.warnings,
        "generated_doc_id": doc_id,
    }
