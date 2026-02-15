"""
FastAPI dependencies — reusable across routers.
"""

from __future__ import annotations

from bson import ObjectId
from fastapi import Cookie, HTTPException, status
from loguru import logger

from app.database import get_users_collection
from app.models.user import User
from app.utils import verify_session


async def get_current_user(session: str | None = Cookie(None)) -> User:
    """
    Verify the session cookie and return the authenticated user.

    Raises 401 on any verification failure.
    """
    if not session:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated. Please log in.",
        )

    # Verify session token
    user_id = verify_session(session)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
        )

    # Get user from database
    try:
        users_collection = get_users_collection()
        user_doc = users_collection.find_one({"_id": ObjectId(user_id)})

        if not user_doc:
            logger.warning("User not found for session: {}", user_id)
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="User not found. Please log in again.",
            )

        return User.from_db(user_doc)

    except Exception as exc:
        logger.error("Error retrieving user: {}", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication error. Please log in again.",
        )
