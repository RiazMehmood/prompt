"""Email authentication service with signup and verification."""
import secrets
import hashlib
from datetime import datetime, timedelta
from typing import Optional
from passlib.context import CryptContext
from backend.src.db.supabase_client import supabase
from backend.src.db.redis import redis_client

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class EmailAuthService:
    """Email authentication service with OTP verification."""

    @staticmethod
    def hash_password(password: str) -> str:
        """Hash password using bcrypt."""
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Verify password against hash."""
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    async def generate_verification_code() -> str:
        """Generate 6-digit verification code."""
        return str(secrets.randbelow(900000) + 100000)

    @staticmethod
    async def send_verification_email(email: str, code: str) -> bool:
        """Send verification code via email.

        Note: For MVP, we'll store in Redis. In production, integrate with email service.
        """
        # Store code in Redis with 10-minute expiry
        key = f"email_verification:{email}"
        await redis_client.setex(key, 600, code)  # 10 minutes

        # TODO: Integrate with email service (SendGrid, AWS SES, etc.)
        print(f"[EMAIL] Verification code for {email}: {code}")
        return True

    @staticmethod
    async def signup(
        email: str,
        password: str,
        full_name: str,
        role_id: str
    ) -> dict:
        """Initiate email signup with verification code.

        Args:
            email: User email address
            password: Plain text password
            full_name: User's full name
            role_id: Role ID (default: lawyer)

        Returns:
            dict with success status and message
        """
        # Check if email already exists
        response = supabase.table("users").select("user_id").eq("email", email).execute()
        if response.data:
            return {
                "success": False,
                "error": "EMAIL_EXISTS",
                "message": "Email already registered"
            }

        # Generate verification code
        code = await EmailAuthService.generate_verification_code()

        # Store pending signup data in Redis (10-minute expiry)
        signup_key = f"pending_signup:{email}"
        signup_data = {
            "email": email,
            "password_hash": EmailAuthService.hash_password(password),
            "full_name": full_name,
            "role_id": role_id,
            "auth_method": "email"
        }

        import json
        await redis_client.setex(signup_key, 600, json.dumps(signup_data))

        # Send verification email
        await EmailAuthService.send_verification_email(email, code)

        return {
            "success": True,
            "message": "Verification code sent to email",
            "email": email
        }

    @staticmethod
    async def verify_and_create_account(email: str, code: str) -> dict:
        """Verify code and create user account.

        Args:
            email: User email address
            code: 6-digit verification code

        Returns:
            dict with user data or error
        """
        # Verify code
        verification_key = f"email_verification:{email}"
        stored_code = await redis_client.get(verification_key)

        if not stored_code or stored_code != code:
            return {
                "success": False,
                "error": "INVALID_CODE",
                "message": "Invalid or expired verification code"
            }

        # Get pending signup data
        signup_key = f"pending_signup:{email}"
        signup_data_json = await redis_client.get(signup_key)

        if not signup_data_json:
            return {
                "success": False,
                "error": "SIGNUP_EXPIRED",
                "message": "Signup session expired. Please try again."
            }

        import json
        signup_data = json.loads(signup_data_json)

        # Create user account
        try:
            response = supabase.table("users").insert(signup_data).execute()
            user = response.data[0]

            # Clean up Redis keys
            await redis_client.delete(verification_key)
            await redis_client.delete(signup_key)

            return {
                "success": True,
                "user": user
            }

        except Exception as e:
            return {
                "success": False,
                "error": "ACCOUNT_CREATION_FAILED",
                "message": str(e)
            }

    @staticmethod
    async def login(email: str, password: str) -> dict:
        """Login with email and password.

        Args:
            email: User email address
            password: Plain text password

        Returns:
            dict with user data or error
        """
        # Fetch user
        response = supabase.table("users").select("*").eq("email", email).execute()

        if not response.data:
            return {
                "success": False,
                "error": "INVALID_CREDENTIALS",
                "message": "Invalid email or password"
            }

        user = response.data[0]

        # Verify password
        if not EmailAuthService.verify_password(password, user["password_hash"]):
            return {
                "success": False,
                "error": "INVALID_CREDENTIALS",
                "message": "Invalid email or password"
            }

        # Check account status
        if user["account_status"] != "active":
            return {
                "success": False,
                "error": "ACCOUNT_SUSPENDED",
                "message": f"Account is {user['account_status']}"
            }

        return {
            "success": True,
            "user": user
        }
