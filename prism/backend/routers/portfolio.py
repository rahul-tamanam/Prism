import json
import os
import logging
from fastapi import APIRouter
from cache.store import cache
from scoring.prism import get_action
from services.correlation import compute_correlation_matrix
from services.history import get_score_history

logger = logging.getLogger(__name__)
router = APIRouter(tags=["portfolio"])

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def _load_mock_scores() -> dict:
    path = os.path.join(DATA_DIR, "mock_scores.json")
    with open(path, "r") as f:
        return json.load(f)


def _load_protocol_configs() -> list[dict]:
    path = os.path.join(DATA_DIR, "protocols.json")
    with open(path, "r") as f:
        return json.load(f)


@router.get("/portfolio")
async def get_portfolio():
    """
    Return a portfolio-level risk view across all tracked protocols.

    Includes overall weighted risk, fragility ranking, and per-protocol
    summary. Uses cached scores when available, mock data otherwise.
    """
    configs = _load_protocol_configs()
    mock = _load_mock_scores()

    protocols = []
    total_tvl = 0
    weighted_score_sum = 0

    for config in configs:
        pid = config["id"]
        cache_key = f"score:{pid}"
        cached = cache.get(cache_key)

        if cached:
            score_data = cached
        elif pid in mock:
            score_data = mock[pid]
        else:
            continue

        tvl = score_data.get("current_tvl", 0)
        score = score_data.get("score", 50.0)
        action = score_data.get("action", get_action(score))

        protocols.append({
            "protocol_id": pid,
            "name": config.get("name", pid),
            "type": config.get("type", ""),
            "chain": config.get("chain", ""),
            "color": config.get("color", "#666"),
            "logo": config.get("logo", ""),
            "score": score,
            "action": action,
            "worst_pillar": score_data.get("worst_pillar", ""),
            "triple_convergence_active": score_data.get("triple_convergence_active", False),
            "safe_position_label": score_data.get("safe_position_label", ""),
            "current_tvl": tvl,
        })

        total_tvl += tvl
        weighted_score_sum += score * tvl

    overall_risk = round(weighted_score_sum / total_tvl, 1) if total_tvl > 0 else 50.0
    overall_action = get_action(overall_risk)

    fragility_ranking = sorted(protocols, key=lambda p: p["score"])

    exit_count = sum(1 for p in protocols if p["action"] == "EXIT")
    reduce_count = sum(1 for p in protocols if p["action"] == "REDUCE")
    convergence_count = sum(1 for p in protocols if p["triple_convergence_active"])

    return {
        "overall_risk_score": overall_risk,
        "overall_action": overall_action,
        "total_tvl_tracked": total_tvl,
        "protocol_count": len(protocols),
        "exit_alerts": exit_count,
        "reduce_alerts": reduce_count,
        "convergence_alerts": convergence_count,
        "fragility_ranking": fragility_ranking,
        "protocols": protocols,
    }


@router.get("/portfolio/correlation")
async def get_correlation_matrix():
    """
    Return cross-protocol correlation matrix and pair-level risk notes.
    Uses live score history where available, static estimates as fallback.
    """
    configs = _load_protocol_configs()

    score_histories: dict[str, list[dict]] = {}
    for config in configs:
        pid = config["id"]
        score_histories[pid] = get_score_history(pid, days=30)

    result = compute_correlation_matrix(score_histories)
    return result
