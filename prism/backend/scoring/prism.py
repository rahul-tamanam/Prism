import logging
from scoring.divergence import calculate_divergence
from scoring.liquidity import calculate_liquidity_score
from scoring.liquidation import calculate_liquidation_score
from scoring.governance import calculate_governance_score
from scoring.oracle import calculate_oracle_score
from scoring.supply import calculate_supply_score
from scoring.narrative import calculate_narrative_score
from services.dune import fetch_unified_prism_row

logger = logging.getLogger(__name__)

PILLAR_WEIGHTS = {
    "liquidity": 0.23,
    "liquidation": 0.23,
    "governance": 0.19,
    "oracle": 0.14,
    "supply": 0.11,
    "narrative": 0.10,
}

TRIPLE_CONVERGENCE_PENALTY = 8.0


def get_action(score: float) -> str:
    """
    Map a PRISM composite score to an actionable recommendation.

    Thresholds reflect risk tolerance bands:
    - >=80: protocol is robust → ENTER (safe to add exposure)
    - >=60: acceptable risk → HOLD (maintain current position)
    - >=40: elevated risk → REDUCE (trim exposure)
    - <40: high risk → EXIT (close positions)
    """
    if score >= 80:
        return "ENTER"
    elif score >= 60:
        return "HOLD"
    elif score >= 40:
        return "REDUCE"
    else:
        return "EXIT"


def calculate_safe_position(liquidity_score: float) -> str:
    """
    Derive maximum safe position size as % of protocol TVL.

    Based on liquidity pillar score: safe_pct = (liquidity_score / 100) * 5
    Caps at 5% — even the healthiest protocol shouldn't hold >5% concentration.
    """
    safe_pct = round((liquidity_score / 100) * 5, 1)
    return f"Max {safe_pct}% of protocol TVL"


async def calculate_prism_score(protocol_id: str, protocol_config: dict) -> dict:
    """
    Calculate the master PRISM composite score for a protocol.

    Aggregation formula:
      raw = liquidity*0.23 + liquidation*0.23 + governance*0.19
            + oracle*0.14 + supply*0.11 + narrative*0.10

    Triple Convergence Alert: When ALL THREE conditions are met:
    1. Narrative mention spike detected
    2. New governance proposal in last 48h
    3. TVL declined >5% in 24h
    → Apply an 8-point penalty to raw score.

    This penalty captures the reflexive feedback loop where simultaneous
    narrative, governance, and liquidity stress compound risk non-linearly.
    """
    u_row, u_qid, _u_err = await fetch_unified_prism_row(protocol_config)

    liquidity_result = await calculate_liquidity_score(protocol_id, protocol_config, dune_unified_row=u_row)
    liquidation_result = await calculate_liquidation_score(
        protocol_id,
        protocol_config,
        dune_unified_row=u_row,
        dune_unified_query_id=u_qid,
    )
    governance_result = await calculate_governance_score(
        protocol_id,
        protocol_config,
        dune_unified_row=u_row,
        dune_unified_query_id=u_qid,
    )
    oracle_result = await calculate_oracle_score(protocol_id, protocol_config, dune_unified_row=u_row)
    supply_result = await calculate_supply_score(protocol_id, protocol_config, dune_unified_row=u_row)
    narrative_result = await calculate_narrative_score(
        protocol_id,
        protocol_config,
        dune_unified_row=u_row,
        dune_unified_query_id=u_qid,
    )

    pillar_scores = {
        "liquidity": liquidity_result["score"],
        "liquidation": liquidation_result["score"],
        "governance": governance_result["score"],
        "oracle": oracle_result["score"],
        "supply": supply_result["score"],
        "narrative": narrative_result["score"],
    }

    raw = sum(pillar_scores[k] * PILLAR_WEIGHTS[k] for k in PILLAR_WEIGHTS)

    spike_detected = narrative_result.get("spike_detected", False)
    has_recent_proposal = governance_result.get("has_recent_proposal_48h", False)
    tvl_data = liquidity_result.get("tvl_data", {})
    tvl_1d_change = tvl_data.get("change_1d_pct", 0)

    triple_convergence = (
        spike_detected
        and has_recent_proposal
        and tvl_1d_change < -5.0
    )

    if triple_convergence:
        raw = max(0, raw - TRIPLE_CONVERGENCE_PENALTY)
        logger.warning(f"TRIPLE CONVERGENCE ALERT for {protocol_id}: -8 penalty applied")

    tvl_usd = liquidity_result.get("tvl_data", {}).get("current_tvl", 0.0)
    score_history = protocol_config.get("_score_history", [])
    divergence_result = calculate_divergence(
        pillar_scores=pillar_scores,
        score_history=score_history,
        tvl_usd=tvl_usd,
    )

    score = round(max(0, min(100, raw)), 1)
    action = get_action(score)

    worst_pillar = min(pillar_scores, key=pillar_scores.get)

    return {
        "protocol_id": protocol_id,
        "name": protocol_config.get("name", protocol_id),
        "score": score,
        "action": action,
        "pillar_scores": {
            **pillar_scores,
            "triple_convergence_active": triple_convergence,
        },
        "worst_pillar": worst_pillar,
        "triple_convergence_active": triple_convergence,
        "safe_position_label": calculate_safe_position(pillar_scores["liquidity"]),
        "details": {
            "liquidity": liquidity_result,
            "liquidation": liquidation_result,
            "governance": governance_result,
            "oracle": oracle_result,
            "supply": supply_result,
            "narrative": narrative_result,
        },
        "divergence": divergence_result,
    }
