"""
Platform-related constants — display names, carbon estimates, colors, icons.
"""

from __future__ import annotations

PLATFORM_NAMES: dict[str, str] = {
    "gemini": "Gemini",
    "claude": "Claude",
    "perplexity": "Perplexity",
    "chatgpt": "ChatGPT",
    "google_search": "Google Search",
}

CARBON_PER_QUERY: dict[str, float] = {
    "gemini": 1.6,
    "claude": 3.5,
    "perplexity": 4.0,
    "chatgpt": 4.4,
    "google_search": 0.2,
}

PLATFORM_COLORS: dict[str, str] = {
    "chatgpt": "#10b981",
    "claude": "#f59e0b",
    "gemini": "#3b82f6",
    "perplexity": "#8b5cf6",
    "google_search": "#64748b",
}

PLATFORM_ICONS: dict[str, str] = {
    "chatgpt": "🤖",
    "claude": "🧠",
    "gemini": "✨",
    "perplexity": "🔍",
    "google_search": "🔎",
}
