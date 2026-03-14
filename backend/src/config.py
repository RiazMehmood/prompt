"""
Backend configuration module for Checkpoint 1 - Free MVP
Loads environment variables for Vercel Serverless deployment
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings loaded from environment variables"""

    # Application
    APP_NAME: str = "Domain Adaptive Platform"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Supabase Configuration
    SUPABASE_URL: str
    SUPABASE_KEY: str
    SUPABASE_SERVICE_ROLE_KEY: Optional[str] = None

    # JWT Configuration
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    JWT_REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Gemini AI Configuration (Free Tier)
    GEMINI_API_KEY: str
    GEMINI_MODEL: str = "gemini-1.5-flash"

    # Google OAuth Configuration
    GOOGLE_CLIENT_ID: str
    GOOGLE_CLIENT_SECRET: str
    GOOGLE_REDIRECT_URI: str = "http://localhost:3000/auth/callback/google"

    # Upstash Redis Configuration (Free Tier)
    REDIS_URL: str
    REDIS_TOKEN: Optional[str] = None

    # CORS Configuration
    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
        "https://*.vercel.app",
    ]

    # Rate Limiting (Free Tier Constraints)
    RATE_LIMIT_PER_MINUTE: int = 15  # Gemini free tier: 15 RPM

    class Config:
        env_file = ".env"
        case_sensitive = True


# Global settings instance
settings = Settings()
