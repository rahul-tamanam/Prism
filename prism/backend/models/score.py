from pydantic import BaseModel


class PillarScores(BaseModel):
    liquidity: float
    liquidation: float
    governance: float
    oracle: float
    supply: float
    narrative: float
    triple_convergence_active: bool = False


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


class ScoreHistoryPoint(BaseModel):
    date: str
    score: float
    action: str
