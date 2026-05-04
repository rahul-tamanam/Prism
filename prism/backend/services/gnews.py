"""
GNews.io — optional headline enrichment for narrative / spike detection.
Falls back cleanly when GNEWS_API_KEY is unset or the request fails.
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timedelta, timezone

import httpx

logger = logging.getLogger(__name__)

GNEWS_BASE = os.getenv("GNEWS_BASE_URL", "https://gnews.io/api/v4").rstrip("/")
TIMEOUT = 20.0

NEGATIVE_KEYWORDS = [
    "exploit", "hack", "attack", "drain", "vulnerability", "bug",
    "insolvent", "depeg", "liquidation", "emergency", "pause",
    "governance attack", "flash loan", "rug", "exit scam",
]

POSITIVE_KEYWORDS = [
    "audit", "partnership", "integration", "upgrade", "growth",
    "record", "milestone", "launch", "secure", "approved",
]


def _gnews_key() -> str:
    return os.getenv("GNEWS_API_KEY", "").strip()


async def get_protocol_sentiment(protocol_name: str, days: int = 7) -> dict:
    """
    Lightweight keyword-based sentiment from GNews headlines.
    Returns keys aligned with narrative enrichment: sentiment_score, spike_detected, headlines.
    """
    if not _gnews_key() or not protocol_name:
        return {
            "sentiment_score": 50.0,
            "article_count": 0,
            "negative_count": 0,
            "positive_count": 0,
            "spike_detected": False,
            "headlines": [],
            "source": "skipped",
        }

    from_date = (datetime.now(timezone.utc) - timedelta(days=days)).strftime("%Y-%m-%dT%H:%M:%SZ")
    q = f'"{protocol_name}" DeFi'
    url = f"{GNEWS_BASE}/search"
    params = {
        "q": q,
        "from": from_date,
        "lang": "en",
        "max": 20,
        "apikey": _gnews_key(),
    }

    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            r = await client.get(url, params=params)
            r.raise_for_status()
            body = r.json()
    except Exception as e:
        logger.warning("GNews fetch failed for %s: %s", protocol_name, e)
        return {
            "sentiment_score": 50.0,
            "article_count": 0,
            "negative_count": 0,
            "positive_count": 0,
            "spike_detected": False,
            "headlines": [],
            "source": "error",
            "error": str(e),
        }

    articles = body.get("articles") or []
    if not articles:
        return {
            "sentiment_score": 50.0,
            "article_count": 0,
            "negative_count": 0,
            "positive_count": 0,
            "spike_detected": False,
            "headlines": [],
            "source": "gnews",
        }

    neg = 0
    pos = 0
    for a in articles:
        blob = f"{a.get('title', '')} {a.get('description', '')}".lower()
        if any(k in blob for k in NEGATIVE_KEYWORDS):
            neg += 1
        if any(k in blob for k in POSITIVE_KEYWORDS):
            pos += 1

    total = len(articles)
    sentiment_score = round(50 + ((pos - neg) / max(total, 1)) * 50, 1)
    sentiment_score = max(0.0, min(100.0, sentiment_score))
    spike_detected = total >= 10 or neg >= 3

    headlines = [
        {"title": a.get("title", ""), "url": a.get("url", ""), "published": a.get("publishedAt", "")}
        for a in articles[:5]
    ]

    return {
        "sentiment_score": sentiment_score,
        "article_count": total,
        "negative_count": neg,
        "positive_count": pos,
        "spike_detected": spike_detected,
        "headlines": headlines,
        "source": "gnews",
    }
