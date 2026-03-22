"""PhoneAuthService: phone registration and Twilio OTP for Pakistani numbers."""
import random
import string
from datetime import datetime, timedelta, timezone

import structlog

from src.config import settings
from src.db.supabase_client import get_supabase_admin
from src.models.user import LoginResponse, UserProfile

logger = structlog.get_logger(__name__)

_OTP_LENGTH = 6
_OTP_EXPIRY_MINUTES = 10


def _generate_otp() -> str:
    return "".join(random.choices(string.digits, k=_OTP_LENGTH))


class PhoneAuthService:
    """Handles phone-based registration and OTP verification via Twilio.

    Supports Pakistani mobile numbers (+92XXXXXXXXXX format).
    """

    def __init__(self) -> None:
        self._admin = get_supabase_admin()
        self._twilio_client = None
        if settings.TWILIO_ACCOUNT_SID and settings.TWILIO_AUTH_TOKEN:
            try:
                from twilio.rest import Client  # type: ignore[import]
                self._twilio_client = Client(
                    settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN
                )
                logger.info("twilio_client_initialized")
            except ImportError:
                logger.warning("twilio_not_installed")

    async def send_otp(self, phone: str) -> dict:
        """Send a 6-digit OTP to the given phone number via Twilio SMS."""
        otp = _generate_otp()
        expires = datetime.now(timezone.utc) + timedelta(minutes=_OTP_EXPIRY_MINUTES)

        # Upsert phone record with OTP (creates profile row if first login)
        self._admin.table("profiles").upsert(
            {
                "phone": phone,
                "password_hash": "",  # phone-only users have no password
                "verification_code": otp,
                "verification_expires": expires.isoformat(),
            }
        ).execute()

        if self._twilio_client:
            self._twilio_client.messages.create(
                body=f"Your Prompt verification code: {otp}. Valid for {_OTP_EXPIRY_MINUTES} minutes.",
                from_=settings.TWILIO_PHONE_NUMBER,
                to=phone,
            )
            logger.info("sms_otp_sent", phone=phone[-4:])
        else:
            # Dev mode: log OTP (never do this in production)
            logger.warning("twilio_not_configured_otp_logged", otp=otp, phone=phone[-4:])

        return {"message": f"OTP sent to {phone[-4:]}"}

    async def verify_otp(self, phone: str, code: str) -> LoginResponse:
        """Verify OTP and return session tokens."""
        result = self._admin.table("profiles").select(
            "id, verification_code, verification_expires, subscription_tier, role, "
            "domain_id, document_generation_count, upload_count, created_at"
        ).eq("phone", phone).single().execute()

        if not result.data:
            raise ValueError("Phone number not registered")

        stored_code = result.data.get("verification_code")
        expires_str = result.data.get("verification_expires")

        if not stored_code or stored_code != code:
            raise ValueError("Invalid OTP code")

        if expires_str:
            expires = datetime.fromisoformat(expires_str)
            if datetime.now(timezone.utc) > expires:
                raise ValueError("OTP has expired")

        # Clear OTP + update last login
        self._admin.table("profiles").update(
            {
                "verification_code": None,
                "verification_expires": None,
                "last_login_at": datetime.now(timezone.utc).isoformat(),
            }
        ).eq("phone", phone).execute()

        # Issue tokens via Supabase magic-link / custom token
        # For MVP: use admin auth to generate a session
        auth_response = self._admin.auth.admin.generate_link(
            {
                "type": "magiclink",
                "email": f"{phone.replace('+', '')}@phone.prompt-platform.internal",
            }
        )

        profile = UserProfile(
            id=result.data["id"],
            phone=phone,
            domain_id=result.data.get("domain_id"),
            subscription_tier=result.data.get("subscription_tier", "basic"),
            role=result.data.get("role", "user"),
            document_generation_count=result.data.get("document_generation_count", 0),
            upload_count=result.data.get("upload_count", 0),
            created_at=result.data.get("created_at", datetime.now(timezone.utc)),
        )
        logger.info("phone_otp_verified", phone=phone[-4:])

        return LoginResponse(
            access_token=getattr(auth_response, "properties", {}).get("access_token", ""),
            refresh_token=getattr(auth_response, "properties", {}).get("refresh_token", ""),
            expires_in=3600,
            user=profile,
        )
