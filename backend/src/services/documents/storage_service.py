"""StorageService — CDN-served PDF/DOCX via Supabase Storage with signed URLs."""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from src.config import settings
from src.db.supabase_client import get_supabase_client

logger = logging.getLogger(__name__)

BUCKET_NAME = "generated-documents"
SIGNED_URL_EXPIRY = 3600  # 1 hour


class StorageService:
    """
    Uploads generated documents to Supabase Storage and returns signed URLs.
    Falls back to streaming if Supabase Storage is unavailable.
    """

    async def upload_and_get_url(
        self,
        file_bytes: bytes,
        filename: str,
        content_type: str,
        document_id: str,
    ) -> str:
        """
        Upload file to Supabase Storage and return a signed URL.
        Path: generated-documents/{document_id}/{filename}
        """
        supabase = get_supabase_client(service_role=True)
        storage_path = f"{document_id}/{filename}"

        try:
            # Upload
            supabase.storage.from_(BUCKET_NAME).upload(
                storage_path,
                file_bytes,
                file_options={"content-type": content_type, "upsert": "true"},
            )

            # Create signed URL (private bucket)
            signed = supabase.storage.from_(BUCKET_NAME).create_signed_url(
                storage_path, SIGNED_URL_EXPIRY
            )
            url = signed.get("signedURL") or signed.get("signed_url")
            if not url:
                raise ValueError("No signed URL returned")

            logger.info(
                "Uploaded %s to Supabase Storage path=%s", filename, storage_path
            )
            return url

        except Exception as exc:
            logger.error("Supabase Storage upload failed: %s", exc)
            # Return a local streaming fallback URL
            return f"/api/generate/{document_id}/export?format={'pdf' if 'pdf' in filename else 'docx'}&direct=1"

    async def delete_document_files(self, document_id: str) -> None:
        """Remove all files for a document from Supabase Storage."""
        supabase = get_supabase_client(service_role=True)
        try:
            files = supabase.storage.from_(BUCKET_NAME).list(document_id)
            paths = [f"{document_id}/{f['name']}" for f in (files or [])]
            if paths:
                supabase.storage.from_(BUCKET_NAME).remove(paths)
                logger.info("Deleted %d files for document_id=%s", len(paths), document_id)
        except Exception as exc:
            logger.warning("Storage cleanup failed for doc=%s: %s", document_id, exc)
