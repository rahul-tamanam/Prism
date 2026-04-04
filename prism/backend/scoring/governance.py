from __future__ import annotations

import logging
from typing import Any

from services.snapshot import get_governance_summary, get_recent_proposals
from services.dune import get_whale_concentration

logger = logging.getLogger(__name__)


def _hhi_score(hhi: float) -> float:
    """
    Score the Herfindahl-Hirschman Index of voting power concentration.

    HHI measures market concentration (here, voter power).
    - HHI > 0.40: extreme concentration (near-monopoly voting) → 5
    - 0.25-0.40: highly concentrated → 25
    - 0.15-0.25: moderately concentrated → 55
    - 0.05-0.15: competitive → 80
    - <0.05: highly distributed → 95

    Data source: Snapshot governance votes.
    """
    if hhi > 0.40:
        return 5.0
    elif hhi > 0.25:
        return 5.0 + 20.0 * ((0.40 - hhi) / 0.15)
    elif hhi > 0.15:
        return 25.0 + 30.0 * ((0.25 - hhi) / 0.10)
    elif hhi > 0.05:
        return 55.0 + 25.0 * ((0.15 - hhi) / 0.10)
    else:
        return 80.0 + 15.0 * min((0.05 - hhi) / 0.05, 1.0)


def _top5_share_score(share_pct: float) -> float:
    """
    Score the voting power share held by the top 5 voters.

    High concentration in few wallets undermines decentralization:
    - >80%: near-total control → 10
    - 60-80%: dominated → 30
    - 40-60%: concerning → 55
    - 20-40%: healthy → 80
    - <20%: excellent distribution → 95

    Data source: Snapshot governance votes, ranked by voting power.
    """
    if share_pct > 80:
        return 10.0
    elif share_pct > 60:
        return 10.0 + 20.0 * ((80 - share_pct) / 20)
    elif share_pct > 40:
        return 30.0 + 25.0 * ((60 - share_pct) / 20)
    elif share_pct > 20:
        return 55.0 + 25.0 * ((40 - share_pct) / 20)
    else:
        return 80.0 + 15.0 * min((20 - share_pct) / 20, 1.0)


def _quorum_participation_score(avg_quorum_ratio: float) -> float:
    """
    Score average quorum participation across recent proposals.

    avg_quorum_ratio = scores_total / quorum_threshold (>1.0 means quorum met).
    Low participation enables governance attacks with minority stake:
    - <0.5: critically low → 15
    - 0.5-0.8: concerning → 40
    - 0.8-1.0: borderline → 60
    - 1.0-1.5: healthy → 80
    - >1.5: robust participation → 95

    Data source: Snapshot proposal quorum data.
    """
    if avg_quorum_ratio < 0.5:
        return 15.0
    elif avg_quorum_ratio < 0.8:
        return 15.0 + 25.0 * ((avg_quorum_ratio - 0.5) / 0.3)
    elif avg_quorum_ratio < 1.0:
        return 40.0 + 20.0 * ((avg_quorum_ratio - 0.8) / 0.2)
    elif avg_quorum_ratio < 1.5:
        return 60.0 + 20.0 * ((avg_quorum_ratio - 1.0) / 0.5)
    else:
        return 80.0 + 15.0 * min((avg_quorum_ratio - 1.5) / 0.5, 1.0)


def _proposal_spike_score(proposal_count_30d: int) -> float:
    """
    Score governance activity level (proposal volume in 30 days).

    Unusual spikes in proposals can signal contentious governance:
    - >10 proposals: governance crisis → 20
    - 6-10: elevated activity → 45
    - 3-5: normal cadence → 75
    - 1-2: low activity (could be good or concerning) → 85
    - 0: inactive governance → 60

    Data source: Snapshot proposal count.
    """
    if proposal_count_30d == 0:
        return 60.0
    elif proposal_count_30d <= 2:
        return 85.0
    elif proposal_count_30d <= 5:
        return 75.0
    elif proposal_count_30d <= 10:
        return 45.0 + 30.0 * ((10 - proposal_count_30d) / 5)
    else:
        return max(20.0, 45.0 - 5.0 * (proposal_count_30d - 10))


async def calculate_governance_score(
    protocol_id: str,
    protocol_config: dict,
    *,
    dune_unified_row: dict[str, Any] | None = None,
    dune_unified_query_id: int | None = None,
) -> dict:
    """
    Calculate the Governance pillar score (Pillar 3) for a protocol.

    Aggregation formula:
      Pillar 3 = (hhi * 0.35) + (top5_share * 0.30)
                 + (quorum * 0.20) + (proposal_spike * 0.15)

    Governance risk is measured through voting power concentration,
    participation rates, and activity anomalies.
    """
    space = protocol_config.get("snapshot_space", "")
    gov_summary = await get_governance_summary(space)

    hhi = float(gov_summary.get("hhi", 0.25))

    whale = await get_whale_concentration(
        protocol_config,
        unified_row=dune_unified_row,
        unified_query_id=dune_unified_query_id,
    )
    if whale.get("source") == "dune":
        gini = whale.get("gini_coefficient")
        if isinstance(gini, (int, float)):
            hhi = min(1.0, (hhi + float(gini)) / 2.0)
        elif whale.get("top_10_pct_supply") is not None:
            try:
                t10 = float(whale["top_10_pct_supply"]) / 100.0
                hhi = min(1.0, (hhi + min(1.0, t10 * t10 * 2.5)) / 2.0)
            except (TypeError, ValueError):
                pass
    top5 = gov_summary.get("top_5_voter_share", 70.0)
    quorum = gov_summary.get("avg_quorum_participation", 0.8)
    proposal_count = gov_summary.get("proposal_count_30d", 2)

    hhi_s = _hhi_score(hhi)
    top5_s = _top5_share_score(top5)
    quorum_s = _quorum_participation_score(quorum)
    proposal_s = _proposal_spike_score(proposal_count)

    composite = (
        hhi_s * 0.35
        + top5_s * 0.30
        + quorum_s * 0.20
        + proposal_s * 0.15
    )

    proposals = await get_recent_proposals(space)
    import time
    now = int(time.time())
    recent_48h = [p for p in proposals if p.get("created", 0) > now - 48 * 3600]

    return {
        "score": round(composite, 1),
        "hhi_score": round(hhi_s, 1),
        "top5_share_score": round(top5_s, 1),
        "quorum_participation_score": round(quorum_s, 1),
        "proposal_spike_score": round(proposal_s, 1),
        "raw_hhi": round(hhi, 4),
        "raw_top5_share": round(top5, 1),
        "proposal_count_30d": proposal_count,
        "has_recent_proposal_48h": len(recent_48h) > 0,
        "dune_whale_source": whale.get("source"),
        "dune_whale_gini": whale.get("gini_coefficient"),
        "dune_whale_top10_pct": whale.get("top_10_pct_supply"),
        "dune_whale_error": whale.get("dune_error"),
    }
