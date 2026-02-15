"""
Auth schemas — request/response models for authentication endpoints.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator


class AuthRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v


class AuthResponse(BaseModel):
    user: UserResponse


class UserResponse(BaseModel):
    id: str
    email: str
    created_at: datetime
    updated_at: datetime


class MessageResponse(BaseModel):
    message: str
