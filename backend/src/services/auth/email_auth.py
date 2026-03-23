"""EmailAuthService: register, verify OTP, login via Supabase Auth."""
import random
import string
from datetime import datetime, timedelta, timezone
from typing import Optional

import structlog

from src.config import settings
from src.db.supabase_client import get_supabase_admin, get_supabase_client
from src.models.user import LoginResponse, UserProfile

logger = structlog.get_logger(__name__)

_OTP_LENGTH = 6
_OTP_EXPIRY_MINUTES = 10


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=_OTP_LENGTH))


class EmailAuthService:
    """Handles email-based registration, OTP verification, and login.

    Uses Supabase Auth for JWT issuance and session management.
    OTP codes are stored temporarily in the profiles table.
    """

    def __init__(self) -> None:
        self._client = get_supabase_client()
        self._admin = get_supabase_admin()

    async def register(self, email: str, password: str, redirect_to: str = "") -> dict:
        """Register a new user via Supabase Auth (sends verification email)."""
        # Check if email is already registered
        existing = self._admin.table("profiles").select("id").eq("email", email).execute()
        if existing.data:
            raise ValueError("An account with this email already exists. Please sign in.")

        try:
            signup_opts: dict = {"email": email, "password": password}
            if redirect_to:
                signup_opts["options"] = {"email_redirect_to": redirect_to}
            response = self._client.auth.sign_up(signup_opts)
            if response.user is None:
                raise ValueError("Registration failed — no user returned")
            logger.info("user_registered", email=email[:3] + "***")
            return {"message": "Verification email sent", "user_id": response.user.id}
        except ValueError:
            raise
        except Exception as exc:
            logger.error("registration_failed", error=str(exc))
            raise ValueError(f"Registration failed: {exc}") from exc

    async def send_otp(self, email: str) -> None:
        """Send an OTP code for email verification (used for custom OTP flow)."""
        otp = _generate_otp()
        expires = datetime.now(timezone.utc) + timedelta(minutes=_OTP_EXPIRY_MINUTES)
        # Store OTP in profiles table
        self._admin.table("profiles").update(
            {"verification_code": otp, "verification_expires": expires.isoformat()}
        ).eq("email", email).execute()
        # In production: send via email service (SendGrid, SES, etc.)
        logger.info("otp_sent", email=email[:3] + "***", expires_at=expires.isoformat())

    async def verify_email(self, email: str, code: str) -> bool:
        """Verify an email OTP code."""
        result = self._admin.table("profiles").select(
            "verification_code, verification_expires"
        ).eq("email", email).single().execute()

        if not result.data:
            raise ValueError("User not found")

        stored_code = result.data.get("verification_code")
        expires_str = result.data.get("verification_expires")

        if not stored_code or stored_code != code:
            raise ValueError("Invalid verification code")

        if expires_str:
            expires = datetime.fromisoformat(expires_str)
            if datetime.now(timezone.utc) > expires:
                raise ValueError("Verification code has expired")

        # Clear OTP after successful verification
        self._admin.table("profiles").update(
            {"verification_code": None, "verification_expires": None}
        ).eq("email", email).execute()
        logger.info("email_verified", email=email[:3] + "***")
        return True

    async def login(self, email: str, password: str) -> LoginResponse:
        """Authenticate and return JWT tokens."""
        try:
            response = self._client.auth.sign_in_with_password(
                {"email": email, "password": password}
            )
            if response.user is None or response.session is None:
                raise ValueError("Invalid credentials")

            # Update last_login_at
            self._admin.table("profiles").update(
                {"last_login_at": datetime.now(timezone.utc).isoformat()}
            ).eq("id", response.user.id).execute()

            profile_data = self._admin.table("profiles").select("*").eq(
                "id", response.user.id
            ).single().execute()

            profile = UserProfile(
                id=response.user.id,
                email=response.user.email,
                **{k: v for k, v in (profile_data.data or {}).items()
                   if k not in ("id", "email")},
            )
            logger.info("user_logged_in", user_id=response.user.id)
            return LoginResponse(
                access_token=response.session.access_token,
                refresh_token=response.session.refresh_token,
                expires_in=3600,
                user=profile,
            )
        except Exception as exc:
            logger.warning("login_failed", error=str(exc))
            raise ValueError("Invalid email or password") from exc

    async def refresh_token(self, refresh_token: str) -> LoginResponse:
        """Exchange refresh token for a new access token."""
        try:
            response = self._client.auth.refresh_session(refresh_token)
            if response.session is None or response.user is None:
                raise ValueError("Invalid refresh token")

            profile_data = self._admin.table("profiles").select("*").eq(
                "id", response.user.id
            ).single().execute()

            profile = UserProfile(
                id=response.user.id,
                email=response.user.email,
                **{k: v for k, v in (profile_data.data or {}).items()
                   if k not in ("id", "email")},
            )
            return LoginResponse(
                access_token=response.session.access_token,
                refresh_token=response.session.refresh_token,
                expires_in=3600,
                user=profile,
            )
        except Exception as exc:
            raise ValueError("Token refresh failed") from exc
