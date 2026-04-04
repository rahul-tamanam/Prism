export interface Protocol {
  id: string
  name: string
  type: 'lending' | 'amm' | 'bridge'
  chain: string
  description: string
  color: string
  logo: string
  current_tvl: number
}

export interface PillarScores {
  liquidity: number
  liquidation: number
  governance: number
  oracle: number
  supply: number
  narrative: number
  triple_convergence_active: boolean
}

export interface PrismScore {
  protocol_id: string
  name: string
  score: number
  action: 'ENTER' | 'HOLD' | 'REDUCE' | 'EXIT'
  pillar_scores: PillarScores
  worst_pillar: string
  triple_convergence_active: boolean
  safe_position_label: string
  score_history: ScoreHistoryPoint[]
  timestamp: string
}

export interface ScoreHistoryPoint {
  date: string
  score: number
  action: string
}

export interface StressScenario {
  id: string
  label: string
  description: string
  icon: string
}

export interface StressResult {
  scenario: string
  base_score: number
  stressed_score: number
  base_action: string
  stressed_action: string
  pillar_deltas: Record<string, number>
  most_affected_pillar: string
  narrative: string
}

export interface NarrativeArticle {
  title: string
  url: string
  published_at: string
  sentiment_score: number
  source: string
}

export interface NarrativeSummary {
  avg_sentiment: number
  negative_ratio: number
  mention_velocity: number
  spike_detected: boolean
  triple_convergence_active: boolean
  articles: NarrativeArticle[]
}

export interface PortfolioProtocol {
  id: string
  name: string
  score: number
  action: string
  safe_position_pct: number
  worst_risk: string
  spike_detected: boolean
}

export interface PortfolioView {
  protocols: PortfolioProtocol[]
  overall_risk: 'moderate' | 'high' | 'critical'
  fragility_ranking: string[]
}

export const ACTION_COLORS: Record<string, string> = {
  ENTER: '#2D8A4E',
  HOLD: '#D4A017',
  REDUCE: '#E07B39',
  EXIT: '#C94040',
}

export const ACTION_BG: Record<string, string> = {
  ENTER: 'rgba(45, 138, 78, 0.12)',
  HOLD: 'rgba(212, 160, 23, 0.12)',
  REDUCE: 'rgba(224, 123, 57, 0.12)',
  EXIT: 'rgba(201, 64, 64, 0.12)',
}

export const PILLAR_COLORS: Record<string, string> = {
  liquidity: '#2D8A4E',
  liquidation: '#7B5EA7',
  governance: '#D4A017',
  oracle: '#7EB8D4',
  supply: '#E07B39',
  narrative: '#7B5EA7',
}

export const PILLAR_LABELS: Record<string, string> = {
  liquidity: 'Liquidity Resilience',
  liquidation: 'Liquidation Cascade',
  governance: 'Governance Capture',
  oracle: 'Oracle Dependency',
  supply: 'Supply Pressure',
  narrative: 'Narrative Risk',
}

export const PILLAR_WEIGHTS: Record<string, number> = {
  liquidity: 23,
  liquidation: 23,
  governance: 19,
  oracle: 14,
  supply: 11,
  narrative: 10,
}
