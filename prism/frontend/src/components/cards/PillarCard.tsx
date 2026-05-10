import { motion } from 'framer-motion'
import type {
  GovernanceDetail,
  LiquidationDuneDetail,
  NarrativeDuneDetail,
  LiquidityDuneSnippet,
  OracleDuneSnippet,
  SupplyDuneSnippet,
} from '../../types'
import { PILLAR_LABELS } from '../../types'
import { formatScore } from '../../lib/utils'

interface PillarCardProps {
  pillar: string
  score: number
  weight: number
  color: string
  index: number
  governanceDune?: GovernanceDetail | null
  liquidationDune?: LiquidationDuneDetail | null
  narrativeDune?: NarrativeDuneDetail | null
  liquidityDune?: LiquidityDuneSnippet | null
  oracleDune?: OracleDuneSnippet | null
  supplyDune?: SupplyDuneSnippet | null
}

function getRiskNarrative(pillar: string, score: number): string {
  const level = score >= 70 ? 'healthy' : score >= 50 ? 'moderate' : score >= 35 ? 'elevated' : 'critical'
  const narratives: Record<string, Record<string, string>> = {
    liquidity: {
      healthy: 'Liquidity depth is strong with well-distributed order books.',
      moderate: 'Liquidity is thinning - withdrawal capacity may be constrained under stress.',
      elevated: 'Significant liquidity gaps detected; slippage risk is material.',
      critical: 'Liquidity crisis in progress - large withdrawals may fail to execute.',
    },
    liquidation: {
      healthy: 'Liquidation thresholds are well-buffered across positions.',
      moderate: 'Clustered liquidation levels approaching current price range.',
      elevated: 'Liquidation cascades likely if collateral drops another 8-12%.',
      critical: 'Active liquidation cascade in progress - bad debt accumulating.',
    },
    governance: {
      healthy: 'Governance participation is strong with diversified voting power.',
      moderate: 'Governance concentration risk is increasing - monitor token accumulation.',
      elevated: 'Governance capture risk elevated - concentrated voting power detected.',
      critical: 'Governance under active threat - emergency proposals may pass unchecked.',
    },
    oracle: {
      healthy: 'Price feeds are responsive with multiple redundant sources.',
      moderate: 'Oracle latency slightly elevated; monitoring for staleness.',
      elevated: 'Oracle dependency risk growing - single-source feeds detected.',
      critical: 'Oracle feeds stale or unreliable - pricing integrity compromised.',
    },
    supply: {
      healthy: 'Supply dynamics are stable with balanced inflows and outflows.',
      moderate: 'Net outflows detected - supply pressure building slowly.',
      elevated: 'Significant supply contraction - TVL drawdown accelerating.',
      critical: 'Supply crisis - rapid outflows threatening protocol viability.',
    },
    narrative: {
      healthy: 'Sentiment is positive with constructive community discourse.',
      moderate: 'Mixed sentiment - negative articles increasing in frequency.',
      elevated: 'Negative narrative building - social media mentions spiking.',
      critical: 'Narrative crisis - coordinated FUD campaign or genuine risk exposure.',
    },
  }
  return narratives[pillar]?.[level] || 'Risk assessment unavailable.'
}

const dataSources: Record<string, string> = {
  liquidity: 'DefiLlama · Optional Dune TVL (unified query)',
  liquidation: 'The Graph · Dune liquidation history (optional)',
  governance: 'Snapshot · Tally · Dune holder concentration (optional)',
  oracle: 'Chainlink · Optional Dune deviation (unified query)',
  supply: 'DefiLlama · Optional Dune net flow (unified query)',
  narrative: 'News / sentiment · Dune DAU–MAU (optional)',
}

function fmtUsdCompact(n: number): string {
  if (!Number.isFinite(n)) return '-'
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function DuneWhaleBlock({ d }: { d: GovernanceDetail }) {
  const src = d.dune_whale_source
  if (src === 'dune') {
    const parts: string[] = []
    if (d.dune_whale_top10_pct != null && !Number.isNaN(Number(d.dune_whale_top10_pct))) {
      parts.push(`Top 10 ~${Number(d.dune_whale_top10_pct).toFixed(1)}% supply`)
    }
    if (d.dune_whale_gini != null && !Number.isNaN(Number(d.dune_whale_gini))) {
      parts.push(`Gini ${Number(d.dune_whale_gini).toFixed(3)}`)
    }
    return (
      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--border)',
          fontFamily: 'Inter',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.45,
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dune (holders)</span>
        {parts.length > 0 ? <span>{`: ${parts.join(' · ')}`}</span> : <span>: live query (no numeric columns parsed)</span>}
      </div>
    )
  }
  if (src === 'mock') {
    const err = d.dune_whale_error
    return (
      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--border)',
          fontFamily: 'Inter',
          fontSize: '0.72rem',
          color: 'var(--text-muted)',
          lineHeight: 1.45,
        }}
      >
        <div>
          Holder concentration: <em>demo data</em>
          {err ? (
            <>. Dune request failed.</>
          ) : (
            <>
              {' '}. Set <code style={{ fontSize: '0.68rem' }}>dune_prism_query_id</code> (one query for all cards) or{' '}
              <code style={{ fontSize: '0.68rem' }}>dune_whale_query_id</code>, plus{' '}
              <code style={{ fontSize: '0.68rem' }}>DUNE_API_KEY</code>. Use{' '}
              <code style={{ fontSize: '0.68rem' }}>?refresh=true</code> or wait for cache (~15m).
            </>
          )}
        </div>
        {err ? (
          <div style={{ marginTop: 6, color: '#B54747', fontSize: '0.68rem', wordBreak: 'break-word' }}>{err}</div>
        ) : null}
      </div>
    )
  }
  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTop: '1px solid var(--border)',
        fontFamily: 'Inter',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        lineHeight: 1.45,
      }}
    >
      Holder concentration: no Dune fields in API response - use live backend or add{' '}
      <code style={{ fontSize: '0.68rem' }}>dune_whale_query_id</code>.
    </div>
  )
}

function DuneLiquidationsBlock({ d }: { d: LiquidationDuneDetail }) {
  const src = d.dune_liquidations_source
  if (src === 'dune') {
    const date = d.dune_liquidation_latest_date
    const cnt = d.dune_liquidation_latest_count
    const usd = d.dune_liquidation_latest_usd
    const parts: string[] = []
    if (date) parts.push(date)
    if (cnt != null && !Number.isNaN(Number(cnt))) parts.push(`${cnt} liqs`)
    if (usd != null && !Number.isNaN(Number(usd))) parts.push(fmtUsdCompact(Number(usd)))
    return (
      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--border)',
          fontFamily: 'Inter',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.45,
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dune (liquidations)</span>
        {parts.length > 0 ? <span>{`: latest row - ${parts.join(' · ')}`}</span> : <span>: live query</span>}
      </div>
    )
  }
  const err = d.dune_liquidation_error
  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTop: '1px solid var(--border)',
        fontFamily: 'Inter',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        lineHeight: 1.45,
      }}
    >
      <div>
        Liquidation history: <em>subgraph scores only</em>
        {err ? (
          <>. Dune request failed.</>
        ) : (
          <>
            {' '}. <strong style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Not configured:</strong> add liquidation columns to{' '}
            <code style={{ fontSize: '0.68rem' }}>dune_prism_query_id</code> or set{' '}
            <code style={{ fontSize: '0.68rem' }}>dune_liquidations_query_id</code>.
          </>
        )}
      </div>
      {err ? <div style={{ marginTop: 6, color: '#B54747', fontSize: '0.68rem', wordBreak: 'break-word' }}>{err}</div> : null}
    </div>
  )
}

function DuneLiquidityExtraBlock({ d }: { d: LiquidityDuneSnippet }) {
  if (d.dune_liquidity_source === 'dune' && d.dune_liquidity_tvl_usd != null) {
    const parts = [`TVL ${fmtUsdCompact(d.dune_liquidity_tvl_usd)}`]
    if (d.dune_borrowed_usd != null) parts.push(`borrowed ${fmtUsdCompact(d.dune_borrowed_usd)}`)
    return (
      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--border)',
          fontFamily: 'Inter',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.45,
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dune</span>
        <span>{`: ${parts.join(' · ')}`}</span>
      </div>
    )
  }
  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTop: '1px solid var(--border)',
        fontFamily: 'Inter',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        lineHeight: 1.45,
      }}
    >
      <strong style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Dune (optional):</strong> add{' '}
      <code style={{ fontSize: '0.68rem' }}>prism_liquidity_tvl_usd</code> to your unified query (
      <code style={{ fontSize: '0.68rem' }}>dune_prism_query_id</code>).
    </div>
  )
}

function DuneOracleExtraBlock({ d }: { d: OracleDuneSnippet }) {
  if (d.dune_oracle_source === 'dune' && d.dune_oracle_max_deviation_bps != null) {
    return (
      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--border)',
          fontFamily: 'Inter',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.45,
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dune</span>
        <span>{`: max oracle deviation ~${Number(d.dune_oracle_max_deviation_bps).toFixed(2)} bps`}</span>
      </div>
    )
  }
  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTop: '1px solid var(--border)',
        fontFamily: 'Inter',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        lineHeight: 1.45,
      }}
    >
      <strong style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Dune (optional):</strong> add{' '}
      <code style={{ fontSize: '0.68rem' }}>prism_oracle_max_deviation_bps</code> to unified query.
    </div>
  )
}

function DuneSupplyExtraBlock({ d }: { d: SupplyDuneSnippet }) {
  if (d.dune_supply_source === 'dune' && d.dune_supply_net_flow_30d_usd != null) {
    const v = d.dune_supply_net_flow_30d_usd
    const sign = v >= 0 ? '+' : ''
    return (
      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--border)',
          fontFamily: 'Inter',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.45,
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dune</span>
        <span>{`: 30d net flow ${sign}${fmtUsdCompact(Math.abs(v))}`}</span>
      </div>
    )
  }
  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTop: '1px solid var(--border)',
        fontFamily: 'Inter',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        lineHeight: 1.45,
      }}
    >
      <strong style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Dune (optional):</strong> add{' '}
      <code style={{ fontSize: '0.68rem' }}>prism_supply_net_flow_30d_usd</code> to unified query.
    </div>
  )
}

function DuneUsersBlock({ d }: { d: NarrativeDuneDetail }) {
  const src = d.dune_users_source
  const parts: string[] = []
  if (d.dune_dau != null && !Number.isNaN(Number(d.dune_dau))) {
    parts.push(`DAU ${Number(d.dune_dau).toLocaleString()}`)
  }
  if (d.dune_wau != null && !Number.isNaN(Number(d.dune_wau))) {
    parts.push(`WAU ${Number(d.dune_wau).toLocaleString()}`)
  }
  if (d.dune_mau != null && !Number.isNaN(Number(d.dune_mau))) {
    parts.push(`MAU ${Number(d.dune_mau).toLocaleString()}`)
  }

  if (src === 'dune') {
    return (
      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--border)',
          fontFamily: 'Inter',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.45,
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Dune (activity)</span>
        {parts.length > 0 ? <span>{`: ${parts.join(' · ')}`}</span> : <span>: live query</span>}
      </div>
    )
  }

  if (src === 'mock' && parts.length > 0) {
    return (
      <div
        style={{
          marginTop: 10,
          paddingTop: 10,
          borderTop: '1px solid var(--border)',
          fontFamily: 'Inter',
          fontSize: '0.72rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.45,
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>On-chain activity (demo)</span>
        <span>{`: ${parts.join(' · ')}`}</span>
        <div style={{ marginTop: 6, fontSize: '0.68rem', color: 'var(--text-muted)' }}>
          For live Dune labeling: set <code style={{ fontSize: '0.68rem' }}>dune_prism_query_id</code> (or per-protocol
          env override in backend) and include <code style={{ fontSize: '0.68rem' }}>dau</code>/
          <code style={{ fontSize: '0.68rem' }}>wau</code>/<code style={{ fontSize: '0.68rem' }}>mau</code> in the unified
          query.
        </div>
      </div>
    )
  }

  const err = d.dune_users_error
  return (
    <div
      style={{
        marginTop: 10,
        paddingTop: 10,
        borderTop: '1px solid var(--border)',
        fontFamily: 'Inter',
        fontSize: '0.72rem',
        color: 'var(--text-muted)',
        lineHeight: 1.45,
      }}
    >
      <div>
        On-chain activity: <em>placeholder until Dune is wired</em>
        {err ? (
          <>. Dune request failed.</>
        ) : (
          <>
            {' '}. <strong style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>Not configured:</strong> add{' '}
            <code style={{ fontSize: '0.68rem' }}>dau</code>/<code style={{ fontSize: '0.68rem' }}>wau</code>/
            <code style={{ fontSize: '0.68rem' }}>mau</code> to unified query or{' '}
            <code style={{ fontSize: '0.68rem' }}>dune_users_query_id</code>.
          </>
        )}
      </div>
      {err ? <div style={{ marginTop: 6, color: '#B54747', fontSize: '0.68rem', wordBreak: 'break-word' }}>{err}</div> : null}
    </div>
  )
}

export default function PillarCard({
  pillar,
  score,
  weight,
  color,
  index,
  governanceDune,
  liquidationDune,
  narrativeDune,
  liquidityDune,
  oracleDune,
  supplyDune,
}: PillarCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '16px 20px',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          style={{
            fontFamily: 'Inter',
            fontWeight: 600,
            fontSize: '0.65rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: 'var(--text-muted)',
          }}
        >
          {PILLAR_LABELS[pillar]}
        </span>
        <span style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '0.7rem', color: 'var(--text-muted)' }}>
          {weight}% weight
        </span>
      </div>

      <div className="font-syne" style={{ fontSize: '2rem', fontWeight: 800, color, marginBottom: 8 }}>
        {formatScore(score)}
      </div>

      <div style={{ width: '100%', height: 4, borderRadius: 2, backgroundColor: 'var(--border)', marginBottom: 12 }}>
        <motion.div
          style={{ height: '100%', borderRadius: 2, background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ delay: index * 0.08 + 0.2, duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: 8, lineHeight: 1.5 }}>
        {getRiskNarrative(pillar, score)}
      </p>

      <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
        {dataSources[pillar]}
      </p>

      {pillar === 'governance' && governanceDune ? <DuneWhaleBlock d={governanceDune} /> : null}
      {pillar === 'liquidation' && liquidationDune ? <DuneLiquidationsBlock d={liquidationDune} /> : null}
      {pillar === 'narrative' && narrativeDune ? <DuneUsersBlock d={narrativeDune} /> : null}
      {pillar === 'liquidity' && liquidityDune ? <DuneLiquidityExtraBlock d={liquidityDune} /> : null}
      {pillar === 'oracle' && oracleDune ? <DuneOracleExtraBlock d={oracleDune} /> : null}
      {pillar === 'supply' && supplyDune ? <DuneSupplyExtraBlock d={supplyDune} /> : null}
    </motion.div>
  )
}
