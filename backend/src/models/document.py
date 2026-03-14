"""Document model for user-contributed and approved documents."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class Document(BaseModel):
    """Document model for legal documents and user contributions."""

    document_id: Optional[str] = Field(None, description="UUID primary key")
    title: str = Field(..., description="Document title")
    content: str = Field(..., description="Document text content")
    category: str = Field("legal", description="Document category")
    role_id: str = Field(..., description="Foreign key to roles table")
    status: str = Field("pending", description="Approval status: pending|approved|rejected")
    file_url: Optional[str] = Field(None, description="S3/storage URL for file")
    metadata: dict = Field(default_factory=dict, description="Additional metadata (JSON)")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "title": "PPC Section 302 - Punishment for Murder",
                "content": "Section 302. Punishment for murder...",
                "category": "legal",
                "role_id": "uuid-lawyer-role",
                "status": "approved",
                "metadata": {
                    "law": "PPC",
                    "section": "302",
                    "topic": "Murder"
                }
            }
        }


class ChatSession(BaseModel):
    """Chat session model for conversation history."""

    session_id: Optional[str] = Field(None, description="UUID primary key")
    user_id: str = Field(..., description="Foreign key to users table")
    role_id: str = Field(..., description="Foreign key to roles table")
    messages: list[dict] = Field(default_factory=list, description="Array of message objects")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")
    last_active: Optional[datetime] = Field(None, description="Last activity timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "uuid-user",
                "role_id": "uuid-lawyer-role",
                "messages": [
                    {
                        "role": "user",
                        "content": "What is PPC Section 302?",
                        "timestamp": "2026-03-14T18:00:00Z"
                    },
                    {
                        "role": "assistant",
                        "content": "PPC Section 302 deals with punishment for murder...",
                        "timestamp": "2026-03-14T18:00:05Z",
                        "citations": ["PPC Section 302"],
                        "confidence": 0.95
                    }
                ]
            }
        }


class GeneratedDocument(BaseModel):
    """Generated document model for AI-created documents."""

    generated_id: Optional[str] = Field(None, description="UUID primary key")
    user_id: str = Field(..., description="Foreign key to users table")
    document_type: str = Field(..., description="Document type (e.g., bail_application)")
    content: str = Field(..., description="Generated document content")
    file_url: Optional[str] = Field(None, description="URL to generated .docx file")
    created_at: Optional[datetime] = Field(None, description="Creation timestamp")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "uuid-user",
                "document_type": "bail_application",
                "content": "IN THE COURT OF...",
                "file_url": "https://storage.example.com/bail_app_123.docx"
            }
        }
