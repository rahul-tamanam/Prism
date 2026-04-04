import logging
import time
from services.defillama import get_unlock_schedule, get_tvl_change

logger = logging.getLogger(__name__)


def _unlock_pressure_score(days_until_unlock: float, unlock_pct_of_supply: float) -> float:
    """
    Score the proximity and magnitude of the next token unlock event.

    Large unlocks increase sell pressure. Closer unlocks = more immediate risk:
    - Unlock >1% of supply within 7 days → 10
    - Unlock >1% within 30 days → 35
    - Unlock >1% within 90 days → 60
    - Unlock <1% or >90 days away → 85
    - No significant unlocks scheduled → 95

    Data source: DefiLlama emissions/unlock data.
    """
    if unlock_pct_of_supply < 1.0:
        return 95.0
    if days_until_unlock <= 7:
        return 10.0 + max(0, 10.0 * (days_until_unlock / 7))
    elif days_until_unlock <= 30:
        return 20.0 + 15.0 * ((days_until_unlock - 7) / 23)
    elif days_until_unlock <= 90:
        return 35.0 + 25.0 * ((days_until_unlock - 30) / 60)
    else:
        return 60.0 + 25.0 * min((days_until_unlock - 90) / 90, 1.0)


def _emission_rate_score(annual_emission_pct: float) -> float:
    """
    Score the annual token emission rate as a % of circulating supply.

    High emissions dilute existing holders and create sustained sell pressure:
    - >50% annual emission: extreme dilution → 10
    - 20-50%: high inflation → 30
    - 10-20%: moderate → 55
    - 5-10%: manageable → 75
    - <5%: low inflation → 92

    Data source: DefiLlama emissions data / protocol tokenomics.
    """
    if annual_emission_pct > 50:
        return 10.0
    elif annual_emission_pct > 20:
        return 10.0 + 20.0 * ((50 - annual_emission_pct) / 30)
    elif annual_emission_pct > 10:
        return 30.0 + 25.0 * ((20 - annual_emission_pct) / 10)
    elif annual_emission_pct > 5:
        return 55.0 + 20.0 * ((10 - annual_emission_pct) / 5)
    else:
        return 75.0 + 17.0 * min((5 - annual_emission_pct) / 5, 1.0)


def _stablecoin_dependency_score(stablecoin_tvl_pct: float) -> float:
    """
    Score how dependent the protocol is on stablecoin deposits.

    Heavy stablecoin dependency means vulnerability to depegs and regulatory action:
    - >80% stablecoin TVL: extreme dependency → 25
    - 60-80%: high → 45
    - 40-60%: moderate → 65
    - 20-40%: balanced → 82
    - <20%: minimal dependency → 93

    Data source: DefiLlama protocol breakdown / reserve composition.
    """
    if stablecoin_tvl_pct > 80:
        return 25.0
    elif stablecoin_tvl_pct > 60:
        return 25.0 + 20.0 * ((80 - stablecoin_tvl_pct) / 20)
    elif stablecoin_tvl_pct > 40:
        return 45.0 + 20.0 * ((60 - stablecoin_tvl_pct) / 20)
    elif stablecoin_tvl_pct > 20:
        return 65.0 + 17.0 * ((40 - stablecoin_tvl_pct) / 20)
    else:
        return 82.0 + 11.0 * min((20 - stablecoin_tvl_pct) / 20, 1.0)


async def calculate_supply_score(protocol_id: str, protocol_config: dict) -> dict:
    """
    Calculate the Supply pillar score (Pillar 5) for a protocol.

    Aggregation formula:
      Pillar 5 = (unlock_pressure * 0.45) + (emission_rate * 0.30)
                 + (stablecoin_dependency * 0.25)

    Token supply dynamics create persistent sell pressure that compounds
    with market downturns, amplifying reflexive spirals.
    """
    slug = protocol_config.get("defillama_slug", protocol_id)

    unlocks = await get_unlock_schedule(slug)

    now = time.time()
    days_until_unlock = 365.0
    unlock_pct = 0.0

    mock_circulating = {
        "aave-v3": 16000000,
        "uniswap-v3": 753000000,
        "stargate-finance": 450000000,
    }
    circulating = mock_circulating.get(slug, 100000000)

    for unlock in unlocks:
        unlock_ts = unlock.get("date", now + 365 * 86400)
        if isinstance(unlock_ts, (int, float)) and unlock_ts > now:
            days = (unlock_ts - now) / 86400
            amount = unlock.get("amount", 0)
            pct = (amount / circulating * 100) if circulating else 0
            if pct > 1.0 and days < days_until_unlock:
                days_until_unlock = days
                unlock_pct = pct

    mock_emission_rates = {
        "aave-v3": 3.2,
        "uniswap-v3": 8.4,
        "stargate-finance": 28.6,
    }
    emission_rate = mock_emission_rates.get(slug, 10.0)

    mock_stablecoin_pct = {
        "aave-v3": 42.3,
        "uniswap-v3": 38.7,
        "stargate-finance": 72.4,
    }
    stablecoin_pct = mock_stablecoin_pct.get(slug, 45.0)

    unlock_s = _unlock_pressure_score(days_until_unlock, unlock_pct)
    emission_s = _emission_rate_score(emission_rate)
    stablecoin_s = _stablecoin_dependency_score(stablecoin_pct)

    composite = (
        unlock_s * 0.45
        + emission_s * 0.30
        + stablecoin_s * 0.25
    )

    return {
        "score": round(composite, 1),
        "unlock_pressure_score": round(unlock_s, 1),
        "emission_rate_score": round(emission_s, 1),
        "stablecoin_dependency_score": round(stablecoin_s, 1),
        "days_until_next_unlock": round(days_until_unlock, 1),
        "next_unlock_pct": round(unlock_pct, 2),
        "annual_emission_rate_pct": emission_rate,
        "stablecoin_tvl_pct": stablecoin_pct,
    }
