"""
Authentication router — register, login, logout, current user.

Uses MongoDB for user storage and session-based authentication with
secure httpOnly cookies.
"""

from __future__ import annotations

from datetime import datetime

from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException, Response, status
from loguru import logger

from app.config import get_settings
from app.database import get_users_collection
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import AuthRequest, AuthResponse, MessageResponse, UserResponse
from app.utils import create_session, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


# ── Endpoints ───────────────────────────────────────────────────────────


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: AuthRequest, response: Response):
    """Create a new user account and return session cookie."""
    logger.info("Register attempt: {}", body.email)

    users_collection = get_users_collection()

    # Check if user already exists
    existing_user = users_collection.find_one({"email": body.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    # Hash password
    password_hash = hash_password(body.password)

    # Create user document
    now = datetime.utcnow()
    user_doc = {
        "email": body.email,
        "password_hash": password_hash,
        "created_at": now,
        "updated_at": now,
    }

    result = users_collection.insert_one(user_doc)
    user_id = str(result.inserted_id)

    logger.info("User created: {} ({})", body.email, user_id)

    # Create session token
    session_token = create_session(user_id)

    # Set secure cookie
    settings = get_settings()
    response.set_cookie(
        key="session",
        value=session_token,
        httponly=True,
        secure= not settings.debug,
        samesite="none",
        max_age=settings.session_expire_hours * 3600,
    )

    # Return user info
    user_doc["_id"] = result.inserted_id
    user = User.from_db(user_doc)

    return AuthResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: AuthRequest, response: Response):
    """Sign in with email & password and return session cookie."""
    logger.info("Login attempt: {}", body.email)

    users_collection = get_users_collection()

    # Find user by email
    user_doc = users_collection.find_one({"email": body.email})
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    # Verify password
    if not verify_password(body.password, user_doc["password_hash"]):
        logger.warning("Failed login attempt for {}", body.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    user_id = str(user_doc["_id"])
    logger.info("User logged in: {} ({})", body.email, user_id)

    # Create session token
    session_token = create_session(user_id)

    # Set secure cookie
    settings = get_settings()
    response.set_cookie(
        key="session",
        value=session_token,
        httponly=True,
        secure=not settings.debug,
        samesite="none",
        max_age=settings.session_expire_hours * 3600,
    )

    # Return user info
    user = User.from_db(user_doc)

    return AuthResponse(
        user=UserResponse(
            id=user.id,
            email=user.email,
            created_at=user.created_at,
            updated_at=user.updated_at,
        )
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(response: Response):
    """Clear session cookie and log out."""
    logger.info("User logout")

    # Clear session cookie
    response.delete_cookie(key="session")

    return MessageResponse(message="Logged out successfully")


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(get_current_user)):
    """Return the currently authenticated user's info."""
    return UserResponse(
        id=user.id,
        email=user.email,
        created_at=user.created_at,
        updated_at=user.updated_at,
    )
