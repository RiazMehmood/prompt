"""Pydantic models for document generation requests and responses."""
from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class OutputLanguage(str, Enum):
    english = "english"
    urdu = "urdu"
    sindhi = "sindhi"


class OutputFormat(str, Enum):
    in_app = "in_app"
    pdf = "pdf"
    docx = "docx"


class GenerateRequest(BaseModel):
    template_id: str
    input_parameters: Dict[str, Any] = Field(
        default_factory=dict,
        description="User-provided slot values matching template slot_definitions",
    )
    output_language: OutputLanguage = OutputLanguage.english
    output_format: OutputFormat = OutputFormat.in_app


class RagSource(BaseModel):
    source_id: Optional[str] = None
    text: Optional[str] = None
    confidence: Optional[float] = None
    page: Optional[int] = None


class GenerateResponse(BaseModel):
    id: str
    status: str  # 'pending' | 'processing' | 'completed' | 'failed'
    message: str = ""


class DocumentDetail(BaseModel):
    id: str
    template_id: str
    domain_id: str
    output_content: str
    output_language: OutputLanguage
    output_format: OutputFormat
    validation_status: str
    validation_errors: Optional[Dict[str, Any]] = None
    retrieved_sources: List[RagSource] = Field(default_factory=list)
    created_at: datetime

    model_config = {"from_attributes": True}
