"""WhisperTranscriptionService — STT via OpenAI Whisper API."""
from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Optional

import openai

from src.config import settings
from src.services.language.detection import LanguageDetectionService

logger = logging.getLogger(__name__)

_lang_service = LanguageDetectionService()

# Language hint → Whisper language code mapping
WHISPER_LANG_MAP = {
    "english": "en",
    "urdu": "ur",
    "sindhi": "sd",
    "en": "en",
    "ur": "ur",
    "sd": "sd",
}

RTL_LANGUAGES = {"ur", "sd", "urdu", "sindhi"}


class WhisperTranscriptionService:
    """
    Transcribes audio using OpenAI Whisper API.
    Returns text in the original script (no transliteration).
    Audio cleanup responsibility lies with AudioCleanupService.
    """

    def __init__(self) -> None:
        openai.api_key = settings.OPENAI_API_KEY

    async def transcribe(
        self,
        audio_path: Path,
        language_hint: Optional[str] = None,
    ) -> dict:
        """
        Transcribe audio file. Returns:
        {
            text: str,
            language_detected: str,
            confidence: float (0-1, estimated from Whisper metadata),
            is_rtl: bool,
        }
        """
        whisper_lang = None
        if language_hint:
            whisper_lang = WHISPER_LANG_MAP.get(language_hint.lower())

        try:
            with open(audio_path, "rb") as audio_file:
                response = openai.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=whisper_lang,
                    response_format="verbose_json",
                )
        except openai.RateLimitError:
            logger.warning("Whisper rate limited; retrying without language hint")
            # Retry without language hint
            with open(audio_path, "rb") as audio_file:
                response = openai.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    response_format="verbose_json",
                )

        text: str = response.text.strip()
        lang_detected: str = getattr(response, "language", "english") or "english"

        # Estimate confidence from segment avg log-probs
        confidence = self._estimate_confidence(response)

        is_rtl = lang_detected.lower() in RTL_LANGUAGES or (
            language_hint and language_hint.lower() in RTL_LANGUAGES
        )

        return {
            "text": text,
            "language_detected": lang_detected,
            "confidence": confidence,
            "is_rtl": is_rtl,
        }

    @staticmethod
    def _estimate_confidence(response) -> float:
        """
        Estimate transcript confidence from Whisper verbose_json segments.
        Segments have avg_logprob; we convert to 0-1 probability.
        """
        segments = getattr(response, "segments", None)
        if not segments:
            return 0.85  # Default assumption when no metadata

        import math
        avg_logprobs = [
            s.get("avg_logprob", -0.2)
            for s in segments
            if isinstance(s, dict) and "avg_logprob" in s
        ]
        if not avg_logprobs:
            return 0.85
        avg = sum(avg_logprobs) / len(avg_logprobs)
        # Map log-prob to [0,1]: avg_logprob of 0 → 1.0, -1 → ~0.37
        return round(min(1.0, math.exp(avg)), 3)
