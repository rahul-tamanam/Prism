import { Fragment, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { GitBranch } from 'lucide-react'
import type { CorrelationMatrix as CorrelationMatrixType } from '../../types'
import { api } from '../../lib/api'

function correlationColor(corr: number): string {
  if (corr >= 0.8) return '#C94040'
  if (corr >= 0.6) return '#E07B39'
  if (corr >= 0.4) return '#D4A017'
  return '#2D8A4E'
}

function correlationBg(corr: number): string {
  if (corr >= 0.8) return 'rgba(201,64,64,0.12)'
  if (corr >= 0.6) return 'rgba(224,123,57,0.10)'
  if (corr >= 0.4) return 'rgba(212,160,23,0.08)'
  return 'rgba(45,138,78,0.08)'
}

const DISPLAY_NAMES: Record<string, string> = {
  'aave-v3': 'Aave V3',
  'uniswap-v3': 'Uniswap V3',
  stargate: 'Stargate',
}

export default function CorrelationMatrix() {
  const [data, setData] = useState<CorrelationMatrixType | null>(null)
  const [selectedPair, setSelectedPair] = useState<string | null>(null)

  useEffect(() => {
    void api.getCorrelationMatrix().then(setData)
  }, [])

  if (!data) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: '#9A9A9A', fontFamily: 'Inter' }}>
        Loading correlation data…
      </div>
    )
  }

  const { protocols, matrix, pairs, overall_diversification_score, high_correlation_warnings } = data
  const selectedPairData = selectedPair
    ? pairs.find(p => `${p.protocol_a}|${p.protocol_b}` === selectedPair)
    : null

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E4DC',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
      }}
    >
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid #E8E4DC',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <GitBranch size={18} color="#7EB8D4" />
          <h3 className="font-syne" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1A1A1A', margin: 0 }}>
            Correlation Matrix
          </h3>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontFamily: 'Inter', fontSize: '0.75rem', color: '#9A9A9A' }}>
            Portfolio Diversification Score
          </span>
          <span
            className="font-syne"
            style={{
              fontWeight: 800,
              fontSize: '1rem',
              color:
                overall_diversification_score > 50
                  ? '#2D8A4E'
                  : overall_diversification_score > 30
                    ? '#D4A017'
                    : '#C94040',
            }}
          >
            {overall_diversification_score.toFixed(1)}
          </span>
        </div>
      </div>

      {high_correlation_warnings.length > 0 && (
        <div
          style={{
            padding: '10px 24px',
            background: 'rgba(224,123,57,0.06)',
            borderBottom: '1px solid rgba(224,123,57,0.2)',
            fontFamily: 'Inter',
            fontSize: '0.8rem',
            color: '#E07B39',
          }}
        >
          ⚠ {high_correlation_warnings.length} high-correlation pair
          {high_correlation_warnings.length > 1 ? 's' : ''} detected - portfolio may be less diversified than it
          appears
        </div>
      )}

      <div style={{ padding: 24 }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `120px repeat(${protocols.length}, 1fr)`,
            gap: 4,
            marginBottom: 24,
          }}
        >
          <div />
          {protocols.map(p => (
            <div
              key={p}
              style={{
                fontFamily: 'Inter',
                fontWeight: 600,
                fontSize: '0.7rem',
                color: '#5C5C5C',
                textAlign: 'center',
                padding: '6px 4px',
              }}
            >
              {DISPLAY_NAMES[p] || p}
            </div>
          ))}

          {protocols.map(rowProto => (
            <Fragment key={rowProto}>
              <div
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  color: '#5C5C5C',
                  display: 'flex',
                  alignItems: 'center',
                  paddingRight: 8,
                }}
              >
                {DISPLAY_NAMES[rowProto] || rowProto}
              </div>
              {protocols.map(colProto => {
                const corr = matrix[rowProto]?.[colProto] ?? 0
                const isDiag = rowProto === colProto
                const sorted = [rowProto, colProto].sort()
                const pairKey = `${sorted[0]}|${sorted[1]}`
                const isSelected = selectedPair === pairKey
                return (
                  <motion.div
                    key={`${rowProto}-${colProto}`}
                    whileHover={!isDiag ? { scale: 1.05 } : {}}
                    onClick={() => {
                      if (!isDiag) setSelectedPair(isSelected ? null : pairKey)
                    }}
                    style={{
                      background: isDiag
                        ? '#F0EDE6'
                        : isSelected
                          ? correlationColor(corr)
                          : correlationBg(corr),
                      borderRadius: 8,
                      padding: '12px 4px',
                      textAlign: 'center',
                      cursor: isDiag ? 'default' : 'pointer',
                      border: isSelected ? `2px solid ${correlationColor(corr)}` : '2px solid transparent',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span
                      className="font-syne"
                      style={{
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        color: isDiag ? '#9A9A9A' : isSelected ? '#FFFFFF' : correlationColor(corr),
                      }}
                    >
                      {isDiag ? '-' : corr.toFixed(2)}
                    </span>
                  </motion.div>
                )
              })}
            </Fragment>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: '≥0.8 Very High', color: '#C94040' },
            { label: '0.6–0.8 High', color: '#E07B39' },
            { label: '0.4–0.6 Moderate', color: '#D4A017' },
            { label: '<0.4 Low', color: '#2D8A4E' },
          ].map(item => (
            <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: 2, background: item.color }} />
              <span style={{ fontFamily: 'Inter', fontSize: '0.72rem', color: '#5C5C5C' }}>{item.label}</span>
            </div>
          ))}
        </div>

        {selectedPairData && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              background: '#FAFAF7',
              border: '1px solid #E8E4DC',
              borderLeft: `3px solid ${correlationColor(selectedPairData.correlation)}`,
              borderRadius: 10,
              padding: 16,
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <span className="font-syne" style={{ fontWeight: 700, fontSize: '0.85rem', color: '#1A1A1A' }}>
                {DISPLAY_NAMES[selectedPairData.protocol_a]} × {DISPLAY_NAMES[selectedPairData.protocol_b]}
              </span>
              <span
                style={{
                  fontFamily: 'Inter',
                  fontWeight: 600,
                  fontSize: '0.7rem',
                  color: '#9A9A9A',
                  background: '#F0EDE6',
                  borderRadius: 20,
                  padding: '2px 8px',
                }}
              >
                {selectedPairData.source === 'live' ? 'Live data' : 'Estimated'}
              </span>
            </div>
            <p
              style={{
                fontFamily: 'Inter',
                fontSize: '0.82rem',
                color: '#5C5C5C',
                margin: '0 0 8px',
                lineHeight: 1.5,
              }}
            >
              {selectedPairData.risk_note}
            </p>
            <p
              style={{
                fontFamily: 'Inter',
                fontSize: '0.8rem',
                color: '#2D8A4E',
                margin: '0 0 8px',
                fontWeight: 600,
              }}
            >
              {selectedPairData.diversification_benefit}
            </p>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {selectedPairData.drivers.map(d => (
                <span
                  key={d}
                  style={{
                    fontFamily: 'Inter',
                    fontSize: '0.7rem',
                    color: '#7EB8D4',
                    background: 'rgba(126,184,212,0.1)',
                    border: '1px solid rgba(126,184,212,0.3)',
                    borderRadius: 20,
                    padding: '2px 10px',
                  }}
                >
                  {d}
                </span>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
