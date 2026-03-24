"""Conversation Pydantic models for multilingual text interaction."""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class RagSource(BaseModel):
    source_id: Optional[str] = None
    text: Optional[str] = None
    confidence: Optional[float] = None
    page: Optional[int] = None


class ConversationRequest(BaseModel):
    message: str
    language_hint: Optional[str] = None  # 'english' | 'urdu' | 'sindhi' | None (auto-detect)
    domain_id: Optional[str] = None  # overrides user's assigned domain if provided
    session_id: Optional[str] = None  # for conversation continuity
    fir_fields: Optional[Dict[str, Any]] = None  # structured FIR data to pre-fill document slots


class ConversationResponse(BaseModel):
    reply: str
    response_language: str  # actual language of the response
    is_rtl: bool
    rag_sources: List[RagSource] = []
    session_id: str
    cached: bool = False
    audio_url: Optional[str] = None  # Populated when client requests voice synthesis (Phase 3)
    # Document generation — populated when AI generates a document inline
    document_ready: bool = False
    document_content: Optional[str] = None
    document_id: Optional[str] = None
