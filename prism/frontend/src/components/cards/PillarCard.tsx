import { motion } from 'framer-motion'
import { PILLAR_LABELS } from '../../types'
import { formatScore } from '../../lib/utils'

interface PillarCardProps {
  pillar: string
  score: number
  weight: number
  color: string
  index: number
}

function getRiskNarrative(pillar: string, score: number): string {
  const level = score >= 70 ? 'healthy' : score >= 50 ? 'moderate' : score >= 35 ? 'elevated' : 'critical'
  const narratives: Record<string, Record<string, string>> = {
    liquidity: {
      healthy: 'Liquidity depth is strong with well-distributed order books.',
      moderate: 'Liquidity is thinning — withdrawal capacity may be constrained under stress.',
      elevated: 'Significant liquidity gaps detected; slippage risk is material.',
      critical: 'Liquidity crisis in progress — large withdrawals may fail to execute.',
    },
    liquidation: {
      healthy: 'Liquidation thresholds are well-buffered across positions.',
      moderate: 'Clustered liquidation levels approaching current price range.',
      elevated: 'Liquidation cascades likely if collateral drops another 8-12%.',
      critical: 'Active liquidation cascade in progress — bad debt accumulating.',
    },
    governance: {
      healthy: 'Governance participation is strong with diversified voting power.',
      moderate: 'Governance concentration risk is increasing — monitor token accumulation.',
      elevated: 'Governance capture risk elevated — concentrated voting power detected.',
      critical: 'Governance under active threat — emergency proposals may pass unchecked.',
    },
    oracle: {
      healthy: 'Price feeds are responsive with multiple redundant sources.',
      moderate: 'Oracle latency slightly elevated; monitoring for staleness.',
      elevated: 'Oracle dependency risk growing — single-source feeds detected.',
      critical: 'Oracle feeds stale or unreliable — pricing integrity compromised.',
    },
    supply: {
      healthy: 'Supply dynamics are stable with balanced inflows and outflows.',
      moderate: 'Net outflows detected — supply pressure building slowly.',
      elevated: 'Significant supply contraction — TVL drawdown accelerating.',
      critical: 'Supply crisis — rapid outflows threatening protocol viability.',
    },
    narrative: {
      healthy: 'Sentiment is positive with constructive community discourse.',
      moderate: 'Mixed sentiment — negative articles increasing in frequency.',
      elevated: 'Negative narrative building — social media mentions spiking.',
      critical: 'Narrative crisis — coordinated FUD campaign or genuine risk exposure.',
    },
  }
  return narratives[pillar]?.[level] || 'Risk assessment unavailable.'
}

const dataSources: Record<string, string> = {
  liquidity: 'DefiLlama · On-chain pool depth',
  liquidation: 'Protocol subgraph · Position analysis',
  governance: 'Snapshot · Tally · Token distribution',
  oracle: 'Chainlink · TWAP deviation monitoring',
  supply: 'DefiLlama · Token terminal flows',
  narrative: 'LunarCrush · News API · Social feeds',
}

export default function PillarCard({ pillar, score, weight, color, index }: PillarCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35 }}
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E4DC',
        borderRadius: 12,
        padding: '16px 20px',
        borderLeft: `3px solid ${color}`,
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <span
          style={{
            fontFamily: 'DM Sans',
            fontWeight: 600,
            fontSize: '0.65rem',
            letterSpacing: '0.12em',
            textTransform: 'uppercase' as const,
            color: '#9A9A9A',
          }}
        >
          {PILLAR_LABELS[pillar]}
        </span>
        <span style={{ fontFamily: 'DM Sans', fontWeight: 400, fontSize: '0.7rem', color: '#9A9A9A' }}>
          {weight}% weight
        </span>
      </div>

      <div className="font-syne" style={{ fontSize: '2rem', fontWeight: 800, color, marginBottom: 8 }}>
        {formatScore(score)}
      </div>

      <div style={{ width: '100%', height: 4, borderRadius: 2, backgroundColor: '#F0EDE6', marginBottom: 12 }}>
        <motion.div
          style={{ height: '100%', borderRadius: 2, background: color }}
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          transition={{ delay: index * 0.08 + 0.2, duration: 0.6, ease: 'easeOut' }}
        />
      </div>

      <p style={{ fontFamily: 'DM Sans', fontWeight: 400, fontSize: '0.85rem', color: '#5C5C5C', marginBottom: 8, lineHeight: 1.5 }}>
        {getRiskNarrative(pillar, score)}
      </p>

      <p style={{ fontFamily: 'DM Sans', fontWeight: 400, fontSize: '0.75rem', color: '#9A9A9A', fontStyle: 'italic' }}>
        {dataSources[pillar]}
      </p>
    </motion.div>
  )
}
