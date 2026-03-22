"""Voice router: STT (Whisper) transcription and TTS synthesis."""
from __future__ import annotations

import tempfile
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import Response

from src.api.dependencies import get_current_user
from src.models.voice import (
    SpeechSynthesisRequest,
    SpeechSynthesisResponse,
    TranscribeResponse,
    VoiceSessionDetail,
)
from src.services.voice.audio_cleanup import AudioCleanupService
from src.services.voice.session_service import VoiceSessionService
from src.services.voice.tts_cache import TTSCacheService
from src.services.voice.tts_service import GoogleTTSService
from src.services.voice.whisper_service import WhisperTranscriptionService

router = APIRouter()
_whisper = WhisperTranscriptionService()
_session_svc = VoiceSessionService()
_cleanup_svc = AudioCleanupService()
_tts = GoogleTTSService()
_tts_cache = TTSCacheService()

ALLOWED_AUDIO_TYPES = {"audio/wav", "audio/mpeg", "audio/ogg", "audio/webm", "audio/mp4"}
MAX_AUDIO_SIZE = 25 * 1024 * 1024  # 25 MB (Whisper limit)


@router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file (WAV/MP3/OGG/WebM, max 25MB)"),
    language_hint: str = Form(default=None),
    current_user: dict = Depends(get_current_user),
):
    """
    Transcribe spoken audio to text using OpenAI Whisper.
    Returns transcription in the original script (no transliteration).
    Audio file is deleted within 30 seconds of completion (GDPR).
    """
    # Size check
    content = await audio.read()
    if len(content) > MAX_AUDIO_SIZE:
        raise HTTPException(status_code=413, detail="Audio file exceeds 25 MB limit")

    # Save to temp file
    suffix = Path(audio.filename or "audio.wav").suffix or ".wav"
    tmp = Path(tempfile.mktemp(suffix=suffix))
    tmp.write_bytes(content)

    session_id = await _session_svc.create(current_user["user_id"], tmp)

    try:
        result = await _whisper.transcribe(tmp, language_hint)

        await _session_svc.complete(
            session_id,
            text=result["text"],
            language=result["language_detected"],
            confidence=result["confidence"],
        )
        # Schedule GDPR cleanup (non-blocking)
        await _cleanup_svc.schedule_cleanup(session_id, tmp)

        return TranscribeResponse(
            session_id=session_id,
            text=result["text"],
            language_detected=result["language_detected"],
            confidence=result["confidence"],
            is_rtl=result["is_rtl"],
            low_confidence_warning=result["confidence"] < 0.8,
        )
    except Exception as exc:
        await _session_svc.fail(session_id, str(exc))
        await _cleanup_svc.immediate_cleanup(session_id, tmp)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}") from exc


@router.get("/sessions/{session_id}", response_model=VoiceSessionDetail)
async def get_voice_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Check the status of a voice session."""
    try:
        return await _session_svc.get(session_id, current_user["user_id"])
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.post("/synthesize", response_model=SpeechSynthesisResponse)
async def synthesize_speech(
    body: SpeechSynthesisRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Synthesize text to speech.
    Returns audio URL (cached MP3 if available, else freshly synthesized).
    Sindhi uses Urdu WaveNet voice per ADR-0003.
    """
    # Check cache first
    cached_url = _tts_cache.get_url(body.text, body.language)
    if cached_url:
        return SpeechSynthesisResponse(
            audio_url=cached_url,
            language=body.language,
            voice_id=_tts.get_voice_id(body.language),
            is_cached=True,
            sindhi_fallback_notice=body.language.lower() == "sindhi",
        )

    # Synthesize
    try:
        result = await _tts.synthesize(body.text, body.language)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    # Cache and return URL
    cache_path = _tts_cache.set(body.text, body.language, result["audio_bytes"])

    return SpeechSynthesisResponse(
        audio_url=f"/voice/audio/{cache_path.name}",
        language=body.language,
        voice_id=result["voice_id"],
        is_cached=False,
        sindhi_fallback_notice=result["sindhi_fallback_notice"],
    )


@router.get("/audio/{filename}")
async def serve_audio(filename: str, current_user: dict = Depends(get_current_user)):
    """Serve cached TTS audio file."""
    from src.services.voice.tts_cache import _CACHE_DIR
    audio_path = _CACHE_DIR / filename
    if not audio_path.exists() or not audio_path.suffix == ".mp3":
        raise HTTPException(status_code=404, detail="Audio file not found")
    return Response(content=audio_path.read_bytes(), media_type="audio/mpeg")
