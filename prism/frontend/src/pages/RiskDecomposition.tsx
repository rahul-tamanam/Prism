import { motion } from 'framer-motion'
import { useOutletContext } from 'react-router-dom'
import { usePrismScore } from '../hooks/usePrismScore'
import { PILLAR_COLORS, PILLAR_WEIGHTS, ACTION_COLORS } from '../types'
import PrismRadarChart from '../components/charts/PrismRadarChart'
import PillarCard from '../components/cards/PillarCard'
import PillarBarChart from '../components/charts/PillarBarChart'
import TripleConvergenceAlert from '../components/cards/TripleConvergenceAlert'
import ActionBadge from '../components/cards/ActionBadge'
import { formatScore } from '../lib/utils'

export default function RiskDecomposition() {
  const { selectedProtocol } = useOutletContext<{
    selectedProtocol: string
    setSelectedProtocol: (id: string) => void
  }>()
  const { score, loading } = usePrismScore(selectedProtocol)

  if (loading || !score) {
    return (
      <div className="flex items-center justify-center h-64">
        <span className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          Loading risk decomposition…
        </span>
      </div>
    )
  }

  const pillars = ['liquidity', 'liquidation', 'governance', 'oracle', 'supply', 'narrative']
  const scoreColor = ACTION_COLORS[score.action]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}
    >
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #E8E4DC' }}>
        <h1
          className="font-syne"
          style={{ fontWeight: 700, fontSize: '1.6rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <span style={{ width: 4, height: 24, background: '#D4A017', borderRadius: 2, display: 'inline-block' }} />
          Risk Decomposition
        </h1>
        <p style={{ color: '#5C5C5C', fontSize: '0.9rem', marginTop: 4, fontFamily: 'DM Sans' }}>
          Full pillar breakdown for {score.name}
        </p>
      </div>

      <TripleConvergenceAlert active={score.triple_convergence_active} />

      <div style={{ display: 'grid', gridTemplateColumns: '55% 1fr', gap: 24, marginBottom: 32 }}>
        <div className="prism-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div className="flex items-center gap-4 mb-6 self-start">
            <span className="font-syne anim-count-up" style={{ fontSize: '3rem', fontWeight: 800, color: scoreColor }}>
              {formatScore(score.score)}
            </span>
            <ActionBadge action={score.action} size="lg" />
          </div>
          <PrismRadarChart pillarScores={score.pillar_scores} color={scoreColor} size={400} />
          <p style={{ fontFamily: 'DM Sans', fontSize: '0.85rem', color: '#9A9A9A', marginTop: 16 }}>
            {score.safe_position_label}
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {pillars.map((pillar, index) => (
            <PillarCard
              key={pillar}
              pillar={pillar}
              score={score.pillar_scores[pillar as keyof typeof score.pillar_scores] as number}
              weight={PILLAR_WEIGHTS[pillar]}
              color={PILLAR_COLORS[pillar]}
              index={index}
            />
          ))}
        </div>
      </div>

      <div className="prism-card" style={{ padding: 24 }}>
        <p className="card-section-label" style={{ color: '#D4A017' }}>PILLAR COMPARISON</p>
        <PillarBarChart pillarScores={score.pillar_scores} />
      </div>
    </motion.div>
  )
}
