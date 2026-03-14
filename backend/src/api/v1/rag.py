"""RAG API router for chat and document queries."""
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from backend.src.api.dependencies import get_current_user
from backend.src.services.chat import ChatService
from backend.src.db.supabase_client import supabase

router = APIRouter(prefix="/rag", tags=["rag"])


class QueryRequest(BaseModel):
    query: str
    session_id: str = None


class QueryResponse(BaseModel):
    response: str
    citations: list[str]
    confidence: float
    session_id: str
    cached: bool


class CreateSessionResponse(BaseModel):
    session_id: str


@router.post("/query", response_model=QueryResponse)
async def query_rag(
    request: QueryRequest,
    current_user: dict = Depends(get_current_user)
):
    """Query RAG system with user question.

    Args:
        request: Query request with question and optional session_id
        current_user: Authenticated user

    Returns:
        AI response with citations and confidence
    """
    user_id = current_user["user_id"]
    role_id = current_user["role_id"]

    # Get role AI persona
    role_response = supabase.table("roles").select("ai_persona_prompt").eq(
        "role_id", role_id
    ).execute()

    if not role_response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Role not found"
        )

    ai_persona = role_response.data[0]["ai_persona_prompt"]

    # Create session if not provided
    session_id = request.session_id
    if not session_id:
        session_result = await ChatService.create_session(user_id, role_id)
        if not session_result["success"]:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session"
            )
        session_id = session_result["session"]["session_id"]

    # Process query with RAG
    result = await ChatService.query_with_rag(
        session_id=session_id,
        user_id=user_id,
        role_id=role_id,
        query=request.query,
        ai_persona=ai_persona
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("error", "Query failed")
        )

    return {
        "response": result["response"],
        "citations": result["citations"],
        "confidence": result["confidence"],
        "session_id": session_id,
        "cached": result.get("cached", False)
    }


@router.post("/sessions", response_model=CreateSessionResponse)
async def create_session(current_user: dict = Depends(get_current_user)):
    """Create new chat session.

    Args:
        current_user: Authenticated user

    Returns:
        Session ID
    """
    result = await ChatService.create_session(
        current_user["user_id"],
        current_user["role_id"]
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create session"
        )

    return {"session_id": result["session"]["session_id"]}


@router.get("/sessions")
async def get_sessions(current_user: dict = Depends(get_current_user)):
    """Get user's chat sessions.

    Args:
        current_user: Authenticated user

    Returns:
        List of chat sessions
    """
    result = await ChatService.get_sessions(current_user["user_id"])

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch sessions"
        )

    return {
        "success": True,
        "sessions": result["sessions"]
    }


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get chat session messages.

    Args:
        session_id: Session ID
        current_user: Authenticated user

    Returns:
        Session with messages
    """
    response = supabase.table("chat_sessions").select("*").eq(
        "session_id", session_id
    ).eq("user_id", current_user["user_id"]).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )

    return {
        "success": True,
        "session": response.data[0]
    }
