"""FIR extraction API — multi-pass Gemini Vision scanner for Urdu/Sindhi FIR documents."""
from typing import List

import structlog
from fastapi import APIRouter, File, HTTPException, UploadFile

from src.api.dependencies import CurrentUser
from src.services.ai.fir_extractor import FIRExtractor, FIR_FIELDS

router = APIRouter()
logger = structlog.get_logger(__name__)

_ALLOWED_MIMES = {
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/tiff",
    "image/webp",
    "image/heic",
    "image/heif",
}
_MAX_SIZE_MB = 20


@router.post("/extract")
async def extract_fir(
    current_user: CurrentUser,
    files: List[UploadFile] = File(...),
) -> dict:
    """Upload one or more FIR pages (PDF or images) and extract all fields.

    Accepts multiple files (e.g. two photos of front and back of FIR).
    Runs a two-pass Gemini Vision pipeline optimized for Urdu/Sindhi photocopies.
    """
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    all_bytes: list[tuple[bytes, str]] = []
    for file in files[:6]:  # max 6 pages
        mime = (file.content_type or "").lower()
        if mime not in _ALLOWED_MIMES:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {mime}. Allowed: PDF, JPEG, PNG, TIFF, WebP",
            )
        contents = await file.read()
        size_mb = len(contents) / (1024 * 1024)
        if size_mb > _MAX_SIZE_MB:
            raise HTTPException(status_code=413, detail=f"File {file.filename} too large ({size_mb:.1f}MB, max {_MAX_SIZE_MB}MB)")
        all_bytes.append((contents, mime))

    logger.info(
        "fir_extract_request",
        user=current_user.id,
        file_count=len(all_bytes),
        filenames=[f.filename for f in files[:6]],
    )

    extractor = FIRExtractor()
    result = await extractor.extract_multi(all_bytes)

    logger.info(
        "fir_extract_done",
        user=current_user.id,
        filled=result["filled_count"],
        confidence=result["confidence"],
        critical_missing=result.get("critical_missing", []),
    )
    return result


@router.get("/fields")
async def get_fir_fields(_: CurrentUser) -> list[dict]:
    """Return the metadata for all FIR fields (key, label, group, critical)."""
    return FIR_FIELDS
