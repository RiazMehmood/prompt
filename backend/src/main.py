"""FastAPI application entry point."""
from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from src.api.middleware import register_exception_handlers
from src.config import settings
from src.db.chromadb_client import get_chromadb_client
from src.db.supabase_client import get_supabase_client
from src.utils.logging import configure_logging

logger = structlog.get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Application lifespan: startup and shutdown."""
    configure_logging()
    logger.info("starting_up", env=settings.APP_ENV, version=settings.APP_VERSION)

    # Verify DB connectivity on startup
    try:
        client = get_supabase_client()
        logger.info("supabase_connected", url=settings.SUPABASE_URL[:30] + "...")
    except Exception as exc:
        logger.error("supabase_connection_failed", error=str(exc))

    try:
        chroma = get_chromadb_client()
        logger.info("chromadb_connected", path=settings.CHROMADB_PATH)
    except Exception as exc:
        logger.error("chromadb_connection_failed", error=str(exc))

    yield

    logger.info("shutting_down")


def create_app() -> FastAPI:
    """Create and configure the FastAPI application."""
    app = FastAPI(
        title="Prompt Platform API",
        description=(
            "Multi-Tenant AI-Powered RAG-Based Document Intelligence Platform. "
            "Supports English, Urdu, and Sindhi."
        ),
        version=settings.APP_VERSION,
        lifespan=lifespan,
        docs_url="/docs" if settings.APP_ENV != "production" else None,
        redoc_url="/redoc" if settings.APP_ENV != "production" else None,
    )

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Global error handlers
    register_exception_handlers(app)

    # Routers
    from src.api.v1.auth import router as auth_router
    from src.api.v1.documents import router as documents_router
    from src.api.v1.domains import router as domains_router
    from src.api.v1.rag import router as rag_router
    from src.api.v1.conversation import router as conversation_router
    from src.api.v1.subscriptions import router as subscriptions_router
    from src.api.v1.tokens import router as tokens_router
    from src.api.v1.analytics import router as analytics_router
    from src.api.v1.voice import router as voice_router
    from src.api.v1.admin import router as admin_router
    from src.api.v1.templates import router as templates_router
    from src.api.v1.institutes import router as institutes_router
    from src.api.v1.staff import router as staff_router
    from src.api.v1.fir import router as fir_router
    from src.api.v1.cases import router as cases_router

    app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
    app.include_router(domains_router, prefix="/domains", tags=["Domains"])
    app.include_router(documents_router, prefix="/documents", tags=["Documents"])
    app.include_router(rag_router, prefix="/api", tags=["Document Generation"])
    app.include_router(conversation_router, prefix="/api", tags=["Conversation"])
    app.include_router(subscriptions_router, prefix="/subscriptions", tags=["Subscriptions"])
    app.include_router(tokens_router, prefix="", tags=["Tokens"])
    app.include_router(analytics_router, prefix="/analytics", tags=["Analytics"])
    app.include_router(voice_router, prefix="/voice", tags=["Voice"])
    app.include_router(admin_router, prefix="", tags=["Admin"])
    app.include_router(templates_router, prefix="/templates", tags=["Templates"])
    app.include_router(institutes_router, prefix="/institutes", tags=["Institutes"])
    app.include_router(staff_router, prefix="/admin/staff", tags=["Staff"])
    app.include_router(fir_router, prefix="/api/fir", tags=["FIR Extraction"])
    app.include_router(cases_router, prefix="/api/cases", tags=["Cases"])

    @app.get("/health", tags=["System"])
    async def health() -> JSONResponse:
        return JSONResponse({"status": "ok", "version": settings.APP_VERSION})

    return app


app = create_app()
