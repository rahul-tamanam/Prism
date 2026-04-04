import hashlib
import json
import os
import logging
from datetime import datetime, timedelta
import numpy as np
from fastapi import APIRouter, HTTPException, Query
from cache.store import cache
from scoring.prism import calculate_prism_score, get_action

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
        result = await calculate_prism_score(protocol_id, configs[protocol_id])
        result["timestamp"] = datetime.utcnow().isoformat()
        cache.set(cache_key, result, ttl=CACHE_TTL)
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
async def get_score_history(protocol_id: str, days: int = 30):
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
