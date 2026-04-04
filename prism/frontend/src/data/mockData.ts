import type {
  Protocol,
  PrismScore,
  ScoreHistoryPoint,
  StressResult,
  MonteCarloResult,
  NarrativeSummary,
  PortfolioView,
} from '../types'
import { getActionForScore } from '../lib/utils'

export const mockProtocols: Protocol[] = [
  {
    id: 'aave-v3',
    name: 'Aave V3',
    type: 'lending',
    chain: 'Ethereum',
    description: 'Decentralized non-custodial liquidity market protocol enabling lending and borrowing of crypto assets.',
    color: '#B6509E',
    logo: 'A',
    current_tvl: 11_247_831_042,
  },
  {
    id: 'uniswap-v3',
    name: 'Uniswap V3',
    type: 'amm',
    chain: 'Ethereum',
    description: 'Automated market maker with concentrated liquidity positions for capital-efficient token swaps.',
    color: '#FF007A',
    logo: 'U',
    current_tvl: 4_832_145_718,
  },
  {
    id: 'stargate',
    name: 'Stargate Finance',
    type: 'bridge',
    chain: 'Multi-chain',
    description: 'Cross-chain bridge protocol enabling native asset transfers across LayerZero-connected chains.',
    color: '#8B5CF6',
    logo: 'S',
    current_tvl: 342_718_493,
  },
]

export const mockScores: Record<string, PrismScore> = {
  'aave-v3': {
    protocol_id: 'aave-v3',
    name: 'Aave V3',
    score: 67.3,
    action: 'HOLD',
    pillar_scores: {
      liquidity: 71.2,
      liquidation: 58.4,
      governance: 76.1,
      oracle: 82.3,
      supply: 69.8,
      narrative: 61.4,
      triple_convergence_active: false,
    },
    worst_pillar: 'liquidation',
    triple_convergence_active: false,
    safe_position_label: 'Max 8.2% of portfolio',
    score_history: [],
    timestamp: new Date(Date.now() - 720000).toISOString(),
    details: {
      governance: {
        dune_whale_source: 'mock',
        dune_whale_gini: null,
        dune_whale_top10_pct: null,
      },
      liquidation: {
        dune_liquidations_source: 'mock',
        dune_liquidation_latest_date: null,
        dune_liquidation_latest_count: null,
        dune_liquidation_latest_usd: null,
      },
      narrative: {
        dune_users_source: 'mock',
        dune_dau: null,
        dune_wau: null,
        dune_mau: null,
      },
      liquidity: {},
      oracle: {},
      supply: {},
    },
  },
  'uniswap-v3': {
    protocol_id: 'uniswap-v3',
    name: 'Uniswap V3',
    score: 51.8,
    action: 'REDUCE',
    pillar_scores: {
      liquidity: 48.3,
      liquidation: 62.1,
      governance: 44.7,
      oracle: 71.2,
      supply: 52.9,
      narrative: 38.6,
      triple_convergence_active: false,
    },
    worst_pillar: 'narrative',
    triple_convergence_active: false,
    safe_position_label: 'Max 4.5% of portfolio',
    score_history: [],
    timestamp: new Date(Date.now() - 540000).toISOString(),
    details: {
      governance: {
        dune_whale_source: 'mock',
        dune_whale_gini: null,
        dune_whale_top10_pct: null,
      },
      liquidation: {
        dune_liquidations_source: 'mock',
        dune_liquidation_latest_date: null,
        dune_liquidation_latest_count: null,
        dune_liquidation_latest_usd: null,
      },
      narrative: {
        dune_users_source: 'mock',
        dune_dau: null,
        dune_wau: null,
        dune_mau: null,
      },
      liquidity: {},
      oracle: {},
      supply: {},
    },
  },
  'stargate': {
    protocol_id: 'stargate',
    name: 'Stargate Finance',
    score: 34.2,
    action: 'EXIT',
    pillar_scores: {
      liquidity: 28.7,
      liquidation: 41.3,
      governance: 33.8,
      oracle: 52.1,
      supply: 24.6,
      narrative: 22.3,
      triple_convergence_active: true,
    },
    worst_pillar: 'narrative',
    triple_convergence_active: true,
    safe_position_label: 'Exit recommended — 0%',
    score_history: [],
    timestamp: new Date(Date.now() - 300000).toISOString(),
    details: {
      governance: {
        dune_whale_source: 'mock',
        dune_whale_gini: null,
        dune_whale_top10_pct: null,
      },
      liquidation: {
        dune_liquidations_source: 'mock',
        dune_liquidation_latest_date: null,
        dune_liquidation_latest_count: null,
        dune_liquidation_latest_usd: null,
      },
      narrative: {
        dune_users_source: 'mock',
        dune_dau: null,
        dune_wau: null,
        dune_mau: null,
      },
      liquidity: {},
      oracle: {},
      supply: {},
    },
  },
}

function seededRandom(seed: number): () => number {
  let s = seed
  return () => {
    s = (s * 16807 + 0) % 2147483647
    return (s - 1) / 2147483646
  }
}

export function generateScoreHistory(protocolId: string): ScoreHistoryPoint[] {
  const history: ScoreHistoryPoint[] = []
  const now = new Date()

  const configs: Record<string, { start: number; end: number; seed: number; dropDay?: number; dropMagnitude?: number }> = {
    'aave-v3': { start: 74, end: 67.3, seed: 42 },
    'uniswap-v3': { start: 65, end: 51.8, seed: 137, dropDay: 20, dropMagnitude: 8 },
    'stargate': { start: 58, end: 34.2, seed: 256, dropDay: 20, dropMagnitude: 12 },
  }

  const cfg = configs[protocolId] || configs['aave-v3']
  const rand = seededRandom(cfg.seed)

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)

    const progress = (29 - i) / 29
    let base = cfg.start + (cfg.end - cfg.start) * progress

    if (cfg.dropDay && cfg.dropMagnitude && (29 - i) >= cfg.dropDay) {
      const dropProgress = ((29 - i) - cfg.dropDay) / (29 - cfg.dropDay)
      base -= cfg.dropMagnitude * dropProgress
    }

    const noise = (rand() - 0.5) * 3.2
    const score = Math.max(10, Math.min(95, base + noise))
    const rounded = Math.round(score * 10) / 10

    history.push({
      date: date.toISOString().split('T')[0],
      score: rounded,
      action: getActionForScore(rounded),
    })
  }

  history[history.length - 1].score = cfg.end
  history[history.length - 1].action = getActionForScore(cfg.end)

  return history
}

export const mockStressResults: Record<string, Record<string, StressResult>> = {
  'aave-v3': {
    eth_drop_10: {
      scenario: 'ETH -10%',
      base_score: 67.3,
      stressed_score: 58.1,
      base_action: 'HOLD',
      stressed_action: 'REDUCE',
      pillar_deltas: { liquidity: -8.3, liquidation: -14.2, governance: -1.1, oracle: -3.7, supply: -9.4, narrative: -5.8 },
      most_affected_pillar: 'liquidation',
      narrative: 'A 10% ETH correction would push Aave V3\'s liquidation cascade risk into the danger zone. Cascading liquidations on leveraged positions could trigger a 14-point drop in the liquidation pillar, moving the overall action from HOLD to REDUCE.',
    },
    eth_drop_20: {
      scenario: 'ETH -20%',
      base_score: 67.3,
      stressed_score: 42.7,
      base_action: 'HOLD',
      stressed_action: 'REDUCE',
      pillar_deltas: { liquidity: -18.6, liquidation: -28.3, governance: -2.4, oracle: -7.1, supply: -19.8, narrative: -12.4 },
      most_affected_pillar: 'liquidation',
      narrative: 'A severe 20% ETH crash would trigger mass liquidations across Aave V3. The liquidation pillar would plummet 28 points as cascading margin calls overwhelm available liquidity. Supply pressure intensifies as borrowers rush to deleverage.',
    },
    whale_exit_15: {
      scenario: 'Whale Exits 15%',
      base_score: 67.3,
      stressed_score: 55.4,
      base_action: 'HOLD',
      stressed_action: 'REDUCE',
      pillar_deltas: { liquidity: -16.8, liquidation: -7.2, governance: -3.4, oracle: -0.8, supply: -12.1, narrative: -6.9 },
      most_affected_pillar: 'liquidity',
      narrative: 'A major whale withdrawing 15% of TVL would severely impact Aave\'s liquidity resilience. Utilization rates would spike across pools, potentially triggering interest rate model jumps that cascade into forced delevering.',
    },
    bridge_outflow_spike: {
      scenario: 'Bridge Outflow',
      base_score: 67.3,
      stressed_score: 61.8,
      base_action: 'HOLD',
      stressed_action: 'HOLD',
      pillar_deltas: { liquidity: -6.2, liquidation: -3.1, governance: -0.4, oracle: -1.2, supply: -7.8, narrative: -3.1 },
      most_affected_pillar: 'supply',
      narrative: 'Cross-chain capital flight would moderately reduce available liquidity on Ethereum-native Aave markets. Supply pressure increases as capital migrates to alternative chains, but Aave\'s deep liquidity provides a meaningful buffer.',
    },
    governance_spike: {
      scenario: 'Governance Spike',
      base_score: 67.3,
      stressed_score: 60.2,
      base_action: 'HOLD',
      stressed_action: 'HOLD',
      pillar_deltas: { liquidity: -1.8, liquidation: -2.1, governance: -14.7, oracle: -0.6, supply: -1.2, narrative: -8.4 },
      most_affected_pillar: 'governance',
      narrative: 'Unusual governance activity would primarily impact the governance capture pillar. While Aave\'s decentralized governance is relatively robust, a coordinated proposal spike signals potential hostile governance actions that elevate overall risk.',
    },
    oracle_staleness: {
      scenario: 'Oracle Staleness',
      base_score: 67.3,
      stressed_score: 54.6,
      base_action: 'HOLD',
      stressed_action: 'REDUCE',
      pillar_deltas: { liquidity: -4.1, liquidation: -11.8, governance: -0.3, oracle: -22.4, supply: -3.7, narrative: -2.6 },
      most_affected_pillar: 'oracle',
      narrative: 'Stale Chainlink price feeds would be catastrophic for Aave\'s liquidation engine. Incorrect pricing would delay necessary liquidations, allowing bad debt to accumulate. The oracle pillar would suffer a 22-point decline.',
    },
  },
  'uniswap-v3': {
    eth_drop_10: {
      scenario: 'ETH -10%',
      base_score: 51.8,
      stressed_score: 44.2,
      base_action: 'REDUCE',
      stressed_action: 'REDUCE',
      pillar_deltas: { liquidity: -7.4, liquidation: -4.1, governance: -2.8, oracle: -5.2, supply: -6.3, narrative: -7.1 },
      most_affected_pillar: 'liquidity',
      narrative: 'A 10% ETH correction would reduce concentrated liquidity positions on Uniswap V3. LPs in narrow ranges would face significant impermanent loss, potentially withdrawing liquidity and widening spreads across key pools.',
    },
    eth_drop_20: {
      scenario: 'ETH -20%',
      base_score: 51.8,
      stressed_score: 33.6,
      base_action: 'REDUCE',
      stressed_action: 'EXIT',
      pillar_deltas: { liquidity: -16.8, liquidation: -8.4, governance: -4.2, oracle: -9.1, supply: -14.7, narrative: -15.3 },
      most_affected_pillar: 'liquidity',
      narrative: 'A severe 20% ETH crash would devastate concentrated liquidity positions. Mass LP withdrawal from active ranges would create thin order books, spiking slippage. The narrative pillar collapses as DeFi sentiment turns deeply negative.',
    },
    whale_exit_15: {
      scenario: 'Whale Exits 15%',
      base_score: 51.8,
      stressed_score: 41.3,
      base_action: 'REDUCE',
      stressed_action: 'REDUCE',
      pillar_deltas: { liquidity: -14.2, liquidation: -3.7, governance: -1.9, oracle: -0.4, supply: -10.8, narrative: -5.2 },
      most_affected_pillar: 'liquidity',
      narrative: 'A large LP withdrawing 15% of TVL from Uniswap V3 would create significant gaps in the liquidity curve. Concentrated liquidity\'s capital efficiency advantage becomes a vulnerability when deep pockets exit key price ranges.',
    },
    bridge_outflow_spike: {
      scenario: 'Bridge Outflow',
      base_score: 51.8,
      stressed_score: 46.1,
      base_action: 'REDUCE',
      stressed_action: 'REDUCE',
      pillar_deltas: { liquidity: -5.8, liquidation: -1.4, governance: -0.7, oracle: -0.9, supply: -8.2, narrative: -3.4 },
      most_affected_pillar: 'supply',
      narrative: 'Bridge outflows would reduce available token supply for Uniswap\'s liquidity pools. L2 capital migration reduces Ethereum mainnet TVL, thinning the liquidity available for price discovery on key trading pairs.',
    },
    governance_spike: {
      scenario: 'Governance Spike',
      base_score: 51.8,
      stressed_score: 44.7,
      base_action: 'REDUCE',
      stressed_action: 'REDUCE',
      pillar_deltas: { liquidity: -1.2, liquidation: -0.8, governance: -16.3, oracle: -0.4, supply: -0.9, narrative: -9.8 },
      most_affected_pillar: 'governance',
      narrative: 'Unusual UNI governance activity raises alarm. With already-low governance scores, a spike in proposals signals potential fee switch activation or treasury raids, driving negative narrative sentiment and further score compression.',
    },
    oracle_staleness: {
      scenario: 'Oracle Staleness',
      base_score: 51.8,
      stressed_score: 45.9,
      base_action: 'REDUCE',
      stressed_action: 'REDUCE',
      pillar_deltas: { liquidity: -2.1, liquidation: -1.7, governance: -0.3, oracle: -14.8, supply: -1.4, narrative: -2.1 },
      most_affected_pillar: 'oracle',
      narrative: 'Uniswap V3 acts as a price oracle for many protocols. Stale external price feeds would create arbitrage opportunities that extract value from LPs, as TWAP oracles diverge from actual market prices during volatile periods.',
    },
  },
  'stargate': {
    eth_drop_10: {
      scenario: 'ETH -10%',
      base_score: 34.2,
      stressed_score: 24.8,
      base_action: 'EXIT',
      stressed_action: 'EXIT',
      pillar_deltas: { liquidity: -8.9, liquidation: -6.2, governance: -3.7, oracle: -4.8, supply: -9.1, narrative: -11.2 },
      most_affected_pillar: 'narrative',
      narrative: 'With triple convergence already active, a 10% ETH drop would amplify Stargate\'s existing vulnerabilities. Bridge protocols face outsized narrative risk during market stress as users fear bridge exploits during volatile conditions.',
    },
    eth_drop_20: {
      scenario: 'ETH -20%',
      base_score: 34.2,
      stressed_score: 14.3,
      base_action: 'EXIT',
      stressed_action: 'EXIT',
      pillar_deltas: { liquidity: -18.4, liquidation: -12.7, governance: -6.8, oracle: -9.2, supply: -17.6, narrative: -19.8 },
      most_affected_pillar: 'narrative',
      narrative: 'A 20% ETH crash on top of triple convergence would be catastrophic for Stargate. Cross-chain bridge TVL would evaporate as users scramble to consolidate assets. Score approaches critical infrastructure failure levels.',
    },
    whale_exit_15: {
      scenario: 'Whale Exits 15%',
      base_score: 34.2,
      stressed_score: 22.1,
      base_action: 'EXIT',
      stressed_action: 'EXIT',
      pillar_deltas: { liquidity: -14.7, liquidation: -4.8, governance: -2.1, oracle: -0.6, supply: -11.3, narrative: -8.4 },
      most_affected_pillar: 'liquidity',
      narrative: 'A whale exiting 15% of Stargate\'s already-depleted TVL would create critical liquidity gaps across bridge pools. Delta credit mechanisms would struggle to rebalance, potentially trapping user funds on destination chains.',
    },
    bridge_outflow_spike: {
      scenario: 'Bridge Outflow',
      base_score: 34.2,
      stressed_score: 18.7,
      base_action: 'EXIT',
      stressed_action: 'EXIT',
      pillar_deltas: { liquidity: -16.2, liquidation: -5.4, governance: -1.8, oracle: -2.3, supply: -14.8, narrative: -12.7 },
      most_affected_pillar: 'liquidity',
      narrative: 'As a bridge protocol, Stargate is maximally exposed to cross-chain capital flight. A bridge outflow spike would drain liquidity pools across all connected chains simultaneously, creating a death spiral of withdrawals.',
    },
    governance_spike: {
      scenario: 'Governance Spike',
      base_score: 34.2,
      stressed_score: 27.4,
      base_action: 'EXIT',
      stressed_action: 'EXIT',
      pillar_deltas: { liquidity: -2.4, liquidation: -1.8, governance: -11.6, oracle: -0.7, supply: -1.9, narrative: -7.2 },
      most_affected_pillar: 'governance',
      narrative: 'Governance proposals during triple convergence signal potential emergency measures or hostile actions. STG token concentration makes governance capture a real threat, especially when protocol viability is already in question.',
    },
    oracle_staleness: {
      scenario: 'Oracle Staleness',
      base_score: 34.2,
      stressed_score: 25.6,
      base_action: 'EXIT',
      stressed_action: 'EXIT',
      pillar_deltas: { liquidity: -3.1, liquidation: -4.2, governance: -0.4, oracle: -16.8, supply: -2.7, narrative: -4.3 },
      most_affected_pillar: 'oracle',
      narrative: 'Stale oracle feeds on a bridge protocol create asymmetric risk — users could bridge assets at incorrect valuations, draining pools on the mispriced side. Stargate\'s cross-chain oracle dependency amplifies this vulnerability.',
    },
  },
}

/** Offline fallback for Monte Carlo API — shape matches backend response. */
export function getMockMonteCarlo(
  protocolId: string,
  scenario: string,
  iterations = 2000,
  sigma = 0.25
): MonteCarloResult {
  const base = mockScores[protocolId]?.score ?? 62
  const tweak = (scenario.length + protocolId.length) % 9
  const meanStressed = Math.max(14, Math.min(92, base - 4.5 - tweak * 0.35))
  const spread = 5 + sigma * 18
  const pct = (p: number) =>
    Math.round(Math.max(0, Math.min(100, meanStressed + spread * (p / 50 - 1))) * 10) / 10
  const weights = Array.from({ length: 20 }, (_, i) => {
    const mid = i * 5 + 2.5
    return Math.exp(-0.5 * ((mid - meanStressed) / (spread * 1.2)) ** 2)
  })
  const sumW = weights.reduce((a, b) => a + b, 0) || 1
  const counts = weights.map(w => Math.floor((w / sumW) * iterations))
  let deficit = iterations - counts.reduce((a, b) => a + b, 0)
  for (let k = 0; deficit > 0; k++, deficit--) counts[k % 20]++
  const histogram: MonteCarloResult['histogram'] = counts.map((c, i) => ({
    bin_start: i * 5,
    bin_end: (i + 1) * 5,
    count: c,
  }))
  const exitBump = tweak * 0.02
  return {
    protocol_id: protocolId,
    scenario,
    iterations,
    sigma,
    base_score: base,
    mean_stressed: Math.round(meanStressed * 100) / 100,
    std_stressed: Math.round(spread * 0.65 * 1000) / 1000,
    percentiles: {
      '5': pct(5),
      '25': pct(25),
      '50': pct(50),
      '75': pct(75),
      '95': pct(95),
    },
    histogram,
    prob_by_action: {
      ENTER: Math.round((0.02 - exitBump * 0.2) * 10000) / 10000,
      HOLD: Math.round((0.48 - exitBump) * 10000) / 10000,
      REDUCE: Math.round((0.32 + exitBump * 0.5) * 10000) / 10000,
      EXIT: Math.round((0.18 + exitBump * 0.7) * 10000) / 10000,
    },
  }
}

const now = new Date()
function daysAgo(d: number): string {
  const date = new Date(now)
  date.setDate(date.getDate() - d)
  return date.toISOString()
}
function hoursAgo(h: number): string {
  const date = new Date(now)
  date.setHours(date.getHours() - h)
  return date.toISOString()
}

export const mockNarratives: Record<string, NarrativeSummary> = {
  'aave-v3': {
    avg_sentiment: 0.42,
    negative_ratio: 0.31,
    mention_velocity: 127.4,
    spike_detected: false,
    triple_convergence_active: false,
    articles: [
      { title: 'Aave V3 passes proposal to reduce LTV ratios across volatile assets', url: '#', published_at: hoursAgo(2), sentiment_score: -0.24, source: 'DeFi Pulse' },
      { title: 'Whale moves $43M from Aave to Morpho Blue — institutional migration?', url: '#', published_at: hoursAgo(5), sentiment_score: -0.58, source: 'The Block' },
      { title: 'Aave DAO treasury hits $142M as fee revenue outpaces projections', url: '#', published_at: hoursAgo(8), sentiment_score: 0.71, source: 'Messari' },
      { title: 'GHO stablecoin reaches $187M market cap — steady growth continues', url: '#', published_at: hoursAgo(14), sentiment_score: 0.62, source: 'CoinDesk' },
      { title: 'Security researcher discloses low-severity bug in Aave V3 periphery contracts', url: '#', published_at: hoursAgo(22), sentiment_score: -0.34, source: 'Rekt News' },
      { title: 'Aave V3 Ethereum TVL climbs to $11.2B amid broader DeFi recovery', url: '#', published_at: daysAgo(1), sentiment_score: 0.83, source: 'DefiLlama' },
      { title: 'Analysis: Aave\'s liquidation engine handled March volatility with zero bad debt', url: '#', published_at: daysAgo(2), sentiment_score: 0.76, source: 'Delphi Digital' },
      { title: 'Chainlink CCIP integration strengthens Aave\'s cross-chain expansion roadmap', url: '#', published_at: daysAgo(3), sentiment_score: 0.68, source: 'The Defiant' },
      { title: 'Aave governance faces criticism over slow response to wstETH risk parameter updates', url: '#', published_at: daysAgo(4), sentiment_score: -0.41, source: 'Bankless' },
    ],
  },
  'uniswap-v3': {
    avg_sentiment: 0.18,
    negative_ratio: 0.47,
    mention_velocity: 214.8,
    spike_detected: false,
    triple_convergence_active: false,
    articles: [
      { title: 'Uniswap Foundation proposes $62M treasury diversification — community divided', url: '#', published_at: hoursAgo(1), sentiment_score: -0.52, source: 'The Block' },
      { title: 'Uniswap V3 sees 23% volume decline as MEV bots dominate order flow', url: '#', published_at: hoursAgo(4), sentiment_score: -0.67, source: 'Flashbots Research' },
      { title: 'SEC investigation into Uniswap Labs enters discovery phase', url: '#', published_at: hoursAgo(9), sentiment_score: -0.81, source: 'Bloomberg Crypto' },
      { title: 'UNI token drops 8% on fee switch uncertainty after latest governance vote', url: '#', published_at: hoursAgo(16), sentiment_score: -0.73, source: 'CoinDesk' },
      { title: 'Concentrated liquidity positions on ETH-USDC pool show record IL this quarter', url: '#', published_at: daysAgo(1), sentiment_score: -0.44, source: 'Dune Analytics' },
      { title: 'Uniswap V4 hooks framework shows promising early-stage testing results', url: '#', published_at: daysAgo(1), sentiment_score: 0.72, source: 'Paradigm Research' },
      { title: 'Cross-chain Uniswap deployment on Base captures 18% of L2 DEX volume', url: '#', published_at: daysAgo(2), sentiment_score: 0.54, source: 'L2Beat' },
      { title: 'Analysis: LP profitability on Uniswap V3 negative for 70% of positions', url: '#', published_at: daysAgo(3), sentiment_score: -0.61, source: 'Bancor Research' },
      { title: 'Uniswap Labs announces partnership with institutional OTC desk for improved fills', url: '#', published_at: daysAgo(4), sentiment_score: 0.48, source: 'Decrypt' },
      { title: 'DeFi governance expert warns of voter apathy crisis in Uniswap DAO', url: '#', published_at: daysAgo(5), sentiment_score: -0.38, source: 'Bankless' },
    ],
  },
  'stargate': {
    avg_sentiment: -0.34,
    negative_ratio: 0.72,
    mention_velocity: 347.2,
    spike_detected: true,
    triple_convergence_active: true,
    articles: [
      { title: 'BREAKING: Stargate Finance TVL drops 34% in 48 hours amid bridge concerns', url: '#', published_at: hoursAgo(1), sentiment_score: -0.92, source: 'The Block' },
      { title: 'LayerZero team denies Stargate insolvency rumors — issues emergency statement', url: '#', published_at: hoursAgo(3), sentiment_score: -0.78, source: 'CoinDesk' },
      { title: 'On-chain analysis: 3 wallets withdrew $89M from Stargate pools in coordinated exit', url: '#', published_at: hoursAgo(6), sentiment_score: -0.86, source: 'Nansen' },
      { title: 'Stargate governance proposal to halt bridge operations receives 40% support', url: '#', published_at: hoursAgo(10), sentiment_score: -0.71, source: 'Snapshot' },
      { title: 'STG token slides 18% as narrative risk compounds with liquidity crisis', url: '#', published_at: hoursAgo(14), sentiment_score: -0.83, source: 'Messari' },
      { title: 'Security firm flags unusual cross-chain message patterns on Stargate contracts', url: '#', published_at: hoursAgo(20), sentiment_score: -0.74, source: 'Rekt News' },
      { title: 'Competing bridge protocol Across sees 340% volume increase as Stargate users migrate', url: '#', published_at: daysAgo(1), sentiment_score: -0.62, source: 'DefiLlama' },
      { title: 'Stargate V2 upgrade timeline pushed back amid current instability concerns', url: '#', published_at: daysAgo(2), sentiment_score: -0.48, source: 'The Defiant' },
      { title: 'LayerZero airdrop speculation fades as market focus shifts to bridge risks', url: '#', published_at: daysAgo(3), sentiment_score: -0.31, source: 'Decrypt' },
      { title: 'Historical analysis: Bridge TVL drawdowns of 30%+ have preceded 2 of 3 major exploits', url: '#', published_at: daysAgo(4), sentiment_score: -0.89, source: 'Chainalysis' },
    ],
  },
}

export const mockPortfolio: PortfolioView = {
  protocols: [
    {
      id: 'aave-v3',
      name: 'Aave V3',
      score: 67.3,
      action: 'HOLD',
      safe_position_pct: 8.2,
      worst_risk: 'Liquidation Cascade',
      spike_detected: false,
    },
    {
      id: 'uniswap-v3',
      name: 'Uniswap V3',
      score: 51.8,
      action: 'REDUCE',
      safe_position_pct: 4.5,
      worst_risk: 'Narrative Risk',
      spike_detected: false,
    },
    {
      id: 'stargate',
      name: 'Stargate Finance',
      score: 34.2,
      action: 'EXIT',
      safe_position_pct: 0,
      worst_risk: 'Narrative Risk',
      spike_detected: true,
    },
  ],
  overall_risk: 'high',
  fragility_ranking: ['stargate', 'uniswap-v3', 'aave-v3'],
}
