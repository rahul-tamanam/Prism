import logging

logger = logging.getLogger(__name__)


async def get_whale_concentration(protocol_id: str) -> dict:
    """
    Stub for Dune Analytics whale concentration query.

    Dune queries require pre-saved query IDs and API key. Returns mock data
    representing top wallet concentration metrics.
    """
    logger.info(f"Dune stub: returning mock whale concentration for {protocol_id}")
    mock_data = {
        "aave-v3": {
            "top_10_pct_supply": 34.2,
            "top_50_pct_supply": 58.7,
            "gini_coefficient": 0.72,
            "whale_count_over_1m": 147,
        },
        "uniswap-v3": {
            "top_10_pct_supply": 48.6,
            "top_50_pct_supply": 71.3,
            "gini_coefficient": 0.81,
            "whale_count_over_1m": 89,
        },
        "stargate": {
            "top_10_pct_supply": 62.1,
            "top_50_pct_supply": 84.7,
            "gini_coefficient": 0.89,
            "whale_count_over_1m": 23,
        },
    }
    return mock_data.get(protocol_id, {
        "top_10_pct_supply": 40.0,
        "top_50_pct_supply": 65.0,
        "gini_coefficient": 0.75,
        "whale_count_over_1m": 50,
    })


async def get_protocol_users(protocol_id: str) -> dict:
    """
    Stub for Dune Analytics active user metrics.

    Returns mock data for daily/weekly/monthly active users.
    """
    logger.info(f"Dune stub: returning mock user metrics for {protocol_id}")
    mock_data = {
        "aave-v3": {"dau": 12400, "wau": 34200, "mau": 89700},
        "uniswap-v3": {"dau": 28700, "wau": 72100, "mau": 156000},
        "stargate": {"dau": 1840, "wau": 5230, "mau": 14600},
    }
    return mock_data.get(protocol_id, {"dau": 5000, "wau": 15000, "mau": 40000})


async def get_liquidation_history(protocol_id: str) -> list[dict]:
    """
    Stub for Dune Analytics historical liquidation data.

    Returns mock 7-day liquidation events.
    """
    logger.info(f"Dune stub: returning mock liquidation history for {protocol_id}")
    return [
        {"date": "2026-04-02", "liquidation_count": 23, "total_liquidated_usd": 4200000},
        {"date": "2026-04-01", "liquidation_count": 18, "total_liquidated_usd": 3100000},
        {"date": "2026-03-31", "liquidation_count": 31, "total_liquidated_usd": 6800000},
        {"date": "2026-03-30", "liquidation_count": 12, "total_liquidated_usd": 1900000},
        {"date": "2026-03-29", "liquidation_count": 15, "total_liquidated_usd": 2400000},
        {"date": "2026-03-28", "liquidation_count": 8, "total_liquidated_usd": 1200000},
        {"date": "2026-03-27", "liquidation_count": 27, "total_liquidated_usd": 5600000},
    ]
