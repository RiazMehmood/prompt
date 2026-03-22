"""Conversation router: multilingual text interaction with RAG and Gemini."""
import uuid
from typing import Annotated

import structlog
from fastapi import APIRouter, Depends, HTTPException

from src.api.dependencies import DomainAssignedUser
from src.models.conversation import ConversationRequest, ConversationResponse, RagSource
from src.services.ai.semantic_cache import SemanticCacheService
from src.services.language.detection import LanguageDetectionService
from src.services.rag.retrieval import RAGRetrievalService

router = APIRouter()
logger = structlog.get_logger(__name__)

_lang_svc = LanguageDetectionService()


@router.post("/conversation", response_model=ConversationResponse)
async def conversation(
    body: ConversationRequest,
    current_user: DomainAssignedUser,
) -> ConversationResponse:
    """Handle a multilingual text query using RAG + Gemini.

    - Auto-detects language if language_hint is not provided
    - Returns response in the same script as the input
    - Uses semantic cache to avoid redundant LLM calls
    """
    session_id = body.session_id or str(uuid.uuid4())
    domain_namespace = current_user.domain_namespace or ""

    # Detect language
    detected_lang = (
        body.language_hint
        if body.language_hint
        else _lang_svc.detect(body.message)
    )

    # Check semantic cache first
    cache = SemanticCacheService()
    cached = cache.get(body.message, domain_namespace)
    if cached:
        return ConversationResponse(
            reply=cached,
            response_language=detected_lang,
            is_rtl=_lang_svc.is_rtl(detected_lang),
            session_id=session_id,
            cached=True,
        )

    # Retrieve relevant context from knowledge base
    retrieval_svc = RAGRetrievalService()
    chunks = await retrieval_svc.retrieve(
        query=body.message,
        domain_namespace=domain_namespace,
        top_k=5,
        language_filter=detected_lang if detected_lang != "mixed" else None,
    )

    # Build prompt context from retrieved chunks
    context_text = "\n\n".join(
        f"[Source {i+1} | confidence: {c['confidence']:.2f}]\n{c['chunk_text']}"
        for i, c in enumerate(chunks)
    )

    # Call Gemini API
    reply = await _generate_reply(
        query=body.message,
        context=context_text,
        language=detected_lang,
    )

    # Cache the response
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
    )


async def _generate_reply(query: str, context: str, language: str) -> str:
    """Generate a reply using Gemini API with domain context."""
    from src.services.ai.key_rotator import get_key_rotator
    import google.generativeai as genai

    rotator = get_key_rotator()
    api_key = rotator.get_key()

    lang_instruction = {
        "english": "Respond in English.",
        "urdu": "اردو میں جواب دیں۔ (Respond in Urdu in Nastaliq script.)",
        "sindhi": "سنڌيءَ ۾ جواب ڏيو. (Respond in Sindhi.)",
    }.get(language, "Respond in English.")

    prompt = (
        f"You are a professional domain expert assistant. "
        f"Answer ONLY based on the provided context. "
        f"If the answer cannot be found in the context, say so. "
        f"Do not generate information not present in the context.\n\n"
        f"CONTEXT:\n{context}\n\n"
        f"QUESTION: {query}\n\n"
        f"{lang_instruction}"
    )

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(prompt)
        return response.text
    except Exception as exc:
        if "429" in str(exc) or "quota" in str(exc).lower():
            rotator.mark_rate_limited(api_key)
        logger.error("gemini_generation_failed", error=str(exc))
        raise HTTPException(status_code=503, detail="AI service temporarily unavailable")
