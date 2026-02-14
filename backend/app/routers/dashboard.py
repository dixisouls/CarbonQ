"""
Dashboard router — aggregated stats, platform breakdown, recent queries,
and 7-day time-series data.

All endpoints require a valid Firebase ID-token.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from google.cloud.firestore_v1.base_query import FieldFilter
from loguru import logger
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.firebase import get_firestore_client

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

# ── Constants ───────────────────────────────────────────────────────────

PLATFORM_NAMES: dict[str, str] = {
    "gemini": "Gemini",
    "claude": "Claude",
    "perplexity": "Perplexity",
    "chatgpt": "ChatGPT",
}

CARBON_PER_QUERY: dict[str, float] = {
    "gemini": 1.6,
    "claude": 3.5,
    "perplexity": 4.0,
    "chatgpt": 4.4,
}

PLATFORM_COLORS: dict[str, str] = {
    "chatgpt": "#10b981",
    "claude": "#f59e0b",
    "gemini": "#3b82f6",
    "perplexity": "#8b5cf6",
}

PLATFORM_ICONS: dict[str, str] = {
    "chatgpt": "🤖",
    "claude": "🧠",
    "gemini": "✨",
    "perplexity": "🔍",
}

# ── Response schemas ────────────────────────────────────────────────────


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


# ── Internal helpers ────────────────────────────────────────────────────


def _fetch_all_queries(uid: str) -> list[dict]:
    """Synchronously fetch all queries for a user from Firestore."""
    db = get_firestore_client()
    ref = db.collection("users").document(uid).collection("queries")
    docs = ref.order_by("timestamp", direction="DESCENDING").stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


def _fetch_queries_since(uid: str, since: datetime) -> list[dict]:
    """Synchronously fetch queries newer than *since* for a user."""
    db = get_firestore_client()
    ref = db.collection("users").document(uid).collection("queries")
    q = (
        ref.where(filter=FieldFilter("timestamp", ">=", since))
        .order_by("timestamp", direction="DESCENDING")
    )
    docs = q.stream()
    return [{"id": d.id, **d.to_dict()} for d in docs]


def _aggregate(queries: list[dict]) -> dict[str, Any]:
    """Compute totals and per-platform breakdown from a list of queries."""
    platform_counts: dict[str, int] = {}
    platform_carbon: dict[str, float] = {}
    total_queries = 0
    total_carbon = 0.0

    for q in queries:
        p = q.get("platform", "unknown")
        cg = q.get("carbonGrams", 0.0)
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


# ── Endpoints ───────────────────────────────────────────────────────────


@router.get("/stats", response_model=StatsResponse)
async def get_stats(user: dict = Depends(get_current_user)):
    """Return overall aggregated statistics."""
    uid = user["uid"]
    logger.info("Fetching stats for user {}", uid)

    queries = await asyncio.to_thread(_fetch_all_queries, uid)
    return _aggregate(queries)


@router.get("/platforms", response_model=list[PlatformStat])
async def get_platforms(user: dict = Depends(get_current_user)):
    """Return per-platform breakdown sorted by query count."""
    uid = user["uid"]
    queries = await asyncio.to_thread(_fetch_all_queries, uid)
    agg = _aggregate(queries)
    return agg["platforms"]


@router.get("/recent", response_model=RecentResponse)
async def get_recent(
    user: dict = Depends(get_current_user),
    limit: int = Query(default=15, ge=1, le=100),
):
    """Return the most recent queries (default 15)."""
    uid = user["uid"]
    logger.info("Fetching {} recent queries for user {}", limit, uid)

    all_queries = await asyncio.to_thread(_fetch_all_queries, uid)
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
                carbon_grams=round(q.get("carbonGrams", 0.0), 2),
                timestamp=ts_str,
            )
        )

    return RecentResponse(queries=items, count=len(items))


@router.get("/weekly", response_model=WeeklyResponse)
async def get_weekly(user: dict = Depends(get_current_user)):
    """
    Return per-day aggregated data for the last 7 days.

    Each day includes the count of queries and total carbon emitted.
    Days with no activity are included with zero values.
    """
    uid = user["uid"]
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=6)
    # Start of that day
    start = seven_days_ago.replace(hour=0, minute=0, second=0, microsecond=0)

    logger.info("Fetching weekly data for user {} (since {})", uid, start.isoformat())

    queries = await asyncio.to_thread(_fetch_queries_since, uid, start)

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
        daily[day_key]["carbon"] += q.get("carbonGrams", 0.0)

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
