"""FIR Scanner — multi-pass Gemini Vision extraction for Urdu/Sindhi court documents.

Handles photocopies, degraded quality, and mixed Urdu/Sindhi/English text.
Two extraction passes: primary extraction + targeted refinement of nulls.
"""
from __future__ import annotations

import io
import json
import re
from typing import Any

import structlog
from PIL import Image, ImageEnhance, ImageFilter

from src.config import settings
from src.services.ai.key_rotator import get_key_rotator

logger = structlog.get_logger(__name__)

# ── Field definitions ──────────────────────────────────────────────────────────

FIR_FIELDS: list[dict] = [
    # FIR Header
    {"key": "fir_number",            "label": "FIR Number",              "group": "fir",        "critical": True},
    {"key": "fir_date",              "label": "FIR Registration Date",   "group": "fir",        "critical": True},
    {"key": "fir_time",              "label": "FIR Registration Time",   "group": "fir",        "critical": False},
    {"key": "police_station",        "label": "Police Station",          "group": "fir",        "critical": True},
    {"key": "district",              "label": "District",                "group": "fir",        "critical": True},
    {"key": "sections",              "label": "Sections / Offences",     "group": "fir",        "critical": True},
    # Accused
    {"key": "accused_name",          "label": "Accused Name(s)",         "group": "accused",    "critical": True},
    {"key": "accused_father_name",   "label": "Accused Father's Name",   "group": "accused",    "critical": True},
    {"key": "accused_caste",         "label": "Accused Caste/Biradri",   "group": "accused",    "critical": False},
    {"key": "accused_address",       "label": "Accused Address",         "group": "accused",    "critical": True},
    # Complainant
    {"key": "complainant_name",      "label": "Complainant Name",        "group": "complainant","critical": True},
    {"key": "complainant_father_name","label": "Complainant Father's Name","group": "complainant","critical": False},
    {"key": "complainant_caste",     "label": "Complainant Caste",       "group": "complainant","critical": False},
    {"key": "complainant_address",   "label": "Complainant Address",     "group": "complainant","critical": False},
    # Incident
    {"key": "incident_date",         "label": "Incident Date",           "group": "incident",   "critical": True},
    {"key": "incident_time",         "label": "Incident Time",           "group": "incident",   "critical": False},
    {"key": "incident_location",     "label": "Incident Location",       "group": "incident",   "critical": True},
    {"key": "case_summary",          "label": "Case Narrative / Bayan",  "group": "incident",   "critical": True},
    # Officials
    {"key": "investigating_officer", "label": "Investigating Officer",   "group": "officials",  "critical": False},
    {"key": "sho_name",              "label": "SHO / Incharge Name",     "group": "officials",  "critical": False},
    {"key": "witnesses",             "label": "Witnesses",               "group": "officials",  "critical": False},
]

FIELD_KEYS = [f["key"] for f in FIR_FIELDS]

# ── Prompts ────────────────────────────────────────────────────────────────────

_EXTRACTION_PROMPT = """\
You are a specialist at reading Pakistani FIR (First Information Report / مقدمہ اولیہ / Form 16) documents.

The image may be:
- A photocopy (common — grey, faded, blurry)
- In Urdu Nastaliq, Sindhi, or a mix with English printed/handwritten portions
- Slightly skewed, rotated, or with fold marks

== STANDARD PAKISTANI FIR STRUCTURE ==
- Header: FIR نمبر, تاریخ, وقت, تھانہ, ضلع
- Complainant (مدعی): نام, والد/شوہر کا نام, برادری/قوم, پتہ, پیشہ
- Accused (ملزم/ملزمان): نام, والد, برادری, پتہ  (may be multiple)
- Offences (دفعات): sections like "302/34 PPC", "3/4 CNSA", "420/468 PPC"
- Incident: تاریخ واقعہ, وقت, جائے وقوعہ (location), مکمل بیان (full narrative)
- Witnesses (گواہان), IO/SHO signature

== YOUR TASK ==
Extract every readable field. Be EXTREMELY careful about:
1. FIR number and sections — these are critical legal identifiers
2. Names — copy EXACTLY in original script (Urdu/Sindhi/Roman)
3. Numbers and dates — re-read them twice before writing
4. If text is partially obscured, provide your best reading with [?] suffix

Return ONLY this JSON (null for fields you genuinely cannot read):
{
  "fir_number": null,
  "fir_date": null,
  "fir_time": null,
  "police_station": null,
  "district": null,
  "sections": null,
  "accused_name": null,
  "accused_father_name": null,
  "accused_caste": null,
  "accused_address": null,
  "complainant_name": null,
  "complainant_father_name": null,
  "complainant_caste": null,
  "complainant_address": null,
  "incident_date": null,
  "incident_time": null,
  "incident_location": null,
  "case_summary": null,
  "investigating_officer": null,
  "sho_name": null,
  "witnesses": null
}

CRITICAL: Return ONLY the JSON object. No markdown, no explanation.\
"""

_REFINEMENT_PROMPT = """\
You are reviewing a previous FIR extraction. Some fields were missed or may be wrong.

PREVIOUS EXTRACTION:
{prev_json}

FIELDS STILL MISSING (null): {missing_fields}

Look at the FIR document image again very carefully. For each missing field, search specifically:
- fir_number: Usually at the top, formatted as a number/year like "123/2023"
- sections: Look for numbers near "PPC", "CNSA", "MRA" — e.g. "302", "34", "420"
- accused_name: Name after words like ملزم, accused, name of accused
- police_station: After تھانہ, P.S., Police Station
- case_summary: The main body text / بیان / تفصیل واقعہ
- incident_location: After جائے وقوعہ, Place of occurrence, مقام واقعہ

Also verify any fields that look incorrect in the previous extraction.

Return the COMPLETE updated JSON (all 21 fields, null only if truly unreadable):
{json_template}\
"""

_VERIFICATION_PROMPT = """\
You previously extracted these values from the FIR image. Now verify them — look at the image one last time.

EXTRACTED VALUES:
{extracted_json}

Check these critical fields digit by digit and letter by letter:
- fir_number: Count each digit. Verify the year (e.g. 2023, 2024, 2025).
- sections: Re-read each PPC/CNSA/MRA section number — wrong digits are common (302 vs 307, 34 vs 324).
- fir_date: Verify day, month, and year separately.
- accused_name: Compare spelling against the original script exactly.
- police_station / district: Confirm the exact names.
- complainant_name: Check spelling.

Rules:
- Only CORRECT values you can see are wrong in the image.
- Do not change values if the image is unclear for that field.
- Do not null-out values that were already filled in unless you can see they are definitely wrong.

Return the COMPLETE corrected JSON (all 21 fields, null only if truly unreadable):
{json_template}\
"""

_JSON_TEMPLATE = json.dumps({k: None for k in FIELD_KEYS}, indent=2)


# ── Main extractor ─────────────────────────────────────────────────────────────

class FIRExtractor:
    """Multi-pass Gemini Vision FIR scanner."""

    def __init__(self) -> None:
        import google.generativeai as genai
        rotator = get_key_rotator()
        genai.configure(api_key=rotator.get_key())
        self._model = genai.GenerativeModel(settings.GEMINI_MODEL)

    # ── Image utilities ────────────────────────────────────────────────────────

    @staticmethod
    def _enhance(img: Image.Image) -> Image.Image:
        """Enhancement tuned for photocopied court documents.

        Avoids over-processing — Gemini's vision works better on
        a moderately enhanced image than an aggressively binarised one.
        """
        img = img.convert("RGB")
        # Moderate contrast boost (too high destroys Urdu letterforms)
        contrast = ImageEnhance.Contrast(img).enhance(1.8)
        # One sharpening pass
        sharp = contrast.filter(ImageFilter.SHARPEN)
        # Slight brightness if image looks dark (photocopy tends to be grey)
        bright = ImageEnhance.Brightness(sharp).enhance(1.1)
        return bright

    @staticmethod
    def _load_one(file_bytes: bytes, mime_type: str) -> list[Image.Image]:
        """Load pages from a single file (PDF → multiple pages, image → one)."""
        if mime_type == "application/pdf":
            try:
                from pdf2image import convert_from_bytes
                raw = convert_from_bytes(file_bytes, dpi=200, first_page=1, last_page=4)
                return list(raw)
            except Exception as exc:
                logger.warning("pdf2image_failed", error=str(exc))
                return []
        try:
            return [Image.open(io.BytesIO(file_bytes))]
        except Exception as exc:
            logger.warning("image_open_failed", error=str(exc))
            return []

    def _load_all_pages(self, uploads: list[tuple[bytes, str]]) -> list[Image.Image]:
        """Load + enhance up to 6 pages across all uploaded files."""
        pages: list[Image.Image] = []
        for file_bytes, mime in uploads:
            pages.extend(self._load_one(file_bytes, mime))
            if len(pages) >= 6:
                break

        enhanced = []
        for p in pages[:6]:
            p = p.convert("RGB")
            w, h = p.size
            # Upscale small images (phone photos of docs can be low-res)
            if max(w, h) < 800:
                scale = 1200 / max(w, h)
                p = p.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
            # Downscale very large images (>3000px) to save tokens
            elif max(w, h) > 3000:
                scale = 2500 / max(w, h)
                p = p.resize((int(w * scale), int(h * scale)), Image.LANCZOS)
            enhanced.append(self._enhance(p))

        return enhanced

    # ── Gemini call ────────────────────────────────────────────────────────────

    def _run_gemini(self, images: list[Image.Image], prompt: str) -> dict[str, Any]:
        """Send images + prompt to Gemini and parse the JSON response."""
        content: list = list(images[:3]) + [prompt]
        try:
            resp = self._model.generate_content(content)
            text = resp.text.strip()
            # Strip markdown code fences if present
            text = re.sub(r"^```(?:json)?\s*", "", text)
            text = re.sub(r"\s*```$", "", text)
            match = re.search(r"\{[\s\S]*\}", text)
            if match:
                return json.loads(match.group())
        except Exception as exc:
            logger.warning("gemini_fir_call_failed", error=str(exc))
        return {}

    # ── Merge helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _merge(p1: dict, p2: dict) -> dict:
        """Merge two pass results: prefer longer/more complete non-null values."""
        out: dict[str, Any] = {}
        for k in FIELD_KEYS:
            v1 = p1.get(k) or None
            v2 = p2.get(k) or None
            if v1 and v2:
                out[k] = v1 if len(str(v1)) >= len(str(v2)) else v2
            else:
                out[k] = v1 or v2
        return out

    # ── Public API ─────────────────────────────────────────────────────────────

    def _run_extraction(self, images: list[Image.Image]) -> dict[str, Any]:
        """Core two-pass extraction on a list of images."""
        if not images:
            return {}

        # Pass 1
        logger.info("fir_pass1_start", pages=len(images))
        pass1 = self._run_gemini(images, _EXTRACTION_PROMPT)
        filled1 = sum(1 for v in pass1.values() if v)
        logger.info("fir_pass1_done", filled=filled1)

        # Pass 2 — always run to refine / catch missed fields
        missing = [k for k in FIELD_KEYS if not pass1.get(k)]
        refinement = _REFINEMENT_PROMPT.format(
            prev_json=json.dumps(pass1, ensure_ascii=False, indent=2),
            missing_fields=", ".join(missing[:12]),
            json_template=_JSON_TEMPLATE,
        )
        logger.info("fir_pass2_start", missing=len(missing))
        pass2 = self._run_gemini(images, refinement)
        merged12 = self._merge(pass1, pass2)

        # Pass 3 — verification: cross-check extracted values against original image
        verification = _VERIFICATION_PROMPT.format(
            extracted_json=json.dumps(merged12, ensure_ascii=False, indent=2),
            json_template=_JSON_TEMPLATE,
        )
        logger.info("fir_pass3_start")
        pass3 = self._run_gemini(images, verification)
        filled3 = sum(1 for v in pass3.values() if v)
        logger.info("fir_pass3_done", filled=filled3)
        return self._merge(merged12, pass3)

    def _build_result(self, fields: dict) -> dict[str, Any]:
        for k in FIELD_KEYS:
            fields.setdefault(k, None)
        filled = sum(1 for v in fields.values() if v)
        critical_missing = [f["key"] for f in FIR_FIELDS if f["critical"] and not fields.get(f["key"])]
        confidence = round(filled / len(FIELD_KEYS), 2)
        logger.info("fir_extraction_complete", filled=filled, total=len(FIELD_KEYS), confidence=confidence)
        return {
            "fields": fields,
            "filled_count": filled,
            "total_fields": len(FIELD_KEYS),
            "critical_missing": critical_missing,
            "confidence": confidence,
        }

    async def extract(self, file_bytes: bytes, mime_type: str) -> dict[str, Any]:
        """Single-file extraction (kept for backward compatibility)."""
        return await self.extract_multi([(file_bytes, mime_type)])

    async def extract_multi(self, uploads: list[tuple[bytes, str]]) -> dict[str, Any]:
        """Multi-file extraction — combines all pages into one Gemini call."""
        images = self._load_all_pages(uploads)
        if not images:
            return _empty_result("Could not load any images from the uploaded files")
        fields = self._run_extraction(images)
        return self._build_result(fields)


def _empty_result(reason: str) -> dict:
    return {
        "fields": {k: None for k in FIELD_KEYS},
        "filled_count": 0,
        "total_fields": len(FIELD_KEYS),
        "critical_missing": [f["key"] for f in FIR_FIELDS if f["critical"]],
        "confidence": 0.0,
        "error": reason,
    }
