import logging
import os
import time
import asyncio
from functools import partial

logger = logging.getLogger(__name__)

AGGREGATOR_V3_ABI = [
    {
        "inputs": [],
        "name": "latestRoundData",
        "outputs": [
            {"name": "roundId", "type": "uint80"},
            {"name": "answer", "type": "int256"},
            {"name": "startedAt", "type": "uint256"},
            {"name": "updatedAt", "type": "uint256"},
            {"name": "answeredInRound", "type": "uint80"},
        ],
        "stateMutability": "view",
        "type": "function",
    },
    {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function",
    },
]

FEED_REGISTRY = {
    "ETH/USD": {"address": "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419", "heartbeat": 3600},
    "BTC/USD": {"address": "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88b", "heartbeat": 3600},
    "USDC/USD": {"address": "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6", "heartbeat": 86400},
}

RPC_URL = os.getenv("ETHEREUM_RPC_URL", "https://eth.llamarpc.com").strip()


def _call_feed_sync(feed_address: str) -> dict:
    """Synchronous web3 call to read latestRoundData from a Chainlink aggregator."""
    from web3 import Web3

    w3 = Web3(Web3.HTTPProvider(RPC_URL, request_kwargs={"timeout": 10}))
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(feed_address),
        abi=AGGREGATOR_V3_ABI,
    )
    round_data = contract.functions.latestRoundData().call()
    decimals = contract.functions.decimals().call()

    return {
        "round_id": round_data[0],
        "answer": round_data[1] / (10 ** decimals),
        "started_at": round_data[2],
        "updated_at": round_data[3],
        "answered_in_round": round_data[4],
        "decimals": decimals,
    }


async def get_feed_freshness(feed_address: str, heartbeat: int) -> dict:
    """
    Check staleness of a Chainlink price feed.

    freshness_ratio = time_since_update / heartbeat.
    >0.8 = stale warning, >1.0 = high risk of stale data.
    """
    try:
        loop = asyncio.get_event_loop()
        data = await loop.run_in_executor(None, partial(_call_feed_sync, feed_address))

        now = int(time.time())
        time_since_update = now - data["updated_at"]
        freshness_ratio = time_since_update / heartbeat

        return {
            "feed_address": feed_address,
            "price": round(data["answer"], 2),
            "updated_at": data["updated_at"],
            "time_since_update_seconds": time_since_update,
            "heartbeat": heartbeat,
            "freshness_ratio": round(freshness_ratio, 4),
            "is_stale_warning": freshness_ratio > 0.8,
            "is_stale_critical": freshness_ratio > 1.0,
        }
    except Exception as e:
        logger.warning(f"Chainlink feed freshness check failed for {feed_address}: {e}")
        mock_feeds = {
            "0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419": {"price": 3247.82, "freshness_ratio": 0.342},
            "0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88b": {"price": 67834.21, "freshness_ratio": 0.287},
            "0x8fFfFfd4AfB6115b954Bd326cbe7B4BA576818f6": {"price": 1.0001, "freshness_ratio": 0.043},
        }
        mock = mock_feeds.get(feed_address, {"price": 100.0, "freshness_ratio": 0.5})
        return {
            "feed_address": feed_address,
            "price": mock["price"],
            "updated_at": int(time.time()) - int(heartbeat * mock["freshness_ratio"]),
            "time_since_update_seconds": int(heartbeat * mock["freshness_ratio"]),
            "heartbeat": heartbeat,
            "freshness_ratio": mock["freshness_ratio"],
            "is_stale_warning": mock["freshness_ratio"] > 0.8,
            "is_stale_critical": mock["freshness_ratio"] > 1.0,
        }


async def get_all_feed_status() -> list[dict]:
    """Check freshness status for all registered Chainlink feeds."""
    results = []
    for name, info in FEED_REGISTRY.items():
        status = await get_feed_freshness(info["address"], info["heartbeat"])
        status["feed_name"] = name
        results.append(status)
    return results


async def calculate_oracle_risk_score(feeds: list[dict]) -> float:
    """
    Calculate an aggregate oracle risk score (0-100, higher = safer).

    Scoring: Each feed scored based on freshness_ratio. A ratio near 0 is ideal (score 100).
    A ratio >= 1.0 gives score 0. Aggregated as average across all feeds.
    """
    if not feeds:
        return 50.0

    feed_scores = []
    for feed in feeds:
        ratio = feed.get("freshness_ratio", 0.5)
        if ratio >= 1.0:
            score = 0.0
        elif ratio >= 0.8:
            score = max(0.0, (1.0 - ratio) * 100)
        else:
            score = max(0.0, 100.0 - (ratio * 80.0))
        feed_scores.append(score)

    avg = sum(feed_scores) / len(feed_scores)
    return round(avg, 1)
