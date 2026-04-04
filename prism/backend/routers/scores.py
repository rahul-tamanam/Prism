import hashlib
import json
import os
import logging
from datetime import datetime, timedelta
import numpy as np
from fastapi import APIRouter, HTTPException, Query
from cache.store import cache
from scoring.prism import calculate_prism_score, get_action
from models.score import ExitCostRequest, ExitCostResponse
from services.exit_calculator import calculate_exit_cost
from services.alerts import (
    check_and_dispatch,
    get_alert_history,
    acknowledge_alert,
    get_unacknowledged_count,
)
from services.history import record_score_snapshot, get_score_history

logger = logging.getLogger(__name__)
router = APIRouter(tags=["scores"])

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
CACHE_TTL = int(os.getenv("CACHE_TTL_SECONDS", "900"))


def _load_protocol_configs() -> dict:
    path = os.path.join(DATA_DIR, "protocols.json")
    with open(path, "r") as f:
        configs = json.load(f)
    return {c["id"]: c for c in configs}


def _load_mock_scores() -> dict:
    path = os.path.join(DATA_DIR, "mock_scores.json")
    with open(path, "r") as f:
        return json.load(f)


def _score_cache_fingerprint(cfg: dict) -> str:
    """
    Bust cache when Dune / subgraph wiring changes. Same fingerprint after
    only editing SQL on Dune still needs ?refresh=true (or wait for TTL).
    """
    subset = {
        "dune_prism_query_id": cfg.get("dune_prism_query_id"),
        "dune_whale_query_id": cfg.get("dune_whale_query_id"),
        "dune_users_query_id": cfg.get("dune_users_query_id"),
        "dune_liquidations_query_id": cfg.get("dune_liquidations_query_id"),
        "thegraph_subgraph": cfg.get("thegraph_subgraph"),
    }
    blob = json.dumps(subset, sort_keys=True, default=str)
    return hashlib.sha256(blob.encode()).hexdigest()[:12]


def _get_cached_score(protocol_id: str) -> dict | None:
    """Resolve a cached PRISM score (supports fingerprinted cache keys)."""
    configs = _load_protocol_configs()
    cfg = configs.get(protocol_id)
    if cfg:
        fp = _score_cache_fingerprint(cfg)
        hit = cache.get(f"score:{protocol_id}:{fp}")
        if hit is not None:
            return hit
    return cache.get(f"score:{protocol_id}")


@router.get("/scores/{protocol_id}")
async def get_score(
    protocol_id: str,
    refresh: bool = Query(False, description="Skip cache and recompute (use after changing Dune or protocols.json)"),
):
    """
    Return the full PRISM score for a protocol.

    Uses cached result if available and <15min old. Otherwise computes fresh.
    Falls back to mock_scores.json on computation failure.
    """
    configs = _load_protocol_configs()
    cfg = configs.get(protocol_id) or {}
    fp = _score_cache_fingerprint(cfg) if cfg else "none"
    cache_key = f"score:{protocol_id}:{fp}"
    legacy_key = f"score:{protocol_id}"

    if refresh:
        cache.invalidate_prefix(f"score:{protocol_id}:")
        cache.invalidate(legacy_key)
        logger.info("Cache invalidated for %s (refresh=1)", protocol_id)

    cached = cache.get(cache_key)
    if cached:
        logger.info(f"Cache hit for {protocol_id}")
        return cached

    if protocol_id not in configs:
        mock = _load_mock_scores()
        if protocol_id in mock:
            result = mock[protocol_id]
            result["timestamp"] = datetime.utcnow().isoformat()
            return result
        raise HTTPException(status_code=404, detail=f"Protocol '{protocol_id}' not found")

    try:
        configs[protocol_id]["_score_history"] = get_score_history(protocol_id, days=30)
        result = await calculate_prism_score(protocol_id, configs[protocol_id])
        result["timestamp"] = datetime.utcnow().isoformat()
        cache.set(cache_key, result, ttl=CACHE_TTL)
        record_score_snapshot(protocol_id, result)
        await check_and_dispatch(protocol_id, result.get("name", protocol_id), result)
        logger.info(f"Computed fresh score for {protocol_id}: {result['score']}")
        return result
    except Exception as e:
        logger.error(f"Score computation failed for {protocol_id}: {e}", exc_info=True)
        mock = _load_mock_scores()
        if protocol_id in mock:
            result = mock[protocol_id]
            result["timestamp"] = datetime.utcnow().isoformat()
            result["_fallback"] = True
            return result
        raise HTTPException(status_code=500, detail=f"Score computation failed: {e}")


@router.get("/scores/{protocol_id}/history")
async def get_score_history_route(protocol_id: str, days: int = 30):
    """
    Return score history for a protocol.

    For MVP: generates synthetic history by adding gaussian noise to the
    current score going back N days. Clamped to [0, 100].
    """
    mock = _load_mock_scores()
    if protocol_id in mock:
        base_score = mock[protocol_id]["score"]
    else:
        configs = _load_protocol_configs()
        if protocol_id not in configs:
            raise HTTPException(status_code=404, detail=f"Protocol '{protocol_id}' not found")
        base_score = 55.0

    noise_std = max(2.0, base_score * 0.06)
    history = []
    now = datetime.utcnow()

    np.random.seed(hash(protocol_id) % (2**31))

    for i in range(days, 0, -1):
        date = now - timedelta(days=i)
        drift = (days - i) / days * 3.0
        noise = np.random.normal(0, noise_std)
        score = float(np.clip(base_score + noise - drift, 0, 100))
        score = round(score, 1)
        action = get_action(score)
        history.append({
            "date": date.strftime("%Y-%m-%d"),
            "score": score,
            "action": action,
        })

    history.append({
        "date": now.strftime("%Y-%m-%d"),
        "score": base_score,
        "action": get_action(base_score),
    })

    return {
        "protocol_id": protocol_id,
        "history": history,
    }


@router.post("/scores/{protocol_id}/exit-cost", response_model=ExitCostResponse)
async def calculate_exit_cost_endpoint(protocol_id: str, request: ExitCostRequest):
    """
    Calculate the real cost of exiting a position.
    Uses live PRISM liquidity pillar score to adjust depth estimates.
    Falls back to mock data if live score unavailable.
    """
    configs = _load_protocol_configs()
    if protocol_id not in configs:
        raise HTTPException(status_code=404, detail=f"Protocol '{protocol_id}' not found")

    liquidity_score = 50.0
    cached = _get_cached_score(protocol_id)
    if cached:
        liquidity_score = cached.get("pillar_scores", {}).get("liquidity", 50.0)
    else:
        mock = _load_mock_scores()
        if protocol_id in mock:
            liquidity_score = mock[protocol_id].get("pillar_scores", {}).get("liquidity", 50.0)

    result = calculate_exit_cost(
        protocol_id=protocol_id,
        position_size_usd=request.position_size_usd,
        urgency=request.urgency,
        liquidity_pillar_score=liquidity_score,
    )
    return result


@router.get("/alerts")
async def list_alerts(limit: int = 50):
    """Return recent alert history with unacknowledged count."""
    return {
        "alerts": get_alert_history(limit),
        "unacknowledged_count": get_unacknowledged_count(),
    }


@router.post("/alerts/{alert_id}/acknowledge")
async def ack_alert(alert_id: str):
    """Acknowledge an alert by ID."""
    success = acknowledge_alert(alert_id)
    if not success:
        raise HTTPException(status_code=404, detail="Alert not found")
    return {"acknowledged": True}


@router.get("/alerts/count")
async def alert_count():
    return {"unacknowledged_count": get_unacknowledged_count()}
