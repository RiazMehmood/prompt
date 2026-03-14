"""Documents API router for uploads and retrieval."""
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from pydantic import BaseModel
from backend.src.api.dependencies import get_current_user
from backend.src.db.supabase_client import supabase

router = APIRouter(prefix="/documents", tags=["documents"])


class DocumentUploadRequest(BaseModel):
    title: str
    content: str
    category: str = "legal"


@router.post("/upload")
async def upload_document(
    request: DocumentUploadRequest,
    current_user: dict = Depends(get_current_user)
):
    """Upload user-contributed document.

    Args:
        request: Document data
        current_user: Authenticated user

    Returns:
        Created document
    """
    try:
        response = supabase.table("documents").insert({
            "title": request.title,
            "content": request.content,
            "category": request.category,
            "role_id": current_user["role_id"],
            "status": "pending"
        }).execute()

        return {
            "success": True,
            "document": response.data[0]
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("")
async def list_documents(
    current_user: dict = Depends(get_current_user),
    status_filter: str = "approved",
    limit: int = 50
):
    """List approved documents.

    Args:
        current_user: Authenticated user
        status_filter: Document status filter
        limit: Max results

    Returns:
        List of documents
    """
    try:
        response = supabase.table("documents").select("*").eq(
            "role_id", current_user["role_id"]
        ).eq("status", status_filter).limit(limit).execute()

        return {
            "success": True,
            "documents": response.data,
            "count": len(response.data)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )


@router.get("/{document_id}")
async def get_document(
    document_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get document by ID.

    Args:
        document_id: Document ID
        current_user: Authenticated user

    Returns:
        Document data
    """
    response = supabase.table("documents").select("*").eq(
        "document_id", document_id
    ).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    return {
        "success": True,
        "document": response.data[0]
    }


@router.get("/generated/list")
async def list_generated_documents(
    current_user: dict = Depends(get_current_user),
    limit: int = 50
):
    """List user's generated documents.

    Args:
        current_user: Authenticated user
        limit: Max results

    Returns:
        List of generated documents
    """
    try:
        response = supabase.table("generated_documents").select("*").eq(
            "user_id", current_user["user_id"]
        ).order("created_at", desc=True).limit(limit).execute()

        return {
            "success": True,
            "documents": response.data,
            "count": len(response.data)
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )
