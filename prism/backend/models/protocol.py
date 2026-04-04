from pydantic import BaseModel
from typing import Optional


class ProtocolConfig(BaseModel):
    id: str
    name: str
    type: str
    chain: str
    description: str
    defillama_slug: str
    defillama_chain: str
    dune_dashboard_id: Optional[str] = None
    thegraph_subgraph: Optional[str] = None
    snapshot_space: str
    tally_org: Optional[str] = None
    token_symbol: str
    coingecko_id: str
    chainlink_feeds: list[str]
    color: str
    logo: str


class ProtocolSummary(BaseModel):
    id: str
    name: str
    type: str
    chain: str
    color: str
    logo: str
    current_tvl: float
