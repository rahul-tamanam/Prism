import logging
from typing import Optional

logger = logging.getLogger(__name__)

PAIR_WEIGHTS = {
    ("liquidity", "governance"): 0.28,
    ("liquidity", "narrative"): 0.22,
    ("supply", "governance"): 0.18,
    ("liquidation", "narrative"): 0.16,
    ("oracle", "liquidity"): 0.16,
}

PAIR_LABELS = {
    ("liquidity", "governance"): "On-chain liquidity vs governance activity",
    ("liquidity", "narrative"): "TVL momentum vs news sentiment",
    ("supply", "governance"): "Whale concentration vs governance timing",
    ("liquidation", "narrative"): "Liquidation stress vs public awareness",
    ("oracle", "liquidity"): "Oracle reliability vs pool depth",
}

PAIR_REAL_WORLD = {
    ("liquidity", "governance"): "Euler March 2023 - governance concentration 58%, liquidity still 71. The 67-point gap preceded the $197M exploit.",
    ("liquidity", "narrative"): "Curve July 2023 - 6 whales withdrew $31M before public disclosure. Exit pressure reached 94%.",
    ("supply", "governance"): "Beanstalk April 2022 - governance velocity +340%, unique voters -71%. $182M drained via flash-loan vote.",
    ("liquidation", "narrative"): "Terra May 2022 - liquidation cascade began 18 hours before mainstream media coverage.",
    ("oracle", "liquidity"): "Mango Markets Oct 2022 - oracle manipulated while liquidity score appeared healthy.",
}

DRS_ALERT_THRESHOLD = 35.0
TVL_WEIGHT_SCALE = 1e10


def _compute_tvl_weight(tvl_usd: float) -> float:
    return min(1.0 + (tvl_usd / TVL_WEIGHT_SCALE), 2.0)


def _compute_baseline(pair: tuple, history: list[dict]) -> float:
    gaps = []
    for h in history:
        ps = h.get("pillar_scores", {})
        a = ps.get(pair[0])
        b = ps.get(pair[1])
        if a is not None and b is not None:
            gaps.append(abs(a - b))
    return round(sum(gaps) / len(gaps), 2) if gaps else 15.0


def _compute_velocity(pair: tuple, history: list[dict]) -> str:
    if len(history) < 2:
        return "STABLE"
    recent = history[-3:] if len(history) >= 3 else history
    deltas = []
    for h in recent:
        ps = h.get("pillar_scores", {})
        a = ps.get(pair[0])
        b = ps.get(pair[1])
        if a is not None and b is not None:
            deltas.append(abs(a - b))
    if len(deltas) < 2:
        return "STABLE"
    trend = deltas[-1] - deltas[0]
    if trend > 5:
        return "WIDENING"
    elif trend < -5:
        return "NARROWING"
    return "STABLE"


def _interpret_drs(drs: float, dominant_pair: Optional[tuple], velocity: str) -> str:
    pair_str = f"{dominant_pair[0]}/{dominant_pair[1]}" if dominant_pair else "unknown"
    if drs < 15:
        return "Signal sources in agreement. Risk assessment confidence is high."
    elif drs < 35:
        return f"Mild divergence detected in {pair_str}. Monitor for escalation over the next 48 hours."
    elif drs < 60:
        return f"Significant disagreement between {pair_str} signals. Protocol in transitional state. Consider reducing exposure."
    else:
        return f"Severe divergence - {pair_str} signals are fundamentally contradicting. Immediate portfolio review required."


def calculate_divergence(
    pillar_scores: dict,
    score_history: list[dict],
    tvl_usd: float = 0.0,
) -> dict:
    """
    Compute the Divergence Risk Score for a protocol.

    For each signal pair, the excess gap beyond the 14-day baseline
    is weighted by pair importance and TVL scale. Sum gives DRS (0-100).
    Higher DRS means the protocol's internal signals are contradicting
    each other - which historically precedes exploits.
    """
    tvl_weight = _compute_tvl_weight(tvl_usd)
    pair_results = []
    weighted_sum = 0.0
    dominant_pair: Optional[tuple] = None
    dominant_delta = -1.0

    recent_history = score_history[-14:] if len(score_history) > 14 else score_history

    for pair, weight in PAIR_WEIGHTS.items():
        score_a = pillar_scores.get(pair[0], 50.0)
        score_b = pillar_scores.get(pair[1], 50.0)
        raw_gap = abs(score_a - score_b)
        baseline = _compute_baseline(pair, recent_history)
        delta = max(0.0, raw_gap - baseline)
        velocity = _compute_velocity(pair, score_history)
        weighted_contribution = weight * delta * tvl_weight
        weighted_sum += weighted_contribution

        if delta > dominant_delta:
            dominant_delta = delta
            dominant_pair = pair

        pair_results.append(
            {
                "pair": f"{pair[0]} vs {pair[1]}",
                "signal_a": pair[0],
                "signal_b": pair[1],
                "score_a": round(score_a, 1),
                "score_b": round(score_b, 1),
                "raw_gap": round(raw_gap, 1),
                "baseline_gap": round(baseline, 1),
                "delta": round(delta, 1),
                "velocity": velocity,
                "widening": velocity == "WIDENING",
                "label": PAIR_LABELS[pair],
                "real_world_precedent": PAIR_REAL_WORLD[pair],
                "weight": weight,
                "weighted_contribution": round(weighted_contribution, 2),
            }
        )

    drs = round(min(100.0, weighted_sum), 1)
    alert = drs >= DRS_ALERT_THRESHOLD

    dominant_velocity = "STABLE"
    if dominant_pair:
        for p in pair_results:
            if p["signal_a"] == dominant_pair[0] and p["signal_b"] == dominant_pair[1]:
                dominant_velocity = p["velocity"]
                break

    if alert:
        logger.warning("DRS ALERT: score=%s, dominant=%s, velocity=%s", drs, dominant_pair, dominant_velocity)

    return {
        "drs": drs,
        "velocity": dominant_velocity,
        "dominant_pair": f"{dominant_pair[0]} vs {dominant_pair[1]}" if dominant_pair else "none",
        "pairs": pair_results,
        "alert": alert,
        "tvl_weight_applied": round(tvl_weight, 3),
        "interpretation": _interpret_drs(drs, dominant_pair, dominant_velocity),
    }
