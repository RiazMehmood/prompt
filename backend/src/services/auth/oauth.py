"""Google OAuth authentication service."""
from typing import Optional
from google.oauth2 import id_token
from google.auth.transport import requests
from backend.src.config import settings
from backend.src.db.supabase_client import supabase


class OAuthService:
    """Google OAuth authentication service."""

    @staticmethod
    async def verify_google_token(token: str) -> dict:
        """Verify Google ID token and extract user info.

        Args:
            token: Google ID token from client

        Returns:
            dict with user info or error
        """
        try:
            # Verify token with Google
            idinfo = id_token.verify_oauth2_token(
                token,
                requests.Request(),
                settings.GOOGLE_CLIENT_ID
            )

            # Token is valid, extract user info
            return {
                "success": True,
                "google_id": idinfo["sub"],
                "email": idinfo.get("email"),
                "full_name": idinfo.get("name"),
                "email_verified": idinfo.get("email_verified", False)
            }

        except ValueError as e:
            return {
                "success": False,
                "error": "INVALID_TOKEN",
                "message": f"Invalid Google token: {str(e)}"
            }

    @staticmethod
    async def signup_or_login(
        token: str,
        role_id: str
    ) -> dict:
        """Sign up or login with Google OAuth.

        Args:
            token: Google ID token
            role_id: Role ID (default: lawyer)

        Returns:
            dict with user data or error
        """
        # Verify Google token
        token_result = await OAuthService.verify_google_token(token)

        if not token_result["success"]:
            return token_result

        google_id = token_result["google_id"]
        email = token_result["email"]
        full_name = token_result["full_name"]

        # Check if user exists by google_id
        response = supabase.table("users").select("*").eq("google_id", google_id).execute()

        if response.data:
            # User exists, return user data (login)
            user = response.data[0]

            # Check account status
            if user["account_status"] != "active":
                return {
                    "success": False,
                    "error": "ACCOUNT_SUSPENDED",
                    "message": f"Account is {user['account_status']}"
                }

            return {
                "success": True,
                "user": user,
                "is_new_user": False
            }

        # Check if email already exists with different auth method
        if email:
            response = supabase.table("users").select("*").eq("email", email).execute()
            if response.data:
                return {
                    "success": False,
                    "error": "EMAIL_EXISTS",
                    "message": "Email already registered with different method"
                }

        # Create new user (signup)
        new_user = {
            "google_id": google_id,
            "email": email,
            "full_name": full_name,
            "auth_method": "google",
            "role_id": role_id,
            "account_status": "active"
        }

        try:
            response = supabase.table("users").insert(new_user).execute()
            user = response.data[0]

            return {
                "success": True,
                "user": user,
                "is_new_user": True
            }

        except Exception as e:
            return {
                "success": False,
                "error": "ACCOUNT_CREATION_FAILED",
                "message": str(e)
            }
