import type { Protocol, PrismScore, ScoreHistoryPoint, StressResult, NarrativeSummary, PortfolioView } from '../types'
import { mockProtocols, mockScores, generateScoreHistory, mockStressResults, mockNarratives, mockPortfolio } from '../data/mockData'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

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

  getScore: async (id: string): Promise<PrismScore> => {
    try {
      const res = await fetch(`${BASE_URL}/scores/${id}`)
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
      }
    } catch {
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
}
