"""VoiceSessionService — manage voice session lifecycle in the database."""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from src.db.supabase_client import get_supabase_admin
from src.models.voice import VoiceSessionDetail, VoiceSessionStatus

logger = logging.getLogger(__name__)


class VoiceSessionService:
    """CRUD for voice_sessions table: create, update status, fetch detail."""

    async def create(self, user_id: str, audio_file_path: Path) -> str:
        """Create a new voice session record. Returns session_id."""
        supabase = get_supabase_admin()
        row = {
            "user_id": user_id,
            "status": VoiceSessionStatus.processing.value,
            "audio_file_path": str(audio_file_path),
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        resp = supabase.table("voice_sessions").insert(row).execute()
        if not resp.data:
            raise RuntimeError("Failed to create voice session record")
        session_id = resp.data[0]["id"]
        logger.info("Voice session created: %s", session_id)
        return session_id

    async def complete(
        self,
        session_id: str,
        text: str,
        language: str,
        confidence: float,
    ) -> None:
        supabase = get_supabase_admin()
        supabase.table("voice_sessions").update(
            {
                "status": VoiceSessionStatus.completed.value,
                "transcription_text": text,
                "language_detected": language,
                "confidence": confidence,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", session_id).execute()

    async def fail(self, session_id: str, error_message: str) -> None:
        supabase = get_supabase_admin()
        supabase.table("voice_sessions").update(
            {
                "status": VoiceSessionStatus.failed.value,
                "error_message": error_message,
                "completed_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("id", session_id).execute()

    async def get(self, session_id: str, user_id: str) -> VoiceSessionDetail:
        supabase = get_supabase_admin()
        resp = (
            supabase.table("voice_sessions")
            .select("*")
            .eq("id", session_id)
            .eq("user_id", user_id)
            .limit(1)
            .execute()
        )
        if not resp.data:
            raise ValueError(f"Voice session {session_id} not found")
        row = resp.data[0]
        return VoiceSessionDetail(
            id=row["id"],
            user_id=row["user_id"],
            status=VoiceSessionStatus(row["status"]),
            transcription_text=row.get("transcription_text"),
            language_detected=row.get("language_detected"),
            confidence=row.get("confidence"),
            audio_file_path=row.get("audio_file_path"),
            created_at=datetime.fromisoformat(row["created_at"]),
            completed_at=(
                datetime.fromisoformat(row["completed_at"])
                if row.get("completed_at")
                else None
            ),
        )
