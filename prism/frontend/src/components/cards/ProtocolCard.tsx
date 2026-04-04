import { motion } from 'framer-motion'
import type { Protocol, PrismScore } from '../../types'
import { ACTION_COLORS, PILLAR_LABELS } from '../../types'
import { formatScore, formatTVL } from '../../lib/utils'
import ActionBadge from './ActionBadge'
import PrismRadarChart from '../charts/PrismRadarChart'

const LOGO_COLORS: Record<string, string> = {
  'aave-v3': 'rgba(212,160,23,0.12)',
  'uniswap-v3': 'rgba(126,184,212,0.12)',
  'stargate': 'rgba(224,123,57,0.12)',
}
const LOGO_TEXT_COLORS: Record<string, string> = {
  'aave-v3': '#D4A017',
  'uniswap-v3': '#7EB8D4',
  'stargate': '#E07B39',
}

interface ProtocolCardProps {
  protocol: Protocol
  score: PrismScore
  onClick: () => void
  index?: number
}

export default function ProtocolCard({ protocol, score, onClick, index = 0 }: ProtocolCardProps) {
  const scoreColor = ACTION_COLORS[score.action] || 'var(--text-primary)'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1, duration: 0.4 }}
      onClick={onClick}
      className="prism-card cursor-pointer"
      style={{ padding: 24 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="flex items-center justify-center font-syne font-bold text-sm"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: LOGO_COLORS[protocol.id] || 'rgba(212,160,23,0.12)',
            color: LOGO_TEXT_COLORS[protocol.id] || '#D4A017',
          }}
        >
          {protocol.logo}
        </div>
        <div>
          <h3 className="font-syne text-sm font-bold" style={{ color: '#1A1A1A' }}>
            {protocol.name}
          </h3>
          <span
            className="text-[9px] uppercase tracking-[0.15em] font-medium"
            style={{ color: '#9A9A9A' }}
          >
            {protocol.type} · {formatTVL(protocol.current_tvl)}
          </span>
        </div>
      </div>

      <div className="flex items-end gap-4 mb-4">
        <span
          className="font-syne text-6xl leading-none anim-count-up"
          style={{ color: scoreColor, fontWeight: 800 }}
        >
          {formatScore(score.score)}
        </span>
        <ActionBadge action={score.action} size="md" />
      </div>

      <div className="flex justify-center mb-4">
        <PrismRadarChart pillarScores={score.pillar_scores} color={scoreColor} size={200} />
      </div>

      <div className="space-y-2 mb-4">
        <p className="text-xs font-medium" style={{ color: '#5C5C5C', fontFamily: 'DM Sans' }}>
          {score.safe_position_label}
        </p>
        <p className="text-xs font-medium" style={{ color: '#D4A017', fontFamily: 'DM Sans' }}>
          Worst: {PILLAR_LABELS[score.worst_pillar] || score.worst_pillar}
        </p>
      </div>

      <button
        className="text-sm font-medium transition-colors"
        style={{ color: '#7EB8D4', fontFamily: 'DM Sans', fontWeight: 500, fontSize: '0.85rem' }}
        onMouseEnter={e => { (e.target as HTMLElement).style.color = '#D4A017' }}
        onMouseLeave={e => { (e.target as HTMLElement).style.color = '#7EB8D4' }}
      >
        View Details →
      </button>
    </motion.div>
  )
}
