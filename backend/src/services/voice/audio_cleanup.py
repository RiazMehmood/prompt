"""AudioCleanupService — GDPR-compliant deletion of temp audio files within 30s."""
from __future__ import annotations

import asyncio
import logging
from pathlib import Path

from src.db.supabase_client import get_supabase_admin

logger = logging.getLogger(__name__)


class AudioCleanupService:
    """
    Schedules audio file deletion 30 seconds after transcription completes.
    Updates VoiceSession.audio_file_path to null after deletion.
    """

    async def schedule_cleanup(self, session_id: str, audio_path: Path) -> None:
        """Non-blocking: schedule cleanup as a background coroutine."""
        asyncio.create_task(self._cleanup_after_delay(session_id, audio_path))

    async def _cleanup_after_delay(self, session_id: str, audio_path: Path) -> None:
        await asyncio.sleep(30)
        await self._delete_audio(session_id, audio_path)

    async def _delete_audio(self, session_id: str, audio_path: Path) -> None:
        try:
            if audio_path.exists():
                audio_path.unlink()
                logger.info(
                    "Audio file deleted for session_id=%s path=%s",
                    session_id,
                    audio_path,
                )
        except Exception as exc:
            logger.error(
                "Failed to delete audio file session_id=%s: %s", session_id, exc
            )

        # Null out the DB reference regardless of file deletion success
        try:
            supabase = get_supabase_admin()
            supabase.table("voice_sessions").update(
                {"audio_file_path": None}
            ).eq("id", session_id).execute()
        except Exception as exc:
            logger.error(
                "Failed to clear audio_file_path in DB session_id=%s: %s",
                session_id,
                exc,
            )

    async def immediate_cleanup(self, session_id: str, audio_path: Path) -> None:
        """Synchronous cleanup for error paths — delete immediately."""
        await self._delete_audio(session_id, audio_path)
