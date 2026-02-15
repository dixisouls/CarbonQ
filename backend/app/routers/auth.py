"""
Authentication router — register, login, token refresh, current user.

Uses the Firebase Auth REST API for client-facing operations (sign-up,
sign-in, token refresh) and firebase-admin for server-side token
verification.
"""

from __future__ import annotations

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from loguru import logger

from app.config import get_settings
from app.dependencies import get_current_user
from app.firebase import get_firebase_auth, get_firestore_client
from app.schemas.auth import AuthRequest, AuthResponse, RefreshRequest, UserResponse
from google.cloud.firestore_v1 import SERVER_TIMESTAMP

router = APIRouter(prefix="/auth", tags=["auth"])

# ── Helpers ─────────────────────────────────────────────────────────────


async def _firebase_auth_request(endpoint: str, payload: dict) -> dict:
    """Call a Firebase Auth REST endpoint and return the JSON body."""
    settings = get_settings()
    url = f"{settings.firebase_auth_base}/{endpoint}?key={settings.firebase_api_key}"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(url, json=payload)

    if resp.status_code != 200:
        body = resp.json()
        error_msg = body.get("error", {}).get("message", "Authentication failed")
        logger.warning("Firebase Auth REST error: {} — {}", resp.status_code, error_msg)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=_friendly_error(error_msg),
        )
    return resp.json()


def _friendly_error(code: str) -> str:
    messages = {
        "EMAIL_EXISTS": "An account with this email already exists.",
        "EMAIL_NOT_FOUND": "No account found with this email.",
        "INVALID_PASSWORD": "Incorrect password.",
        "INVALID_EMAIL": "Please enter a valid email address.",
        "WEAK_PASSWORD": "Password should be at least 6 characters.",
        "TOO_MANY_ATTEMPTS_TRY_LATER": "Too many attempts. Please try again later.",
        "INVALID_LOGIN_CREDENTIALS": "Invalid email or password.",
        "USER_DISABLED": "This account has been disabled.",
    }
    return messages.get(code, f"Authentication error: {code}")


# ── Endpoints ───────────────────────────────────────────────────────────


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(body: AuthRequest):
    """Create a new user account and return tokens."""
    logger.info("Register attempt: {}", body.email)

    data = await _firebase_auth_request(
        "accounts:signUp",
        {"email": body.email, "password": body.password, "returnSecureToken": True},
    )

    uid = data["localId"]

    # Create user document in Firestore
    try:
        db = get_firestore_client()
        db.collection("users").document(uid).set(
            {"email": body.email, "createdAt": SERVER_TIMESTAMP},
            merge=True,
        )
        logger.info("User document created for {}", uid)
    except Exception as exc:
        logger.error("Failed to create user document: {}", exc)

    return AuthResponse(
        id_token=data["idToken"],
        refresh_token=data["refreshToken"],
        uid=uid,
        email=data["email"],
        expires_in=data.get("expiresIn", "3600"),
    )


@router.post("/login", response_model=AuthResponse)
async def login(body: AuthRequest):
    """Sign in with email & password and return tokens."""
    logger.info("Login attempt: {}", body.email)

    data = await _firebase_auth_request(
        "accounts:signInWithPassword",
        {"email": body.email, "password": body.password, "returnSecureToken": True},
    )

    return AuthResponse(
        id_token=data["idToken"],
        refresh_token=data["refreshToken"],
        uid=data["localId"],
        email=data["email"],
        expires_in=data.get("expiresIn", "3600"),
    )


@router.post("/refresh", response_model=AuthResponse)
async def refresh_token(body: RefreshRequest):
    """Exchange a refresh token for a new ID token."""
    settings = get_settings()
    url = f"{settings.firebase_token_base}/token?key={settings.firebase_api_key}"

    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.post(
            url,
            data={
                "grant_type": "refresh_token",
                "refresh_token": body.refresh_token,
            },
        )

    if resp.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Failed to refresh token. Please sign in again.",
        )

    data = resp.json()
    return AuthResponse(
        id_token=data["id_token"],
        refresh_token=data["refresh_token"],
        uid=data["user_id"],
        email=data.get("email", ""),
        expires_in=data.get("expires_in", "3600"),
    )


@router.get("/me", response_model=UserResponse)
async def me(user: dict = Depends(get_current_user)):
    """Return the currently authenticated user's info."""
    return UserResponse(uid=user["uid"], email=user.get("email"))
