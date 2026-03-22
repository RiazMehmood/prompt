"""Voice session Pydantic models for STT (Whisper) and TTS (Google Cloud)."""
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class VoiceSessionStatus(str, Enum):
    recording = "recording"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class TranscribeRequest(BaseModel):
    """Metadata sent alongside the audio file upload."""
    language_hint: Optional[str] = Field(
        default=None,
        description="ISO language code hint (en, ur, sd). If None, Whisper auto-detects.",
    )
    domain_id: Optional[str] = None


class TranscribeResponse(BaseModel):
    """Whisper transcription result."""
    session_id: str
    text: str
    language_detected: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    is_rtl: bool
    low_confidence_warning: bool = False  # True if confidence < 0.8


class SpeechSynthesisRequest(BaseModel):
    """Request TTS synthesis for an agent response."""
    text: str = Field(..., max_length=5000)
    language: str = Field(
        ..., description="Target language: english | urdu | sindhi"
    )
    conversation_id: Optional[str] = None


class SpeechSynthesisResponse(BaseModel):
    """TTS audio URL (cached or freshly synthesized)."""
    audio_url: str
    language: str
    voice_id: str
    duration_seconds: Optional[float] = None
    is_cached: bool = False
    sindhi_fallback_notice: bool = False  # True when Sindhi maps to Urdu voice


class VoiceSessionDetail(BaseModel):
    """Full voice session record."""
    id: str
    user_id: str
    status: VoiceSessionStatus
    transcription_text: Optional[str]
    language_detected: Optional[str]
    confidence: Optional[float]
    audio_file_path: Optional[str]  # Null after cleanup
    created_at: datetime
    completed_at: Optional[datetime]
