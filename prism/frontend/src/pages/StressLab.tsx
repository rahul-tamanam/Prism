import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOutletContext } from 'react-router-dom'
import { TrendingDown, Waves, ArrowRightLeft, Users, Clock, Zap, FlaskConical } from 'lucide-react'
import { usePrismScore } from '../hooks/usePrismScore'
import { useStressScenario } from '../hooks/useStressScenario'
import { STRESS_SCENARIOS } from '../lib/constants'
import { formatScore } from '../lib/utils'
import { ACTION_COLORS } from '../types'
import StressResultCard from '../components/cards/StressResultCard'
import StressComparisonChart from '../components/charts/StressComparisonChart'
import MonteCarloHistogramChart from '../components/charts/MonteCarloHistogramChart'
import ActionBadge from '../components/cards/ActionBadge'
import type { StressResult, MonteCarloResult } from '../types'
import { mockStressResults } from '../data/mockData'
import { api } from '../lib/api'

const MC_ACTION_ORDER = ['ENTER', 'HOLD', 'REDUCE', 'EXIT'] as const

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

  const [mcScenario, setMcScenario] = useState(STRESS_SCENARIOS[0].id)
  const [mcIterations, setMcIterations] = useState(2000)
  const [mcSigma, setMcSigma] = useState(0.25)
  const [mcResult, setMcResult] = useState<MonteCarloResult | null>(null)
  const [mcLoading, setMcLoading] = useState(false)

  useEffect(() => {
    if (activeScenario) setMcScenario(activeScenario)
  }, [activeScenario])

  const runMonteCarlo = useCallback(async () => {
    setMcLoading(true)
    try {
      const data = await api.runMonteCarlo(selectedProtocol, {
        scenario: mcScenario,
        iterations: mcIterations,
        sigma: mcSigma,
      })
      setMcResult(data)
    } finally {
      setMcLoading(false)
    }
  }, [selectedProtocol, mcScenario, mcIterations, mcSigma])

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
        <p style={{ color: '#5C5C5C', fontSize: '0.9rem', marginTop: 4, fontFamily: 'Inter' }}>
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
                      <div style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '0.85rem', color: '#1A1A1A', marginBottom: 2 }}>
                        {scenario.label}
                      </div>
                      <div style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '0.8rem', color: '#9A9A9A' }}>
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
              fontFamily: 'Inter',
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
                <span style={{ fontFamily: 'Inter', fontWeight: 400, color: '#9A9A9A' }}>
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
                <span style={{ fontFamily: 'Inter', fontWeight: 400, fontStyle: 'italic', color: '#9A9A9A' }}>
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
                  <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '0.85rem', color: '#5C5C5C' }}>
                    {cr.narrative}
                  </p>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="prism-card" style={{ padding: 24, marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <FlaskConical size={22} color="#D4A017" />
          <h2 className="font-syne" style={{ fontWeight: 700, fontSize: '1.15rem', color: '#1A1A1A', margin: 0 }}>
            Monte Carlo
          </h2>
        </div>
        <p style={{ fontFamily: 'Inter', fontSize: '0.85rem', color: '#5C5C5C', marginBottom: 20, maxWidth: 720 }}>
          Each path applies independent log-normal multipliers (mean 1, tunable σ) to the selected scenario&apos;s pillar
          deltas, then recomputes the PRISM score. Use this to see the distribution of outcomes under shock magnitude
          uncertainty.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: 16,
            alignItems: 'end',
            marginBottom: 20,
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'Inter', fontSize: '0.8rem', color: '#5C5C5C' }}>
            Scenario
            <select
              value={mcScenario}
              onChange={e => setMcScenario(e.target.value)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                border: '1px solid #E8E4DC',
                fontFamily: 'Inter',
                fontSize: '0.85rem',
                background: '#F9F8F5',
                color: '#1A1A1A',
              }}
            >
              {STRESS_SCENARIOS.map(s => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'Inter', fontSize: '0.8rem', color: '#5C5C5C' }}>
            Paths ({mcIterations})
            <input
              type="range"
              min={500}
              max={5000}
              step={250}
              value={mcIterations}
              onChange={e => setMcIterations(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'Inter', fontSize: '0.8rem', color: '#5C5C5C' }}>
            σ (shock uncertainty) - {mcSigma.toFixed(2)}
            <input
              type="range"
              min={0.1}
              max={0.8}
              step={0.05}
              value={mcSigma}
              onChange={e => setMcSigma(Number(e.target.value))}
              style={{ width: '100%' }}
            />
          </label>
          <button
            type="button"
            onClick={runMonteCarlo}
            disabled={mcLoading}
            style={{
              padding: '12px 20px',
              borderRadius: 8,
              border: 'none',
              cursor: mcLoading ? 'not-allowed' : 'pointer',
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#FFFFFF',
              background: mcLoading ? '#9A9A9A' : '#1A3A52',
              transition: 'background 0.2s ease',
            }}
          >
            {mcLoading ? 'Simulating…' : 'Run simulation'}
          </button>
        </div>

        {mcLoading && (
          <div className="flex items-center justify-center" style={{ minHeight: 120 }}>
            <span style={{ fontFamily: 'Inter', color: '#9A9A9A' }}>Running Monte Carlo paths…</span>
          </div>
        )}

        {!mcLoading && mcResult && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
                gap: 12,
              }}
            >
              <div style={{ padding: 14, background: '#F9F8F5', borderRadius: 8 }}>
                <div style={{ fontFamily: 'Inter', fontSize: '0.7rem', color: '#9A9A9A', textTransform: 'uppercase' }}>Base score</div>
                <div className="font-syne" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1A1A1A' }}>
                  {formatScore(mcResult.base_score)}
                </div>
              </div>
              <div style={{ padding: 14, background: '#F9F8F5', borderRadius: 8 }}>
                <div style={{ fontFamily: 'Inter', fontSize: '0.7rem', color: '#9A9A9A', textTransform: 'uppercase' }}>Mean stressed</div>
                <div className="font-syne" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#D4A017' }}>
                  {formatScore(mcResult.mean_stressed)}
                </div>
              </div>
              <div style={{ padding: 14, background: '#F9F8F5', borderRadius: 8 }}>
                <div style={{ fontFamily: 'Inter', fontSize: '0.7rem', color: '#9A9A9A', textTransform: 'uppercase' }}>Std dev</div>
                <div className="font-syne" style={{ fontSize: '1.35rem', fontWeight: 800, color: '#5C5C5C' }}>
                  {mcResult.std_stressed.toFixed(2)}
                </div>
              </div>
              <div style={{ padding: 14, background: '#F9F8F5', borderRadius: 8 }}>
                <div style={{ fontFamily: 'Inter', fontSize: '0.7rem', color: '#9A9A9A', textTransform: 'uppercase' }}>p5 / p50 / p95</div>
                <div className="font-syne" style={{ fontSize: '1rem', fontWeight: 800, color: '#1A1A1A' }}>
                  {formatScore(mcResult.percentiles['5'])} · {formatScore(mcResult.percentiles['50'])} ·{' '}
                  {formatScore(mcResult.percentiles['95'])}
                </div>
              </div>
            </div>

            <div>
              <p className="card-section-label" style={{ color: '#D4A017', marginBottom: 8 }}>DISTRIBUTION OF STRESSED SCORES</p>
              <MonteCarloHistogramChart result={mcResult} />
            </div>

            <div>
              <p className="card-section-label" style={{ color: '#D4A017', marginBottom: 10 }}>IMPLIED ACTION (PATH PROBABILITY)</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {MC_ACTION_ORDER.map(action => {
                  const p = mcResult.prob_by_action[action] ?? 0
                  return (
                    <div
                      key={action}
                      style={{
                        flex: '1 1 120px',
                        padding: '10px 12px',
                        borderRadius: 8,
                        background: 'rgba(0,0,0,0.03)',
                        borderLeft: `3px solid ${ACTION_COLORS[action] || '#9A9A9A'}`,
                      }}
                    >
                      <div style={{ fontFamily: 'Inter', fontSize: '0.72rem', fontWeight: 600, color: ACTION_COLORS[action] }}>
                        {action}
                      </div>
                      <div className="font-syne" style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1A1A1A' }}>
                        {(p * 100).toFixed(1)}%
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {!mcLoading && !mcResult && (
          <p style={{ fontFamily: 'Inter', fontSize: '0.85rem', fontStyle: 'italic', color: '#9A9A9A', margin: 0 }}>
            Run a simulation to see percentiles, histogram, and action probabilities.
          </p>
        )}
      </div>
    </motion.div>
  )
}
