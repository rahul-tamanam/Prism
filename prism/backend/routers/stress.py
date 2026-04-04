import json
import os
import logging
from fastapi import APIRouter, HTTPException
from models.stress import StressRequest, MonteCarloRequest
from scoring.stress_engine import (
    run_stress_scenario,
    run_monte_carlo_noisy_scenario,
    get_mock_stress_result,
    SCENARIOS,
)
from cache.store import cache

logger = logging.getLogger(__name__)
router = APIRouter(tags=["stress"])

DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")


def _load_mock_scores() -> dict:
    path = os.path.join(DATA_DIR, "mock_scores.json")
    with open(path, "r") as f:
        return json.load(f)


def _resolve_base_pillars(protocol_id: str) -> dict:
    cache_key = f"score:{protocol_id}"
    cached_score = cache.get(cache_key)

    if cached_score and "pillar_scores" in cached_score:
        pillars = cached_score["pillar_scores"]
        return {k: v for k, v in pillars.items() if k != "triple_convergence_active"}

    mock = _load_mock_scores()
    if protocol_id in mock:
        pillars = mock[protocol_id]["pillar_scores"]
        return {k: v for k, v in pillars.items() if k != "triple_convergence_active"}

    raise HTTPException(status_code=404, detail=f"No score data for '{protocol_id}'")


@router.post("/stress/{protocol_id}")
async def stress_test(protocol_id: str, request: StressRequest):
    """
    Run a stress scenario against a protocol.

    Applies the specified scenario's pillar deltas to the protocol's current
    scores and recalculates the composite PRISM score.
    """
    if request.scenario not in SCENARIOS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario '{request.scenario}'. Valid: {list(SCENARIOS.keys())}",
        )

    base_pillars = _resolve_base_pillars(protocol_id)

    try:
        result = await run_stress_scenario(protocol_id, request.scenario, base_pillars)
        return result
    except Exception as e:
        logger.error(f"Stress test failed for {protocol_id}/{request.scenario}: {e}")
        mock_result = get_mock_stress_result(protocol_id, request.scenario)
        if mock_result:
            return mock_result
        raise HTTPException(status_code=500, detail=f"Stress test failed: {e}")


@router.post("/stress/{protocol_id}/monte-carlo")
async def monte_carlo_stress(protocol_id: str, request: MonteCarloRequest):
    """
    Monte Carlo stress: random multipliers on one scenario's pillar deltas (E[multiplier]=1).
    """
    if request.scenario not in SCENARIOS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid scenario '{request.scenario}'. Valid: {list(SCENARIOS.keys())}",
        )

    base_pillars = _resolve_base_pillars(protocol_id)

    try:
        return run_monte_carlo_noisy_scenario(
            protocol_id,
            request.scenario,
            base_pillars,
            request.iterations,
            request.sigma,
            request.seed,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        logger.error(f"Monte Carlo stress failed for {protocol_id}/{request.scenario}: {e}")
        raise HTTPException(status_code=500, detail=f"Monte Carlo simulation failed: {e}") from e


@router.get("/stress/scenarios")
async def list_scenarios():
    """Return all available stress test scenarios with descriptions."""
    return [
        {"id": key, "name": val["name"], "description": val["description"]}
        for key, val in SCENARIOS.items()
    ]
