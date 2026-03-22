"""GeneratorAgent node: execute DataBindingEngine with RAG data, assemble final template."""
from typing import Any, Dict

import structlog

from src.db.supabase_client import get_supabase_admin
from src.models.template import TemplateResponse
from src.services.data_binding import DataBindingEngine
from src.services.rag.provenance import ProvenanceTracker
from src.services.template_service import TemplateService

logger = structlog.get_logger(__name__)


async def generator_agent_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Fill all template slots using DataBindingEngine and render the final document.

    Outputs:
    - rendered_content: fully assembled document text
    - slot_values: dict of slot_name → value
    - provenance_report: list of provenance records
    """
    template_id = state.get("identified_template_id")
    domain_id = state.get("domain_id")
    domain_namespace = state.get("domain_namespace")
    input_params = state.get("input_parameters", {})
    output_language = state.get("output_language", "english")

    # Load template
    admin = get_supabase_admin()
    result = admin.table("templates").select("*").eq("id", template_id).single().execute()
    if not result.data:
        return {**state, "error": f"Template {template_id} not found", "validation_status": "invalid"}

    from src.models.template import SlotDefinition, FormattingRules
    from pydantic import TypeAdapter

    template = TemplateResponse(**result.data)
    provenance = ProvenanceTracker()
    engine = DataBindingEngine()

    slot_values = await engine.bind(
        template=template,
        user_inputs=input_params,
        domain_namespace=domain_namespace or "",
        output_language=output_language,
        provenance=provenance,
    )

    # Render template with bound values
    svc = TemplateService()
    rendered = svc.render(template.content, slot_values)

    logger.info(
        "generator_agent_complete",
        template_id=template_id,
        slot_count=len(slot_values),
        rendered_length=len(rendered),
    )
    return {
        **state,
        "rendered_content": rendered,
        "slot_values": slot_values,
        "provenance_report": provenance.get_report(),
    }
