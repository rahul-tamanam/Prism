import type {
  Protocol,
  PrismScore,
  ScoreHistoryPoint,
  StressResult,
  MonteCarloResult,
  MonteCarloRequestBody,
  NarrativeSummary,
  PortfolioView,
  ExitCostRequest,
  ExitCostResponse,
  AlertsResponse,
  CorrelationMatrix,
} from '../types'
import {
  mockProtocols,
  mockScores,
  generateScoreHistory,
  mockStressResults,
  mockNarratives,
  mockPortfolio,
  getMockMonteCarlo,
} from '../data/mockData'

// In dev, use same-origin `/api` so Vite proxies to the backend (vite.config server.proxy).
// Hitting `http://localhost:8000` directly from the browser often fails CORS or network rules.
const BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? '/api' : 'http://localhost:8000/api')

async function fetchWithFallback<T>(url: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${BASE_URL}${url}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } catch {
    console.warn(`API call failed for ${url}, using mock data`)
    return fallback
  }
}

export const api = {
  getProtocols: () => fetchWithFallback<Protocol[]>('/protocols', mockProtocols),

  getScore: async (id: string, opts?: { refresh?: boolean }): Promise<PrismScore> => {
    try {
      const q = opts?.refresh ? '?refresh=true' : ''
      const res = await fetch(`${BASE_URL}/scores/${id}${q}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      return {
        protocol_id: data.protocol_id,
        name: data.name,
        score: data.score,
        action: data.action,
        pillar_scores: data.pillar_scores,
        worst_pillar: data.worst_pillar,
        triple_convergence_active: data.triple_convergence_active,
        safe_position_label: data.safe_position_label,
        score_history: data.score_history || [],
        timestamp: data.timestamp,
        divergence: data.divergence,
        details: data.details
          ? {
              governance: data.details.governance
                ? {
                    dune_whale_source: data.details.governance.dune_whale_source,
                    dune_whale_gini: data.details.governance.dune_whale_gini ?? null,
                    dune_whale_top10_pct: data.details.governance.dune_whale_top10_pct ?? null,
                    dune_whale_error: data.details.governance.dune_whale_error ?? null,
                  }
                : undefined,
              liquidation: data.details.liquidation
                ? {
                    dune_liquidations_source: data.details.liquidation.dune_liquidations_source,
                    dune_liquidation_latest_date: data.details.liquidation.dune_liquidation_latest_date ?? null,
                    dune_liquidation_latest_count: data.details.liquidation.dune_liquidation_latest_count ?? null,
                    dune_liquidation_latest_usd: data.details.liquidation.dune_liquidation_latest_usd ?? null,
                    dune_liquidation_error: data.details.liquidation.dune_liquidation_error ?? null,
                  }
                : undefined,
              narrative: data.details.narrative
                ? {
                    dune_users_source: data.details.narrative.dune_users_source,
                    dune_dau: data.details.narrative.dune_dau ?? null,
                    dune_wau: data.details.narrative.dune_wau ?? null,
                    dune_mau: data.details.narrative.dune_mau ?? null,
                    dune_users_error: data.details.narrative.dune_users_error ?? null,
                  }
                : undefined,
              liquidity: data.details.liquidity
                ? {
                    dune_liquidity_source: data.details.liquidity.dune_liquidity_source,
                    dune_liquidity_tvl_usd: data.details.liquidity.dune_liquidity_tvl_usd ?? null,
                    dune_borrowed_usd: data.details.liquidity.dune_borrowed_usd ?? null,
                  }
                : undefined,
              oracle: data.details.oracle
                ? {
                    dune_oracle_source: data.details.oracle.dune_oracle_source,
                    dune_oracle_max_deviation_bps: data.details.oracle.dune_oracle_max_deviation_bps ?? null,
                  }
                : undefined,
              supply: data.details.supply
                ? {
                    dune_supply_source: data.details.supply.dune_supply_source,
                    dune_supply_net_flow_30d_usd: data.details.supply.dune_supply_net_flow_30d_usd ?? null,
                  }
                : undefined,
            }
          : undefined,
      }
    } catch (e) {
      console.warn(`[PRISM] getScore("${id}") failed — using mock data. Is the backend running?`, e)
      return mockScores[id]
    }
  },

  getScoreHistory: (id: string) =>
    fetchWithFallback<ScoreHistoryPoint[]>(`/scores/${id}/history`, generateScoreHistory(id)),

  runStress: async (id: string, scenario: string): Promise<StressResult> => {
    try {
      const res = await fetch(`${BASE_URL}/stress/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch {
      return mockStressResults[id]?.[scenario] || mockStressResults['aave-v3']['eth_drop_10']
    }
  },

  runMonteCarlo: async (id: string, body: MonteCarloRequestBody): Promise<MonteCarloResult> => {
    const iterations = body.iterations ?? 2000
    const sigma = body.sigma ?? 0.25
    try {
      const res = await fetch(`${BASE_URL}/stress/${id}/monte-carlo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario: body.scenario,
          iterations,
          sigma,
          seed: body.seed ?? null,
        }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch {
      return getMockMonteCarlo(id, body.scenario, iterations, sigma)
    }
  },

  getNarrative: (id: string) =>
    fetchWithFallback<NarrativeSummary>(`/narrative/${id}`, mockNarratives[id]),

  getPortfolio: async (): Promise<PortfolioView> => {
    try {
      const res = await fetch(`${BASE_URL}/portfolio`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const protocols = (data.protocols || data.fragility_ranking || []).map((p: Record<string, unknown>) => ({
        id: p.protocol_id || p.id,
        name: p.name,
        score: p.score,
        action: p.action,
        safe_position_pct: parseFloat(String(p.safe_position_label || '0').replace(/[^0-9.]/g, '')) || 0,
        worst_risk: p.worst_pillar || p.worst_risk || 'unknown',
        spike_detected: p.triple_convergence_active || false,
      }))
      return {
        protocols,
        overall_risk: data.overall_action === 'EXIT' ? 'critical' : data.overall_action === 'REDUCE' ? 'high' : 'moderate',
        fragility_ranking: (data.fragility_ranking || []).map((p: Record<string, unknown>) => p.protocol_id || p.id || p),
      }
    } catch {
      return mockPortfolio
    }
  },

  calculateExitCost: async (id: string, body: ExitCostRequest): Promise<ExitCostResponse> => {
    try {
      const res = await fetch(`${BASE_URL}/scores/${id}/exit-cost`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch {
      return {
        protocol_id: id,
        position_size_usd: body.position_size_usd,
        urgency: body.urgency,
        slippage_pct: 1.2,
        protocol_fee_pct: 0.05,
        utilization_penalty_pct: 0.3,
        total_cost_pct: 1.55,
        total_cost_usd: Math.round(body.position_size_usd * 0.0155 * 100) / 100,
        max_safe_single_tx_usd: 2_400_000,
        optimal_chunks: Math.ceil(body.position_size_usd / 2_400_000),
        optimal_exit_hours: 18,
        exit_quality_rating: 'MODERATE',
        recommendations: ['Spreading exit over 24h reduces cost significantly'],
      }
    }
  },

  getAlerts: async (): Promise<AlertsResponse> => {
    try {
      const res = await fetch(`${BASE_URL}/alerts`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch {
      return { alerts: [], unacknowledged_count: 0 }
    }
  },

  acknowledgeAlert: async (alertId: string): Promise<void> => {
    try {
      await fetch(`${BASE_URL}/alerts/${encodeURIComponent(alertId)}/acknowledge`, { method: 'POST' })
    } catch {
      /* silent */
    }
  },

  getCorrelationMatrix: async (): Promise<CorrelationMatrix> => {
    try {
      const res = await fetch(`${BASE_URL}/portfolio/correlation`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch {
      return {
        protocols: ['aave-v3', 'uniswap-v3', 'stargate'],
        matrix: {
          'aave-v3': { 'aave-v3': 1.0, 'uniswap-v3': 0.72, stargate: 0.41 },
          'uniswap-v3': { 'aave-v3': 0.72, 'uniswap-v3': 1.0, stargate: 0.38 },
          stargate: { 'aave-v3': 0.41, 'uniswap-v3': 0.38, stargate: 1.0 },
        },
        pairs: [
          {
            protocol_a: 'aave-v3',
            protocol_b: 'uniswap-v3',
            correlation: 0.72,
            source: 'static',
            diversification_benefit: 'Low — moderate co-movement during crashes',
            risk_note:
              'Aave and Uniswap move together in roughly 72% of stress scenarios.',
            drivers: ['ETH price', 'Ethereum gas'],
          },
          {
            protocol_a: 'aave-v3',
            protocol_b: 'stargate',
            correlation: 0.41,
            source: 'static',
            diversification_benefit: 'Moderate — partial diversification',
            risk_note: 'Aave and Stargate have sufficiently independent risk drivers.',
            drivers: ['Bridge liquidity'],
          },
          {
            protocol_a: 'uniswap-v3',
            protocol_b: 'stargate',
            correlation: 0.38,
            source: 'static',
            diversification_benefit: 'Moderate — partial diversification',
            risk_note: 'Uniswap and Stargate have independent risk drivers.',
            drivers: ['Cross-chain volume'],
          },
        ],
        overall_diversification_score: 58.3,
        high_correlation_warnings: [],
      }
    }
  },
}
