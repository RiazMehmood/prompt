"""Admin utility endpoints — free-tier usage dashboard, health, diagnostics."""
from __future__ import annotations

import os
import shutil
from pathlib import Path

from fastapi import APIRouter, Depends

from src.api.dependencies import RootAdminUser
from src.config import settings
from src.db.supabase_client import get_supabase_admin

router = APIRouter()

_ALERT_THRESHOLD = 0.80  # Alert at 80% of any free-tier limit


@router.get("/admin/free-tier-usage")
async def free_tier_usage(_admin: RootAdminUser):
    """
    Dashboard endpoint for tracking free-tier resource consumption.
    Alerts at 80% of any limit.
    Resources tracked:
    - Supabase DB rows (via table counts)
    - ChromaDB disk usage
    - External drive disk usage
    """
    alerts = []
    metrics = {}

    # ── ChromaDB / external drive disk usage ─────────────────────────────────
    chroma_path = Path(settings.CHROMADB_PATH)
    if chroma_path.exists():
        drive_usage = shutil.disk_usage(chroma_path)
        drive_pct = drive_usage.used / drive_usage.total if drive_usage.total else 0
        metrics["external_drive"] = {
            "used_gb": round(drive_usage.used / 1e9, 2),
            "total_gb": round(drive_usage.total / 1e9, 2),
            "pct": round(drive_pct * 100, 1),
        }
        if drive_pct >= _ALERT_THRESHOLD:
            alerts.append({
                "resource": "external_drive",
                "message": f"External drive at {round(drive_pct*100, 1)}% capacity",
                "severity": "warning",
            })

    # ── Supabase row counts ───────────────────────────────────────────────────
    supabase = get_supabase_admin()
    for table in ["profiles", "generated_documents", "documents", "embeddings"]:
        try:
            resp = supabase.table(table).select("id", count="exact").execute()
            metrics[f"supabase_{table}_count"] = resp.count or 0
        except Exception:
            metrics[f"supabase_{table}_count"] = None

    # ── Root disk usage ───────────────────────────────────────────────────────
    root_usage = shutil.disk_usage("/")
    root_pct = root_usage.used / root_usage.total if root_usage.total else 0
    metrics["root_disk"] = {
        "used_gb": round(root_usage.used / 1e9, 2),
        "total_gb": round(root_usage.total / 1e9, 2),
        "pct": round(root_pct * 100, 1),
    }
    if root_pct >= _ALERT_THRESHOLD:
        alerts.append({
            "resource": "root_disk",
            "message": f"Root partition at {round(root_pct*100, 1)}% — consider moving data to external drive",
            "severity": "critical",
        })

    return {
        "metrics": metrics,
        "alerts": alerts,
        "alert_threshold_pct": _ALERT_THRESHOLD * 100,
        "chromadb_path": str(settings.CHROMADB_PATH),
    }
