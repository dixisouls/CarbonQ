"""
CarbonQ — FastAPI Application entry point.

Configures CORS, logging, Firebase singletons, and mounts routers.
"""

from __future__ import annotations

import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger

from app.config import get_settings
from app.firebase import get_firebase_app, get_firestore_client
from app.logging_config import setup_logging
from app.routers import auth, dashboard
from app.schemas.common import HealthResponse

# ── Bootstrap logging first ─────────────────────────────────────────────
settings = get_settings()
setup_logging(debug=settings.debug)

# ── Create app ──────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.app_name,
    version="1.0.0",
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=f"{settings.api_prefix}/redoc",
    openapi_url=f"{settings.api_prefix}/openapi.json",
)

# ── CORS ────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request logging middleware ──────────────────────────────────────────


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.perf_counter()
    response = await call_next(request)
    elapsed = (time.perf_counter() - start) * 1000
    logger.info(
        "{method} {path} → {status} ({ms:.0f} ms)",
        method=request.method,
        path=request.url.path,
        status=response.status_code,
        ms=elapsed,
    )
    return response


# ── Startup — eagerly initialise singletons ─────────────────────────────


@app.on_event("startup")
async def on_startup():
    logger.info("Starting {} …", settings.app_name)
    try:
        get_firebase_app()
        get_firestore_client()
        logger.info("Firebase singletons initialised successfully")
    except Exception as exc:
        logger.error("Firebase initialisation failed: {}", exc)
        logger.warning(
            "Make sure the service-account key exists at '{}' "
            "or set GOOGLE_APPLICATION_CREDENTIALS.",
            settings.firebase_service_account_path,
        )


# ── Routers ─────────────────────────────────────────────────────────────
app.include_router(auth.router, prefix=settings.api_prefix)
app.include_router(dashboard.router, prefix=settings.api_prefix)


# ── Health check ────────────────────────────────────────────────────────


@app.get(f"{settings.api_prefix}/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", service=settings.app_name)
