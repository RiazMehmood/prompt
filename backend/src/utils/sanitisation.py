"""Input sanitisation utilities — strip HTML, enforce length limits, prevent injection."""
from __future__ import annotations

import html
import re
import unicodedata
from typing import Optional

# Max allowed lengths by context
MAX_TEXT_FIELD = 2000
MAX_NAME_FIELD = 200
MAX_QUERY_LENGTH = 5000


def sanitise_text(value: str, max_length: Optional[int] = None) -> str:
    """
    Sanitise arbitrary user text:
    1. Normalize Unicode (NFC)
    2. Strip HTML tags
    3. HTML-entity encode special chars (XSS prevention)
    4. Trim whitespace
    5. Enforce max length
    """
    if not isinstance(value, str):
        return ""

    # Unicode normalization
    value = unicodedata.normalize("NFC", value)

    # Strip HTML tags
    value = _strip_html_tags(value)

    # Collapse excessive whitespace
    value = re.sub(r"\s{3,}", "  ", value).strip()

    # Length enforcement
    limit = max_length or MAX_TEXT_FIELD
    if len(value) > limit:
        value = value[:limit]

    return value


def sanitise_name(value: str) -> str:
    """Sanitise a name field (domain name, template name, user display name)."""
    if not isinstance(value, str):
        return ""
    value = unicodedata.normalize("NFC", value)
    value = _strip_html_tags(value)
    # Remove control characters
    value = re.sub(r"[\x00-\x1f\x7f]", "", value)
    return value.strip()[:MAX_NAME_FIELD]


def sanitise_namespace(value: str) -> str:
    """Enforce namespace slug format: lowercase alphanumeric + underscore only."""
    value = value.lower().strip()
    value = re.sub(r"[^a-z0-9_]", "_", value)
    value = re.sub(r"_+", "_", value)
    return value[:50].strip("_")


def sanitise_query(value: str) -> str:
    """Sanitise a RAG/conversation query — preserve RTL chars, strip control chars."""
    if not isinstance(value, str):
        return ""
    value = unicodedata.normalize("NFC", value)
    # Remove only control chars (preserve Arabic/Urdu/Sindhi Unicode ranges)
    value = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]", "", value)
    return value.strip()[:MAX_QUERY_LENGTH]


def prevent_prompt_injection(value: str) -> str:
    """
    Strip common prompt-injection patterns from user inputs destined for AI.
    Patterns: 'ignore previous instructions', 'system:', 'assistant:' injections.
    """
    INJECTION_PATTERNS = [
        r"ignore\s+(all\s+)?previous\s+instructions?",
        r"(system|assistant|human|user)\s*:\s*",
        r"\[INST\]|\[/INST\]",
        r"<\|im_start\|>|<\|im_end\|>",
        r"###\s*(Instruction|System|Human|Assistant)",
    ]
    for pattern in INJECTION_PATTERNS:
        value = re.sub(pattern, " ", value, flags=re.IGNORECASE)
    return value.strip()


# ── Private helpers ────────────────────────────────────────────────────────────

def _strip_html_tags(value: str) -> str:
    """Remove HTML/XML tags while preserving tag content."""
    return re.sub(r"<[^>]+>", " ", value)
