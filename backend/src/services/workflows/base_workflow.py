"""LangGraph workflow base class with state schema, node registration, and persistence.

All complex AI workflows (QueryAgent, PlannerAgent, GeneratorAgent, ValidationAgent)
extend BaseWorkflow. LangGraph provides:
- State persistence after each node (resume after interruption)
- Checkpointing for long-running document generation
- Built-in error boundary at each node boundary
"""
from abc import ABC, abstractmethod
from typing import Any, Callable, Dict, Optional, TypeVar

import structlog
from langgraph.graph import END, StateGraph
from langgraph.graph.state import CompiledStateGraph as CompiledGraph

logger = structlog.get_logger(__name__)

StateType = TypeVar("StateType", bound=dict)


class BaseWorkflow(ABC):
    """Abstract base for LangGraph stateful workflows.

    Subclasses must implement:
    - `state_schema`: TypedDict class defining the workflow state
    - `build_graph()`: Add nodes and edges to the StateGraph

    Example usage:
        class DocumentGenerationWorkflow(BaseWorkflow):
            @property
            def state_schema(self): return DocumentGenState
            def build_graph(self, graph: StateGraph) -> None:
                graph.add_node("retrieve", self._retrieve_node)
                graph.add_node("generate", self._generate_node)
                graph.add_node("validate", self._validate_node)
                graph.add_edge("retrieve", "generate")
                graph.add_edge("generate", "validate")
                graph.add_edge("validate", END)
                graph.set_entry_point("retrieve")
    """

    def __init__(self) -> None:
        self._compiled: Optional[CompiledGraph] = None

    @property
    @abstractmethod
    def state_schema(self) -> type:
        """Return the TypedDict class that defines this workflow's state."""
        ...

    @property
    def workflow_name(self) -> str:
        return self.__class__.__name__

    @abstractmethod
    def build_graph(self, graph: StateGraph) -> None:
        """Add nodes, edges, and entry point to the graph.

        Called once during compilation. Subclasses must call
        graph.set_entry_point("<first_node>").
        """
        ...

    def compile(self) -> CompiledGraph:
        """Compile the workflow graph (lazy, cached)."""
        if self._compiled is None:
            graph = StateGraph(self.state_schema)
            self.build_graph(graph)
            self._compiled = graph.compile()
            logger.info("workflow_compiled", workflow=self.workflow_name)
        return self._compiled

    async def run(
        self,
        initial_state: Dict[str, Any],
        thread_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute the workflow and return the final state.

        Args:
            initial_state: Initial workflow state dict
            thread_id: Optional thread ID for checkpointing (enables resume)
        """
        compiled = self.compile()
        config: Dict[str, Any] = {}
        if thread_id:
            config["configurable"] = {"thread_id": thread_id}

        logger.info(
            "workflow_started",
            workflow=self.workflow_name,
            thread_id=thread_id,
            state_keys=list(initial_state.keys()),
        )
        try:
            result = await compiled.ainvoke(initial_state, config=config)
            logger.info("workflow_completed", workflow=self.workflow_name)
            return result
        except Exception as exc:
            logger.error(
                "workflow_failed",
                workflow=self.workflow_name,
                error=str(exc),
                exc_info=True,
            )
            raise

    def _node_wrapper(self, name: str, fn: Callable) -> Callable:
        """Wrap a node function with structured logging."""
        async def wrapped(state: Dict[str, Any]) -> Dict[str, Any]:
            logger.debug("node_entered", workflow=self.workflow_name, node=name)
            result = await fn(state)
            logger.debug("node_exited", workflow=self.workflow_name, node=name)
            return result
        wrapped.__name__ = fn.__name__
        return wrapped
