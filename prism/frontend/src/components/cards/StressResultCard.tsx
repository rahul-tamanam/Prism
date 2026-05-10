import { motion } from 'framer-motion'
import type { StressResult } from '../../types'
import { ACTION_COLORS, PILLAR_LABELS } from '../../types'
import { formatScore } from '../../lib/utils'
import ActionBadge from './ActionBadge'

interface StressResultCardProps {
  result: StressResult
}

export default function StressResultCard({ result }: StressResultCardProps) {
  const scoreDelta = result.stressed_score - result.base_score

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="prism-card"
      style={{ padding: 24 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h3 className="font-syne" style={{ fontWeight: 700, fontSize: '0.9rem', color: '#D4A017' }}>
          STRESS RESULT: {result.scenario.toUpperCase()}
        </h3>
        <span style={{ fontFamily: 'Inter', fontWeight: 600, color: '#C94040' }}>
          {scoreDelta > 0 ? '+' : ''}{formatScore(scoreDelta)} pts
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: 'Inter', fontWeight: 600, fontSize: '0.65rem',
            letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            color: 'var(--text-muted)', marginBottom: 4,
          }}>
            Before
          </p>
          <span className="font-syne" style={{ fontSize: '2.5rem', fontWeight: 800, color: ACTION_COLORS[result.base_action] }}>
            {formatScore(result.base_score)}
          </span>
          <div style={{ marginTop: 8 }}>
            <ActionBadge action={result.base_action} size="sm" />
          </div>
        </div>

        <div style={{ fontSize: '1.2rem', color: 'var(--text-muted)' }}>→</div>

        <div style={{ textAlign: 'center' }}>
          <p style={{
            fontFamily: 'Inter', fontWeight: 600, fontSize: '0.65rem',
            letterSpacing: '0.1em', textTransform: 'uppercase' as const,
            color: 'var(--text-muted)', marginBottom: 4,
          }}>
            After
          </p>
          <span className="font-syne" style={{ fontSize: '2.5rem', fontWeight: 800, color: ACTION_COLORS[result.stressed_action] }}>
            {formatScore(result.stressed_score)}
          </span>
          <div style={{ marginTop: 8 }}>
            <ActionBadge action={result.stressed_action} size="sm" />
          </div>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <span style={{
          fontFamily: 'Inter', fontWeight: 600, fontSize: '0.65rem',
          letterSpacing: '0.1em', textTransform: 'uppercase' as const,
          color: 'var(--text-muted)',
        }}>
          MOST AFFECTED
        </span>
        <p style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '0.9rem', color: '#D4A017', marginTop: 4 }}>
          {PILLAR_LABELS[result.most_affected_pillar] || result.most_affected_pillar}
        </p>
      </div>

      <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '0.85rem', color: '#5C5C5C', lineHeight: 1.6 }}>
        {result.narrative}
      </p>
    </motion.div>
  )
}
