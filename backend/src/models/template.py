"""Template Pydantic models."""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class SlotType(str, Enum):
    text = "text"
    date = "date"
    number = "number"
    list = "list"


class DataSource(str, Enum):
    user_input = "user_input"
    rag_retrieval = "rag_retrieval"


class SlotDefinition(BaseModel):
    name: str
    type: SlotType
    required: bool
    data_source: DataSource
    description: Optional[str] = None


class FormattingRules(BaseModel):
    paper_size: str = "A4"
    margins: Dict[str, str] = Field(
        default_factory=lambda: {"top": "1in", "bottom": "1in", "left": "1.25in", "right": "1in"}
    )
    font: str = "Times New Roman"
    font_size: int = 12
    language: str = "english"
    direction: str = "ltr"


class TemplateCreate(BaseModel):
    name: str
    domain_id: str
    description: Optional[str] = None
    content: str
    slot_definitions: List[SlotDefinition]
    formatting_rules: FormattingRules = Field(default_factory=FormattingRules)
    version: str = "1.0.0"


class TemplateUpdate(BaseModel):
    description: Optional[str] = None
    content: Optional[str] = None
    slot_definitions: Optional[List[SlotDefinition]] = None
    formatting_rules: Optional[FormattingRules] = None
    is_active: Optional[bool] = None


class TemplateResponse(BaseModel):
    id: str
    name: str
    domain_id: str
    description: Optional[str] = None
    content: str
    slot_definitions: List[SlotDefinition]
    formatting_rules: FormattingRules
    version: str
    is_active: bool
    created_at: datetime

    model_config = {"from_attributes": True}
