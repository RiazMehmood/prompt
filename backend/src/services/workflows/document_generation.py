"""DocumentGenerationWorkflow: LangGraph stateful pipeline for RAG-based document creation.

Nodes:
  query_agent → planner_agent → retrieval_agent → generator_agent → validation_agent
"""
from typing import Any, Dict, List, Optional, TypedDict

import structlog
from langgraph.graph import END, StateGraph

from src.services.workflows.base_workflow import BaseWorkflow

logger = structlog.get_logger(__name__)


class DocumentGenState(TypedDict, total=False):
    """Shared state passed through every node of the document generation workflow."""
    # Inputs
    user_id: str
    domain_id: str
    domain_namespace: str
    template_id: str
    input_parameters: Dict[str, Any]
    output_language: str
    output_format: str

    # Query agent outputs
    parsed_intent: str
    identified_template_id: str
    missing_fields: List[str]

    # Planner outputs
    retrieval_queries: Dict[str, str]  # slot_name → query string
    clarification_needed: bool
    clarification_message: Optional[str]

    # Retrieval outputs
    retrieved_slots: Dict[str, Any]       # slot_name → chunk_text
    provenance_report: List[Dict[str, Any]]

    # Generator outputs
    rendered_content: str
    slot_values: Dict[str, Any]

    # Validation outputs
    validation_status: str  # 'valid' | 'invalid'
    validation_errors: List[str]
    validation_warnings: List[str]

    # Final output
    generated_doc_id: Optional[str]
    error: Optional[str]


class DocumentGenerationWorkflow(BaseWorkflow):
    """LangGraph workflow for deterministic RAG-based document generation."""

    @property
    def state_schema(self) -> type:
        return DocumentGenState

    def build_graph(self, graph: StateGraph) -> None:
        from src.services.workflows.nodes.query_agent import query_agent_node
        from src.services.workflows.nodes.planner_agent import planner_agent_node
        from src.services.workflows.nodes.generator_agent import generator_agent_node
        from src.services.workflows.nodes.validation_agent import validation_agent_node

        graph.add_node("query_agent", query_agent_node)
        graph.add_node("planner_agent", planner_agent_node)
        graph.add_node("generator_agent", generator_agent_node)
        graph.add_node("validation_agent", validation_agent_node)

        graph.set_entry_point("query_agent")
        graph.add_edge("query_agent", "planner_agent")
        graph.add_conditional_edges(
            "planner_agent",
            lambda state: "generator_agent" if not state.get("clarification_needed") else END,
        )
        graph.add_edge("generator_agent", "validation_agent")
        graph.add_edge("validation_agent", END)
