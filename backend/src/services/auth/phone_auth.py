"""Phone OTP authentication service."""
import secrets
import re
from typing import Optional
from backend.src.db.supabase_client import supabase
from backend.src.db.redis import redis_client


class PhoneAuthService:
    """Phone OTP authentication service for Pakistani numbers."""

    @staticmethod
    def validate_pakistani_phone(phone: str) -> bool:
        """Validate Pakistani phone number format (+92-3XX-XXXXXXX).

        Args:
            phone: Phone number string

        Returns:
            True if valid Pakistani mobile number
        """
        # Pakistani mobile format: +92-3XX-XXXXXXX
        pattern = r'^\+92-3\d{2}-\d{7}$'
        return bool(re.match(pattern, phone))

    @staticmethod
    async def generate_otp() -> str:
        """Generate 6-digit OTP."""
        return str(secrets.randbelow(900000) + 100000)

    @staticmethod
    async def send_sms_otp(phone: str, otp: str) -> bool:
        """Send OTP via SMS.

        Note: For MVP, we'll store in Redis. In production, integrate with Twilio.
        """
        # Store OTP in Redis with 5-minute expiry
        key = f"phone_otp:{phone}"
        await redis_client.setex(key, 300, otp)  # 5 minutes

        # TODO: Integrate with Twilio or other SMS service
        print(f"[SMS] OTP for {phone}: {otp}")
        return True

    @staticmethod
    async def signup(
        phone: str,
        full_name: str,
        role_id: str
    ) -> dict:
        """Initiate phone signup with OTP.

        Args:
            phone: Pakistani phone number (+92-3XX-XXXXXXX)
            full_name: User's full name
            role_id: Role ID (default: lawyer)

        Returns:
            dict with success status and message
        """
        # Validate phone format
        if not PhoneAuthService.validate_pakistani_phone(phone):
            return {
                "success": False,
                "error": "INVALID_PHONE_FORMAT",
                "message": "Invalid phone format. Use +92-3XX-XXXXXXX"
            }

        # Check if phone already exists
        response = supabase.table("users").select("user_id").eq("phone_number", phone).execute()
        if response.data:
            return {
                "success": False,
                "error": "PHONE_EXISTS",
                "message": "Phone number already registered"
            }

        # Generate OTP
        otp = await PhoneAuthService.generate_otp()

        # Store pending signup data in Redis (5-minute expiry)
        signup_key = f"pending_phone_signup:{phone}"
        signup_data = {
            "phone_number": phone,
            "full_name": full_name,
            "role_id": role_id,
            "auth_method": "phone"
        }

        import json
        await redis_client.setex(signup_key, 300, json.dumps(signup_data))

        # Send SMS OTP
        await PhoneAuthService.send_sms_otp(phone, otp)

        return {
            "success": True,
            "message": "OTP sent to phone number",
            "phone": phone
        }

    @staticmethod
    async def verify_and_create_account(phone: str, otp: str) -> dict:
        """Verify OTP and create user account.

        Args:
            phone: Phone number
            otp: 6-digit OTP

        Returns:
            dict with user data or error
        """
        # Verify OTP
        otp_key = f"phone_otp:{phone}"
        stored_otp = await redis_client.get(otp_key)

        if not stored_otp or stored_otp != otp:
            return {
                "success": False,
                "error": "INVALID_OTP",
                "message": "Invalid or expired OTP"
            }

        # Get pending signup data
        signup_key = f"pending_phone_signup:{phone}"
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
            await redis_client.delete(otp_key)
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
    async def login(phone: str) -> dict:
        """Initiate phone login with OTP.

        Args:
            phone: Phone number

        Returns:
            dict with success status
        """
        # Validate phone format
        if not PhoneAuthService.validate_pakistani_phone(phone):
            return {
                "success": False,
                "error": "INVALID_PHONE_FORMAT",
                "message": "Invalid phone format. Use +92-3XX-XXXXXXX"
            }

        # Check if user exists
        response = supabase.table("users").select("user_id").eq("phone_number", phone).execute()
        if not response.data:
            return {
                "success": False,
                "error": "USER_NOT_FOUND",
                "message": "Phone number not registered"
            }

        # Generate and send OTP
        otp = await PhoneAuthService.generate_otp()
        await PhoneAuthService.send_sms_otp(phone, otp)

        return {
            "success": True,
            "message": "OTP sent to phone number",
            "phone": phone
        }

    @staticmethod
    async def verify_login(phone: str, otp: str) -> dict:
        """Verify OTP and login user.

        Args:
            phone: Phone number
            otp: 6-digit OTP

        Returns:
            dict with user data or error
        """
        # Verify OTP
        otp_key = f"phone_otp:{phone}"
        stored_otp = await redis_client.get(otp_key)

        if not stored_otp or stored_otp != otp:
            return {
                "success": False,
                "error": "INVALID_OTP",
                "message": "Invalid or expired OTP"
            }

        # Fetch user
        response = supabase.table("users").select("*").eq("phone_number", phone).execute()

        if not response.data:
            return {
                "success": False,
                "error": "USER_NOT_FOUND",
                "message": "User not found"
            }

        user = response.data[0]

        # Check account status
        if user["account_status"] != "active":
            return {
                "success": False,
                "error": "ACCOUNT_SUSPENDED",
                "message": f"Account is {user['account_status']}"
            }

        # Clean up OTP
        await redis_client.delete(otp_key)

        return {
            "success": True,
            "user": user
        }
