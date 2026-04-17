import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DollarSign, Clock, AlertTriangle, CheckCircle, TrendingDown } from 'lucide-react'
import type { ExitCostResponse } from '../../types'
import { api } from '../../lib/api'

interface ExitCostCalculatorProps {
  protocolId: string
  protocolName: string
}

const RATING_CONFIG = {
  GOOD: { color: '#2D8A4E', bg: 'rgba(45,138,78,0.08)', label: 'Good', icon: CheckCircle },
  MODERATE: { color: '#D4A017', bg: 'rgba(212,160,23,0.08)', label: 'Moderate', icon: Clock },
  HIGH: { color: '#E07B39', bg: 'rgba(224,123,57,0.08)', label: 'High', icon: TrendingDown },
  CRITICAL: { color: '#C94040', bg: 'rgba(201,64,64,0.08)', label: 'Critical', icon: AlertTriangle },
} as const

const URGENCY_OPTIONS = [
  { value: 'immediate' as const, label: 'Immediate', sublabel: 'Exit now' },
  { value: '24h' as const, label: '24 Hours', sublabel: 'Spread today' },
  { value: '7d' as const, label: '7 Days', sublabel: 'Optimal timing' },
]

function formatUSD(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(2)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(2)}M`
  if (n >= 1e3) return `$${(n / 1e3).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

export default function ExitCostCalculator({ protocolId, protocolName }: ExitCostCalculatorProps) {
  const [positionUsd, setPositionUsd] = useState('')
  const [urgency, setUrgency] = useState<'immediate' | '24h' | '7d'>('24h')
  const [result, setResult] = useState<ExitCostResponse | null>(null)
  const [loading, setLoading] = useState(false)

  const handleCalculate = async () => {
    const amount = parseFloat(positionUsd.replace(/,/g, ''))
    if (!amount || amount <= 0) return
    setLoading(true)
    const data = await api.calculateExitCost(protocolId, { position_size_usd: amount, urgency })
    setResult(data)
    setLoading(false)
  }

  const ratingKey = result?.exit_quality_rating ?? 'MODERATE'
  const rating = RATING_CONFIG[ratingKey as keyof typeof RATING_CONFIG] ?? RATING_CONFIG.MODERATE

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E4DC',
        borderRadius: 16,
        padding: 24,
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        marginTop: 24,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <DollarSign size={20} color="#D4A017" />
        <h3 className="font-syne" style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1A1A', margin: 0 }}>
          Exit Cost Calculator
        </h3>
        <span style={{ fontFamily: 'Inter', fontSize: '0.75rem', color: '#9A9A9A', marginLeft: 4 }}>
          {protocolName}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 12, marginBottom: 16 }}>
        <div>
          <label
            style={{
              fontFamily: 'Inter',
              fontSize: '0.75rem',
              color: '#5C5C5C',
              fontWeight: 600,
              display: 'block',
              marginBottom: 6,
            }}
          >
            Position Size (USD)
          </label>
          <input
            type="text"
            value={positionUsd}
            onChange={e => setPositionUsd(e.target.value)}
            placeholder="e.g. 5000000"
            style={{
              width: '100%',
              padding: '10px 14px',
              borderRadius: 8,
              border: '1px solid #E8E4DC',
              fontFamily: 'Inter',
              fontSize: '0.9rem',
              background: '#FAFAF7',
              color: '#1A1A1A',
              outline: 'none',
            }}
          />
        </div>
        <div>
          <label
            style={{
              fontFamily: 'Inter',
              fontSize: '0.75rem',
              color: '#5C5C5C',
              fontWeight: 600,
              display: 'block',
              marginBottom: 6,
            }}
          >
            Exit Window
          </label>
          <div style={{ display: 'flex', gap: 6 }}>
            {URGENCY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setUrgency(opt.value)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  border: `1px solid ${urgency === opt.value ? '#D4A017' : '#E8E4DC'}`,
                  background: urgency === opt.value ? 'rgba(212,160,23,0.08)' : '#FAFAF7',
                  fontFamily: 'Inter',
                  fontWeight: urgency === opt.value ? 600 : 400,
                  fontSize: '0.8rem',
                  color: urgency === opt.value ? '#D4A017' : '#5C5C5C',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => void handleCalculate()}
        disabled={loading || !positionUsd}
        style={{
          width: '100%',
          padding: '12px',
          borderRadius: 8,
          border: 'none',
          background: loading || !positionUsd ? '#9A9A9A' : '#1A1A1A',
          color: '#FFFFFF',
          fontFamily: 'Inter',
          fontWeight: 600,
          fontSize: '0.9rem',
          cursor: loading || !positionUsd ? 'not-allowed' : 'pointer',
          marginBottom: 20,
          transition: 'background 0.2s ease',
        }}
      >
        {loading ? 'Calculating…' : 'Calculate Exit Cost'}
      </button>

      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div
              style={{
                background: rating.bg,
                border: `1px solid ${rating.color}`,
                borderRadius: 12,
                padding: 16,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <rating.icon size={20} color={rating.color} />
              <div>
                <span className="font-syne" style={{ fontWeight: 800, fontSize: '1.4rem', color: rating.color }}>
                  {result.total_cost_pct.toFixed(2)}%
                </span>
                <span style={{ fontFamily: 'Inter', fontSize: '0.85rem', color: '#5C5C5C', marginLeft: 8 }}>
                  total exit cost - {formatUSD(result.total_cost_usd)} on {formatUSD(result.position_size_usd)}{' '}
                  position
                </span>
              </div>
              <span
                style={{
                  marginLeft: 'auto',
                  fontFamily: 'Inter',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                  color: rating.color,
                  background: rating.bg,
                  border: `1px solid ${rating.color}`,
                  borderRadius: 20,
                  padding: '3px 10px',
                  textTransform: 'uppercase' as const,
                }}
              >
                {rating.label}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 16 }}>
              {[
                { label: 'Slippage', value: `${result.slippage_pct.toFixed(2)}%` },
                { label: 'Protocol Fee', value: `${result.protocol_fee_pct.toFixed(2)}%` },
                { label: 'Utilization Penalty', value: `${result.utilization_penalty_pct.toFixed(2)}%` },
                { label: 'Max Safe Tx', value: formatUSD(result.max_safe_single_tx_usd) },
                { label: 'Optimal Chunks', value: `${result.optimal_chunks} txs` },
                { label: 'Optimal Duration', value: `${result.optimal_exit_hours}h` },
              ].map(item => (
                <div
                  key={item.label}
                  style={{
                    background: '#FAFAF7',
                    borderRadius: 8,
                    padding: '10px 12px',
                    border: '1px solid #E8E4DC',
                  }}
                >
                  <div
                    style={{
                      fontFamily: 'Inter',
                      fontSize: '0.65rem',
                      color: '#9A9A9A',
                      textTransform: 'uppercase' as const,
                      letterSpacing: '0.1em',
                      marginBottom: 4,
                    }}
                  >
                    {item.label}
                  </div>
                  <div className="font-syne" style={{ fontWeight: 700, fontSize: '1rem', color: '#1A1A1A' }}>
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {result.recommendations.length > 0 && (
              <div
                style={{
                  background: 'rgba(212,160,23,0.06)',
                  border: '1px solid rgba(212,160,23,0.2)',
                  borderRadius: 8,
                  padding: '12px 16px',
                }}
              >
                <p
                  style={{
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    color: '#D4A017',
                    textTransform: 'uppercase' as const,
                    letterSpacing: '0.1em',
                    marginBottom: 8,
                  }}
                >
                  Recommendations
                </p>
                {result.recommendations.map((r, i) => (
                  <p key={i} style={{ fontFamily: 'Inter', fontSize: '0.85rem', color: '#5C5C5C', margin: '0 0 4px' }}>
                    · {r}
                  </p>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
