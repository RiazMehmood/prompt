"""QueryAgent node: parse user input, identify template, extract field values."""
from typing import Any, Dict

import structlog

from src.db.supabase_client import get_supabase_admin

logger = structlog.get_logger(__name__)


async def query_agent_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Parse user input and identify which template to use.

    Outputs:
    - parsed_intent: human-readable description of what the user wants
    - identified_template_id: confirmed template ID (from input or auto-detected)
    - missing_fields: list of required slots not provided in input_parameters
    """
    template_id = state.get("template_id") or state.get("identified_template_id")
    input_params = state.get("input_parameters", {})
    domain_id = state.get("domain_id")

    if not template_id:
        logger.error("query_agent_no_template_id")
        return {**state, "error": "No template_id provided", "validation_status": "invalid"}

    # Load template to identify required slots
    admin = get_supabase_admin()
    result = admin.table("templates").select(
        "id, name, slot_definitions"
    ).eq("id", template_id).eq("domain_id", domain_id).single().execute()

    if not result.data:
        return {
            **state,
            "error": f"Template {template_id} not found in domain {domain_id}",
            "validation_status": "invalid",
        }

    template_data = result.data
    slot_defs = template_data.get("slot_definitions", [])

    # Identify required user_input slots that are missing
    missing = []
    for slot in slot_defs:
        if slot.get("required") and slot.get("data_source") == "user_input":
            if not input_params.get(slot["name"]):
                missing.append(slot["name"])

    parsed_intent = (
        f"User requests generation of '{template_data['name']}' document "
        f"with {len(input_params)} provided parameters."
    )
    logger.info(
        "query_agent_complete",
        template=template_data["name"],
        missing_count=len(missing),
    )
    return {
        **state,
        "identified_template_id": template_id,
        "parsed_intent": parsed_intent,
        "missing_fields": missing,
    }
