import os
import logging
import httpx

logger = logging.getLogger(__name__)

API_KEY = os.getenv("CRYPTOPANIC_API_KEY", "")
BASE_URL = os.getenv("CRYPTOPANIC_BASE_URL", "https://cryptopanic.com/api/v1")
TIMEOUT = 15.0


async def get_news(currencies: list[str]) -> list[dict]:
    """
    Fetch hot news articles from CryptoPanic for the given currency symbols.

    Falls back to mock DeFi news articles on API failure or missing API key.
    """
    try:
        if not API_KEY:
            raise ValueError("CRYPTOPANIC_API_KEY not configured")

        symbols = ",".join(currencies)
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            resp = await client.get(
                f"{BASE_URL}/posts/",
                params={
                    "auth_token": API_KEY,
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
    except Exception as e:
        logger.warning(f"CryptoPanic fetch failed for {currencies}: {e}")
        symbol_str = ",".join(currencies).upper()
        return [
            {
                "title": f"{symbol_str} market activity increases amid DeFi sector rotation",
                "source": "CoinDesk",
                "published_at": "2026-04-02T14:30:00Z",
                "url": "https://coindesk.com/mock-article-1",
                "kind": "news",
                "votes": {"positive": 12, "negative": 3},
            },
            {
                "title": f"Analysts debate {symbol_str} protocol risk parameters after volatility spike",
                "source": "The Block",
                "published_at": "2026-04-02T10:15:00Z",
                "url": "https://theblock.co/mock-article-2",
                "kind": "news",
                "votes": {"positive": 8, "negative": 5},
            },
            {
                "title": f"DeFi governance proposal sparks debate in {symbol_str} community",
                "source": "Decrypt",
                "published_at": "2026-04-01T16:45:00Z",
                "url": "https://decrypt.co/mock-article-3",
                "kind": "news",
                "votes": {"positive": 15, "negative": 2},
            },
            {
                "title": f"On-chain data shows whale accumulation of {symbol_str} tokens",
                "source": "CryptoSlate",
                "published_at": "2026-04-01T09:20:00Z",
                "url": "https://cryptoslate.com/mock-article-4",
                "kind": "news",
                "votes": {"positive": 6, "negative": 1},
            },
            {
                "title": f"Security researchers identify potential vulnerability in {symbol_str} ecosystem",
                "source": "Rekt News",
                "published_at": "2026-03-31T18:10:00Z",
                "url": "https://rekt.news/mock-article-5",
                "kind": "news",
                "votes": {"positive": 3, "negative": 11},
            },
        ]
