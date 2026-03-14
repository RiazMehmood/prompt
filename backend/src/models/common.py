"""Common Pydantic schemas for API responses and errors."""
from typing import Optional, Generic, TypeVar
from pydantic import BaseModel, Field


T = TypeVar("T")


class ErrorResponse(BaseModel):
    """Standard error response schema."""

    error: str = Field(..., description="Error type or code")
    message: str = Field(..., description="Human-readable error message")
    details: Optional[dict] = Field(None, description="Additional error details")

    class Config:
        json_schema_extra = {
            "example": {
                "error": "VALIDATION_ERROR",
                "message": "Invalid email format",
                "details": {"field": "email"}
            }
        }


class SuccessResponse(BaseModel, Generic[T]):
    """Standard success response wrapper."""

    success: bool = Field(True, description="Success flag")
    data: T = Field(..., description="Response data")
    message: Optional[str] = Field(None, description="Optional success message")


class PaginationParams(BaseModel):
    """Pagination parameters for list endpoints."""

    page: int = Field(1, ge=1, description="Page number (1-indexed)")
    page_size: int = Field(20, ge=1, le=100, description="Items per page")


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper."""

    items: list[T] = Field(..., description="List of items")
    total: int = Field(..., description="Total item count")
    page: int = Field(..., description="Current page number")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total page count")
