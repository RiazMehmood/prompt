"""Conversation router: multilingual text interaction with RAG and Gemini.

Two modes:
1. Document creation mode — guided by DocumentAgentService (intent detected)
2. Normal RAG chat mode — direct question answering from knowledge base
"""
import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException

from src.api.dependencies import CurrentUser, DomainAssignedUser
from src.models.conversation import ConversationRequest, ConversationResponse, RagSource
from src.services.ai.document_agent import DocumentAgentService
from src.services.ai.semantic_cache import SemanticCacheService
from src.services.language.detection import LanguageDetectionService
from src.services.rag.retrieval import RAGRetrievalService
from src.db.supabase_client import get_supabase_admin

router = APIRouter()
logger = structlog.get_logger(__name__)

_lang_svc = LanguageDetectionService()
_doc_agent = DocumentAgentService()

# Per-session FIR context cache — stores structured FIR fields so document agent
# can auto-fill slots when the user later requests a document in the same session
_FIR_CONTEXT: dict[str, dict] = {}


@router.post("/conversation", response_model=ConversationResponse)
async def conversation(
    body: ConversationRequest,
    current_user: CurrentUser,
) -> ConversationResponse:
    """Handle a multilingual text query using RAG + Gemini.

    Automatically detects document creation intent and routes to the
    DocumentAgentService for guided, conversational document generation.
    Otherwise performs normal RAG-based question answering.
    """
    session_id = body.session_id or str(uuid.uuid4())

    # Non-admins must have a domain assigned
    is_admin = current_user.role in ("root_admin", "domain_admin")
    if not is_admin and not current_user.domain_id:
        from fastapi import HTTPException as _HTTPException
        raise _HTTPException(
            status_code=403,
            detail={"code": "NO_DOMAIN", "message": "Please select a domain before accessing this feature"},
        )

    # Admins may override domain to test any domain's AI
    effective_domain_id = (body.domain_id if is_admin and body.domain_id else current_user.domain_id)

    # Resolve namespace for the effective domain
    if is_admin and body.domain_id and body.domain_id != current_user.domain_id:
        try:
            admin = get_supabase_admin()
            d = admin.table("domains").select("knowledge_base_namespace").eq("id", body.domain_id).single().execute()
            domain_namespace = (d.data or {}).get("knowledge_base_namespace") or body.domain_id
        except Exception:
            domain_namespace = body.domain_id
    else:
        domain_namespace = current_user.domain_namespace or ""

    # ── Load templates for the effective domain ────────────────────────────────
    templates = _get_templates(effective_domain_id)

    # ── Cache FIR fields if provided (for this session) ───────────────────────
    if body.fir_fields:
        _FIR_CONTEXT[session_id] = body.fir_fields

    # ── Try document agent first ──────────────────────────────────────────────
    domain_name = current_user.domain_name or "General"
    fir_context = _FIR_CONTEXT.get(session_id)

    agent_result = await _doc_agent.process(
        session_id=session_id,
        message=body.message,
        domain_namespace=domain_namespace,
        templates=templates,
        professional_details=current_user.professional_details,
        user_id=current_user.id,
        domain_name=domain_name,
        fir_context=fir_context,
    )

    if agent_result is not None:
        # Agent handled it — but reply may be None (post-done, fall through to RAG)
        if agent_result.get("reply") is not None:
            return ConversationResponse(
                reply=agent_result["reply"],
                response_language="english",
                is_rtl=False,
                session_id=session_id,
                document_ready=agent_result.get("document_ready", False),
                document_content=agent_result.get("document_content"),
                document_id=agent_result.get("document_id"),
                needs_fir_upload=agent_result.get("needs_fir_upload", False),
            )

    # ── Normal RAG chat ───────────────────────────────────────────────────────
    detected_lang = (
        body.language_hint if body.language_hint else _lang_svc.detect(body.message)
    )

    cache = SemanticCacheService()
    cached = cache.get(body.message, domain_namespace)
    if cached:
        return ConversationResponse(
            reply=cached,
            response_language=detected_lang,
            is_rtl=_lang_svc.is_rtl(detected_lang),
            session_id=session_id,
            cached=True,
            # Carry through document state if agent has a done doc
            document_ready=agent_result.get("document_ready", False) if agent_result else False,
            document_content=agent_result.get("document_content") if agent_result else None,
            document_id=agent_result.get("document_id") if agent_result else None,
        )

    retrieval_svc = RAGRetrievalService()
    chunks = await retrieval_svc.retrieve(
        query=body.message,
        domain_namespace=domain_namespace,
        top_k=5,
        language_filter=detected_lang if detected_lang != "mixed" else None,
    )

    context_text = "\n\n".join(
        f"[Source {i+1} | confidence: {c['confidence']:.2f}]\n{c['chunk_text']}"
        for i, c in enumerate(chunks)
    )

    reply = await _generate_reply(
        query=body.message,
        context=context_text,
        language=detected_lang,
        domain_name=domain_name,
    )

    cache.set(body.message, domain_namespace, reply)

    sources = [
        RagSource(
            source_id=c.get("document_id"),
            text=c["chunk_text"][:200],
            confidence=c["confidence"],
            page=c.get("metadata", {}).get("page_num"),
        )
        for c in chunks
    ]

    return ConversationResponse(
        reply=reply,
        response_language=detected_lang,
        is_rtl=_lang_svc.is_rtl(detected_lang),
        rag_sources=sources,
        session_id=session_id,
        cached=False,
        document_ready=agent_result.get("document_ready", False) if agent_result else False,
        document_content=agent_result.get("document_content") if agent_result else None,
        document_id=agent_result.get("document_id") if agent_result else None,
    )


# ── Helpers ───────────────────────────────────────────────────────────────────

def _get_templates(domain_id: str | None) -> list[dict]:
    """Fetch templates for the user's domain."""
    if not domain_id:
        return []
    try:
        admin = get_supabase_admin()
        resp = admin.table("templates").select("*").eq("domain_id", domain_id).execute()
        return resp.data or []
    except Exception:
        return []


async def _generate_reply(query: str, context: str, language: str, domain_name: str = "General") -> str:
    """Generate a reply using Gemini with RAG context."""
    from src.services.ai.key_rotator import get_key_rotator
    import google.generativeai as genai
    from src.config import settings

    rotator = get_key_rotator()
    api_key = rotator.get_key()

    lang_instruction = {
        "english": "Respond in English.",
        "urdu": "اردو میں جواب دیں۔ (Respond in Urdu in Nastaliq script.)",
        "sindhi": "سنڌيءَ ۾ جواب ڏيو. (Respond in Sindhi.)",
    }.get(language, "Respond in English.")

    domain_persona = {
        "Legal": (
            "You are a senior Pakistani criminal defense lawyer with deep expertise in "
            "Sindh courts, PPC (Pakistan Penal Code), Cr.P.C., and FIR law. "
            "You speak like an experienced advocate — clear, precise, and strategic. "
            "When FIR details are shared, analyse the sections, identify the legal issues, "
            "and guide the lawyer on the best course of action. "
            "If the user shares FIR fields and asks what to do, suggest the most relevant "
            "legal documents (bail application, legal notice, etc.) based on the case."
        ),
        "Education": (
            "You are an experienced educational consultant and curriculum expert. "
            "Provide practical, evidence-based guidance for teachers, administrators, and students."
        ),
        "Medical": (
            "You are a senior medical professional and clinical documentation expert. "
            "Provide accurate, clinically sound guidance following standard medical practices."
        ),
    }.get(domain_name, f"You are a professional {domain_name} domain expert assistant.")

    prompt = (
        f"{domain_persona}\n\n"
        f"Answer based on the provided context from the knowledge base. "
        f"If context is insufficient, provide expert guidance from your professional knowledge, "
        f"but indicate it is from general expertise rather than the knowledge base.\n\n"
        f"CONTEXT:\n{context}\n\n"
        f"QUESTION / USER MESSAGE: {query}\n\n"
        f"{lang_instruction}"
    )

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel(settings.GEMINI_MODEL)
        response = model.generate_content(prompt)
        return response.text
    except Exception as exc:
        if "429" in str(exc) or "quota" in str(exc).lower():
            rotator.mark_rate_limited(api_key)
        logger.error("gemini_generation_failed", error=str(exc))
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable")
