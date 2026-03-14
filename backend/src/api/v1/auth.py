"""Authentication API router."""
from fastapi import APIRouter, HTTPException, status, Depends
from pydantic import BaseModel, EmailStr
from jose import jwt
from datetime import datetime, timedelta
from backend.src.config import settings
from backend.src.services.auth.email_auth import EmailAuthService
from backend.src.services.auth.phone_auth import PhoneAuthService
from backend.src.services.auth.oauth import OAuthService
from backend.src.services.subscriptions.trial import TrialService
from backend.src.api.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["authentication"])


# Request/Response models
class EmailSignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    role_id: str


class EmailVerifyRequest(BaseModel):
    email: EmailStr
    code: str


class EmailLoginRequest(BaseModel):
    email: EmailStr
    password: str


class PhoneSignupRequest(BaseModel):
    phone: str
    full_name: str
    role_id: str


class PhoneVerifyRequest(BaseModel):
    phone: str
    otp: str


class PhoneLoginRequest(BaseModel):
    phone: str


class GoogleAuthRequest(BaseModel):
    token: str
    role_id: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: dict


def create_access_token(user_id: str) -> str:
    """Create JWT access token."""
    expire = datetime.utcnow() + timedelta(days=7)
    to_encode = {
        "sub": user_id,
        "exp": expire
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm="HS256")


@router.post("/signup/email")
async def signup_email(request: EmailSignupRequest):
    """Sign up with email and password."""
    result = await EmailAuthService.signup(
        email=request.email,
        password=request.password,
        full_name=request.full_name,
        role_id=request.role_id
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result
        )

    return result


@router.post("/verify/email", response_model=TokenResponse)
async def verify_email(request: EmailVerifyRequest):
    """Verify email code and create account."""
    result = await EmailAuthService.verify_and_create_account(
        email=request.email,
        code=request.code
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result
        )

    user = result["user"]

    # Activate trial subscription
    await TrialService.activate_trial(user["user_id"])

    # Generate JWT token
    access_token = create_access_token(user["user_id"])

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/login", response_model=TokenResponse)
async def login_email(request: EmailLoginRequest):
    """Login with email and password."""
    result = await EmailAuthService.login(
        email=request.email,
        password=request.password
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result
        )

    user = result["user"]
    access_token = create_access_token(user["user_id"])

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/signup/phone")
async def signup_phone(request: PhoneSignupRequest):
    """Sign up with phone number."""
    result = await PhoneAuthService.signup(
        phone=request.phone,
        full_name=request.full_name,
        role_id=request.role_id
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result
        )

    return result


@router.post("/verify/phone", response_model=TokenResponse)
async def verify_phone(request: PhoneVerifyRequest):
    """Verify phone OTP and create account."""
    result = await PhoneAuthService.verify_and_create_account(
        phone=request.phone,
        otp=request.otp
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result
        )

    user = result["user"]

    # Activate trial subscription
    await TrialService.activate_trial(user["user_id"])

    # Generate JWT token
    access_token = create_access_token(user["user_id"])

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.post("/signup/google", response_model=TokenResponse)
async def signup_google(request: GoogleAuthRequest):
    """Sign up or login with Google OAuth."""
    result = await OAuthService.signup_or_login(
        token=request.token,
        role_id=request.role_id
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result
        )

    user = result["user"]

    # Activate trial for new users
    if result.get("is_new_user"):
        await TrialService.activate_trial(user["user_id"])

    # Generate JWT token
    access_token = create_access_token(user["user_id"])

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user
    }


@router.get("/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user info."""
    return {
        "success": True,
        "user": current_user
    }


@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(current_user: dict = Depends(get_current_user)):
    """Refresh JWT token."""
    access_token = create_access_token(current_user["user_id"])

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": current_user
    }
