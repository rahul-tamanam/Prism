"""
Crypto / DeFi news for narrative scoring.

Priority (first match wins):
1. NEWS_PROVIDER=cryptopanic and CRYPTOPANIC_API_KEY set → CryptoPanic API
2. NEWS_PROVIDER=gnews (or unset GNEWS) and GNEWS_API_KEY set → GNews API
3. Otherwise → free RSS feeds (no API key)

Set NEWS_PROVIDER=rss to force RSS even if CryptoPanic key exists.
"""
from __future__ import annotations

import logging
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import httpx

logger = logging.getLogger(__name__)

TIMEOUT = 15.0

CRYPTOPANIC_KEY = os.getenv("CRYPTOPANIC_API_KEY", "").strip()
CRYPTOPANIC_BASE = os.getenv("CRYPTOPANIC_BASE_URL", "https://cryptopanic.com/api/v1")
GNEWS_KEY = os.getenv("GNEWS_API_KEY", "").strip()
GNEWS_BASE = os.getenv("GNEWS_BASE_URL", "https://gnews.io/api/v4").rstrip("/")
NEWS_PROVIDER = os.getenv("NEWS_PROVIDER", "").strip().lower()

RSS_FEEDS = [
    "https://www.coindesk.com/arc/outboundfeeds/rss?outputType=xml",
    "https://cointelegraph.com/rss",
]

ATOM_NS = {"atom": "http://www.w3.org/2005/Atom"}


def _iso_date(raw: str) -> str:
    if not raw:
        return datetime.now(timezone.utc).isoformat()
    try:
        if "T" in raw or raw.endswith("Z"):
            dt = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt.isoformat()
    except ValueError:
        pass
    try:
        dt = parsedate_to_datetime(raw)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat()
    except (TypeError, ValueError, OverflowError):
        return datetime.now(timezone.utc).isoformat()


def _parse_rss_or_atom(xml_bytes: bytes) -> list[dict]:
    out: list[dict] = []
    try:
        root = ET.fromstring(xml_bytes)
    except ET.ParseError:
        return out

    tag = root.tag.split("}")[-1]

    if tag == "rss":
        channel = root.find("channel")
        if channel is None:
            return out
        for item in channel.findall("item")[:12]:
            title_el = item.find("title")
            link_el = item.find("link")
            date_el = item.find("pubDate")
            title = (title_el.text or "").strip() if title_el is not None and title_el.text else ""
            link = (link_el.text or "").strip() if link_el is not None and link_el.text else ""
            pub = (date_el.text or "").strip() if date_el is not None and date_el.text else ""
            if title:
                out.append({
                    "title": title,
                    "source": "RSS",
                    "published_at": _iso_date(pub),
                    "url": link or "https://www.coindesk.com",
                    "kind": "news",
                    "votes": {"positive": 0, "negative": 0},
                })
        return out

    if tag == "feed":
        for entry in root.findall("atom:entry", ATOM_NS)[:12]:
            title_el = entry.find("atom:title", ATOM_NS)
            link_el = entry.find("atom:link", ATOM_NS)
            pub_el = entry.find("atom:updated", ATOM_NS) or entry.find("atom:published", ATOM_NS)
            title = (title_el.text or "").strip() if title_el is not None and title_el.text else ""
            link = ""
            if link_el is not None:
                link = (link_el.get("href") or "").strip()
            pub = (pub_el.text or "").strip() if pub_el is not None and pub_el.text else ""
            if title:
                out.append({
                    "title": title,
                    "source": "RSS",
                    "published_at": _iso_date(pub),
                    "url": link or "https://cointelegraph.com",
                    "kind": "news",
                    "votes": {"positive": 0, "negative": 0},
                })

    return out


async def _rss_news(_currencies: list[str]) -> list[dict]:
    articles: list[dict] = []
    async with httpx.AsyncClient(
        timeout=TIMEOUT,
        headers={"User-Agent": "PRISM/1.0"},
        follow_redirects=True,
    ) as client:
        for feed in RSS_FEEDS:
            try:
                resp = await client.get(feed)
                resp.raise_for_status()
                articles.extend(_parse_rss_or_atom(resp.content))
            except Exception as e:
                logger.warning("RSS feed failed %s: %s", feed, e)
    if not articles:
        return _mock_articles(_currencies)
    return articles[:25]


async def _gnews_news(currencies: list[str]) -> list[dict]:
    q = " OR ".join(currencies) if currencies else "defi cryptocurrency"
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(
                f"{GNEWS_BASE}/search",
                params={
                    "q": q,
                    "lang": "en",
                    "max": 15,
                    "apikey": GNEWS_KEY,
                },
            )
            resp.raise_for_status()
            data = resp.json()
        articles = []
        for a in data.get("articles", []):
            articles.append({
                "title": a.get("title", ""),
                "source": (a.get("source") or {}).get("name", "GNews"),
                "published_at": a.get("publishedAt", ""),
                "url": a.get("url", ""),
                "kind": "news",
                "votes": {"positive": 0, "negative": 0},
            })
        return articles or _mock_articles(currencies)
    except Exception as e:
        logger.warning("GNews fetch failed: %s", e)
        return await _rss_news(currencies)


async def _cryptopanic_news(currencies: list[str]) -> list[dict]:
    symbols = ",".join(currencies)
    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(
            f"{CRYPTOPANIC_BASE}/posts/",
            params={
                "auth_token": CRYPTOPANIC_KEY,
                "currencies": symbols,
                "kind": "news",
                "filter": "hot",
                "public": "true",
            },
        )
        resp.raise_for_status()
        data = resp.json()

    articles = []
    for post in data.get("results", []):
        articles.append({
            "title": post.get("title", ""),
            "source": post.get("source", {}).get("title", "Unknown"),
            "published_at": post.get("published_at", ""),
            "url": post.get("url", ""),
            "kind": post.get("kind", "news"),
            "votes": {
                "positive": post.get("votes", {}).get("positive", 0),
                "negative": post.get("votes", {}).get("negative", 0),
            },
        })
    return articles


def _mock_articles(currencies: list[str]) -> list[dict]:
    symbol_str = ",".join(currencies).upper() if currencies else "DEFI"
    return [
        {
            "title": f"{symbol_str} market activity increases amid DeFi sector rotation",
            "source": "CoinDesk",
            "published_at": "2026-04-02T14:30:00Z",
            "url": "https://coindesk.com/",
            "kind": "news",
            "votes": {"positive": 12, "negative": 3},
        },
        {
            "title": f"Analysts debate {symbol_str} protocol risk parameters after volatility spike",
            "source": "The Block",
            "published_at": "2026-04-02T10:15:00Z",
            "url": "https://www.theblock.co/",
            "kind": "news",
            "votes": {"positive": 8, "negative": 5},
        },
        {
            "title": f"DeFi governance proposal sparks debate in {symbol_str} community",
            "source": "Decrypt",
            "published_at": "2026-04-01T16:45:00Z",
            "url": "https://decrypt.co/",
            "kind": "news",
            "votes": {"positive": 15, "negative": 2},
        },
    ]


async def get_news(currencies: list[str]) -> list[dict]:
    """
    Headlines for narrative / sentiment. Same shape as legacy CryptoPanic output.

    When NEWS_PROVIDER is unset: try GNews (if GNEWS_API_KEY), then CryptoPanic
    (if CRYPTOPANIC_API_KEY), else free RSS feeds.
    """
    p = NEWS_PROVIDER

    if p == "rss":
        return await _rss_news(currencies)
    if p == "gnews" and GNEWS_KEY:
        return await _gnews_news(currencies)
    if p == "cryptopanic" and CRYPTOPANIC_KEY:
        try:
            return await _cryptopanic_news(currencies)
        except Exception as e:
            logger.warning("CryptoPanic failed, falling back: %s", e)
            return await _rss_news(currencies)

    if GNEWS_KEY:
        try:
            return await _gnews_news(currencies)
        except Exception as e:
            logger.warning("GNews failed, falling back: %s", e)

    if CRYPTOPANIC_KEY:
        try:
            return await _cryptopanic_news(currencies)
        except Exception as e:
            logger.warning("CryptoPanic failed, falling back: %s", e)

    return await _rss_news(currencies)
