"""LanguageDetectionService: detect English/Urdu/Sindhi from text input."""
import re
from typing import Optional

import structlog

logger = structlog.get_logger(__name__)

# Unicode ranges for Arabic-script languages
_ARABIC_SCRIPT_RE = re.compile(r"[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]")

# Sindhi-specific characters not common in Urdu
_SINDHI_CHARS = set("ڄڃڻڙ")
# Urdu-specific characters not common in Arabic
_URDU_CHARS = set("ں ے ہ")


def detect_language(text: str) -> str:
    """Detect the primary language of the input text.

    Returns: 'english', 'urdu', 'sindhi', or 'mixed'

    Strategy:
    1. Count Arabic-script chars vs Latin chars
    2. If Arabic-dominant, check for Sindhi-specific characters
    3. Falls back to 'english' if uncertain
    """
    if not text or not text.strip():
        return "english"

    text_clean = text.strip()

    # Count script characters
    arabic_chars = len(_ARABIC_SCRIPT_RE.findall(text_clean))
    total_alpha = sum(1 for c in text_clean if c.isalpha())

    if total_alpha == 0:
        return "english"

    arabic_ratio = arabic_chars / total_alpha

    if arabic_ratio < 0.3:
        # Mostly Latin — English
        return "english"

    if arabic_ratio >= 0.3:
        # Check for Sindhi-specific characters
        if any(c in _SINDHI_CHARS for c in text_clean):
            return "sindhi"
        # Default Arabic-script to Urdu for Pakistan context
        return "urdu"

    return "english"


def detect_with_library(text: str) -> str:
    """Use langdetect library for better accuracy when available."""
    try:
        from langdetect import detect, LangDetectException

        lang = detect(text)
        # langdetect uses ISO 639-1 codes
        if lang == "ur":
            return "urdu"
        elif lang == "sd":
            return "sindhi"
        elif lang in ("en", "en-us", "en-gb"):
            return "english"
        # For Arabic ('ar'), check for Sindhi chars
        elif lang == "ar":
            if any(c in _SINDHI_CHARS for c in text):
                return "sindhi"
            return "urdu"
        else:
            # For unknown or other scripts, fall back to character-based detection
            return detect_language(text)
    except Exception:
        # langdetect fails on short strings; use character-based fallback
        return detect_language(text)


class LanguageDetectionService:
    """Service for detecting input language with fallback strategy."""

    def detect(self, text: str) -> str:
        """Detect language with library-first, character-based fallback."""
        if len(text.strip()) < 10:
            # Too short for langdetect — use character-based
            return detect_language(text)
        return detect_with_library(text)

    def is_rtl(self, language: str) -> bool:
        return language in ("urdu", "sindhi", "arabic")

    def get_tts_language_code(self, language: str) -> str:
        """Map platform language to Google Cloud TTS language code."""
        mapping = {
            "english": "en-US",
            "urdu": "ur-IN",
            "sindhi": "ur-IN",  # ADR-0003: Urdu voice fallback for Sindhi
        }
        return mapping.get(language, "en-US")

    def get_whisper_language_code(self, language: str) -> Optional[str]:
        """Map platform language to Whisper API language hint."""
        mapping = {
            "english": "en",
            "urdu": "ur",
            "sindhi": "sd",
        }
        return mapping.get(language)
