"""DomainConfigService — per-domain agent parameters and formatting rules."""
from __future__ import annotations

import logging
from functools import lru_cache
from typing import Optional

from src.db.supabase_client import get_supabase_client
from src.models.domain import DomainConfig

logger = logging.getLogger(__name__)

# In-memory config cache (invalidated on update)
_config_cache: dict[str, DomainConfig] = {}


class DomainConfigService:
    """
    Provides per-domain configuration including:
    - AI agent persona and system prompt
    - Supported output languages
    - Document type list
    - Formatting overrides (paper size, font, RTL)
    - RAG confidence threshold
    """

    async def get_config(self, domain_id: str) -> DomainConfig:
        """Return cached (or freshly loaded) domain config."""
        if domain_id in _config_cache:
            return _config_cache[domain_id]
        return await self._load_and_cache(domain_id)

    async def update_config(self, domain_id: str, config: DomainConfig) -> DomainConfig:
        """Persist updated config and invalidate cache."""
        supabase = get_supabase_client(service_role=True)
        supabase.table("domains").update(
            {"configuration": config.model_dump()}
        ).eq("id", domain_id).execute()
        _config_cache[domain_id] = config
        logger.info("Domain config updated and cache refreshed for domain_id=%s", domain_id)
        return config

    def invalidate_cache(self, domain_id: str) -> None:
        _config_cache.pop(domain_id, None)

    async def get_agent_system_prompt(self, domain_id: str) -> str:
        """Return the domain-specific agent system prompt."""
        config = await self.get_config(domain_id)
        return config.agent_persona.system_prompt

    async def get_rag_threshold(self, domain_id: str) -> float:
        """Return the minimum RAG confidence threshold for this domain."""
        config = await self.get_config(domain_id)
        return config.rag_confidence_threshold

    async def get_supported_languages(self, domain_id: str) -> list[str]:
        """Return the list of supported output languages for this domain."""
        config = await self.get_config(domain_id)
        return config.supported_output_languages

    async def get_formatting_rules(self, domain_id: str) -> dict:
        """Return formatting overrides (paper_size, font, rtl, etc.)."""
        config = await self.get_config(domain_id)
        return config.formatting

    # ── Private helpers ───────────────────────────────────────────────────────

    async def _load_and_cache(self, domain_id: str) -> DomainConfig:
        supabase = get_supabase_client(service_role=True)
        resp = (
            supabase.table("domains")
            .select("configuration")
            .eq("id", domain_id)
            .limit(1)
            .execute()
        )
        if not resp.data:
            logger.warning("Domain %s not found; using default config", domain_id)
            return DomainConfig()
        raw = resp.data[0].get("configuration") or {}
        config = DomainConfig(**raw) if raw else DomainConfig()
        _config_cache[domain_id] = config
        return config
