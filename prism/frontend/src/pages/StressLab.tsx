import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOutletContext } from 'react-router-dom'
import { TrendingDown, Waves, ArrowRightLeft, Users, Clock, Zap } from 'lucide-react'
import { usePrismScore } from '../hooks/usePrismScore'
import { useStressScenario } from '../hooks/useStressScenario'
import { STRESS_SCENARIOS } from '../lib/constants'
import { formatScore } from '../lib/utils'
import { ACTION_COLORS } from '../types'
import StressResultCard from '../components/cards/StressResultCard'
import StressComparisonChart from '../components/charts/StressComparisonChart'
import ActionBadge from '../components/cards/ActionBadge'
import type { StressResult } from '../types'
import { mockStressResults } from '../data/mockData'

const iconMap: Record<string, React.ComponentType<{ size?: number; color?: string }>> = {
  TrendingDown,
  Waves,
  ArrowRightLeft,
  Users,
  Clock,
}

const CASCADE_STAGES = [
  { scenario: 'bridge_outflow_spike', label: 'Stage 1: Bridge Outflow' },
  { scenario: 'whale_exit_15', label: 'Stage 2: Whale Exit' },
  { scenario: 'governance_spike', label: 'Stage 3: Governance Spike' },
  { scenario: 'eth_drop_20', label: 'Stage 4: Market Crash' },
]

export default function StressLab() {
  const { selectedProtocol } = useOutletContext<{
    selectedProtocol: string
    setSelectedProtocol: (id: string) => void
  }>()
  const { score } = usePrismScore(selectedProtocol)
  const { runScenario, result, loading } = useStressScenario(selectedProtocol)
  const [activeScenario, setActiveScenario] = useState<string | null>(null)
  const [cascadeRunning, setCascadeRunning] = useState(false)
  const [cascadeStage, setCascadeStage] = useState(-1)
  const [cascadeResults, setCascadeResults] = useState<StressResult[]>([])

  const handleScenario = (scenarioId: string) => {
    setActiveScenario(scenarioId)
    setCascadeResults([])
    setCascadeStage(-1)
    runScenario(scenarioId)
  }

  const runCascade = useCallback(async () => {
    setCascadeRunning(true)
    setCascadeResults([])
    setActiveScenario(null)

    const results: StressResult[] = []
    for (let i = 0; i < CASCADE_STAGES.length; i++) {
      setCascadeStage(i)
      await new Promise(resolve => setTimeout(resolve, 1200))
      const stageResult = mockStressResults[selectedProtocol]?.[CASCADE_STAGES[i].scenario]
      if (stageResult) {
        results.push(stageResult)
        setCascadeResults([...results])
      }
    }
    setCascadeRunning(false)
  }, [selectedProtocol])

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
          Stress Lab
        </h1>
        <p style={{ color: '#5C5C5C', fontSize: '0.9rem', marginTop: 4, fontFamily: 'DM Sans' }}>
          Interactive scenario simulator for {score?.name || 'selected protocol'}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '30% 1fr', gap: 24, marginBottom: 24 }}>
        {/* Left: scenario list */}
        <div className="prism-card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {STRESS_SCENARIOS.map((scenario, idx) => {
              const Icon = iconMap[scenario.icon] || Zap
              const isActive = activeScenario === scenario.id
              return (
                <div key={scenario.id}>
                  <button
                    onClick={() => handleScenario(scenario.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 12,
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: 'none',
                      borderLeft: `3px solid ${isActive ? '#D4A017' : 'transparent'}`,
                      background: isActive ? 'rgba(212,160,23,0.06)' : 'transparent',
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <Icon size={16} color="#7EB8D4" />
                    <div>
                      <div style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: '0.85rem', color: '#1A1A1A', marginBottom: 2 }}>
                        {scenario.label}
                      </div>
                      <div style={{ fontFamily: 'DM Sans', fontWeight: 400, fontSize: '0.8rem', color: '#9A9A9A' }}>
                        {scenario.description}
                      </div>
                    </div>
                  </button>
                  {idx < STRESS_SCENARIOS.length - 1 && (
                    <div style={{ height: 1, background: '#F0EDE6', margin: '0 16px' }} />
                  )}
                </div>
              )
            })}
          </div>

          <button
            onClick={runCascade}
            disabled={cascadeRunning}
            style={{
              marginTop: 16,
              width: '100%',
              padding: '12px 16px',
              borderRadius: 8,
              border: 'none',
              cursor: cascadeRunning ? 'not-allowed' : 'pointer',
              fontFamily: 'DM Sans',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#FFFFFF',
              background: cascadeRunning ? '#9A9A9A' : '#D4A017',
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={e => { if (!cascadeRunning) (e.target as HTMLElement).style.background = '#C49010' }}
            onMouseLeave={e => { if (!cascadeRunning) (e.target as HTMLElement).style.background = '#D4A017' }}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Zap size={14} />
              {cascadeRunning ? `Running Stage ${cascadeStage + 1} of 4…` : 'FOUR-ACT CASCADE'}
            </span>
          </button>
        </div>

        {/* Right: results */}
        <div>
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="prism-card flex items-center justify-center"
                style={{ minHeight: 400 }}
              >
                <span style={{ fontFamily: 'DM Sans', fontWeight: 400, color: '#9A9A9A' }}>
                  Running scenario…
                </span>
              </motion.div>
            )}

            {!loading && !result && cascadeResults.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="prism-card flex items-center justify-center"
                style={{ minHeight: 400 }}
              >
                <span style={{ fontFamily: 'DM Sans', fontWeight: 400, fontStyle: 'italic', color: '#9A9A9A' }}>
                  Select a scenario to begin
                </span>
              </motion.div>
            )}

            {!loading && result && cascadeResults.length === 0 && score && (
              <motion.div
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
              >
                <StressResultCard result={result} />
                <div className="prism-card" style={{ padding: 24, background: '#F9F8F5' }}>
                  <p className="card-section-label" style={{ color: '#D4A017' }}>PILLAR IMPACT</p>
                  <StressComparisonChart result={result} baseScores={score.pillar_scores} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {cascadeResults.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {cascadeResults.map((cr, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.15 }}
                  className="prism-card"
                  style={{ padding: 16 }}
                >
                  <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                    <span className="font-syne" style={{ fontSize: '0.9rem', fontWeight: 700, color: '#D4A017' }}>
                      {CASCADE_STAGES[idx].label}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="font-syne" style={{ fontSize: '0.9rem', fontWeight: 800, color: ACTION_COLORS[cr.base_action] }}>
                        {formatScore(cr.base_score)}
                      </span>
                      <span style={{ color: '#9A9A9A' }}>→</span>
                      <span className="font-syne" style={{ fontSize: '0.9rem', fontWeight: 800, color: ACTION_COLORS[cr.stressed_action] }}>
                        {formatScore(cr.stressed_score)}
                      </span>
                      <ActionBadge action={cr.stressed_action} size="sm" />
                    </div>
                  </div>
                  <p style={{ fontFamily: 'DM Sans', fontWeight: 400, fontSize: '0.85rem', color: '#5C5C5C' }}>
                    {cr.narrative}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
