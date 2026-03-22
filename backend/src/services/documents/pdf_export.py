"""PDFExportService: export generated documents to PDF using ReportLab.

Supports English (LTR) and Urdu/Sindhi (RTL with Nastaliq font).
"""
import io
import re
from typing import Any, Dict, Optional

import structlog
from reportlab.lib.pagesizes import A4, legal
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer

logger = structlog.get_logger(__name__)

# Font paths — these fonts must be installed on the server
# Install: sudo apt-get install fonts-nafees or download from Nafees/Jameel
_URDU_FONT_NAME = "NafeesNastaleeq"
_URDU_FONT_PATH = "/usr/share/fonts/truetype/nafees/NafeesNastaleeq.ttf"
_SINDHI_FONT_PATH = "/usr/share/fonts/truetype/nafees/NafeesNastaleeq.ttf"

_urdu_font_registered = False


def _register_urdu_font() -> bool:
    global _urdu_font_registered
    if _urdu_font_registered:
        return True
    try:
        pdfmetrics.registerFont(TTFont(_URDU_FONT_NAME, _URDU_FONT_PATH))
        _urdu_font_registered = True
        return True
    except Exception as exc:
        logger.warning("urdu_font_not_available", error=str(exc))
        return False


def _get_page_size(domain_name: str) -> Any:
    """Legal domain uses Legal paper (8.5" × 14"), others use A4."""
    if domain_name and "legal" in domain_name.lower():
        return legal
    return A4


class PDFExportService:
    """Generate PDF from rendered document content."""

    def export(
        self,
        content: str,
        output_language: str = "english",
        domain_name: str = "",
        title: str = "Document",
        formatting_rules: Optional[Dict[str, Any]] = None,
    ) -> bytes:
        """Render content to PDF bytes.

        RTL languages (Urdu, Sindhi) use Nastaliq font and reversed paragraph alignment.
        """
        is_rtl = output_language in ("urdu", "sindhi")
        page_size = _get_page_size(domain_name)
        rules = formatting_rules or {}
        margins = rules.get("margins", {})

        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=page_size,
            topMargin=self._margin(margins.get("top", "1in")),
            bottomMargin=self._margin(margins.get("bottom", "1in")),
            leftMargin=self._margin(margins.get("left", "1.25in")),
            rightMargin=self._margin(margins.get("right", "1in")),
        )

        # Font selection
        if is_rtl:
            font_available = _register_urdu_font()
            font_name = _URDU_FONT_NAME if font_available else "Helvetica"
        else:
            font_name = rules.get("font", "Times-Roman")
            if font_name == "Times New Roman":
                font_name = "Times-Roman"

        font_size = int(rules.get("font_size", 12))
        alignment = 2 if is_rtl else 0  # 2=RIGHT for RTL, 0=LEFT for LTR

        style = ParagraphStyle(
            name="custom",
            fontName=font_name,
            fontSize=font_size,
            leading=font_size * 1.4,
            alignment=alignment,
            rightToLeft=is_rtl,
        )

        story = []
        if is_rtl and _urdu_font_registered:
            content = self._prepare_arabic_text(content)

        for paragraph in content.split("\n"):
            if paragraph.strip():
                story.append(Paragraph(paragraph.replace("&", "&amp;"), style))
                story.append(Spacer(1, 0.1 * inch))

        doc.build(story)
        return buffer.getvalue()

    def _margin(self, margin_str: str) -> float:
        """Convert margin string like '1in' to points."""
        if margin_str.endswith("in"):
            return float(margin_str[:-2]) * inch
        if margin_str.endswith("cm"):
            from reportlab.lib.units import cm
            return float(margin_str[:-2]) * cm
        return inch  # default

    def _prepare_arabic_text(self, text: str) -> str:
        """Apply arabic-reshaper + python-bidi for correct RTL rendering."""
        try:
            import arabic_reshaper
            from bidi.algorithm import get_display
            lines = []
            for line in text.split("\n"):
                if line.strip():
                    reshaped = arabic_reshaper.reshape(line)
                    lines.append(get_display(reshaped))
                else:
                    lines.append(line)
            return "\n".join(lines)
        except ImportError:
            logger.warning("arabic_reshaper_not_available")
            return text
