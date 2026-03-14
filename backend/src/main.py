"""FastAPI application entry point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.src.config import settings

app = FastAPI(
    title="Domain-Adaptive Platform API",
    description="Multi-domain AI-powered platform for professionals",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring."""
    return {
        "status": "healthy",
        "service": "domain-adaptive-platform",
        "version": "1.0.0"
    }


@app.get("/")
async def root():
    """Root endpoint."""
    return {
        "message": "Domain-Adaptive Platform API",
        "docs": "/docs",
        "health": "/health"
    }


# Mount API v1 routers
from backend.src.api.v1.auth import router as auth_router
from backend.src.api.v1.rag import router as rag_router
from backend.src.api.v1.documents import router as documents_router

app.include_router(auth_router, prefix="/api/v1")
app.include_router(rag_router, prefix="/api/v1")
app.include_router(documents_router, prefix="/api/v1")
