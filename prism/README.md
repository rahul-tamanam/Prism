# PRISM - Protocol Reflexivity, Insolvency, Stress & Marketability Score

**DeFi Exit Capacity & Reflexivity Risk Engine**

PRISM is a fund-grade DeFi risk intelligence platform that helps portfolio managers determine how much capital they can safely hold in a DeFi protocol and when to enter, hold, reduce, or exit positions. Unlike conventional dashboards that track TVL as a vanity metric, PRISM measures *TVL quality* - whether your position size is too large for the protocol's real exit liquidity under stress.

The platform produces a master **PRISM Score** (0–100) per protocol, computed across six risk pillars: Liquidity Resilience, Liquidation Cascade Risk, Governance Capture Risk, Oracle & Infrastructure Risk, Reflexive Supply Pressure, and Narrative Risk. Each pillar pulls from on-chain data, governance APIs, oracle feeds, and sentiment analysis to generate an actionable recommendation: **ENTER**, **HOLD**, **REDUCE**, or **EXIT**.

PRISM includes a Stress Lab for scenario-based risk simulation (ETH price crashes, whale exits, bridge outflows, governance attacks, oracle staleness) and a Triple Convergence Alert system that fires when negative sentiment, governance activity, and TVL drawdown occur simultaneously - the strongest empirical signal of imminent protocol distress.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        PRISM Frontend (React)                       │
│  ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌─────────┐ ┌───────┐ │
│  │ Protocol  │ │    Risk      │ │  Stress  │ │Narrative│ │Portfo-│ │
│  │  Radar    │ │Decomposition │ │   Lab    │ │  Feed   │ │ lio   │ │
│  └──────────┘ └──────────────┘ └──────────┘ └─────────┘ └───────┘ │
│                    Recharts · Framer Motion · TailwindCSS           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ REST API (localhost:8000/api)
┌──────────────────────────────┴──────────────────────────────────────┐
│                        PRISM Backend (FastAPI)                      │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                        Scoring Engine                          │ │
│  │  Liquidity · Liquidation · Governance · Oracle · Supply · NAR  │ │
│  │              Master Aggregation · Stress Simulator              │ │
│  └────────────────────────┬───────────────────────────────────────┘ │
│  ┌────────────────────────┴───────────────────────────────────────┐ │
│  │                       Data Services                            │ │
│  │  DefiLlama · The Graph · Snapshot · Chainlink · News (RSS/GNews) │ │
│  └────────────────────────────────────────────────────────────────┘ │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Cache (In-Memory + TTL)                     │ │
│  └────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
         │           │            │            │            │
    DefiLlama   The Graph    Snapshot     Chainlink   News feeds
    (TVL/Fees)  (Aave/Uni)  (Governance) (Oracles)    (News/NLP)
```

---

## Setup Instructions

### Prerequisites

- **Python 3.11+** with pip
- **Node.js 18+** with npm
- Git (optional)

### 1. Clone / Navigate to the project

```bash
cd prism
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env and add your API keys (optional - app works without them)
uvicorn main:app --reload --port 8000
```

The backend starts at `http://localhost:8000`. Verify with:

```bash
curl http://localhost:8000/health
# → {"status": "ok", "protocols_loaded": 3}
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend starts at `http://localhost:5173`. Open it in your browser.

### 4. API Keys (Optional)

The platform works with public DefiLlama/Snapshot/RSS out of the box. Add keys for The Graph (required for live subgraph IDs in `protocols.json`), optional GNews/CryptoPanic, and optional dedicated Ethereum RPC:

| Service | Key Required? | Where to Get It | What It Powers |
|---------|:------------:|-----------------|----------------|
| DefiLlama | No | Public API | TVL, bridge flows, fees, unlocks |
| Snapshot | No | Public GraphQL | Governance proposals, voting power |
| News (RSS / GNews / CryptoPanic) | No / optional | [gnews.io](https://gnews.io/) (optional key); RSS default | Headlines for narrative sentiment |
| The Graph | Yes (Studio key) | [thegraph.com/studio](https://thegraph.com/studio/) | Aave health factors, Uniswap liquidity via gateway |
| Dune Analytics | Yes (free) | [dune.com/settings/api](https://dune.com/settings/api) | Reserved for advanced queries |

Add to `backend/.env` (see `.env.example`):
```
THEGRAPH_API_KEY=your_graph_studio_key
GNEWS_API_KEY=optional
ETHEREUM_RPC_URL=https://...   # optional Infura/Alchemy
```

---

## PRISM Score - Six Pillars

### Pillar 1: Liquidity Resilience (23%)

Measures how easily capital can exit the protocol without destabilizing it.

| Sub-Score | Weight | Data Source |
|-----------|--------|-------------|
| TVL 7-day change | 30% | DefiLlama |
| Bridge net flow | 25% | DefiLlama Bridges |
| Liquidity depth (±5% range) | 25% | The Graph (Uniswap ticks) |
| $5M exit slippage simulation | 20% | Computed from depth |

### Pillar 2: Liquidation Cascade Risk (23%)

Quantifies the fragility of the borrower base and exposure to correlated liquidations.

| Sub-Score | Weight | Data Source |
|-----------|--------|-------------|
| % borrowed value near liquidation (HF < 1.2) | 35% | The Graph (Aave) |
| Health factor fragility (avg HF) | 25% | The Graph (Aave) |
| Collateral concentration | 20% | Protocol data |
| ETH -15% shock simulation | 20% | Computed |

### Pillar 3: Governance Capture Risk (19%)

Detects whether a small group could force malicious governance actions.

| Sub-Score | Weight | Data Source |
|-----------|--------|-------------|
| Herfindahl-Hirschman Index (HHI) | 35% | Snapshot votes |
| Top-5 wallet voting share | 30% | Snapshot votes |
| Quorum participation rate | 20% | Snapshot proposals |
| Proposal activity spike | 15% | Snapshot proposals |

### Pillar 4: Oracle & Infrastructure Risk (14%)

Assesses dependency on price feed infrastructure.

| Sub-Score | Weight | Data Source |
|-----------|--------|-------------|
| Feed freshness ratio | 50% | Chainlink on-chain |
| Single oracle dependency | 25% | Protocol config |
| Price deviation vs CoinGecko | 25% | Chainlink + CoinGecko |

### Pillar 5: Reflexive Supply Pressure (11%)

Measures token emission and unlock pressure that could create reflexive selling.

| Sub-Score | Weight | Data Source |
|-----------|--------|-------------|
| Days until next unlock (>1% supply) | 45% | DefiLlama emissions |
| Annual emission rate vs circulating | 30% | Protocol data |
| Stablecoin concentration in TVL | 25% | DefiLlama |

### Pillar 6: Narrative Risk (10%)

Tracks media sentiment and social signal velocity.

| Sub-Score | Weight | Data Source |
|-----------|--------|-------------|
| VADER sentiment score | 40% | News feed + VADER NLP |
| Negative article ratio | 35% | News feed |
| Mention velocity spike | 25% | News feed |

### Master Aggregation

```
PRISM = Liquidity×0.23 + Liquidation×0.23 + Governance×0.19
      + Oracle×0.14 + Supply×0.11 + Narrative×0.10
```

**Triple Convergence Penalty:** When all three conditions fire simultaneously - sentiment spike + new governance proposal + TVL drawdown >5% - the score is reduced by 8 points and the action recommendation escalates one level.

### Action Thresholds

| Score Range | Action | Meaning |
|:-----------:|:------:|---------|
| 80–100 | **ENTER** | Safe to increase position |
| 60–79 | **HOLD** | Maintain current exposure |
| 40–59 | **REDUCE** | De-risk, trim position |
| 0–39 | **EXIT** | Withdraw capital immediately |

---

## Dashboard Pages

### 1. Protocol Radar (`/`)
Overview of all monitored protocols with PRISM scores, radar charts, action badges, and 30-day score trend lines. Entry point for the platform.

### 2. Risk Decomposition (`/decomposition`)
Deep dive into the selected protocol's six pillar scores. Large radar chart visualization with individual pillar cards showing sub-scores, progress bars, and risk narratives. Shows Triple Convergence Alert when active.

### 3. Stress Lab (`/stress`)
Interactive scenario simulator. Select from six predefined stress scenarios (ETH -10%, ETH -20%, whale exit, bridge outflow, governance spike, oracle staleness) and observe how the PRISM score responds. Includes a **Four-Act Cascade** demo that sequences through escalating scenarios with animated score progression.

### 4. Narrative Feed (`/narrative`)
Sentiment analysis dashboard with gauge chart, mention velocity timeline, and curated news feed. Each article is scored with VADER sentiment analysis and displayed with color-coded sentiment badges.

### 5. Portfolio View (`/portfolio`)
Cross-protocol portfolio risk assessment. Fragility-ranked protocol table, safe allocation chart, and three recommendation cards covering position sizing, correlation risk, and exit sequencing.

---

## Stress Lab - Four-Act Cascade Demo

The signature demo sequence simulates a cascading market event:

1. **Stage 1 - Bridge Outflow:** Capital begins fleeing cross-chain
2. **Stage 2 - Whale Exit:** Large holder withdraws 15% of TVL
3. **Stage 3 - Governance Spike:** Emergency proposals appear
4. **Stage 4 - Market Crash:** ETH drops 20% + oracle feeds go stale

Each stage animates the score declining in real-time with action badge transitions. This demonstrates how PRISM captures the compounding nature of DeFi risk.

---

## Extending with New Protocols

1. Add a new entry to `backend/data/protocols.json` with the protocol's metadata
2. Add corresponding mock data in `backend/data/mock_scores.json`
3. Add frontend mock data in `frontend/src/data/mockData.ts`
4. If the protocol type is novel (not lending/amm/bridge), add a new scoring adapter in `backend/scoring/`

The scoring engine uses protocol type to determine which sub-scores apply. Lending protocols use health factor data, AMMs use liquidity depth analysis, and bridges use cross-chain flow data.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/api/protocols` | List all monitored protocols |
| GET | `/api/scores/{id}` | Full PRISM score for a protocol |
| GET | `/api/scores/{id}/history` | 30-day score history |
| POST | `/api/stress/{id}` | Run stress scenario (body: `{"scenario": "eth_drop_10"}`) |
| GET | `/api/narrative/{id}` | Narrative risk feed |
| GET | `/api/portfolio` | Portfolio-level risk view |

---

## Known Limitations

- **Score history is synthetic.** For the demo, history is generated by applying gaussian noise to the current score backward 30 days. Production would store and retrieve actual historical scores.
- **Single-chain focus.** Currently monitors Ethereum mainnet only. Multi-chain support would require chain-specific data services.
- **Simplified liquidation model.** The ETH shock simulation uses a linear health factor adjustment. Production would model cross-asset collateral, liquidation penalty mechanics, and DEX liquidity for liquidation execution.
- **Rate limits.** GNews / CryptoPanic / The Graph each have provider limits; RSS has none. The caching layer (15-minute TTL) mitigates load but production may need paid plans.
- **No authentication.** The platform has no user auth or access control. Production deployment would need API keys, JWT tokens, and role-based access.
- **In-memory cache.** Cache is lost on restart. Production would use Redis or similar.
- **No WebSocket updates.** Data refreshes on page load / 15-minute intervals. Real-time feeds would require WebSocket or SSE infrastructure.

### Production Requirements

- PostgreSQL or TimescaleDB for time-series score history
- Redis for distributed caching
- Celery or similar for background task processing
- Multi-chain RPC endpoints (Alchemy, Infura)
- Dedicated subgraph deployments on The Graph
- Monitoring/alerting (Datadog, PagerDuty) for Triple Convergence events
- Rate-limited API gateway (Kong, AWS API Gateway)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS, CSS Variables |
| Charts | Recharts |
| Animation | Framer Motion |
| Icons | Lucide React |
| UI Components | Radix UI primitives |
| Backend | Python 3.11+, FastAPI |
| HTTP Client | httpx (async) |
| Data Processing | pandas, scipy, numpy |
| NLP | VADER Sentiment |
| Blockchain | web3.py (Chainlink feeds) |
| Scheduling | APScheduler |

---

*Built for FinHack 2026 - UTD*

We leveraged AI-driven techniques to enhance data analysis, automate insights, and improve decision-making within the system.
