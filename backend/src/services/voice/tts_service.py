"""GoogleTTSService — English/Urdu WaveNet + Sindhi fallback (ADR-0003)."""
from __future__ import annotations

import logging
from typing import Optional

from src.config import settings

logger = logging.getLogger(__name__)

# Language → Google Cloud TTS voice ID mapping
# ADR-0003: Sindhi uses Urdu WaveNet voice as interim strategy
VOICE_MAP = {
    "english": ("en-US", "en-US-Wavenet-D"),
    "urdu": ("ur-IN", "ur-IN-Wavenet-A"),
    "sindhi": ("ur-IN", "ur-IN-Wavenet-A"),  # Sindhi fallback per ADR-0003
}

RTL_LANGUAGES = {"urdu", "sindhi", "ur", "sd"}


class GoogleTTSService:
    """
    Synthesizes speech via Google Cloud Text-to-Speech API.
    - English: Standard WaveNet voice
    - Urdu: WaveNet ur-IN-Wavenet-A
    - Sindhi: Urdu WaveNet voice as fallback (user notice required per ADR-0003)
    """

    def __init__(self) -> None:
        self._client = None
        self._init_client()

    def _init_client(self) -> None:
        try:
            from google.cloud import texttospeech
            self._tts = texttospeech
            self._client = texttospeech.TextToSpeechClient()
            logger.info("Google TTS client initialized")
        except ImportError:
            logger.warning("google-cloud-texttospeech not installed; TTS disabled")
        except Exception as exc:
            logger.warning("Google TTS client init failed: %s", exc)

    async def synthesize(
        self,
        text: str,
        language: str,
    ) -> dict:
        """
        Synthesize text to speech.
        Returns: {audio_bytes, voice_id, language, sindhi_fallback_notice}
        """
        if not self._client:
            raise RuntimeError("Google TTS is not available. Install google-cloud-texttospeech.")

        lang_key = language.lower()
        lang_code, voice_name = VOICE_MAP.get(lang_key, VOICE_MAP["english"])
        sindhi_fallback = lang_key == "sindhi"

        synthesis_input = self._tts.SynthesisInput(text=text)
        voice = self._tts.VoiceSelectionParams(
            language_code=lang_code,
            name=voice_name,
        )
        audio_config = self._tts.AudioConfig(
            audio_encoding=self._tts.AudioEncoding.MP3,
            speaking_rate=0.9 if lang_key in RTL_LANGUAGES else 1.0,
        )

        response = self._client.synthesize_speech(
            input=synthesis_input,
            voice=voice,
            audio_config=audio_config,
        )

        return {
            "audio_bytes": response.audio_content,
            "voice_id": voice_name,
            "language": language,
            "sindhi_fallback_notice": sindhi_fallback,
        }

    def get_voice_id(self, language: str) -> str:
        _, voice_name = VOICE_MAP.get(language.lower(), VOICE_MAP["english"])
        return voice_name
