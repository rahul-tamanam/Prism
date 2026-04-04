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

/** Subset of backend `details.governance` used in the UI */
export interface GovernanceDetail {
  dune_whale_source?: string
  dune_whale_gini?: number | null
  dune_whale_top10_pct?: number | null
  /** Present when Dune was attempted but failed (see backend logs too) */
  dune_whale_error?: string | null
}

/** Backend `details.liquidation` Dune fields */
export interface LiquidationDuneDetail {
  dune_liquidations_source?: string
  dune_liquidation_latest_date?: string | null
  dune_liquidation_latest_count?: number | null
  dune_liquidation_latest_usd?: number | null
  dune_liquidation_error?: string | null
}

/** Backend `details.narrative` Dune user-activity fields */
export interface NarrativeDuneDetail {
  dune_users_source?: string
  dune_dau?: number | null
  dune_wau?: number | null
  dune_mau?: number | null
  dune_users_error?: string | null
}

/** Optional unified-query fields merged into `details.liquidity` */
export interface LiquidityDuneSnippet {
  dune_liquidity_source?: string
  dune_liquidity_tvl_usd?: number | null
  dune_borrowed_usd?: number | null
}

export interface OracleDuneSnippet {
  dune_oracle_source?: string
  dune_oracle_max_deviation_bps?: number | null
}

export interface SupplyDuneSnippet {
  dune_supply_source?: string
  dune_supply_net_flow_30d_usd?: number | null
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
  /** Pillar breakdown from API (includes Dune snippets per pillar where wired) */
  details?: {
    governance?: GovernanceDetail
    liquidation?: LiquidationDuneDetail
    narrative?: NarrativeDuneDetail
    liquidity?: LiquidityDuneSnippet
    oracle?: OracleDuneSnippet
    supply?: SupplyDuneSnippet
  }
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
