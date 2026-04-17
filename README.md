# PRISM

**Protocol Reflexivity, Insolvency, Stress and Marketability Score**

DeFi risk intelligence platform that scores protocols 0-100 and outputs one signal: **ENTER / HOLD / REDUCE / EXIT**.

Built for FinHack 2026, UTD.

---

## What It Does

PRISM measures TVL quality, not TVL level. It tells portfolio managers whether their position size is too large for a protocol's real exit liquidity under stress.

Each protocol gets a composite score across six risk pillars, updated every 15 minutes from live on-chain data.

---

## Six Risk Pillars

| Pillar | Weight | Data Source |
|---|---|---|
| Liquidity Resilience | 23% | DefiLlama, The Graph |
| Liquidation Cascade | 23% | The Graph (Aave health factors) |
| Governance Capture | 19% | Snapshot, Dune Analytics |
| Oracle Reliability | 14% | Chainlink on-chain feeds |
| Supply Pressure | 11% | DefiLlama emissions |
| Narrative Risk | 10% | News feeds + VADER NLP |

### Score to Action

| Score | Action |
|---|---|
| 80-100 | ENTER |
| 60-79 | HOLD |
| 40-59 | REDUCE |
| 0-39 | EXIT |

### Triple Convergence Alert

Fires when all three conditions hit simultaneously:

- Narrative mention spike detected
- New governance proposal in last 48h
- TVL declined >5% in 24h

Applies an 8-point penalty and escalates the action one level. Historically the strongest precursor to protocol distress (Beanstalk, Terra, Euler).

---

## Setup

### Prerequisites

- Python 3.11+
- Node.js 18+

### Backend

```bash
cd prism/backend
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd prism/frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`. Backend runs at `http://localhost:8000`.

### API Keys

| Service | Required | Purpose |
|---|---|---|
| DefiLlama | No | TVL, bridge flows, emissions |
| Snapshot | No | Governance proposals and votes |
| The Graph | Yes | Aave health factors, Uniswap liquidity |
| Dune Analytics | Optional | Holder concentration, liquidation history |
| GNews | Optional | News headlines for sentiment |

Add keys to `backend/.env`:

```
THEGRAPH_API_KEY=your_key
DUNE_API_KEY=your_key
GNEWS_API_KEY=your_key
```

---

## Pages

**Protocol Radar** `/` - Live PRISM scores, radar charts, and 30-day trend lines for all monitored protocols.

**Risk Decomposition** `/decomposition` - Full pillar breakdown with sub-scores, exit cost calculator, and signal divergence panel.

**Stress Lab** `/stress` - Run six predefined scenarios (ETH crash, whale exit, oracle staleness, etc.) with Monte Carlo analysis and a four-act cascade demo.

**Narrative Feed** `/narrative` - Sentiment gauge, mention velocity chart, and scored news articles.

**Portfolio View** `/portfolio` - Cross-protocol risk table, safe allocation chart, and correlation matrix.

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/api/protocols` | All monitored protocols |
| GET | `/api/scores/{id}` | Full PRISM score |
| GET | `/api/scores/{id}/history` | 30-day score history |
| POST | `/api/stress/{id}` | Run stress scenario |
| POST | `/api/stress/{id}/monte-carlo` | Monte Carlo simulation |
| GET | `/api/narrative/{id}` | Sentiment feed |
| GET | `/api/portfolio` | Portfolio risk view |
| GET | `/api/portfolio/correlation` | Correlation matrix |
| GET | `/api/alerts` | Alert history |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite |
| Styling | TailwindCSS, Framer Motion |
| Charts | Recharts |
| Backend | Python 3.11, FastAPI |
| NLP | VADER Sentiment |
| Blockchain | web3.py (Chainlink reads) |
| Data | pandas, numpy, scipy |

---

## Monitored Protocols

- Aave V3 (lending, Ethereum)
- Uniswap V3 (AMM, Ethereum)
- Stargate Finance (bridge, multi-chain)
