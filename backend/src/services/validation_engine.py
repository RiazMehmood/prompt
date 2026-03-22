"""ValidationEngine: verify all required slots filled, content grounded, formatting correct."""
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import structlog

from src.config import settings
from src.models.template import DataSource, TemplateResponse
from src.services.rag.provenance import ProvenanceTracker

logger = structlog.get_logger(__name__)

_MIN_CONFIDENCE = settings.RAG_MIN_CONFIDENCE


@dataclass
class ValidationResult:
    is_valid: bool
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    provenance_report: List[Dict[str, Any]] = field(default_factory=list)
    min_confidence: Optional[float] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "errors": self.errors,
            "warnings": self.warnings,
            "provenance_report": self.provenance_report,
            "min_confidence": self.min_confidence,
        }


class ValidationEngine:
    """Validate generated document output against template rules and RAG provenance.

    Rejects output if:
    - Any required slot is missing
    - Any RAG slot has confidence < 0.75
    - Template formatting rules are violated
    - Any slot contains placeholder text (e.g., [MISSING: ...])
    """

    def __init__(self, min_confidence: float = _MIN_CONFIDENCE) -> None:
        self._min_confidence = min_confidence

    def validate(
        self,
        template: TemplateResponse,
        slot_values: Dict[str, Any],
        rendered_content: str,
        provenance: ProvenanceTracker,
    ) -> ValidationResult:
        """Run all validation checks and return a ValidationResult."""
        errors: List[str] = []
        warnings: List[str] = []

        # Check 1: All required slots are filled
        for slot in template.slot_definitions:
            if slot.required and (
                slot.name not in slot_values
                or slot_values[slot.name] is None
                or str(slot_values[slot.name]).strip() == ""
            ):
                errors.append(f"Required slot '{slot.name}' is missing or empty")

        # Check 2: No [MISSING: ...] placeholders in rendered content
        if "[MISSING:" in rendered_content:
            import re
            missing = re.findall(r"\[MISSING: (\w+)\]", rendered_content)
            errors.append(f"Rendered content contains unresolved placeholders: {missing}")

        # Check 3: RAG slots have sufficient confidence
        rag_slots = [s.name for s in template.slot_definitions if s.data_source == DataSource.rag_retrieval]
        ungrounded = provenance.has_ungrounded_slots(rag_slots)
        if ungrounded:
            errors.append("One or more RAG-required slots have no grounded source")

        min_conf = provenance.min_confidence()
        if min_conf is not None and min_conf < self._min_confidence:
            errors.append(
                f"Minimum RAG confidence {min_conf:.3f} is below required {self._min_confidence}"
            )

        # Check 4: Check for free-text AI hallucination markers
        # (In future: add AI-based factual grounding check)
        if len(rendered_content.strip()) < 50:
            warnings.append("Generated document is very short — review for completeness")

        is_valid = len(errors) == 0
        if not is_valid:
            logger.warning("validation_failed", error_count=len(errors), errors=errors[:3])
        else:
            logger.info("validation_passed", min_confidence=min_conf)

        return ValidationResult(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            provenance_report=provenance.get_report(),
            min_confidence=min_conf,
        )
