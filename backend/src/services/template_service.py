"""TemplateService: parse {{slot}} syntax, validate, CRUD operations."""
import re
from typing import Any, Dict, List, Optional, Set

import structlog

from src.db.supabase_client import get_supabase_admin
from src.models.template import TemplateCreate, TemplateResponse, TemplateUpdate

logger = structlog.get_logger(__name__)

_SLOT_PATTERN = re.compile(r"\{\{(\w+)\}\}")


class TemplateService:
    """Manage templates: creation, validation, retrieval."""

    def __init__(self) -> None:
        self._admin = get_supabase_admin()

    def extract_slots(self, content: str) -> Set[str]:
        """Extract all {{slot_name}} placeholders from template content."""
        return set(_SLOT_PATTERN.findall(content))

    def validate_template(self, create: TemplateCreate) -> List[str]:
        """Validate that all {{slot}} placeholders are defined in slot_definitions.

        Returns a list of error strings (empty = valid).
        """
        errors: List[str] = []
        content_slots = self.extract_slots(create.content)
        defined_slots = {s.name for s in create.slot_definitions}

        # All content slots must be defined
        undefined = content_slots - defined_slots
        if undefined:
            errors.append(f"Slots in content not defined: {sorted(undefined)}")

        # All defined slots must appear in content
        unused = defined_slots - content_slots
        if unused:
            errors.append(f"Defined slots not used in content: {sorted(unused)}")

        return errors

    def render(self, content: str, slot_values: Dict[str, Any]) -> str:
        """Replace {{slot_name}} placeholders with provided values."""
        def replace(match: re.Match) -> str:
            name = match.group(1)
            value = slot_values.get(name)
            if value is None:
                return f"[MISSING: {name}]"
            return str(value)
        return _SLOT_PATTERN.sub(replace, content)

    async def create_template(self, create: TemplateCreate, created_by: str) -> TemplateResponse:
        """Create a new template after validation."""
        errors = self.validate_template(create)
        if errors:
            raise ValueError(f"Template validation failed: {'; '.join(errors)}")

        result = self._admin.table("templates").insert({
            "name": create.name,
            "domain_id": create.domain_id,
            "description": create.description,
            "content": create.content,
            "slot_definitions": [s.model_dump() for s in create.slot_definitions],
            "formatting_rules": create.formatting_rules.model_dump(),
            "version": create.version,
            "is_active": True,
            "created_by": created_by,
        }).execute()
        row = result.data[0]
        logger.info("template_created", template_id=row["id"], name=create.name)
        return TemplateResponse(**row)

    async def get_template(self, template_id: str, domain_id: str) -> TemplateResponse:
        """Retrieve a template, enforcing domain isolation."""
        result = self._admin.table("templates").select("*").eq("id", template_id).eq(
            "domain_id", domain_id
        ).single().execute()
        if not result.data:
            raise ValueError(f"Template {template_id} not found in domain {domain_id}")
        return TemplateResponse(**result.data)

    async def list_templates(self, domain_id: str, active_only: bool = True) -> List[TemplateResponse]:
        """List templates for a domain."""
        query = self._admin.table("templates").select("*").eq("domain_id", domain_id)
        if active_only:
            query = query.eq("is_active", True)
        result = query.execute()
        return [TemplateResponse(**row) for row in (result.data or [])]

    async def update_template(
        self, template_id: str, domain_id: str, update: TemplateUpdate
    ) -> TemplateResponse:
        """Update a template's metadata (creates a new version for content changes)."""
        updates = update.model_dump(exclude_none=True)
        if "slot_definitions" in updates:
            updates["slot_definitions"] = [
                s.model_dump() for s in update.slot_definitions  # type: ignore
            ]
        if "formatting_rules" in updates:
            updates["formatting_rules"] = update.formatting_rules.model_dump()  # type: ignore
        result = self._admin.table("templates").update(updates).eq("id", template_id).eq(
            "domain_id", domain_id
        ).execute()
        if not result.data:
            raise ValueError(f"Template {template_id} not found")
        return TemplateResponse(**result.data[0])
