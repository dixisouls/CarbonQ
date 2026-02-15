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


class TrendResponse(BaseModel):
    trend: str  # "up" | "down" | "stable"
    estimated_total_next_week: float
    last_smoothed_value: float
    days_used: int
    sufficient_data: bool


class GoogleSearchComparisonResponse(BaseModel):
    actual_emission: float  # Current total LLM emissions (grams)
    forecasted_emission: float  # If 35% were Google searches (grams)
    times_more: float  # Multiplier showing X times more CO2
    total_llm_queries: int  # Number of LLM queries analyzed
    days_used: int  # Number of days of data used
    sufficient_data: bool  # Whether we have at least 7 days
