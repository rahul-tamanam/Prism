import logging
import json
import os

import numpy as np

from scoring.prism import get_action, PILLAR_WEIGHTS

logger = logging.getLogger(__name__)

PILLAR_KEYS = ["liquidity", "liquidation", "governance", "oracle", "supply", "narrative"]

_WEIGHT_VEC = np.array([PILLAR_WEIGHTS[k] for k in PILLAR_KEYS], dtype=np.float64)

_MC_PERCENTILES = (5, 25, 50, 75, 95)
_MC_HIST_BINS = 20


def apply_pillar_deltas(base_pillar_scores: dict, deltas: dict) -> dict:
    """
    Apply pillar score deltas, clamp to [0, 100], return composite stressed score
    and bookkeeping fields (no narrative).
    """
    stressed_pillars: dict[str, float] = {}
    actual_deltas: dict[str, float] = {}
    for pillar in PILLAR_KEYS:
        base_val = float(base_pillar_scores.get(pillar, 50.0))
        delta = float(deltas.get(pillar, 0))
        stressed_val = max(0.0, min(100.0, base_val + delta))
        stressed_pillars[pillar] = stressed_val
        actual_deltas[pillar] = round(stressed_val - base_val, 1)

    base_score = round(
        sum(float(base_pillar_scores.get(k, 50)) * PILLAR_WEIGHTS[k] for k in PILLAR_KEYS), 1
    )
    stressed_score = round(
        sum(stressed_pillars[k] * PILLAR_WEIGHTS[k] for k in PILLAR_KEYS), 1
    )
    most_affected = min(actual_deltas, key=actual_deltas.get)

    return {
        "base_score": base_score,
        "stressed_score": stressed_score,
        "stressed_pillars": stressed_pillars,
        "actual_deltas": actual_deltas,
        "most_affected_pillar": most_affected,
    }

SCENARIOS = {
    "eth_drop_10": {
        "name": "ETH -10% Drop",
        "description": "Simulate a 10% decline in ETH price",
        "deltas": {
            "liquidity": -5,
            "liquidation": -18,
            "governance": 0,
            "oracle": -15,
            "supply": -3,
            "narrative": -7,
        },
    },
    "eth_drop_20": {
        "name": "ETH -20% Crash",
        "description": "Simulate a severe 20% ETH price crash",
        "deltas": {
            "liquidity": -12,
            "liquidation": -32,
            "governance": 0,
            "oracle": -30,
            "supply": -6,
            "narrative": -14,
        },
    },
    "whale_exit_15": {
        "name": "15% Whale Exit",
        "description": "Simulate a sudden 15% TVL withdrawal by large holders",
        "deltas": {
            "liquidity": -25,
            "liquidation": -3,
            "governance": 0,
            "oracle": 0,
            "supply": -5,
            "narrative": -10,
        },
    },
    "bridge_outflow_spike": {
        "name": "Bridge Outflow Spike",
        "description": "Simulate massive cross-chain bridge outflows",
        "deltas": {
            "liquidity": -30,
            "liquidation": -2,
            "governance": 0,
            "oracle": 0,
            "supply": -15,
            "narrative": -6,
        },
    },
    "governance_spike": {
        "name": "Governance Crisis",
        "description": "Simulate a contentious governance proposal causing turmoil",
        "deltas": {
            "liquidity": -2,
            "liquidation": 0,
            "governance": -25,
            "oracle": 0,
            "supply": 0,
            "narrative": -8,
        },
    },
    "oracle_staleness": {
        "name": "Oracle Staleness Event",
        "description": "Simulate all price feeds going stale (freshness ratio 0.95)",
        "deltas": {
            "liquidity": -4,
            "liquidation": -5,
            "governance": 0,
            "oracle": -40,
            "supply": 0,
            "narrative": -5,
        },
    },
}


def _generate_narrative(scenario_key: str, protocol_name: str, most_affected: str, base_score: float, stressed_score: float) -> str:
    """Generate a human-readable narrative for the stress test result."""
    drop = round(base_score - stressed_score, 1)
    narratives = {
        "eth_drop_10": f"A 10% ETH decline pushes {protocol_name}'s PRISM score down {drop} points. The {most_affected} pillar absorbs the heaviest impact as correlated positions face mark-to-market losses.",
        "eth_drop_20": f"A severe 20% ETH crash drops {protocol_name}'s score by {drop} points. The {most_affected} pillar enters critical territory, with cascading effects across the risk surface.",
        "whale_exit_15": f"A sudden 15% TVL exit from {protocol_name} reduces the score by {drop} points. The {most_affected} pillar degrades as remaining participants face elevated concentration risk.",
        "bridge_outflow_spike": f"Massive bridge outflows compress {protocol_name}'s score by {drop} points. The {most_affected} pillar suffers most as cross-chain capital flees the ecosystem.",
        "governance_spike": f"Governance turmoil at {protocol_name} causes a {drop}-point score decline. The {most_affected} pillar drops as voter concentration and proposal contention surge.",
        "oracle_staleness": f"Oracle staleness across {protocol_name}'s price feeds reduces the score by {drop} points. The {most_affected} pillar deteriorates as stale data undermines pricing accuracy.",
    }
    return narratives.get(scenario_key, f"Stress scenario reduces {protocol_name}'s score by {drop} points, with {most_affected} most affected.")


async def run_stress_scenario(protocol_id: str, scenario: str, base_pillar_scores: dict) -> dict:
    """
    Run a single stress scenario against a protocol's current pillar scores.

    Each scenario applies predefined delta adjustments to pillar scores,
    then recalculates the composite PRISM score using the standard weights.
    Scores are clamped to [0, 100] after adjustment.

    Returns the scenario result including base vs stressed scores, per-pillar
    deltas, the most affected pillar, and a narrative explanation.
    """
    if scenario not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario}. Valid: {list(SCENARIOS.keys())}")

    deltas = SCENARIOS[scenario]["deltas"]
    out = apply_pillar_deltas(base_pillar_scores, deltas)
    base_score = out["base_score"]
    stressed_score = out["stressed_score"]
    actual_deltas = out["actual_deltas"]
    most_affected = out["most_affected_pillar"]

    protocol_name = protocol_id.replace("-", " ").title()
    narrative = _generate_narrative(scenario, protocol_name, most_affected, base_score, stressed_score)

    return {
        "scenario": scenario,
        "base_score": base_score,
        "stressed_score": stressed_score,
        "base_action": get_action(base_score),
        "stressed_action": get_action(stressed_score),
        "pillar_deltas": actual_deltas,
        "most_affected_pillar": most_affected,
        "narrative": narrative,
    }


def run_monte_carlo_noisy_scenario(
    protocol_id: str,
    scenario_key: str,
    base_pillar_scores: dict,
    n_iter: int,
    sigma: float,
    seed: int | None = None,
) -> dict:
    """
    Monte Carlo over one scenario: per draw, each pillar delta is scaled by an
    independent lognormal multiplier with E[M]=1 (underlying normal mean = -sigma^2/2).
    """
    if scenario_key not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario_key}. Valid: {list(SCENARIOS.keys())}")

    n_iter = max(1, min(int(n_iter), 10_000))
    sigma = float(sigma)
    if sigma <= 0:
        raise ValueError("sigma must be positive")

    rng = np.random.default_rng(seed)
    base = np.array([float(base_pillar_scores.get(k, 50.0)) for k in PILLAR_KEYS], dtype=np.float64)
    delta = np.array(
        [float(SCENARIOS[scenario_key]["deltas"].get(k, 0)) for k in PILLAR_KEYS], dtype=np.float64
    )

    # Lognormal with E[M]=1: if ln M ~ N(mu, sigma^2), E[M]=exp(mu+sigma^2/2)=1 => mu=-sigma^2/2
    mu_log = -0.5 * sigma**2
    mult = rng.lognormal(mean=mu_log, sigma=sigma, size=(n_iter, len(PILLAR_KEYS)))
    effective = mult * delta
    stressed = np.clip(base + effective, 0.0, 100.0)
    scores = stressed @ _WEIGHT_VEC
    scores = np.round(scores, 1)

    pct = {str(p): float(np.percentile(scores, p)) for p in _MC_PERCENTILES}
    mean_s = float(np.mean(scores))
    std_s = float(np.std(scores, ddof=0))

    counts, edges = np.histogram(scores, bins=_MC_HIST_BINS, range=(0.0, 100.0))
    histogram = [
        {"bin_start": round(float(edges[i]), 2), "bin_end": round(float(edges[i + 1]), 2), "count": int(counts[i])}
        for i in range(len(counts))
    ]

    actions = ["ENTER", "HOLD", "REDUCE", "EXIT"]
    prob_by_action = {a: 0.0 for a in actions}
    for s in scores:
        prob_by_action[get_action(float(s))] += 1.0
    inv = 1.0 / n_iter
    prob_by_action = {k: round(v * inv, 4) for k, v in prob_by_action.items()}

    base_score = round(float(np.dot(base, _WEIGHT_VEC)), 1)

    return {
        "protocol_id": protocol_id,
        "scenario": scenario_key,
        "iterations": n_iter,
        "sigma": sigma,
        "base_score": base_score,
        "mean_stressed": round(mean_s, 2),
        "std_stressed": round(std_s, 3),
        "percentiles": pct,
        "histogram": histogram,
        "prob_by_action": prob_by_action,
    }


async def run_all_scenarios(protocol_id: str, base_pillar_scores: dict) -> list[dict]:
    """Run all 6 stress scenarios and return results."""
    results = []
    for scenario_key in SCENARIOS:
        result = await run_stress_scenario(protocol_id, scenario_key, base_pillar_scores)
        results.append(result)
    return results


def get_mock_stress_result(protocol_id: str, scenario: str) -> dict | None:
    """Load pre-computed stress result from mock data as fallback."""
    try:
        data_path = os.path.join(os.path.dirname(__file__), "..", "data", "mock_scores.json")
        with open(data_path, "r") as f:
            data = json.load(f)
        return data.get("stress_results", {}).get(protocol_id, {}).get(scenario)
    except Exception as e:
        logger.warning(f"Failed to load mock stress result: {e}")
        return None
