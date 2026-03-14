"""Trial subscription activation service."""
from datetime import datetime, timedelta
from backend.src.db.supabase_client import supabase


class TrialService:
    """Trial subscription management service."""

    @staticmethod
    async def activate_trial(user_id: str) -> dict:
        """Create trial subscription record for new user.

        Note: For Checkpoint 1, this is just a database record for UI display.
        No real payment processing.

        Args:
            user_id: User ID

        Returns:
            dict with subscription data or error
        """
        # Check if user already has a subscription
        response = supabase.table("subscriptions").select("*").eq("user_id", user_id).execute()

        if response.data:
            return {
                "success": False,
                "error": "SUBSCRIPTION_EXISTS",
                "message": "User already has a subscription"
            }

        # Create trial subscription
        trial_end = datetime.utcnow() + timedelta(days=14)

        subscription = {
            "user_id": user_id,
            "status": "trial",
            "trial_end": trial_end.isoformat(),
            "document_limit": 10,
            "documents_used": 0,
            "features": {
                "rag_queries": True,
                "document_generation": True,
                "chat_history": True,
                "basic_support": True
            }
        }

        try:
            response = supabase.table("subscriptions").insert(subscription).execute()
            return {
                "success": True,
                "subscription": response.data[0]
            }

        except Exception as e:
            return {
                "success": False,
                "error": "TRIAL_ACTIVATION_FAILED",
                "message": str(e)
            }

    @staticmethod
    async def get_subscription(user_id: str) -> dict:
        """Get user's subscription status.

        Args:
            user_id: User ID

        Returns:
            dict with subscription data or None
        """
        response = supabase.table("subscriptions").select("*").eq("user_id", user_id).execute()

        if not response.data:
            return {
                "success": False,
                "error": "NO_SUBSCRIPTION",
                "message": "No subscription found"
            }

        return {
            "success": True,
            "subscription": response.data[0]
        }
