"""FastAPI dependencies for dependency injection."""
from typing import AsyncGenerator
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from supabase import Client
from backend.src.config import settings
from backend.src.db.session import get_db

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Client = Depends(get_db)
):
    """Dependency to get current authenticated user from JWT token.

    Args:
        credentials: HTTP Bearer token
        db: Database session

    Returns:
        dict: User data from token

    Raises:
        HTTPException: If token is invalid or user not found
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=["HS256"]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Fetch user from database
    response = db.table("users").select("*").eq("user_id", user_id).execute()

    if not response.data:
        raise credentials_exception

    return response.data[0]


async def get_admin_user(
    current_user: dict = Depends(get_current_user),
    db: Client = Depends(get_db)
):
    """Dependency to verify current user is an admin.

    Args:
        current_user: Current authenticated user
        db: Database session

    Returns:
        dict: Admin data

    Raises:
        HTTPException: If user is not an admin
    """
    response = db.table("admins").select("*").eq(
        "user_id", current_user["user_id"]
    ).eq("is_active", True).execute()

    if not response.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )

    return response.data[0]
