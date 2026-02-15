"""
Pydantic schemas for request/response validation.

Re-export all schemas for convenient imports::

    from app.schemas import AuthRequest, AuthResponse, HealthResponse, ...
"""

from __future__ import annotations

from app.schemas.auth import (
    AuthRequest,
    AuthResponse,
    MessageResponse,
    UserResponse,
)
from app.schemas.common import HealthResponse
from app.schemas.dashboard import (
    DayData,
    PlatformStat,
    RecentQuery,
    RecentResponse,
    StatsResponse,
    WeeklyResponse,
)

__all__ = [
    "AuthRequest",
    "AuthResponse",
    "DayData",
    "HealthResponse",
    "MessageResponse",
    "PlatformStat",
    "RecentQuery",
    "RecentResponse",
    "StatsResponse",
    "UserResponse",
    "WeeklyResponse",
]
