"""Gemini API Key Rotator: round-robin with automatic failover on 429 errors."""
import threading
import time
from collections import defaultdict
from typing import Dict, List, Optional

import structlog

from src.config import settings

logger = structlog.get_logger(__name__)

# Back-off duration (seconds) for a key that hit a 429 rate limit
_RATE_LIMIT_BACKOFF = 60


class GeminiKeyRotator:
    """Thread-safe round-robin key rotator with per-key rate-limit tracking.

    Usage:
        rotator = get_key_rotator()
        key = rotator.get_key()
        try:
            # call Gemini API with key ...
        except RateLimitError:
            rotator.mark_rate_limited(key)
    """

    def __init__(self, keys: List[str]) -> None:
        if not keys:
            raise ValueError("At least one Gemini API key is required")
        self._keys = list(keys)
        self._lock = threading.Lock()
        self._index = 0
        self._rate_limited_until: Dict[str, float] = defaultdict(float)
        self._call_counts: Dict[str, int] = defaultdict(int)
        logger.info("key_rotator_initialized", key_count=len(self._keys))

    def get_key(self) -> str:
        """Return the next available API key (skipping rate-limited keys).

        Raises RuntimeError if all keys are currently rate-limited.
        """
        with self._lock:
            now = time.monotonic()
            for _ in range(len(self._keys)):
                key = self._keys[self._index % len(self._keys)]
                self._index += 1
                if self._rate_limited_until[key] <= now:
                    self._call_counts[key] += 1
                    return key
            # All keys are rate-limited — return the one with the earliest recovery
            earliest_key = min(self._keys, key=lambda k: self._rate_limited_until[k])
            wait_seconds = max(0.0, self._rate_limited_until[earliest_key] - now)
            logger.warning(
                "all_keys_rate_limited",
                earliest_recovery_in=f"{wait_seconds:.1f}s",
            )
            raise RuntimeError(
                f"All Gemini API keys are rate-limited. "
                f"Earliest recovery in {wait_seconds:.1f}s."
            )

    def mark_rate_limited(self, key: str, backoff: float = _RATE_LIMIT_BACKOFF) -> None:
        """Record that a key hit a 429 rate limit and should be avoided for `backoff` seconds."""
        with self._lock:
            self._rate_limited_until[key] = time.monotonic() + backoff
            logger.warning("key_rate_limited", key_suffix=key[-6:], backoff_seconds=backoff)

    def get_usage_stats(self) -> Dict[str, int]:
        """Return call count per key (last 6 chars of key shown for privacy)."""
        with self._lock:
            return {k[-6:]: v for k, v in self._call_counts.items()}

    @property
    def available_key_count(self) -> int:
        """Number of keys not currently rate-limited."""
        now = time.monotonic()
        return sum(1 for k in self._keys if self._rate_limited_until[k] <= now)


# Module-level singleton
_rotator: Optional[GeminiKeyRotator] = None
_rotator_lock = threading.Lock()


def get_key_rotator() -> GeminiKeyRotator:
    """Return the singleton GeminiKeyRotator (lazy-init)."""
    global _rotator
    if _rotator is None:
        with _rotator_lock:
            if _rotator is None:
                _rotator = GeminiKeyRotator(settings.gemini_keys_list)
    return _rotator
