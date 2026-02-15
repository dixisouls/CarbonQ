"""
Session management utilities using itsdangerous.

Provides secure session token creation and verification with expiration.
"""

from __future__ import annotations

from datetime import datetime, timedelta

from itsdangerous import BadSignature, SignatureExpired, TimestampSigner
from loguru import logger

from app.config import get_settings


def _get_signer() -> TimestampSigner:
    """Get a TimestampSigner instance with the secret key from settings."""
    settings = get_settings()
    return TimestampSigner(settings.session_secret_key)


def create_session(user_id: str) -> str:
    """
    Create a signed session token for a user.

    Args:
        user_id: MongoDB ObjectId as string

    Returns:
        Signed session token as string
    """
    signer = _get_signer()
    # Sign the user_id to create a tamper-proof token
    token = signer.sign(user_id)
    return token.decode("utf-8") if isinstance(token, bytes) else token


def verify_session(token: str) -> str | None:
    """
    Verify a session token and extract the user_id.

    Args:
        token: Signed session token

    Returns:
        user_id if valid, None if invalid or expired
    """
    settings = get_settings()
    max_age = settings.session_expire_hours * 3600  # Convert hours to seconds

    signer = _get_signer()
    try:
        # Verify signature and check expiration
        token_bytes = token.encode("utf-8") if isinstance(token, str) else token
        user_id = signer.unsign(token_bytes, max_age=max_age)
        return user_id.decode("utf-8") if isinstance(user_id, bytes) else user_id
    except SignatureExpired:
        logger.warning("Session token expired")
        return None
    except BadSignature:
        logger.warning("Invalid session token signature")
        return None
    except Exception as exc:
        logger.error("Session verification error: {}", exc)
        return None
