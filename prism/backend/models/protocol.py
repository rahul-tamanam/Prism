from pydantic import BaseModel, Field
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
    dune_prism_query_id: Optional[int] = Field(
        default=None,
        description="Single Dune query supplying all PRISM pillar snippets (first row).",
    )
    dune_whale_query_id: Optional[int] = None
    dune_users_query_id: Optional[int] = None
    dune_liquidations_query_id: Optional[int] = None
    thegraph_subgraph: Optional[str] = Field(
        default=None,
        description="The Graph deployment ID for gateway, or a full GraphQL URL (Studio/legacy).",
    )
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
