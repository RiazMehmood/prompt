"""PlannerAgent node: decompose request, build retrieval queries, flag missing fields."""
from typing import Any, Dict

import structlog

from src.db.supabase_client import get_supabase_admin

logger = structlog.get_logger(__name__)


async def planner_agent_node(state: Dict[str, Any]) -> Dict[str, Any]:
    """Build per-slot retrieval queries and check if clarification is needed.

    If required user_input slots are missing, set clarification_needed=True
    and provide a clarification_message listing what's needed.

    Outputs:
    - retrieval_queries: {slot_name: query_string} for rag_retrieval slots
    - clarification_needed: bool
    - clarification_message: str (if clarification_needed)
    """
    missing_fields = state.get("missing_fields", [])
    template_id = state.get("identified_template_id")
    domain_id = state.get("domain_id")
    input_params = state.get("input_parameters", {})

    if missing_fields:
        msg = (
            f"Please provide the following required fields to continue: "
            f"{', '.join(missing_fields)}"
        )
        logger.info("planner_agent_clarification_needed", missing=missing_fields)
        return {
            **state,
            "clarification_needed": True,
            "clarification_message": msg,
        }

    # Build retrieval queries for rag_retrieval slots
    admin = get_supabase_admin()
    result = admin.table("templates").select("slot_definitions").eq(
        "id", template_id
    ).single().execute()
    slot_defs = (result.data or {}).get("slot_definitions", [])

    retrieval_queries: Dict[str, str] = {}
    for slot in slot_defs:
        if slot.get("data_source") == "rag_retrieval":
            slot_name = slot["name"]
            # Use the human-readable slot name as the base query
            # Enriched with any provided context from user_inputs
            context = input_params.get(f"{slot_name}_query", "")
            retrieval_queries[slot_name] = (
                f"{slot_name.replace('_', ' ')}: {context}" if context
                else slot_name.replace("_", " ")
            )

    logger.info(
        "planner_agent_complete",
        rag_slots=len(retrieval_queries),
    )
    return {
        **state,
        "retrieval_queries": retrieval_queries,
        "clarification_needed": False,
    }
