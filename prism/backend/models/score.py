from typing import Literal as TypingLiteral, Optional

from pydantic import BaseModel, Field


class PillarScores(BaseModel):
    liquidity: float
    liquidation: float
    governance: float
    oracle: float
    supply: float
    narrative: float
    triple_convergence_active: bool = False


class DivergencePair(BaseModel):
    pair: str
    signal_a: str
    signal_b: str
    score_a: float
    score_b: float
    raw_gap: float
    baseline_gap: float
    delta: float
    velocity: str
    widening: bool
    label: str
    real_world_precedent: str
    weight: float
    weighted_contribution: float


class DivergenceResult(BaseModel):
    drs: float
    velocity: str
    dominant_pair: str
    pairs: list[DivergencePair]
    alert: bool
    tvl_weight_applied: float
    interpretation: str


class PrismScoreResponse(BaseModel):
    protocol_id: str
    name: str
    score: float
    action: str
    pillar_scores: PillarScores
    worst_pillar: str
    triple_convergence_active: bool
    safe_position_label: str
    score_history: list[dict] = []
    timestamp: str
    divergence: Optional[DivergenceResult] = None


class ScoreHistoryPoint(BaseModel):
    date: str
    score: float
    action: str


class ExitCostRequest(BaseModel):
    position_size_usd: float = Field(gt=0, description="Position size in USD")
    urgency: TypingLiteral["immediate", "24h", "7d"] = "24h"


class ExitCostResponse(BaseModel):
    protocol_id: str
    position_size_usd: float
    urgency: str
    slippage_pct: float
    protocol_fee_pct: float
    utilization_penalty_pct: float
    total_cost_pct: float
    total_cost_usd: float
    max_safe_single_tx_usd: float
    optimal_chunks: int
    optimal_exit_hours: float
    exit_quality_rating: str
    recommendations: list[str]
