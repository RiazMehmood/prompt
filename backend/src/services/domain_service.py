"""DomainService — create, configure, and manage multi-tenant domains."""
from __future__ import annotations

import logging
from typing import Optional

from fastapi import HTTPException, status

from src.db.chromadb_client import get_or_create_domain_collection
from src.db.supabase_client import get_supabase_admin
from src.models.domain import DomainCreate, DomainResponse, DomainUpdate, DomainConfig

logger = logging.getLogger(__name__)


class DomainService:
    """CRUD operations for domains with ChromaDB namespace provisioning."""

    async def list_domains(self, include_inactive: bool = False) -> list[DomainResponse]:
        supabase = get_supabase_admin()
        query = supabase.table("domains").select(
            "*, user_count:profiles(count), template_count:templates(count), document_count:documents(count)"
        )
        if not include_inactive:
            query = query.eq("is_active", True)
        resp = query.order("name").execute()
        return [self._to_response(row) for row in (resp.data or [])]

    async def get_domain(self, domain_id: str) -> DomainResponse:
        supabase = get_supabase_admin()
        resp = (
            supabase.table("domains")
            .select("*")
            .eq("id", domain_id)
            .limit(1)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Domain not found")
        return self._to_response(resp.data[0])

    async def create_domain(self, data: DomainCreate) -> DomainResponse:
        supabase = get_supabase_admin()

        # Check namespace uniqueness
        existing = (
            supabase.table("domains")
            .select("id")
            .eq("namespace", data.namespace)
            .execute()
        )
        if existing.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Namespace '{data.namespace}' is already taken",
            )

        # Provision ChromaDB collection
        try:
            get_or_create_domain_collection(data.namespace)
            logger.info("Provisioned ChromaDB collection for namespace=%s", data.namespace)
        except Exception as exc:
            logger.error("ChromaDB provisioning failed: %s", exc)
            raise HTTPException(
                status_code=500,
                detail=f"Failed to provision vector collection: {exc}",
            )

        row = {
            "name": data.name,
            "description": data.description,
            "namespace": data.namespace,
            "icon_url": data.icon_url,
            "configuration": data.configuration.model_dump(),
            "is_active": True,
        }
        resp = supabase.table("domains").insert(row).execute()
        if not resp.data:
            raise HTTPException(status_code=500, detail="Domain creation failed")
        return self._to_response(resp.data[0])

    async def update_domain(self, domain_id: str, data: DomainUpdate) -> DomainResponse:
        supabase = get_supabase_admin()
        updates = data.model_dump(exclude_none=True)
        if not updates:
            return await self.get_domain(domain_id)
        resp = (
            supabase.table("domains")
            .update(updates)
            .eq("id", domain_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Domain not found")
        return self._to_response(resp.data[0])

    async def update_config(self, domain_id: str, config: DomainConfig) -> DomainResponse:
        supabase = get_supabase_admin()
        resp = (
            supabase.table("domains")
            .update({"configuration": config.model_dump()})
            .eq("id", domain_id)
            .execute()
        )
        if not resp.data:
            raise HTTPException(status_code=404, detail="Domain not found")
        return self._to_response(resp.data[0])

    async def delete_domain(self, domain_id: str) -> None:
        """Soft-delete domain only if no active users are assigned to it."""
        supabase = get_supabase_admin()
        user_count_resp = (
            supabase.table("profiles")
            .select("id", count="exact")
            .eq("domain_id", domain_id)
            .execute()
        )
        user_count = user_count_resp.count or 0
        if user_count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Cannot delete domain with {user_count} active user(s). Deactivate instead.",
            )
        supabase.table("domains").update({"is_active": False}).eq("id", domain_id).execute()

    # ── Helpers ──────────────────────────────────────────────────────────────

    @staticmethod
    def _to_response(row: dict) -> DomainResponse:
        config_raw = row.get("configuration") or {}
        return DomainResponse(
            id=row["id"],
            name=row["name"],
            description=row.get("description", ""),
            namespace=row["namespace"],
            icon_url=row.get("icon_url"),
            is_active=row.get("is_active", True),
            user_count=row.get("user_count", 0),
            template_count=row.get("template_count", 0),
            document_count=row.get("document_count", 0),
            configuration=DomainConfig(**config_raw) if config_raw else DomainConfig(),
            created_at=row["created_at"],
        )
