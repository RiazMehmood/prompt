"""TTS audio cache — hash(text+language) → local file cache."""
from __future__ import annotations

import hashlib
import logging
from pathlib import Path
from typing import Optional

from src.config import settings

logger = logging.getLogger(__name__)

# Cache directory on the external drive (same volume as ChromaDB / HF models)
_CACHE_DIR = Path(settings.CHROMADB_PATH).parent / "tts_cache"
_CACHE_DIR.mkdir(parents=True, exist_ok=True)


class TTSCacheService:
    """
    Content-addressed TTS audio cache.
    Key: SHA256(text + language)
    Value: MP3 file on disk.
    Avoids duplicate TTS API calls for repeated responses.
    """

    def get(self, text: str, language: str) -> Optional[bytes]:
        """Return cached MP3 bytes if available, else None."""
        cache_path = self._path(text, language)
        if cache_path.exists():
            logger.debug("TTS cache hit for lang=%s", language)
            return cache_path.read_bytes()
        return None

    def set(self, text: str, language: str, audio_bytes: bytes) -> Path:
        """Store audio bytes in cache. Returns file path."""
        cache_path = self._path(text, language)
        cache_path.write_bytes(audio_bytes)
        logger.debug("TTS cached: lang=%s size=%d bytes", language, len(audio_bytes))
        return cache_path

    def get_url(self, text: str, language: str) -> Optional[str]:
        """Return file:// URL if cached, else None."""
        cache_path = self._path(text, language)
        if cache_path.exists():
            return f"file://{cache_path}"
        return None

    def invalidate(self, text: str, language: str) -> None:
        cache_path = self._path(text, language)
        if cache_path.exists():
            cache_path.unlink()

    def clear_all(self) -> int:
        """Clear all cached audio files. Returns count deleted."""
        count = 0
        for f in _CACHE_DIR.glob("*.mp3"):
            f.unlink()
            count += 1
        return count

    @staticmethod
    def _path(text: str, language: str) -> Path:
        key = hashlib.sha256(f"{language}:{text}".encode()).hexdigest()
        return _CACHE_DIR / f"{key}.mp3"
