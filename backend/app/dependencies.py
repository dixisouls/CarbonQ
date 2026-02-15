"""
FastAPI dependencies — reusable across routers.
"""

from __future__ import annotations

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from loguru import logger

from app.firebase import get_firebase_auth

_bearer_scheme = HTTPBearer()


async def get_current_user(
    creds: HTTPAuthorizationCredentials = Depends(_bearer_scheme),
) -> dict:
    """
    Verify the Firebase ID-token from the ``Authorization: Bearer <token>``
    header and return the decoded claims dict.

    Raises 401 on any verification failure.
    """
    token = creds.credentials
    try:
        auth = get_firebase_auth()
        decoded = auth.verify_id_token(token)
        return decoded
    except Exception as exc:
        logger.warning("Token verification failed: {}", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token.",
        )
