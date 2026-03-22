"""Centralised application configuration loaded from environment variables."""
from functools import lru_cache
from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # Application
    APP_ENV: str = "development"
    APP_HOST: str = "0.0.0.0"
    APP_PORT: int = 8000
    APP_VERSION: str = "0.1.0"
    LOG_LEVEL: str = "INFO"
    ALLOWED_ORIGINS: List[str] = ["http://localhost:3000", "http://localhost:19006"]

    # Database — Supabase
    SUPABASE_URL: str = Field(..., description="Supabase project URL")
    SUPABASE_ANON_KEY: str = Field(..., description="Supabase anon/public key")
    SUPABASE_SERVICE_ROLE_KEY: str = Field(..., description="Supabase service role key")
    DATABASE_URL: str = Field(..., description="PostgreSQL connection string")

    # AI / LLM — Gemini
    GEMINI_API_KEYS: str = Field(..., description="Comma-separated Gemini API keys")
    GEMINI_MODEL: str = "gemini-1.5-flash"

    @field_validator("GEMINI_API_KEYS")
    @classmethod
    def parse_gemini_keys(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("At least one Gemini API key is required")
        return v

    @property
    def gemini_keys_list(self) -> List[str]:
        return [k.strip() for k in self.GEMINI_API_KEYS.split(",") if k.strip()]

    # Auth
    JWT_SECRET: str = Field(..., min_length=32)
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 60

    # Twilio (SMS OTP)
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_PHONE_NUMBER: str = ""

    # Vector Store — ChromaDB
    CHROMADB_PATH: str = "./data/chromadb"
    CHROMADB_EMBEDDING_MODEL: str = "intfloat/multilingual-e5-base"

    # OCR
    TESSERACT_CMD: str = "/usr/bin/tesseract"
    TESSERACT_LANG_PATH: str = "/usr/share/tesseract-ocr/4.00/tessdata"
    OCR_CONFIDENCE_THRESHOLD: float = 0.70
    OCR_FALLBACK_ENABLED: bool = True

    # Voice / Speech (Phase 2)
    OPENAI_API_KEY: str = ""
    VOICE_AUDIO_TEMP_DIR: str = "./data/voice_temp"
    VOICE_AUDIO_MAX_SIZE_MB: int = 25
    VOICE_AUDIO_DELETE_SECONDS: int = 30

    # Text-to-Speech (Phase 3)
    GOOGLE_CLOUD_TTS_KEY: str = ""
    GOOGLE_CLOUD_TTS_VOICE_URDU: str = "ur-IN-Wavenet-A"
    GOOGLE_CLOUD_TTS_VOICE_ENGLISH: str = "en-US-Standard-C"

    # RAG settings
    RAG_MIN_CONFIDENCE: float = 0.75
    SEMANTIC_CACHE_THRESHOLD: float = 0.92
    MAX_UPLOAD_SIZE_MB: int = 10

    # Feature flags
    SHOW_PAID_TIERS: bool = False

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v: str | List[str]) -> List[str]:
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
