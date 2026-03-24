"""Conversational Document Agent.

Guides users through document creation via natural conversation:
1. Detects document intent ("write a bail application")
2. Asks for ALL user-required fields in one go
3. Extracts values from natural language responses using Gemini
4. Auto-fills RAG-sourced fields (bail_grounds, sections) from the knowledge base
5. Generates the document inline and returns it with a preview

Session state is kept in-memory per session_id (Redis in production).
"""
from __future__ import annotations

import json
import logging
import re
from datetime import date
from typing import Any, Optional

import structlog

logger = structlog.get_logger(__name__)


def _is_toc_chunk(text: str) -> bool:
    """Return True if a chunk looks like a table of contents (short numbered list, no substance)."""
    lines = [l.strip() for l in text.strip().splitlines() if l.strip()]
    if not lines:
        return True
    # TOC pattern: most lines are very short (< 60 chars) and start with a number or dot
    short_lines = sum(1 for l in lines if len(l) < 60)
    numbered = sum(1 for l in lines if re.match(r"^[\d\.]+\s", l))
    if len(lines) > 3 and short_lines / len(lines) > 0.75 and numbered / len(lines) > 0.5:
        return True
    # Also flag if average word count per line is very low
    avg_words = sum(len(l.split()) for l in lines) / len(lines)
    return avg_words < 5


# In-memory session store — keyed by session_id
_SESSIONS: dict[str, dict] = {}

# Slot names that AI fills from RAG (not asked from user)
RAG_SLOTS = {"bail_grounds"}
# Slots AI fills automatically without asking user
AUTO_SLOTS = {"application_date"}

# FIR field → template slot name mapping
# These slots are auto-filled from FIR extraction data when available
FIR_SLOT_MAP: dict[str, str] = {
    "fir_number":          "fir_number",
    "fir_date":            "fir_date",
    "police_station":      "police_station",
    "district":            "district",
    "sections":            "sections",
    "accused_name":        "accused_name",
    "accused_father_name": "accused_father_name",
    "accused_address":     "accused_address",
    "accused_caste":       "accused_caste",
    "complainant_name":    "complainant_name",
    "incident_date":       "incident_date",
    "incident_location":   "incident_location",
    "case_summary":        "case_summary",
    "investigating_officer": "investigating_officer",
    "witnesses":           "witnesses",
}

# Map from slot name → professional_details key
# Slots in this map are auto-filled from the lawyer's profile (no need to ask)
PROFILE_SLOT_MAP: dict[str, str] = {
    "applicant_name":    "full_name",
    "lawyer_name":       "full_name",
    "advocate_name":     "full_name",
    "petitioner_name":   "full_name",
    "court_name":        "court_name",
    "bar_number":        "bar_number",
    "bar_registration":  "bar_number",
    "designation":       "designation",
    "organization":      "organization",
    "city":              "city",
}


class DocumentAgentService:
    """Handles the full lifecycle of AI-assisted document generation via chat."""

    # ── Public API ────────────────────────────────────────────────────────────

    async def process(
        self,
        session_id: str,
        message: str,
        domain_namespace: str,
        templates: list[dict],
        professional_details: dict | None = None,
        user_id: str | None = None,
        domain_name: str = "General",
        fir_context: dict | None = None,
    ) -> Optional[dict]:
        """
        Main entry point from the conversation router.

        Returns None if this is a normal chat message (not a document flow).
        Returns dict with {reply, document_content, document_id, document_ready} otherwise.
        """
        state = _SESSIONS.get(session_id)

        if not state:
            # Check for document intent
            template = await self._detect_intent(message, templates, domain_name)
            if not template:
                return None  # Normal chat message
            state = self._init_state(session_id, template, domain_namespace, professional_details or {}, user_id, domain_name, fir_context)
            return {"reply": self._build_info_request(state), "document_ready": False}

        mode = state.get("mode")

        if mode == "collecting":
            return await self._handle_collecting(session_id, state, message)

        if mode == "confirming":
            return await self._handle_confirming(session_id, state, message, domain_namespace)

        if mode == "done":
            # User continues chatting after document is done — handle follow-up
            return await self._handle_post_done(session_id, state, message)

        return None

    def clear_session(self, session_id: str) -> None:
        _SESSIONS.pop(session_id, None)

    # ── Intent detection ──────────────────────────────────────────────────────

    async def _detect_intent(self, message: str, templates: list[dict], domain_name: str = "General") -> Optional[dict]:
        """Use Gemini to detect if the user wants to create a document."""
        if not templates:
            return None

        template_list = "\n".join(
            f"- {t['name']}: {t.get('description', '')}" for t in templates
        )
        prompt = (
            f"You are a {domain_name} domain AI assistant. The user said: \"{message}\"\n\n"
            f"Available document templates for the {domain_name} domain:\n{template_list}\n\n"
            f"Does the user want to CREATE/DRAFT/WRITE one of these documents? "
            f"If yes, reply with ONLY the exact template name. "
            f"If no, reply with ONLY the word: NONE"
        )
        result = (await _call_gemini(prompt)).strip()
        if result.upper() == "NONE":
            return None
        for t in templates:
            if t["name"].lower() in result.lower() or result.lower() in t["name"].lower():
                return t
        return None

    # ── Session init ──────────────────────────────────────────────────────────

    def _init_state(
        self,
        session_id: str,
        template: dict,
        domain_namespace: str,
        professional_details: dict,
        user_id: str | None = None,
        domain_name: str = "General",
        fir_context: dict | None = None,
    ) -> dict:
        slots = template.get("slot_definitions", [])

        # Pre-fill profile-derived slots
        pre_filled: dict[str, str] = {}
        for s in slots:
            prof_key = PROFILE_SLOT_MAP.get(s["name"])
            if prof_key and professional_details.get(prof_key):
                pre_filled[s["name"]] = professional_details[prof_key]

        # Pre-fill FIR-derived slots (fields extracted from uploaded FIR document)
        fir_filled: dict[str, str] = {}
        if fir_context:
            for fir_key, slot_key in FIR_SLOT_MAP.items():
                val = fir_context.get(fir_key)
                if val and str(val).strip():
                    # Check if template has this slot
                    for s in slots:
                        if s["name"] == slot_key:
                            fir_filled[slot_key] = str(val).strip()
                            break
        pre_filled.update(fir_filled)

        # Only ask for user_input slots that are not pre-filled from profile or FIR
        user_slots = [
            s for s in slots
            if s.get("data_source") == "user_input"
            and s["name"] not in AUTO_SLOTS
            and s["name"] not in pre_filled
        ]
        rag_slot_names = [
            s["name"] for s in slots
            if s.get("data_source") == "rag_retrieval" or s["name"] in RAG_SLOTS
        ]
        state = {
            "mode": "collecting",
            "template": template,
            "domain_namespace": domain_namespace,
            "domain_name": domain_name,
            "user_slots": user_slots,
            "rag_slot_names": rag_slot_names,
            "collected": pre_filled,
            "profile_filled": list(set(pre_filled.keys()) - set(fir_filled.keys())),
            "fir_filled": list(fir_filled.keys()),
            "user_id": user_id,
        }
        _SESSIONS[session_id] = state
        return state

    # ── Info request ──────────────────────────────────────────────────────────

    def _build_info_request(self, state: dict) -> str:
        template_name = state["template"]["name"]
        slots = state["user_slots"]
        profile_filled = state.get("profile_filled", [])
        lines = []
        for s in slots:
            label = _to_label(s["name"])
            req = "" if s.get("required", True) else " *(optional)*"
            lines.append(f"• **{label}**{req}")

        # Mention what was auto-filled from FIR
        fir_filled = state.get("fir_filled", [])
        fir_note = ""
        if fir_filled:
            fir_labels = ", ".join(_to_label(n) for n in fir_filled)
            fir_note = f"\n\n📋 Auto-filled from FIR: {fir_labels}"

        # Mention what was auto-filled from profile
        profile_note = ""
        if profile_filled:
            filled_labels = ", ".join(_to_label(n) for n in profile_filled)
            profile_note = f"\n\n✅ Auto-filled from your profile: {filled_labels}"

        rag_note = ""
        if state["rag_slot_names"]:
            rag_labels = [_to_label(n) for n in state["rag_slot_names"]]
            domain_name = state.get("domain_name", "General")
            rag_note = (
                f"\n\nI will automatically research and fill in: "
                f"**{', '.join(rag_labels)}** from the {domain_name} knowledge base."
            )

        if not lines:
            # All fields are auto-filled — proceed directly
            return (
                f"I'll draft a **{template_name}** for you."
                + fir_note
                + profile_note
                + (rag_note or "")
                + "\n\nShall I go ahead and generate it now?"
            )

        return (
            f"I'll draft a **{template_name}** for you. "
            f"Please provide the following additional information:\n\n"
            + "\n".join(lines)
            + fir_note
            + profile_note
            + rag_note
            + "\n\nFeel free to include any extra context about the case."
        )

    # ── Collecting mode ───────────────────────────────────────────────────────

    async def _handle_collecting(
        self, session_id: str, state: dict, message: str
    ) -> dict:
        # Extract all slot values from the user's message
        extracted = await self._extract_slots(message, state["user_slots"])
        # Disambiguate lawyer vs accused if both present
        extracted = await self._disambiguate_persons(extracted, message)
        state["collected"].update({k: v for k, v in extracted.items() if v})

        # Auto-fill date fields
        for s in state["user_slots"]:
            if s["name"] in AUTO_SLOTS or (s["type"] == "date" and s["name"] == "application_date"):
                state["collected"].setdefault(s["name"], date.today().isoformat())

        # Find still-missing required slots
        missing = [
            s for s in state["user_slots"]
            if s.get("required", True) and not state["collected"].get(s["name"])
        ]

        # If exactly one field is still missing, do a targeted extraction
        # (handles "I already added X" or single-value correction messages)
        if len(missing) == 1:
            targeted = await self._extract_single_slot(message, missing[0], state["collected"])
            if targeted:
                state["collected"][missing[0]["name"]] = targeted
                missing = []

        if missing:
            missing_labels = [f"**{s.get('label') or _to_label(s['name'])}**" for s in missing]
            return {
                "reply": (
                    f"I still need the following to complete the document:\n\n"
                    + "\n".join(f"• {l}" for l in missing_labels)
                    + "\n\nPlease provide these details."
                ),
                "document_ready": False,
            }

        # All user slots collected — build summary for confirmation
        state["mode"] = "confirming"
        summary = self._build_summary(state)
        return {
            "reply": (
                f"I have all the case details. Here's a summary:\n\n{summary}\n\n"
                f"I'll now search our {state.get('domain_name', 'domain')} knowledge base to find relevant information. "
                f"Type **'generate'** to proceed, or let me know "
                f"if any details above need correction."
            ),
            "document_ready": False,
        }

    # ── Confirming mode ───────────────────────────────────────────────────────

    async def _handle_confirming(
        self, session_id: str, state: dict, message: str, domain_namespace: str
    ) -> dict:
        msg_lower = message.lower().strip()

        # Check for confirmation
        confirm_words = {"yes", "generate", "proceed", "ok", "okay", "confirm", "go", "sure", "do it", "create"}
        if any(w in msg_lower for w in confirm_words):
            return await self._generate_document(session_id, state, domain_namespace)

        # Handle correction: user mentions specific fields
        corrected = await self._extract_slots(message, state["user_slots"])
        corrected = await self._disambiguate_persons({**state["collected"], **corrected}, message)
        corrected_filled = {k: v for k, v in corrected.items() if v}
        if corrected_filled:
            state["collected"].update(corrected_filled)
            summary = self._build_summary(state)
            labels = [_to_label(k) for k in corrected_filled]
            return {
                "reply": (
                    f"Updated: **{', '.join(labels)}**. Here's the revised summary:\n\n"
                    f"{summary}\n\nType **'generate'** when ready."
                ),
                "document_ready": False,
            }

        return {
            "reply": (
                "Let me know what you'd like to change, or type **'generate'** to create the document."
            ),
            "document_ready": False,
        }

    # ── Document generation ───────────────────────────────────────────────────

    async def _generate_document(
        self, session_id: str, state: dict, domain_namespace: str
    ) -> dict:
        template = state["template"]
        collected = dict(state["collected"])

        # Auto-fill date if missing
        collected.setdefault("application_date", date.today().isoformat())

        # Fill RAG slots
        for slot_name in state.get("rag_slot_names", []):
            value = await self._fill_rag_slot(slot_name, collected, domain_namespace, template)
            collected[slot_name] = value

        # Load sample format reference if admin uploaded one
        sample_text: str = ""
        formatting_rules: dict = template.get("formatting_rules") or {}
        sample_path = formatting_rules.get("sample_file_path", "")
        if sample_path:
            try:
                import os
                ext = os.path.splitext(sample_path)[1].lower()
                if ext in (".pdf",):
                    from src.services.documents.text_extraction import TextExtractionService
                    pages = TextExtractionService().extract_pdf(sample_path)
                    sample_text = "\n".join(p.get("text", "") for p in pages)
                elif ext in (".docx",):
                    from docx import Document as DocxDocument
                    doc_obj = DocxDocument(sample_path)
                    sample_text = "\n".join(p.text for p in doc_obj.paragraphs if p.text.strip())
                elif ext in (".txt",):
                    with open(sample_path, encoding="utf-8", errors="ignore") as f:
                        sample_text = f.read()
            except Exception as e:
                logger.warning("sample_load_failed", path=sample_path, error=str(e))

        # Fill template content
        content = template.get("content", "")
        for key, value in collected.items():
            content = content.replace(f"{{{{{key}}}}}", str(value) if value else "")

        # Remove any unfilled placeholders
        content = re.sub(r"\{\{[^}]+\}\}", "[Not provided]", content)

        # If a sample format was provided, use Gemini to reformat the output to match it
        if sample_text and len(sample_text.strip()) > 100:
            content = await _reformat_with_sample(content, sample_text, template.get("name", "document"))

        # Save to DB and get doc_id
        doc_id = await _save_document(template["id"], collected, content, domain_namespace, state.get("user_id"))

        state["mode"] = "done"
        state["document_content"] = content
        state["document_id"] = doc_id

        return {
            "reply": (
                f"Your **{template['name']}** is ready! "
                f"You can preview it below.\n\n"
                f"What would you like to do?\n"
                f"• Type **'download pdf'** to export as PDF\n"
                f"• Type **'download docx'** to export as Word document\n"
                f"• Ask me anything else or say **'new document'** to start again"
            ),
            "document_ready": True,
            "document_content": content,
            "document_id": doc_id,
        }

    # ── Post-done follow-up ───────────────────────────────────────────────────

    async def _handle_post_done(
        self, session_id: str, state: dict, message: str
    ) -> dict:
        msg_lower = message.lower()
        if "new document" in msg_lower or "another" in msg_lower or "start over" in msg_lower:
            self.clear_session(session_id)
            return {
                "reply": "Sure! What document would you like me to draft?",
                "document_ready": False,
            }
        if "download pdf" in msg_lower or "export pdf" in msg_lower:
            return {
                "reply": "Click the **Download PDF** button below to save your document.",
                "document_ready": True,
                "document_content": state.get("document_content", ""),
                "document_id": state.get("document_id"),
            }
        if "download docx" in msg_lower or "export docx" in msg_lower or "word" in msg_lower:
            return {
                "reply": "Click the **Download DOCX** button below to save your document.",
                "document_ready": True,
                "document_content": state.get("document_content", ""),
                "document_id": state.get("document_id"),
            }
        # Normal chat — still show document
        return {
            "reply": None,  # signal to fall through to normal RAG chat
            "document_ready": True,
            "document_content": state.get("document_content", ""),
            "document_id": state.get("document_id"),
        }

    # ── Slot extraction ───────────────────────────────────────────────────────

    async def _extract_single_slot(
        self, message: str, slot: dict, already_collected: dict
    ) -> Optional[str]:
        """Targeted extraction when only one slot remains missing.

        Tells Gemini exactly which field we need and what values are already known,
        so it can resolve ambiguity (e.g. 'I already said gul mohammad' → lawyer_name).
        """
        slot_name = slot["name"]
        label = slot.get("label") or _to_label(slot_name)
        already = "\n".join(f"- {k}: {v}" for k, v in already_collected.items())

        _SLOT_HINTS = {
            "accused_name":   "the ACCUSED person charged with the crime",
            "lawyer_name":    "the LAWYER / ADVOCATE representing the accused",
            "advocate_name":  "the LAWYER / ADVOCATE representing the accused",
            "applicant_name": "the LAWYER / ADVOCATE filing the application",
            "bar_council":    "the BAR ASSOCIATION or BAR COUNCIL (e.g. DBA Thatta)",
            "bar_number":     "the lawyer's bar registration number",
            "court_name":     "the court name",
            "police_station": "the police station name",
            "sections":       "the penal code sections / charges",
            "fir_number":     "the FIR number",
            "fir_date":       "the FIR date",
        }
        hint = _SLOT_HINTS.get(slot_name, label)

        prompt = (
            f"From the user's message below, extract ONLY the value for: "
            f"**{label}** ({hint}).\n\n"
            f"Already collected fields (do NOT re-use these values for this field):\n{already}\n\n"
            f"User message: \"{message}\"\n\n"
            f"Return ONLY the extracted value as plain text (no JSON, no explanation). "
            f"If not found, return the word: null"
        )
        result = (await _call_gemini(prompt)).strip()
        if result.lower() in ("null", "none", "not found", "not mentioned", ""):
            return None
        return result

    async def _disambiguate_persons(
        self, extracted: dict, message: str
    ) -> dict:
        """
        Post-extraction step: if both a lawyer-type slot and accused_name are set,
        ask Gemini to verify the assignment is correct using Pakistani legal context.
        Returns corrected dict (or original if no change needed).
        """
        lawyer_keys = [k for k in ("lawyer_name", "advocate_name", "applicant_name") if extracted.get(k)]
        if not extracted.get("accused_name") or not lawyer_keys:
            return extracted  # nothing to disambiguate

        lawyer_key = lawyer_keys[0]
        lawyer_val = extracted[lawyer_key]
        accused_val = extracted["accused_name"]

        if lawyer_val == accused_val:
            return extracted  # same value — can't disambiguate, skip

        bar_council = extracted.get("bar_council", "")
        sections = extracted.get("sections", "")

        prompt = (
            f"In a Pakistani bail application, two names appear:\n"
            f"  Name A: \"{lawyer_val}\"\n"
            f"  Name B: \"{accused_val}\"\n\n"
            f"Additional context:\n"
            f"  Bar Council/Association: \"{bar_council}\"\n"
            f"  Penal Code Sections: \"{sections}\"\n"
            f"  Original message: \"{message}\"\n\n"
            f"Rules:\n"
            f"- The LAWYER is the advocate/legal representative who belongs to the bar council.\n"
            f"- The ACCUSED is the person charged under the penal sections / arrested.\n"
            f"- The lawyer's name typically appears near a bar council, 'advocate', or 'esquire'.\n"
            f"- The accused's name typically appears in relation to the FIR, crime, or arrest.\n\n"
            f"Which name is the LAWYER and which is the ACCUSED?\n"
            f"Reply with ONLY valid JSON in this exact format:\n"
            f"{{\"lawyer\": \"<name>\", \"accused\": \"<name>\"}}"
        )
        try:
            raw = await _call_gemini(prompt)
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                result = json.loads(match.group())
                corrected_lawyer = result.get("lawyer", "").strip()
                corrected_accused = result.get("accused", "").strip()
                if corrected_lawyer and corrected_accused and corrected_lawyer != corrected_accused:
                    extracted[lawyer_key] = corrected_lawyer
                    extracted["accused_name"] = corrected_accused
        except Exception as e:
            logger.warning("disambiguate_persons_failed", error=str(e))

        return extracted

    async def _extract_slots(self, message: str, slots: list[dict]) -> dict[str, Any]:
        """Use Gemini to extract slot values from natural language."""
        # Build rich slot descriptions so Gemini knows the semantic meaning of each field
        _SLOT_HINTS: dict[str, str] = {
            "accused_name":    "The ACCUSED person — the one arrested / charged with the crime (NOT the lawyer)",
            "lawyer_name":     "The LAWYER / ADVOCATE who is representing the accused in court (NOT the accused)",
            "applicant_name":  "The person filing the application — usually the lawyer/advocate",
            "advocate_name":   "The LAWYER / ADVOCATE representing the accused (NOT the accused themselves)",
            "court_name":      "Name of the court where the case is being heard",
            "fir_number":      "First Information Report number (e.g. 25/2025 or FIR No. 42)",
            "fir_date":        "Date the FIR was registered (convert to YYYY-MM-DD)",
            "police_station":  "Name of the police station that registered the FIR",
            "sections":        "Penal code sections / charges the accused is booked under (e.g. 302, 34 PPC)",
            "bar_number":      "The lawyer's bar registration / enrollment number",
            "bar_council":     "The bar council or bar association the lawyer belongs to (e.g. DBA Karachi)",
            "bail_history":    "Any previous bail applications or bail orders in this case",
            "application_date":"Date of the bail application",
        }
        slot_descs = "\n".join(
            f'- "{s["name"]}": {_SLOT_HINTS.get(s["name"]) or (s.get("label") or _to_label(s["name"]))} [{s.get("type","text")}]'
            for s in slots
        )
        prompt = (
            f"You are a Pakistani legal document assistant. "
            f"Extract the following fields from the user's message.\n\n"
            f"IMPORTANT RULES:\n"
            f"- accused_name / accused is the PERSON CHARGED WITH THE CRIME — never the lawyer\n"
            f"- lawyer_name / advocate_name is the LEGAL REPRESENTATIVE — never the accused\n"
            f"- bar_council is the BAR ASSOCIATION (e.g. 'DBA Thatta', 'Karachi Bar') — not a person name\n"
            f"- If two person names appear, the accused is usually the one associated with the FIR/crime; "
            f"  the lawyer is the one associated with a bar council or legal designation\n\n"
            f"User message: \"{message}\"\n\n"
            f"Fields to extract:\n{slot_descs}\n\n"
            f"Return a JSON object with these exact keys. "
            f"Use null for any field not clearly mentioned. "
            f"For dates use YYYY-MM-DD format. "
            f"Return ONLY valid JSON, no explanation."
        )
        raw = await _call_gemini(prompt)
        try:
            # Extract JSON from response
            match = re.search(r"\{.*\}", raw, re.DOTALL)
            if match:
                return json.loads(match.group())
        except Exception:
            pass
        return {}

    # ── RAG slot filling ──────────────────────────────────────────────────────

    async def _fill_rag_slot(
        self, slot_name: str, collected: dict, domain_namespace: str, template: dict
    ) -> str:
        from src.services.rag.retrieval import RAGRetrievalService

        sections = collected.get("sections", "")
        accused = collected.get("accused_name", "")
        fir = collected.get("fir_number", "")

        if slot_name == "bail_grounds":
            case_summary = collected.get("case_summary", "")
            accused_address = collected.get("accused_address", "")
            police_station = collected.get("police_station", "")
            district = collected.get("district", "")

            # Use multiple targeted queries to get substantive legal content, not TOC
            queries = [
                f"bail granted section {sections} PPC conditions grounds Pakistan",
                f"bail application grounds section {sections} accused not flight risk",
                f"Section 497 498 CrPC bail entitlement pre-trial custody Pakistan",
                f"bail grounds investigation complete no further custody required PPC",
                f"bail cancellation refused grounds Pakistan court",
            ]
            try:
                svc = RAGRetrievalService()
                all_chunks: list[dict] = []
                for q in queries:
                    chunks = await svc.retrieve(q, domain_namespace, top_k=3)
                    all_chunks.extend(chunks)

                # Filter out TOC-like chunks
                substantive = [
                    c for c in all_chunks
                    if c.get("confidence", 0) > 0.30
                    and len(c.get("chunk_text", "")) > 150
                    and not _is_toc_chunk(c.get("chunk_text", ""))
                ]
                seen: set[str] = set()
                unique_chunks: list[dict] = []
                for c in substantive:
                    key = c["chunk_text"][:80]
                    if key not in seen:
                        seen.add(key)
                        unique_chunks.append(c)

                context = "\n\n".join(c["chunk_text"] for c in unique_chunks[:6])
            except Exception as e:
                logger.warning("rag_slot_fill_failed", slot=slot_name, error=str(e))
                context = ""

            prompt = (
                f"You are a seasoned Pakistani criminal defense lawyer with 20+ years of experience "
                f"in Sindh courts. Your bail applications have an excellent success rate.\n\n"
                f"Write STRONG, SPECIFIC bail grounds for this case. You must:\n"
                f"1. Analyze the exact sections ({sections}) and identify which are bailable vs non-bailable\n"
                f"2. Craft arguments specifically addressing why bail should be granted DESPITE those sections\n"
                f"3. Use case law and statutory provisions from Pakistani law\n"
                f"4. If any names/addresses are in Urdu/Sindhi script, refer to them in English transliteration\n\n"
                f"CASE DETAILS:\n"
                f"  Accused: {accused}\n"
                f"  Address: {accused_address}\n"
                f"  FIR No: {fir}, Police Station: {police_station}, District: {district}\n"
                f"  Sections charged: {sections}\n"
                f"  Case narrative summary: {case_summary[:500] if case_summary else 'Not provided'}\n\n"
                + (f"RELEVANT LEGAL REFERENCES FROM KNOWLEDGE BASE:\n{context}\n\n" if context else "")
                + f"Write 6-8 numbered bail grounds. Each ground must:\n"
                f"- Be a complete, self-contained legal argument\n"
                f"- Reference specific statutory provisions (Section 497 Cr.P.C., relevant PPC sections)\n"
                f"- Be written in formal, court-ready English\n"
                f"- Be persuasive and factually grounded in the case details above\n"
                f"- Address the seriousness of the charge and rebut custody justification\n\n"
                f"REQUIRED GROUNDS TO COVER (use all):\n"
                f"i. Bail entitlement under Section 497/498 Cr.P.C.\n"
                f"ii. Investigation complete / police challan filed\n"
                f"iii. Accused not a flight risk (local resident with family)\n"
                f"iv. No previous criminal record / first offender\n"
                f"v. Right to fair trial and presumption of innocence\n"
                f"vi. Section-specific mitigating factors for {sections}\n"
                f"vii. Extended pre-trial detention is punitive and unjust\n"
                f"viii. Accused will cooperate with court proceedings\n\n"
                f"Return ONLY the numbered grounds in formal legal English. No preamble."
            )
            result = await _call_gemini(prompt)
            return result if result.strip() else (
                f"i. The accused is entitled to bail under Section 497 Cr.P.C. as the investigation "
                f"has been completed and the challan has been/is being filed before this Honourable Court.\n"
                f"ii. The accused is not a flight risk. He is a permanent resident of the district "
                f"with strong family and community ties and has no means or reason to abscond.\n"
                f"iii. The accused has no prior criminal record and is a first-time offender. "
                f"His continued detention pending trial serves no legitimate penological purpose.\n"
                f"iv. The prosecution's case rests on disputed facts. The accusations are denied "
                f"in toto and the accused is presumed innocent until proven guilty.\n"
                f"v. Continued incarceration of the accused is causing undue hardship to his "
                f"dependants and family, who rely on him for their sustenance and welfare.\n"
                f"vi. The offences charged under section {sections} are disputed in their "
                f"applicability. The factual matrix does not support the gravity attributed "
                f"to the alleged offence.\n"
                f"vii. The accused undertakes to abide by all conditions of bail and to appear "
                f"before this Honourable Court whenever required.\n"
                f"viii. The ends of justice will be better served by releasing the accused on bail "
                f"with appropriate surety conditions rather than continued pre-trial detention."
            )

        return ""

    # ── Summary builder ───────────────────────────────────────────────────────

    def _build_summary(self, state: dict) -> str:
        lines = []
        # User-provided slots
        for s in state["user_slots"]:
            value = state["collected"].get(s["name"])
            label = s.get("label") or _to_label(s["name"])
            lines.append(f"• **{label}**: {value or '*(not provided)*'}")
        # FIR auto-filled slots
        fir_filled = state.get("fir_filled", [])
        if fir_filled:
            all_slots = state["template"].get("slot_definitions", [])
            slot_map = {s["name"]: s for s in all_slots}
            for name in fir_filled:
                value = state["collected"].get(name)
                label = slot_map.get(name, {}).get("label") or _to_label(name)
                lines.append(f"• **{label}**: {value} 📋 *(from FIR)*")

        # Profile auto-filled slots
        profile_filled = state.get("profile_filled", [])
        if profile_filled:
            all_slots = state["template"].get("slot_definitions", [])
            slot_map = {s["name"]: s for s in all_slots}
            for name in profile_filled:
                value = state["collected"].get(name)
                label = slot_map.get(name, {}).get("label") or _to_label(name)
                lines.append(f"• **{label}**: {value} ✅ *(from your profile)*")
        # RAG slots
        if state.get("rag_slot_names"):
            rag_labels = [_to_label(n) for n in state["rag_slot_names"]]
            lines.append(f"• **{', '.join(rag_labels)}**: *(will be researched from {state.get('domain_name', 'domain')} knowledge base)*")
        return "\n".join(lines)


# ── Helpers ───────────────────────────────────────────────────────────────────

def _to_label(name: str) -> str:
    return name.replace("_", " ").title()


async def _call_gemini(prompt: str) -> str:
    from src.services.ai.key_rotator import get_key_rotator
    from src.config import settings
    import google.generativeai as genai

    rotator = get_key_rotator()
    api_key = rotator.get_key()
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(settings.GEMINI_MODEL)
    response = model.generate_content(prompt)
    return response.text.strip()


async def _reformat_with_sample(content: str, sample_text: str, doc_name: str) -> str:
    """Use Gemini to reformat generated content to match the admin's sample document layout."""
    prompt = (
        f"You are a Pakistani legal document formatter.\n\n"
        f"SAMPLE FORMAT (reference layout uploaded by admin):\n"
        f"---\n{sample_text[:3000]}\n---\n\n"
        f"GENERATED CONTENT (all correct data, needs reformatting):\n"
        f"---\n{content}\n---\n\n"
        f"Reformat the GENERATED CONTENT to match the layout, heading style, and structure "
        f"of the SAMPLE FORMAT. Keep ALL the data from the generated content exactly as-is. "
        f"Do not add or remove any legal information — only adjust formatting and structure. "
        f"Return only the reformatted document text, no explanation."
    )
    try:
        return await _call_gemini(prompt)
    except Exception as e:
        logger.warning("reformat_with_sample_failed", error=str(e))
        return content  # fall back to original if Gemini fails


async def _save_document(
    template_id: str, params: dict, content: str, domain_namespace: str, user_id: Optional[str] = None
) -> Optional[str]:
    """Save generated document to DB and return its ID."""
    try:
        from src.db.supabase_client import get_supabase_admin
        import uuid

        admin = get_supabase_admin()
        # Get domain_id from namespace
        domain_resp = admin.table("domains").select("id").eq(
            "knowledge_base_namespace", domain_namespace
        ).single().execute()
        domain_id = domain_resp.data["id"] if domain_resp.data else None
        if not domain_id:
            return None

        doc_id = str(uuid.uuid4())
        row: dict = {
            "id": doc_id,
            "template_id": template_id,
            "domain_id": domain_id,
            "input_parameters": params,
            "output_content": content,
            "output_language": "english",
            "output_format": "in_app",
            "validation_status": "valid",
        }
        if user_id:
            row["user_id"] = user_id
        result = admin.table("generated_documents").insert(row).execute()
        if hasattr(result, "error") and result.error:
            logger.error("save_document_db_error", error=str(result.error), user_id=user_id, template_id=template_id)
            return None
        logger.info("save_document_success", doc_id=doc_id, user_id=user_id)
        return doc_id
    except Exception as e:
        logger.error("save_document_failed", error=str(e), user_id=user_id, template_id=template_id, exc_info=True)
        return None
