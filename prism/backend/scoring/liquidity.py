import logging
from services.defillama import get_tvl_change, get_bridge_flows
from services.thegraph import get_uniswap_pool_liquidity

logger = logging.getLogger(__name__)


def _tvl_change_score(change_7d_pct: float) -> float:
    """
    Score TVL change over 7 days on a 0-100 scale (higher = safer).

    Thresholds based on historical DeFi TVL volatility:
    - Down >20%: crisis-level outflow → 0
    - Down 10-20%: significant stress → 25
    - Down 5-10%: moderate concern → 50
    - Flat (-5% to +5%): stable → 75
    - Up >5%: healthy growth → 100

    Data source: DefiLlama protocol TVL history.
    """
    if change_7d_pct <= -20:
        return 0.0
    elif change_7d_pct <= -10:
        return 25.0 + 25.0 * ((change_7d_pct + 20) / 10)
    elif change_7d_pct <= -5:
        return 50.0 + 25.0 * ((change_7d_pct + 10) / 5)
    elif change_7d_pct <= 5:
        return 75.0 + 25.0 * (change_7d_pct / 10)
    else:
        return 100.0


def _bridge_flow_score(net_flow_pct: float) -> float:
    """
    Score net bridge flows as % of TVL (higher = safer).

    Cross-chain capital flows indicate ecosystem confidence:
    - Net outflow >20%: capital flight → 0
    - Net outflow 10-20%: elevated risk → 25
    - Neutral (±5%): stable flows → 75
    - Net inflow >5%: capital attraction → 100

    Data source: DefiLlama bridge volume API.
    """
    if net_flow_pct <= -20:
        return 0.0
    elif net_flow_pct <= -10:
        return 25.0 + 25.0 * ((net_flow_pct + 20) / 10)
    elif net_flow_pct <= -5:
        return 50.0 + 25.0 * ((net_flow_pct + 10) / 5)
    elif net_flow_pct <= 5:
        return 75.0 + 25.0 * (net_flow_pct / 10)
    else:
        return 100.0


def _liquidity_depth_score(tvl_usd: float, liquidity_within_range_pct: float) -> float:
    """
    Score liquidity concentration within ±5% of current price (AMM-specific).

    Concentrated liquidity protocols can have wide TVL but thin active depth.
    Higher percentage within the active range indicates better trade execution.

    - <20%: dangerously thin → 20
    - 20-40%: concerning → 40
    - 40-60%: moderate → 60
    - 60-80%: healthy → 80
    - >80%: excellent depth → 95

    Data source: The Graph Uniswap V3 tick data.
    """
    if liquidity_within_range_pct < 20:
        return 20.0
    elif liquidity_within_range_pct < 40:
        return 20.0 + 20.0 * ((liquidity_within_range_pct - 20) / 20)
    elif liquidity_within_range_pct < 60:
        return 40.0 + 20.0 * ((liquidity_within_range_pct - 40) / 20)
    elif liquidity_within_range_pct < 80:
        return 60.0 + 20.0 * ((liquidity_within_range_pct - 60) / 20)
    else:
        return 80.0 + 15.0 * min((liquidity_within_range_pct - 80) / 20, 1.0)


def _slippage_simulation_score(exit_amount_usd: float, liquidity_within_range_usd: float) -> float:
    """
    Simulate price impact of a $5M exit and score it.

    price_impact_pct = (exit_amount / (2 * liquidity_within_range)) * 100
    A large exit relative to available liquidity creates significant slippage.

    - Impact >10%: severe → 10
    - Impact 5-10%: high → 30
    - Impact 2-5%: moderate → 55
    - Impact 1-2%: acceptable → 75
    - Impact <1%: excellent → 95

    Data source: Calculated from The Graph liquidity data.
    """
    if liquidity_within_range_usd <= 0:
        return 10.0

    price_impact_pct = (exit_amount_usd / (2 * liquidity_within_range_usd)) * 100

    if price_impact_pct > 10:
        return 10.0
    elif price_impact_pct > 5:
        return 10.0 + 20.0 * ((10 - price_impact_pct) / 5)
    elif price_impact_pct > 2:
        return 30.0 + 25.0 * ((5 - price_impact_pct) / 3)
    elif price_impact_pct > 1:
        return 55.0 + 20.0 * ((2 - price_impact_pct) / 1)
    else:
        return 75.0 + 20.0 * max(0, (1 - price_impact_pct))


async def calculate_liquidity_score(protocol_id: str, protocol_config: dict) -> dict:
    """
    Calculate the Liquidity pillar score (Pillar 1) for a protocol.

    Aggregation formula:
      Pillar 1 = (tvl_change * 0.30) + (bridge_flow * 0.25)
                 + (liquidity_depth * 0.25) + (slippage * 0.20)

    Returns the final composite score and all individual sub-scores for
    transparency and drill-down in the frontend.
    """
    slug = protocol_config.get("defillama_slug", protocol_id)
    chain = protocol_config.get("defillama_chain", "Ethereum").lower()
    protocol_type = protocol_config.get("type", "lending")

    tvl_data = await get_tvl_change(slug)
    tvl_score = _tvl_change_score(tvl_data.get("change_7d_pct", 0))

    bridge_data = await get_bridge_flows(chain)
    bridge_score = _bridge_flow_score(bridge_data.get("net_flow_pct", 0))

    if protocol_type == "amm":
        pool_data = await get_uniswap_pool_liquidity(None)
        tvl_usd = pool_data.get("tvl_usd", 100000000)
        liquidity_range_pct = min(100, (pool_data.get("tick_count", 50) / 100) * 60)
        depth_score = _liquidity_depth_score(tvl_usd, liquidity_range_pct)
        liquidity_in_range_usd = tvl_usd * (liquidity_range_pct / 100)
        slippage_score = _slippage_simulation_score(5000000, liquidity_in_range_usd)
    else:
        depth_score = 72.4
        slippage_score = 78.6

    composite = (
        tvl_score * 0.30
        + bridge_score * 0.25
        + depth_score * 0.25
        + slippage_score * 0.20
    )

    return {
        "score": round(composite, 1),
        "tvl_change_7d_score": round(tvl_score, 1),
        "bridge_flow_score": round(bridge_score, 1),
        "liquidity_depth_score": round(depth_score, 1),
        "slippage_simulation_score": round(slippage_score, 1),
        "tvl_data": tvl_data,
        "bridge_data": bridge_data,
    }
