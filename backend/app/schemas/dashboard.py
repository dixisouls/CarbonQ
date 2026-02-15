"""
Dashboard schemas — request/response models for dashboard endpoints.
"""

from __future__ import annotations

from pydantic import BaseModel


class PlatformStat(BaseModel):
    key: str
    name: str
    color: str
    icon: str
    count: int
    carbon: float
    percentage: float


class StatsResponse(BaseModel):
    total_queries: int
    total_carbon: float
    avg_carbon: float
    platform_count: int
    platforms: list[PlatformStat]


class RecentQuery(BaseModel):
    id: str
    platform: str
    platform_name: str
    carbon_grams: float
    timestamp: str | None = None


class RecentResponse(BaseModel):
    queries: list[RecentQuery]
    count: int


class DayData(BaseModel):
    date: str
    label: str
    queries: int
    carbon: float


class WeeklyResponse(BaseModel):
    days: list[DayData]
    total_queries: int
    total_carbon: float
