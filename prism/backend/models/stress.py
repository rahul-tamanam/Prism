from pydantic import BaseModel, Field


class StressRequest(BaseModel):
    scenario: str


class MonteCarloRequest(BaseModel):
    scenario: str
    iterations: int = Field(default=2000, ge=1, le=10_000)
    sigma: float = Field(default=0.25, gt=0, le=2.0)
    seed: int | None = None


class StressResult(BaseModel):
    scenario: str
    base_score: float
    stressed_score: float
    base_action: str
    stressed_action: str
    pillar_deltas: dict[str, float]
    most_affected_pillar: str
    narrative: str
