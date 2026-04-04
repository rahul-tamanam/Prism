import json
import os
import logging
from fastapi import APIRouter, HTTPException
from services.cryptopanic import get_news
from services.sentiment import get_narrative_summary

logger = logging.getLogger(__name__)
router = APIRouter(tags=["narrative"])

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def _load_protocol_configs() -> dict:
    path = os.path.join(DATA_DIR, "protocols.json")
    with open(path, "r") as f:
        configs = json.load(f)
    return {c["id"]: c for c in configs}


def _load_mock_narrative() -> dict:
    path = os.path.join(DATA_DIR, "mock_scores.json")
    with open(path, "r") as f:
        data = json.load(f)
    return data.get("narrative_data", {})


@router.get("/narrative/{protocol_id}")
async def get_narrative(protocol_id: str):
    """
    Return narrative risk data for a protocol including articles and sentiment.

    Tries live CryptoPanic API + VADER analysis first. Falls back to
    pre-computed mock narrative data from mock_scores.json.
    """
    configs = _load_protocol_configs()
    config = configs.get(protocol_id)

    if not config:
        mock_narrative = _load_mock_narrative()
        if protocol_id in mock_narrative:
            return mock_narrative[protocol_id]
        raise HTTPException(status_code=404, detail=f"Protocol '{protocol_id}' not found")

    token = config.get("token_symbol", "")

    try:
        articles = await get_news([token])
        summary = await get_narrative_summary(token, articles)
        return {
            "protocol_id": protocol_id,
            "token_symbol": token,
            "avg_sentiment": summary.get("avg_sentiment", 0),
            "negative_ratio": summary.get("negative_ratio", 0),
            "mention_velocity": summary.get("mention_velocity", 0),
            "spike_detected": summary.get("spike_detected", False),
            "articles": summary.get("scored_articles", []),
        }
    except Exception as e:
        logger.error(f"Narrative fetch failed for {protocol_id}: {e}")
        mock_narrative = _load_mock_narrative()
        if protocol_id in mock_narrative:
            return mock_narrative[protocol_id]
        return {
            "protocol_id": protocol_id,
            "token_symbol": token,
            "avg_sentiment": 0.0,
            "negative_ratio": 0.0,
            "mention_velocity": 0.0,
            "spike_detected": False,
            "articles": [],
        }
