"""
Application settings — single cached instance via @lru_cache.

All environment variables are read once and reused throughout the app lifetime.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Centralised configuration loaded from the .env at the project root."""

    # ── Firebase ────────────────────────────────────────────────────────
    firebase_api_key: str
    firebase_auth_domain: str
    firebase_project_id: str
    firebase_storage_bucket: str
    firebase_messaging_sender_id: str
    firebase_app_id: str
    firebase_measurement_id: str

    # Path to the Firebase service-account JSON (for firebase-admin).
    # Download from: Firebase Console → Project Settings → Service Accounts
    firebase_service_account_path: str = "serviceAccountKey.json"

    # ── App ─────────────────────────────────────────────────────────────
    app_name: str = "CarbonQ API"
    debug: bool = False
    api_prefix: str = "/api"
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
    ]

    # ── Firebase Auth REST base URL ─────────────────────────────────────
    firebase_auth_base: str = "https://identitytoolkit.googleapis.com/v1"
    firebase_token_base: str = "https://securetoken.googleapis.com/v1"

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the **single** Settings instance for the entire process."""
    return Settings()
