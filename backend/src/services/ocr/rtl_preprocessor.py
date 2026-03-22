"""RTLPreprocessor: preserve RTL reading order, normalize Urdu Unicode variants."""
import re
import unicodedata
from typing import List

import structlog

logger = structlog.get_logger(__name__)

# Common Urdu Unicode normalization mappings
# Maps variant forms to canonical forms used in Pakistani text
_URDU_NORMALIZATIONS = {
    "\u0643": "\u06A9",  # Arabic Kaf → Urdu Kaf (ک)
    "\u0649": "\u06CC",  # Arabic Alef Maqsura → Urdu Ye (ی)
    "\u06D2": "\u06D2",  # Urdu Ye Barree (ے) — keep as-is
    "\u0624": "\u0648",  # Waw with Hamza → plain Waw (و) for simpler matching
}


class RTLPreprocessor:
    """Post-process OCR-extracted Arabic-script text for correct RTL rendering.

    Operations:
    1. Normalize Urdu-specific Unicode variants
    2. Preserve original RTL reading order (Tesseract sometimes reverses lines)
    3. Remove common OCR artifacts in Arabic script
    4. Tag text with RTL direction marker
    """

    def process(self, text: str) -> str:
        """Apply full RTL preprocessing pipeline to extracted text."""
        if not text:
            return text
        text = self._normalize_unicode(text)
        text = self._fix_line_order(text)
        text = self._clean_artifacts(text)
        return text

    def _normalize_unicode(self, text: str) -> str:
        """Normalize Urdu/Sindhi Unicode variants to canonical forms."""
        for variant, canonical in _URDU_NORMALIZATIONS.items():
            text = text.replace(variant, canonical)
        # NFC normalization for consistent rendering
        return unicodedata.normalize("NFC", text)

    def _fix_line_order(self, text: str) -> str:
        """Reverse incorrectly ordered lines in RTL OCR output.

        Tesseract sometimes outputs lines in LTR order for RTL text.
        Heuristic: if the text has multiple lines and the first line looks
        like LTR ordering of an RTL paragraph, reverse the line order.
        """
        lines = [l for l in text.split("\n") if l.strip()]
        if len(lines) <= 1:
            return text

        # Use python-bidi to get the display order (not reversing here,
        # just returning the text as-is; bidi rendering happens at display time)
        try:
            from bidi.algorithm import get_display
            processed = []
            for line in text.split("\n"):
                if line.strip():
                    processed.append(get_display(line))
                else:
                    processed.append(line)
            return "\n".join(processed)
        except ImportError:
            logger.warning("bidi_not_installed_skipping_rtl_fix")
            return text

    def _clean_artifacts(self, text: str) -> str:
        """Remove common OCR artifacts from Arabic-script extraction."""
        # Remove stray isolated diacritics at line beginnings
        text = re.sub(r"^[\u064B-\u065F\u0670]+\s*", "", text, flags=re.MULTILINE)
        # Remove multiple consecutive whitespace within lines
        text = re.sub(r" {3,}", "  ", text)
        # Remove very short noise lines (1-2 chars, likely OCR fragments)
        lines = [l for l in text.split("\n") if len(l.strip()) > 2 or not l.strip()]
        return "\n".join(lines)

    def add_rtl_marker(self, text: str) -> str:
        """Prepend Unicode RTL mark (U+200F) to indicate text direction."""
        return "\u200F" + text
