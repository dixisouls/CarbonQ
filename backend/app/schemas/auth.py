"""
Auth schemas — request/response models for authentication endpoints.
"""

from __future__ import annotations

from pydantic import BaseModel, EmailStr


class AuthRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class AuthResponse(BaseModel):
    id_token: str
    refresh_token: str
    uid: str
    email: str
    expires_in: str


class UserResponse(BaseModel):
    uid: str
    email: str | None = None
