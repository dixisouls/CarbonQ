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

    # ── MongoDB ─────────────────────────────────────────────────────────
    mongodb_uri: str
    mongodb_database_name: str = "carbonq"

    # ── Sessions ────────────────────────────────────────────────────────
    session_secret_key: str
    session_expire_hours: int = 24

    # ── App ─────────────────────────────────────────────────────────────
    app_name: str = "CarbonQ API"
    debug: bool = False
    api_prefix: str = "/api"
    cors_origins: list[str] = ["*"]  # Allow all origins (Chrome extension + web apps)

    model_config = SettingsConfigDict(
        env_file=str(Path(__file__).resolve().parent.parent.parent / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """Return the **single** Settings instance for the entire process."""
    return Settings()
