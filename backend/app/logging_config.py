"""
Loguru-based logging configuration.

Call ``setup_logging()`` once at application startup.
"""

from __future__ import annotations

import sys
from pathlib import Path

from loguru import logger


def setup_logging(*, debug: bool = False) -> None:
    """Remove default handlers and configure loguru sinks."""

    # Remove any pre-existing handlers
    logger.remove()

    level = "DEBUG" if debug else "INFO"

    # ── Console sink ────────────────────────────────────────────────────
    logger.add(
        sys.stderr,
        format=(
            "<green>{time:YYYY-MM-DD HH:mm:ss.SSS}</green> | "
            "<level>{level: <8}</level> | "
            "<cyan>{name}</cyan>:<cyan>{function}</cyan>:<cyan>{line}</cyan> — "
            "<level>{message}</level>"
        ),
        level=level,
        colorize=True,
    )

    # ── File sink (rotated) ─────────────────────────────────────────────
    log_dir = Path(__file__).resolve().parent.parent / "logs"
    log_dir.mkdir(exist_ok=True)

    logger.add(
        str(log_dir / "carbonq_{time:YYYY-MM-DD}.log"),
        rotation="10 MB",
        retention="7 days",
        compression="zip",
        level="INFO",
        format=(
            "{time:YYYY-MM-DD HH:mm:ss.SSS} | {level: <8} | "
            "{name}:{function}:{line} — {message}"
        ),
    )

    logger.info("Logging initialised (level={})", level)
