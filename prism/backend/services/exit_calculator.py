import math
from typing import Literal

ExitUrgency = Literal["immediate", "24h", "7d"]

PROTOCOL_LIQUIDITY_PARAMS = {
    "aave-v3": {
        "depth_1pct_usd": 45_000_000,
        "depth_5pct_usd": 180_000_000,
        "avg_daily_volume_usd": 320_000_000,
        "utilization_rate": 0.72,
        "exit_fee_bps": 0,
    },
    "uniswap-v3": {
        "depth_1pct_usd": 28_000_000,
        "depth_5pct_usd": 95_000_000,
        "avg_daily_volume_usd": 890_000_000,
        "utilization_rate": 0.0,
        "exit_fee_bps": 5,
    },
    "stargate": {
        "depth_1pct_usd": 4_200_000,
        "depth_5pct_usd": 12_000_000,
        "avg_daily_volume_usd": 18_000_000,
        "utilization_rate": 0.0,
        "exit_fee_bps": 6,
    },
}

DEFAULT_PARAMS = {
    "depth_1pct_usd": 10_000_000,
    "depth_5pct_usd": 40_000_000,
    "avg_daily_volume_usd": 50_000_000,
    "utilization_rate": 0.5,
    "exit_fee_bps": 0,
}

URGENCY_MULTIPLIERS = {
    "immediate": {"time_hours": 1, "slippage_mult": 3.2, "volume_fraction": 0.05},
    "24h": {"time_hours": 24, "slippage_mult": 1.0, "volume_fraction": 0.40},
    "7d": {"time_hours": 168, "slippage_mult": 0.4, "volume_fraction": 0.95},
}


def _slippage_pct(position_usd: float, depth_1pct: float, depth_5pct: float, mult: float) -> float:
    """
    Estimate price impact using a piecewise linear depth curve.
    depth_1pct_usd = liquidity available within 1% of current price
    depth_5pct_usd = liquidity available within 5% of current price
    mult = urgency multiplier (higher urgency = more slippage)
    """
    if position_usd <= depth_1pct:
        raw = (position_usd / depth_1pct) * 1.0
    elif position_usd <= depth_5pct:
        raw = 1.0 + ((position_usd - depth_1pct) / (depth_5pct - depth_1pct)) * 4.0
    else:
        raw = 5.0 + math.log(position_usd / depth_5pct) * 3.5
    return round(min(raw * mult, 25.0), 3)


def _optimal_chunk_usd(params: dict, urgency: str) -> float:
    """
    Maximum single transaction size that keeps slippage under 0.5%.
    Based on available depth and urgency-adjusted volume capacity.
    """
    urg = URGENCY_MULTIPLIERS[urgency]
    volume_capacity = params["avg_daily_volume_usd"] * urg["volume_fraction"]
    depth_capacity = params["depth_1pct_usd"] * 0.6
    return min(volume_capacity, depth_capacity)


def _optimal_exit_hours(position_usd: float, params: dict) -> float:
    """
    Hours needed to exit cleanly at <0.5% slippage by spreading across volume.
    """
    daily_vol = params["avg_daily_volume_usd"]
    safe_daily_exit = daily_vol * 0.15
    if safe_daily_exit <= 0:
        return 168.0
    hours = (position_usd / safe_daily_exit) * 24
    return round(min(hours, 168.0), 1)


def calculate_exit_cost(
    protocol_id: str,
    position_size_usd: float,
    urgency: ExitUrgency,
    current_tvl_usd: float = 0.0,
    liquidity_pillar_score: float = 50.0,
) -> dict:
    """
    Calculate the true cost of exiting a DeFi position.

    Adjusts base liquidity parameters by the live liquidity pillar score
    from the PRISM engine - a low score compresses available depth further.
    """
    _ = current_tvl_usd  # reserved for future TVL-scaled depth
    params = PROTOCOL_LIQUIDITY_PARAMS.get(protocol_id, DEFAULT_PARAMS).copy()

    score_adj = liquidity_pillar_score / 75.0
    params["depth_1pct_usd"] = params["depth_1pct_usd"] * score_adj
    params["depth_5pct_usd"] = params["depth_5pct_usd"] * score_adj

    urg = URGENCY_MULTIPLIERS[urgency]
    slippage = _slippage_pct(
        position_size_usd,
        params["depth_1pct_usd"],
        params["depth_5pct_usd"],
        urg["slippage_mult"],
    )
    fee_pct = params["exit_fee_bps"] / 100.0
    utilization_penalty = params["utilization_rate"] * 0.5

    total_cost_pct = round(slippage + fee_pct + utilization_penalty, 3)
    total_cost_usd = round(position_size_usd * total_cost_pct / 100, 2)
    max_safe_tx_usd = _optimal_chunk_usd(params, urgency)
    n_chunks = math.ceil(position_size_usd / max_safe_tx_usd) if max_safe_tx_usd > 0 else 1
    optimal_hours = _optimal_exit_hours(position_size_usd, params)

    rating = (
        "GOOD"
        if total_cost_pct < 0.5
        else "MODERATE"
        if total_cost_pct < 2.0
        else "HIGH"
        if total_cost_pct < 5.0
        else "CRITICAL"
    )

    recommendations = []
    if urgency == "immediate" and total_cost_pct > 1.0:
        recommendations.append(f"Spreading exit over 24h reduces cost to ~{round(total_cost_pct * 0.3, 2)}%")
    if n_chunks > 1:
        recommendations.append(f"Split into {n_chunks} transactions of ~${max_safe_tx_usd:,.0f} to limit per-trade impact")
    if params["utilization_rate"] > 0.8:
        recommendations.append("High utilization - consider waiting for rate normalization before withdrawing")

    return {
        "protocol_id": protocol_id,
        "position_size_usd": position_size_usd,
        "urgency": urgency,
        "slippage_pct": slippage,
        "protocol_fee_pct": fee_pct,
        "utilization_penalty_pct": round(utilization_penalty, 3),
        "total_cost_pct": total_cost_pct,
        "total_cost_usd": total_cost_usd,
        "max_safe_single_tx_usd": round(max_safe_tx_usd, 2),
        "optimal_chunks": n_chunks,
        "optimal_exit_hours": optimal_hours,
        "exit_quality_rating": rating,
        "recommendations": recommendations,
    }
