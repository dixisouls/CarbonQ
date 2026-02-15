"""
Dashboard router — aggregated stats, platform breakdown, recent queries,
and 7-day time-series data.

All endpoints require a valid session cookie.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any

from bson import ObjectId
from fastapi import APIRouter, Depends, Query, status
from loguru import logger

from app.constants.platforms import PLATFORM_COLORS, PLATFORM_ICONS, PLATFORM_NAMES
from app.database import get_queries_collection
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.dashboard import (
    DayData,
    PlatformStat,
    RecentQuery,
    RecentResponse,
    StatsResponse,
    TrendResponse,
    WeeklyResponse,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# ── Internal helpers ────────────────────────────────────────────────────


def _fetch_all_queries(user_id: str) -> list[dict]:
    """Synchronously fetch all queries for a user from MongoDB."""
    collection = get_queries_collection()
    queries = collection.find(
        {"user_id": ObjectId(user_id)}
    ).sort("timestamp", -1)
    return [{"id": str(q["_id"]), **q} for q in queries]


def _fetch_queries_since(user_id: str, since: datetime) -> list[dict]:
    """Synchronously fetch queries newer than *since* for a user."""
    collection = get_queries_collection()
    queries = collection.find(
        {"user_id": ObjectId(user_id), "timestamp": {"$gte": since}}
    ).sort("timestamp", -1)
    return [{"id": str(q["_id"]), **q} for q in queries]


def _aggregate(queries: list[dict]) -> dict[str, Any]:
    """Compute totals and per-platform breakdown from a list of queries."""
    platform_counts: dict[str, int] = {}
    platform_carbon: dict[str, float] = {}
    total_queries = 0
    total_carbon = 0.0

    for q in queries:
        p = q.get("platform", "unknown")
        cg = q.get("carbon_grams", 0.0)  # Updated field name
        total_queries += 1
        total_carbon += cg
        platform_counts[p] = platform_counts.get(p, 0) + 1
        platform_carbon[p] = platform_carbon.get(p, 0.0) + cg

    platforms = sorted(
        [
            PlatformStat(
                key=p,
                name=PLATFORM_NAMES.get(p, p),
                color=PLATFORM_COLORS.get(p, "#6b7280"),
                icon=PLATFORM_ICONS.get(p, "💬"),
                count=platform_counts[p],
                carbon=round(platform_carbon[p], 2),
                percentage=round(platform_counts[p] / total_queries * 100, 1)
                if total_queries
                else 0,
            )
            for p in platform_counts
        ],
        key=lambda x: x.count,
        reverse=True,
    )

    avg_carbon = round(total_carbon / total_queries, 2) if total_queries else 0.0

    return {
        "total_queries": total_queries,
        "total_carbon": round(total_carbon, 2),
        "avg_carbon": avg_carbon,
        "platform_count": len(platforms),
        "platforms": platforms,
    }


def _apply_exponential_smoothing(values: list[float], alpha: float = 0.35) -> list[float]:
    """Apply simple exponential smoothing: S_0 = Y_0, S_t = alpha*Y_t + (1-alpha)*S_{t-1}."""
    if not values:
        return []
    smoothed: list[float] = [values[0]]
    for t in range(1, len(values)):
        s = alpha * values[t] + (1 - alpha) * smoothed[t - 1]
        smoothed.append(s)
    return smoothed


def _detect_trend(smoothed: list[float], threshold_g: float = 1.0) -> str:
    """
    Compare first and last smoothed values. Use threshold to avoid noise.
    Returns 'up' | 'down' | 'stable'.
    """
    if len(smoothed) < 2:
        return "stable"
    first, last = smoothed[0], smoothed[-1]
    diff = last - first
    if diff > threshold_g:
        return "up"
    if diff < -threshold_g:
        return "down"
    return "stable"


# ── Endpoints ───────────────────────────────────────────────────────────


@router.get("/stats", response_model=StatsResponse)
async def get_stats(user: User = Depends(get_current_user)):
    """Return overall aggregated statistics."""
    logger.info("Fetching stats for user {}", user.id)

    queries = await asyncio.to_thread(_fetch_all_queries, user.id)
    return _aggregate(queries)


@router.get("/platforms", response_model=list[PlatformStat])
async def get_platforms(user: User = Depends(get_current_user)):
    """Return per-platform breakdown sorted by query count."""
    queries = await asyncio.to_thread(_fetch_all_queries, user.id)
    agg = _aggregate(queries)
    return agg["platforms"]


@router.get("/recent", response_model=RecentResponse)
async def get_recent(
    user: User = Depends(get_current_user),
    limit: int = Query(default=15, ge=1, le=100),
):
    """Return the most recent queries (default 15)."""
    logger.info("Fetching {} recent queries for user {}", limit, user.id)

    all_queries = await asyncio.to_thread(_fetch_all_queries, user.id)
    recent = all_queries[:limit]

    items = []
    for q in recent:
        ts = q.get("timestamp")
        ts_str = None
        if ts and hasattr(ts, "isoformat"):
            ts_str = ts.isoformat()

        items.append(
            RecentQuery(
                id=q["id"],
                platform=q.get("platform", "unknown"),
                platform_name=PLATFORM_NAMES.get(q.get("platform", ""), q.get("platform", "unknown")),
                carbon_grams=round(q.get("carbon_grams", 0.0), 2),  # Updated field name
                timestamp=ts_str,
            )
        )

    return RecentResponse(queries=items, count=len(items))


@router.get("/weekly", response_model=WeeklyResponse)
async def get_weekly(user: User = Depends(get_current_user)):
    """
    Return per-day aggregated data for the last 7 days.

    Each day includes the count of queries and total carbon emitted.
    Days with no activity are included with zero values.
    """
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=6)
    # Start of that day
    start = seven_days_ago.replace(hour=0, minute=0, second=0, microsecond=0)

    logger.info("Fetching weekly data for user {} (since {})", user.id, start.isoformat())

    queries = await asyncio.to_thread(_fetch_queries_since, user.id, start)

    # Group by date
    daily: dict[str, dict] = {}
    for q in queries:
        ts = q.get("timestamp")
        if ts is None:
            continue
        if hasattr(ts, "date"):
            day_key = ts.strftime("%Y-%m-%d")
        else:
            continue

        if day_key not in daily:
            daily[day_key] = {"queries": 0, "carbon": 0.0}
        daily[day_key]["queries"] += 1
        daily[day_key]["carbon"] += q.get("carbon_grams", 0.0)  # Updated field name

    # Build complete 7-day array (oldest → newest)
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
    days: list[DayData] = []
    total_q = 0
    total_c = 0.0

    for i in range(7):
        d = start + timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        entry = daily.get(key, {"queries": 0, "carbon": 0.0})
        total_q += entry["queries"]
        total_c += entry["carbon"]
        days.append(
            DayData(
                date=key,
                label=day_names[d.weekday()],
                queries=entry["queries"],
                carbon=round(entry["carbon"], 2),
            )
        )

    return WeeklyResponse(days=days, total_queries=total_q, total_carbon=round(total_c, 2))


@router.get("/trend", response_model=TrendResponse)
async def get_trend(user: User = Depends(get_current_user)):
    """
    Predict upcoming trend and estimated total emission for next week.

    Uses 7–14 days of emission data with exponential smoothing (alpha=0.35).
    Returns trend direction, estimated total for next 7 days, and metadata.
    """
    now = datetime.now(timezone.utc)
    fourteen_days_ago = now - timedelta(days=13)
    start = fourteen_days_ago.replace(hour=0, minute=0, second=0, microsecond=0)

    logger.info("Fetching trend data for user {} (since {})", user.id, start.isoformat())

    queries = await asyncio.to_thread(_fetch_queries_since, user.id, start)

    # Group by date
    daily: dict[str, float] = {}
    for q in queries:
        ts = q.get("timestamp")
        if ts is None or not hasattr(ts, "date"):
            continue
        day_key = ts.strftime("%Y-%m-%d")
        daily[day_key] = daily.get(day_key, 0.0) + q.get("carbon_grams", 0.0)  # Updated field name

    # Build 14-day carbon series (oldest → newest)
    carbon_series: list[float] = []
    days_with_data = 0
    for i in range(14):
        d = start + timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        carbon = daily.get(key, 0.0)
        carbon_series.append(carbon)
        if carbon > 0:
            days_with_data += 1

    sufficient_data = days_with_data >= 7

    if not sufficient_data:
        return TrendResponse(
            trend="stable",
            estimated_total_next_week=0.0,
            last_smoothed_value=0.0,
            days_used=len(carbon_series),
            sufficient_data=False,
        )

    smoothed = _apply_exponential_smoothing(carbon_series, alpha=0.35)
    last_smoothed = smoothed[-1] if smoothed else 0.0
    estimated_total = 7.0 * last_smoothed
    trend = _detect_trend(smoothed)

    return TrendResponse(
        trend=trend,
        estimated_total_next_week=round(estimated_total, 2),
        last_smoothed_value=round(last_smoothed, 2),
        days_used=14,
        sufficient_data=True,
    )


@router.post("/query", status_code=status.HTTP_201_CREATED)
async def submit_query(
    platform: str,
    carbon_grams: float,
    user: User = Depends(get_current_user),
):
    """Submit a new query from the browser extension."""
    logger.info("Submitting query for user {}: {} ({}g CO2)", user.id, platform, carbon_grams)

    collection = get_queries_collection()
    query_doc = {
        "user_id": ObjectId(user.id),
        "platform": platform,
        "carbon_grams": carbon_grams,
        "timestamp": datetime.utcnow(),
    }

    result = collection.insert_one(query_doc)
    logger.info("Query submitted: {}", result.inserted_id)

    return {"id": str(result.inserted_id), "message": "Query submitted successfully"}
