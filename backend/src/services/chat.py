"""Chat service with RAG integration."""
from datetime import datetime
from backend.src.db.supabase_client import supabase
from backend.src.services.ai.gemini import gemini_client
from backend.src.services.rag.retrieval import RetrievalService
from backend.src.services.rag.cache import CacheService


class ChatService:
    """Chat service with RAG-powered responses."""

    @staticmethod
    async def create_session(user_id: str, role_id: str) -> dict:
        """Create new chat session.

        Args:
            user_id: User ID
            role_id: Role ID

        Returns:
            dict with session data
        """
        try:
            response = supabase.table("chat_sessions").insert({
                "user_id": user_id,
                "role_id": role_id,
                "messages": []
            }).execute()

            return {
                "success": True,
                "session": response.data[0]
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    async def query_with_rag(
        session_id: str,
        user_id: str,
        role_id: str,
        query: str,
        ai_persona: str
    ) -> dict:
        """Process query with RAG and generate response.

        Args:
            session_id: Chat session ID
            user_id: User ID
            role_id: Role ID
            query: User query
            ai_persona: AI persona prompt for this role

        Returns:
            dict with AI response and citations
        """
        # Check cache first
        cached = await CacheService.get_cached_response(query, role_id)
        if cached:
            # Add to session messages
            await ChatService._add_message_to_session(
                session_id,
                "user",
                query
            )
            await ChatService._add_message_to_session(
                session_id,
                "assistant",
                cached["response"],
                cached.get("citations", []),
                cached.get("confidence", 0)
            )

            return {
                "success": True,
                "response": cached["response"],
                "citations": cached.get("citations", []),
                "confidence": cached.get("confidence", 0),
                "cached": True
            }

        # Retrieve relevant documents
        retrieval_result = await RetrievalService.search_similar_documents(
            query=query,
            role_id=role_id,
            top_k=5,
            confidence_threshold=0.75
        )

        if not retrieval_result["success"] or retrieval_result["count"] == 0:
            # No relevant documents found
            response_text = "I couldn't find relevant information in the legal database to answer your question. Please try rephrasing or ask about a different topic."

            await ChatService._add_message_to_session(session_id, "user", query)
            await ChatService._add_message_to_session(
                session_id,
                "assistant",
                response_text,
                [],
                0.0
            )

            return {
                "success": True,
                "response": response_text,
                "citations": [],
                "confidence": 0.0,
                "cached": False
            }

        # Build context from retrieved documents
        context_parts = []
        citations = []

        for result in retrieval_result["results"]:
            context_parts.append(f"[{result['title']}]\n{result['content']}")
            citations.append(result["title"])

        context = "\n\n".join(context_parts)

        # Generate AI response with context
        prompt = f"""Context from legal documents:
{context}

{ai_persona}

Based on the context above, answer the following question. Cite specific sections and laws when applicable.

Question: {query}

Answer:"""

        try:
            ai_response = await gemini_client.generate_response(prompt)

            # Calculate average confidence from retrieval
            avg_confidence = sum(r["similarity"] for r in retrieval_result["results"]) / len(retrieval_result["results"])

            # Add messages to session
            await ChatService._add_message_to_session(session_id, "user", query)
            await ChatService._add_message_to_session(
                session_id,
                "assistant",
                ai_response,
                citations,
                avg_confidence
            )

            # Cache response
            cache_data = {
                "response": ai_response,
                "citations": citations,
                "confidence": avg_confidence
            }
            await CacheService.cache_response(query, role_id, cache_data)

            return {
                "success": True,
                "response": ai_response,
                "citations": citations,
                "confidence": avg_confidence,
                "cached": False
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }

    @staticmethod
    async def _add_message_to_session(
        session_id: str,
        role: str,
        content: str,
        citations: list[str] = None,
        confidence: float = None
    ):
        """Add message to chat session.

        Args:
            session_id: Session ID
            role: Message role (user/assistant)
            content: Message content
            citations: List of citations (for assistant)
            confidence: Confidence score (for assistant)
        """
        # Fetch current session
        response = supabase.table("chat_sessions").select("messages").eq(
            "session_id", session_id
        ).execute()

        if not response.data:
            return

        messages = response.data[0]["messages"]

        # Add new message
        message = {
            "role": role,
            "content": content,
            "timestamp": datetime.utcnow().isoformat()
        }

        if role == "assistant":
            if citations:
                message["citations"] = citations
            if confidence is not None:
                message["confidence"] = confidence

        messages.append(message)

        # Update session
        supabase.table("chat_sessions").update({
            "messages": messages,
            "last_active": datetime.utcnow().isoformat()
        }).eq("session_id", session_id).execute()

    @staticmethod
    async def get_sessions(user_id: str) -> dict:
        """Get user's chat sessions.

        Args:
            user_id: User ID

        Returns:
            dict with sessions list
        """
        try:
            response = supabase.table("chat_sessions").select("*").eq(
                "user_id", user_id
            ).order("last_active", desc=True).execute()

            return {
                "success": True,
                "sessions": response.data
            }

        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
