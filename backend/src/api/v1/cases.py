"""Cases API — persistent lawyer case files linked to FIR extractions."""
from datetime import datetime, timezone
from typing import Optional

import structlog
from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from src.api.dependencies import CurrentUser
from src.db.supabase_client import get_supabase_admin

router = APIRouter()
logger = structlog.get_logger(__name__)


# ── Schemas ───────────────────────────────────────────────────────────────────

class CaseCreate(BaseModel):
    fir_fields: dict
    fir_file_names: list[str] = []
    notes: Optional[str] = None


class CaseUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    case_title: Optional[str] = None


class CaseResponse(BaseModel):
    id: str
    user_id: str
    domain_id: str
    case_title: str
    fir_number: Optional[str]
    fir_date: Optional[str]
    police_station: Optional[str]
    district: Optional[str]
    sections: Optional[str]
    accused_name: Optional[str]
    complainant_name: Optional[str]
    fir_fields: dict
    fir_file_names: list[str]
    status: str
    notes: Optional[str]
    created_at: str
    updated_at: str


def _build_title(fields: dict) -> str:
    accused = fields.get("accused_name") or "Unknown Accused"
    fir_no  = fields.get("fir_number") or ""
    ps      = fields.get("police_station") or ""
    parts   = [f"State vs {accused}"]
    if fir_no:
        parts.append(f"FIR {fir_no}")
    if ps:
        parts.append(f"PS {ps}")
    return " — ".join(parts)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.post("", status_code=status.HTTP_201_CREATED, response_model=CaseResponse)
async def create_case(body: CaseCreate, current_user: CurrentUser) -> CaseResponse:
    """Create a new case file from extracted FIR fields."""
    if not current_user.domain_id:
        raise HTTPException(status_code=400, detail="User has no domain assigned")

    fields = body.fir_fields
    db = get_supabase_admin()

    row = {
        "user_id":          current_user.id,
        "domain_id":        current_user.domain_id,
        "case_title":       _build_title(fields),
        "fir_number":       fields.get("fir_number"),
        "fir_date":         fields.get("fir_date"),
        "police_station":   fields.get("police_station"),
        "district":         fields.get("district"),
        "sections":         fields.get("sections"),
        "accused_name":     fields.get("accused_name"),
        "complainant_name": fields.get("complainant_name"),
        "fir_fields":       fields,
        "fir_file_names":   body.fir_file_names,
        "notes":            body.notes,
        "status":           "active",
    }

    result = db.table("cases").insert(row).execute()
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create case")

    logger.info("case_created", case_id=result.data[0]["id"], user=current_user.id)
    return CaseResponse(**result.data[0])


@router.get("", response_model=list[CaseResponse])
async def list_cases(
    current_user: CurrentUser,
    case_status: Optional[str] = None,
) -> list[CaseResponse]:
    """List all cases for the current user, newest first."""
    db = get_supabase_admin()
    query = (
        db.table("cases")
        .select("*")
        .eq("user_id", current_user.id)
        .order("created_at", desc=True)
    )
    if case_status:
        query = query.eq("status", case_status)
    result = query.execute()
    return [CaseResponse(**row) for row in (result.data or [])]


@router.get("/{case_id}", response_model=CaseResponse)
async def get_case(case_id: str, current_user: CurrentUser) -> CaseResponse:
    db = get_supabase_admin()
    result = (
        db.table("cases")
        .select("*")
        .eq("id", case_id)
        .eq("user_id", current_user.id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseResponse(**result.data)


@router.patch("/{case_id}", response_model=CaseResponse)
async def update_case(case_id: str, body: CaseUpdate, current_user: CurrentUser) -> CaseResponse:
    db = get_supabase_admin()
    updates = {k: v for k, v in body.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    # validate status
    if "status" in updates and updates["status"] not in ("active", "closed", "archived"):
        raise HTTPException(status_code=400, detail="Invalid status")
    result = (
        db.table("cases")
        .update(updates)
        .eq("id", case_id)
        .eq("user_id", current_user.id)
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Case not found")
    return CaseResponse(**result.data[0])


@router.delete("/{case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_case(case_id: str, current_user: CurrentUser) -> None:
    db = get_supabase_admin()
    db.table("cases").delete().eq("id", case_id).eq("user_id", current_user.id).execute()
