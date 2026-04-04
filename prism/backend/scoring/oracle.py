import logging
from typing import Any

from services.chainlink import get_all_feed_status
from services.dune import unified_extra_pillar_fields

logger = logging.getLogger(__name__)


def _feed_freshness_score(feeds: list[dict]) -> float:
    """
    Score the freshness of all Chainlink price feeds used by the protocol.

    Aggregates individual feed freshness ratios (time_since_update / heartbeat).
    A ratio near 0 is ideal; approaching 1.0 means the feed is about to go stale:
    - Any feed ratio >1.0: critical stale feed → max 20
    - Avg ratio >0.8: stale warning zone → 20-40
    - Avg ratio 0.5-0.8: aging data → 40-70
    - Avg ratio 0.2-0.5: normal update cycle → 70-90
    - Avg ratio <0.2: very fresh → 90-100

    Data source: Chainlink latestRoundData() on-chain calls.
    """
    if not feeds:
        return 50.0

    ratios = [f.get("freshness_ratio", 0.5) for f in feeds]
    max_ratio = max(ratios)
    avg_ratio = sum(ratios) / len(ratios)

    if max_ratio > 1.0:
        return max(5.0, 20.0 - (max_ratio - 1.0) * 15)
    elif avg_ratio > 0.8:
        return 20.0 + 20.0 * ((1.0 - avg_ratio) / 0.2)
    elif avg_ratio > 0.5:
        return 40.0 + 30.0 * ((0.8 - avg_ratio) / 0.3)
    elif avg_ratio > 0.2:
        return 70.0 + 20.0 * ((0.5 - avg_ratio) / 0.3)
    else:
        return 90.0 + 10.0 * min((0.2 - avg_ratio) / 0.2, 1.0)


def _single_oracle_dependency_score(feed_names: list[str]) -> float:
    """
    Score the diversity of oracle sources for the protocol.

    Reliance on a single oracle creates a single point of failure.
    More feeds used = better redundancy:
    - 1 feed: single dependency → 30
    - 2 feeds: limited diversity → 55
    - 3+ feeds: good coverage → 80
    - 5+ feeds: excellent → 95

    Data source: Protocol config (chainlink_feeds list).
    """
    count = len(feed_names)
    if count <= 1:
        return 30.0
    elif count == 2:
        return 55.0
    elif count <= 4:
        return 80.0
    else:
        return 95.0


def _deviation_mismatch_score(feeds: list[dict]) -> float:
    """
    Score price deviation between oracle feeds and expected values.

    Large deviations between Chainlink reported prices and market prices
    indicate potential oracle manipulation or stale data:
    - No feeds to check: uncertain → 50
    - Feed prices within expected bounds: score based on freshness proximity

    This is a simplified version - production would compare against CoinGecko
    spot prices for each asset.

    Data source: Chainlink price vs external reference (CoinGecko stub).
    """
    if not feeds:
        return 50.0

    scores = []
    for feed in feeds:
        ratio = feed.get("freshness_ratio", 0.5)
        if ratio < 0.3:
            scores.append(95.0)
        elif ratio < 0.6:
            scores.append(75.0)
        elif ratio < 0.9:
            scores.append(50.0)
        else:
            scores.append(25.0)

    return sum(scores) / len(scores)


async def calculate_oracle_score(
    protocol_id: str,
    protocol_config: dict,
    *,
    dune_unified_row: dict[str, Any] | None = None,
) -> dict:
    """
    Calculate the Oracle pillar score (Pillar 4) for a protocol.

    Aggregation formula:
      Pillar 4 = (freshness * 0.50) + (single_oracle * 0.25) + (deviation * 0.25)

    Oracle reliability is the foundation for all DeFi pricing. Stale or
    manipulated feeds can cascade into bad liquidations, mispriced swaps,
    and bridge exploits.
    """
    feed_names = protocol_config.get("chainlink_feeds", [])
    feeds = await get_all_feed_status()

    relevant_feeds = [f for f in feeds if f.get("feed_name") in feed_names]
    if not relevant_feeds:
        relevant_feeds = feeds

    freshness_s = _feed_freshness_score(relevant_feeds)
    dependency_s = _single_oracle_dependency_score(feed_names)
    deviation_s = _deviation_mismatch_score(relevant_feeds)

    composite = (
        freshness_s * 0.50
        + dependency_s * 0.25
        + deviation_s * 0.25
    )

    out = {
        "score": round(composite, 1),
        "feed_freshness_score": round(freshness_s, 1),
        "single_oracle_dependency_score": round(dependency_s, 1),
        "deviation_mismatch_score": round(deviation_s, 1),
        "feeds_checked": len(relevant_feeds),
        "feed_details": [
            {
                "name": f.get("feed_name", ""),
                "price": f.get("price", 0),
                "freshness_ratio": f.get("freshness_ratio", 0),
                "is_stale": f.get("is_stale_warning", False),
            }
            for f in relevant_feeds
        ],
    }
    extras = unified_extra_pillar_fields(dune_unified_row).get("oracle") or {}
    return {**out, **extras}
