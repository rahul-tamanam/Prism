from pydantic import BaseModel


class StressRequest(BaseModel):
    scenario: str


class StressResult(BaseModel):
    scenario: str
    base_score: float
    stressed_score: float
    base_action: str
    stressed_action: str
    pillar_deltas: dict[str, float]
    most_affected_pillar: str
    narrative: str
