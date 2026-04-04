import { useState } from 'react'
import { motion } from 'framer-motion'
import type { Protocol, PrismScore } from '../../types'
import { ACTION_COLORS, PILLAR_LABELS } from '../../types'
import { formatScore, formatTVL } from '../../lib/utils'
import ActionBadge from './ActionBadge'
import PrismRadarChart from '../charts/PrismRadarChart'

function logoIsRemoteUrl(logo: string | undefined): boolean {
  const s = (logo || '').trim()
  return /^https?:\/\//i.test(s)
}

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
  const [logoFailed, setLogoFailed] = useState(false)
  const showImg = logoIsRemoteUrl(protocol.logo) && !logoFailed
  const letterFallback = (protocol.name || protocol.id || '?').charAt(0).toUpperCase()

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
          className="flex items-center justify-center font-syne font-bold text-sm overflow-hidden shrink-0"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: LOGO_COLORS[protocol.id] || 'rgba(212,160,23,0.12)',
            color: LOGO_TEXT_COLORS[protocol.id] || '#D4A017',
          }}
        >
          {showImg ? (
            <img
              src={protocol.logo}
              alt=""
              width={36}
              height={36}
              loading="lazy"
              decoding="async"
              className="object-contain p-1"
              style={{ width: 36, height: 36 }}
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <span aria-hidden>{protocol.logo && !logoIsRemoteUrl(protocol.logo) ? protocol.logo : letterFallback}</span>
          )}
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

      {score.divergence && (
        <div
          style={{
            fontFamily: 'DM Sans',
            fontSize: '0.72rem',
            color:
              score.divergence.drs < 15
                ? '#2D8A4E'
                : score.divergence.drs < 35
                  ? '#D4A017'
                  : score.divergence.drs < 60
                    ? '#E07B39'
                    : '#C94040',
            fontWeight: 600,
            marginTop: 6,
            marginBottom: 8,
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <span>DIV {score.divergence.drs.toFixed(1)}</span>
          <span style={{ color: '#9A9A9A', fontWeight: 400 }}>·</span>
          <span style={{ color: '#9A9A9A', fontWeight: 400 }}>{score.divergence.dominant_pair}</span>
          <span style={{ color: '#9A9A9A', fontWeight: 400 }}>·</span>
          <span>{score.divergence.velocity}</span>
        </div>
      )}

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
