"""Auth API router — registration, login, verification, token refresh."""
from typing import Annotated

from fastapi import APIRouter, Body, status
from fastapi.responses import JSONResponse

from src.api.dependencies import CurrentUser
from src.models.user import (
    LoginResponse,
    RefreshTokenRequest,
    UserRegistration,
    UserLogin,
    VerifyEmailRequest,
    VerifyPhoneRequest,
)
from src.services.auth.email_auth import EmailAuthService
from src.services.auth.phone_auth import PhoneAuthService

router = APIRouter()


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: UserRegistration) -> JSONResponse:
    """Register a new user with email or phone.

    - Email registration: sends a verification email via Supabase Auth
    - Phone registration: sends an OTP SMS via Twilio
    """
    if body.email:
        svc = EmailAuthService()
        # Redirect to frontend callback page after email verification
        import os
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")
        redirect_to = f"{frontend_url}/auth/callback"
        result = await svc.register(body.email, body.password, redirect_to=redirect_to)
        return JSONResponse(status_code=201, content=result)
    else:
        svc = PhoneAuthService()
        result = await svc.send_otp(body.phone)  # type: ignore[arg-type]
        return JSONResponse(status_code=201, content=result)


@router.post("/login", response_model=LoginResponse)
async def login(body: UserLogin) -> LoginResponse:
    """Authenticate with email+password or initiate phone OTP flow."""
    if body.email and body.password:
        svc = EmailAuthService()
        return await svc.login(body.email, body.password)
    raise ValueError("Email and password are required for login")


@router.post("/verify-email")
async def verify_email(body: VerifyEmailRequest) -> JSONResponse:
    """Verify email with OTP code."""
    svc = EmailAuthService()
    await svc.verify_email(body.email, body.code)
    return JSONResponse(content={"message": "Email verified successfully"})


@router.post("/verify-phone", response_model=LoginResponse)
async def verify_phone(body: VerifyPhoneRequest) -> LoginResponse:
    """Verify phone OTP and receive JWT tokens."""
    svc = PhoneAuthService()
    return await svc.verify_otp(body.phone, body.code)


@router.post("/send-phone-otp")
async def send_phone_otp(phone: Annotated[str, Body(embed=True)]) -> JSONResponse:
    """Send an OTP to the given phone number (used for login/registration)."""
    svc = PhoneAuthService()
    result = await svc.send_otp(phone)
    return JSONResponse(content=result)


@router.get("/me")
async def get_me(current_user: CurrentUser) -> dict:
    """Return the authenticated user's profile."""
    return {
        "id":                   current_user.id,
        "email":                current_user.email,
        "role":                 current_user.role,
        "domain_id":            current_user.domain_id,
        "domain_name":          current_user.domain_name,
        "subscription_tier":    current_user.subscription_tier,
        "professional_details": current_user.professional_details,
    }


@router.patch("/profile")
async def update_profile(
    body: dict,
    current_user: CurrentUser,
) -> dict:
    """Update the current user's professional details (name, court, bar number, etc.)."""
    from src.db.supabase_client import get_supabase_admin
    allowed = {
        "full_name", "court_name", "bar_number", "designation",
        "organization", "city", "phone",
    }
    details = {k: v for k, v in body.items() if k in allowed and v is not None}
    if not details:
        return {"professional_details": current_user.professional_details}

    admin = get_supabase_admin()
    # Merge with existing details
    existing = current_user.professional_details or {}
    merged = {**existing, **details}
    admin.table("profiles").update({"professional_details": merged}).eq("id", current_user.id).execute()
    return {"professional_details": merged}


@router.post("/refresh", response_model=LoginResponse)
async def refresh_token(body: RefreshTokenRequest) -> LoginResponse:
    """Exchange a refresh token for a new access token."""
    svc = EmailAuthService()
    return await svc.refresh_token(body.refresh_token)
