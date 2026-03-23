"""FastAPI dependency injection — JWT validation and user context extraction."""
from typing import Annotated, Callable, Optional

import structlog
from fastapi import Depends, Header, HTTPException, status

from src.db.supabase_client import get_supabase_admin
from src.models.user import UserProfile, UserRole

logger = structlog.get_logger(__name__)


class AuthenticatedUser(UserProfile):
    """Extends UserProfile with request-scoped context from JWT."""
    domain_namespace: Optional[str] = None


async def get_current_user(
    authorization: Annotated[Optional[str], Header()] = None,
) -> AuthenticatedUser:
    """Extract and validate Supabase JWT, return authenticated user context.

    Attaches user_id, domain_id, role, and domain_namespace to request state
    so all downstream handlers have full tenant context without extra DB calls.

    Raises HTTPException 401 if token is missing or invalid.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "MISSING_TOKEN", "message": "Authorization header required"},
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = authorization.removeprefix("Bearer ").strip()

    # Use Supabase server-side verification (handles ES256 / HS256 transparently)
    try:
        admin = get_supabase_admin()
        user_resp = admin.auth.get_user(token)
        user_id: Optional[str] = user_resp.user.id if user_resp.user else None
    except Exception as exc:
        logger.warning("jwt_invalid", error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Token is invalid or expired"},
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "INVALID_TOKEN", "message": "Token missing subject claim"},
        )

    # Bind context for structured logging
    structlog.contextvars.bind_contextvars(user_id=user_id)

    # Load profile from DB to get domain_id, role, etc.
    try:
        result = admin.table("profiles").select(
            "id, email, phone, domain_id, subscription_tier, role, "
            "document_generation_count, upload_count, created_at, last_login_at"
        ).eq("id", user_id).single().execute()
    except Exception as exc:
        logger.error("profile_load_failed", user_id=user_id, error=str(exc))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"code": "PROFILE_NOT_FOUND", "message": "User profile not found"},
        ) from exc

    data = result.data or {}

    # Load domain namespace for vector isolation
    domain_namespace: Optional[str] = None
    if data.get("domain_id"):
        domain_result = admin.table("domains").select("knowledge_base_namespace").eq(
            "id", data["domain_id"]
        ).single().execute()
        if domain_result.data:
            domain_namespace = domain_result.data.get("knowledge_base_namespace")

    structlog.contextvars.bind_contextvars(
        domain_id=data.get("domain_id"),
        user_role=data.get("role"),
    )

    return AuthenticatedUser(
        id=user_id,
        email=data.get("email"),
        phone=data.get("phone"),
        domain_id=data.get("domain_id"),
        subscription_tier=data.get("subscription_tier", "basic"),
        role=data.get("role", "user"),
        document_generation_count=data.get("document_generation_count", 0),
        upload_count=data.get("upload_count", 0),
        created_at=data.get("created_at"),
        last_login_at=data.get("last_login_at"),
        domain_namespace=domain_namespace,
    )


async def require_domain_admin(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> AuthenticatedUser:
    """Require domain_admin or root_admin role."""
    if current_user.role not in (UserRole.domain_admin, UserRole.root_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Domain admin access required"},
        )
    return current_user


async def require_root_admin(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> AuthenticatedUser:
    """Require root_admin role."""
    if current_user.role != UserRole.root_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Root admin access required"},
        )
    return current_user


async def require_domain_assigned(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> AuthenticatedUser:
    """Require that the user has been assigned to a domain."""
    if not current_user.domain_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "NO_DOMAIN",
                "message": "Please select a domain before accessing this feature",
            },
        )
    return current_user


async def check_generate_limit(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> AuthenticatedUser:
    """Enforce daily document generation limit for the user's subscription tier.

    Returns 429 with upgrade prompt when limit is reached.
    """
    from src.services.subscriptions.subscription_service import SubscriptionService

    svc = SubscriptionService()
    prompt = await svc.check_limit(current_user.id, current_user.subscription_tier, "generate")
    if prompt is not None:
        from fastapi.responses import JSONResponse
        from fastapi import HTTPException
        raise HTTPException(
            status_code=429,
            detail={
                "code": "LIMIT_REACHED",
                "message": prompt.message,
                "current_usage": prompt.current_usage,
                "daily_limit": prompt.daily_limit,
                "tier": prompt.tier,
                "upgrade_available": prompt.upgrade_available,
            },
        )
    return current_user


async def check_upload_limit(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> AuthenticatedUser:
    """Enforce daily document upload limit for the user's subscription tier."""
    from src.services.subscriptions.subscription_service import SubscriptionService

    svc = SubscriptionService()
    prompt = await svc.check_limit(current_user.id, current_user.subscription_tier, "upload")
    if prompt is not None:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=429,
            detail={
                "code": "LIMIT_REACHED",
                "message": prompt.message,
                "current_usage": prompt.current_usage,
                "daily_limit": prompt.daily_limit,
                "tier": prompt.tier,
                "upgrade_available": prompt.upgrade_available,
            },
        )
    return current_user


# Aliases for use in route handlers that require admin access
async def require_admin(
    current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
) -> AuthenticatedUser:
    """Require root_admin or domain_admin role (alias for backwards compat)."""
    if current_user.role not in (UserRole.domain_admin, UserRole.root_admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Admin access required"},
        )
    return current_user


def require_permission(*permissions: str) -> Callable:
    """Factory: returns a dependency that passes for root_admin, domain_admin, or
    a staff member who has ANY of the listed permission scopes in staff_permissions."""

    async def _dep(
        current_user: Annotated[AuthenticatedUser, Depends(get_current_user)],
    ) -> AuthenticatedUser:
        if current_user.role in (UserRole.root_admin, UserRole.domain_admin):
            return current_user
        if current_user.role == UserRole.staff:
            supabase = get_supabase_admin()
            resp = supabase.table("staff_permissions").select("permission").eq(
                "staff_id", current_user.id
            ).in_("permission", list(permissions)).execute()
            if resp.data:
                return current_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "FORBIDDEN",
                "message": f"One of permissions {list(permissions)} required",
            },
        )

    return _dep


# Convenience type aliases for use in route handlers
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
DomainAdminUser = Annotated[AuthenticatedUser, Depends(require_domain_admin)]
RootAdminUser = Annotated[AuthenticatedUser, Depends(require_root_admin)]
DomainAssignedUser = Annotated[AuthenticatedUser, Depends(require_domain_assigned)]
GenerateLimitedUser = Annotated[AuthenticatedUser, Depends(check_generate_limit)]
UploadLimitedUser = Annotated[AuthenticatedUser, Depends(check_upload_limit)]

# Staff-permission-aware dependency aliases (any matching permission grants access)
ApproveDocumentsUser = Annotated[AuthenticatedUser, Depends(require_permission("approve_documents"))]
ViewAnalyticsUser    = Annotated[AuthenticatedUser, Depends(require_permission("view_analytics"))]
ManageUsersUser      = Annotated[AuthenticatedUser, Depends(require_permission("manage_all_users", "manage_domain_users"))]
ManageTemplatesUser  = Annotated[AuthenticatedUser, Depends(require_permission("manage_templates"))]
ManagePaymentsUser   = Annotated[AuthenticatedUser, Depends(require_permission("manage_payments"))]
ManageInstitutesUser = Annotated[AuthenticatedUser, Depends(require_permission("manage_institutes"))]
ManageSubsUser       = Annotated[AuthenticatedUser, Depends(require_permission("manage_subscriptions", "manage_all_users"))]
