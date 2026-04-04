import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, ArrowUp, ArrowRight, ArrowDown, ChevronDown, ChevronUp } from 'lucide-react'
import type { DivergenceResult, DivergencePair } from '../../types'

interface DivergencePanelProps {
  divergence: DivergenceResult
}

function drsColor(drs: number): string {
  if (drs < 15) return '#2D8A4E'
  if (drs < 35) return '#D4A017'
  if (drs < 60) return '#E07B39'
  return '#C94040'
}

function drsBg(drs: number): string {
  if (drs < 15) return 'rgba(45,138,78,0.08)'
  if (drs < 35) return 'rgba(212,160,23,0.08)'
  if (drs < 60) return 'rgba(224,123,57,0.08)'
  return 'rgba(201,64,64,0.08)'
}

function deltaColor(delta: number): string {
  if (delta < 5) return '#2D8A4E'
  if (delta < 20) return '#D4A017'
  return '#C94040'
}

function VelocityIcon({ velocity }: { velocity: string }) {
  if (velocity === 'WIDENING') return <ArrowUp size={13} color="#C94040" />
  if (velocity === 'NARROWING') return <ArrowDown size={13} color="#2D8A4E" />
  return <ArrowRight size={13} color="#D4A017" />
}

function PairRow({ pair }: { pair: DivergencePair }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div
      style={{
        borderBottom: '1px solid #F0EDE6',
        background: expanded ? 'rgba(212,160,23,0.03)' : 'transparent',
        transition: 'background 0.15s ease',
      }}
    >
      <div
        role="button"
        tabIndex={0}
        onKeyDown={e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            setExpanded(x => !x)
          }
        }}
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 60px 60px 70px 70px 70px 90px 36px',
          alignItems: 'center',
          padding: '10px 16px',
          cursor: 'pointer',
          gap: 8,
        }}
        onClick={() => setExpanded(e => !e)}
      >
        <span style={{ fontFamily: 'Inter', fontWeight: 500, fontSize: '0.8rem', color: '#1A1A1A' }}>
          {pair.label}
        </span>
        <span
          style={{
            fontFamily: 'Inter',
            fontWeight: 600,
            fontSize: '0.8rem',
            color: '#5C5C5C',
            textAlign: 'center',
          }}
        >
          {pair.score_a.toFixed(1)}
        </span>
        <span
          style={{
            fontFamily: 'Inter',
            fontWeight: 600,
            fontSize: '0.8rem',
            color: '#5C5C5C',
            textAlign: 'center',
          }}
        >
          {pair.score_b.toFixed(1)}
        </span>
        <span
          style={{
            fontFamily: 'Inter',
            fontWeight: 600,
            fontSize: '0.8rem',
            color: '#9A9A9A',
            textAlign: 'center',
          }}
        >
          {pair.raw_gap.toFixed(1)}
        </span>
        <span
          style={{
            fontFamily: 'Inter',
            fontWeight: 600,
            fontSize: '0.8rem',
            color: '#9A9A9A',
            textAlign: 'center',
          }}
        >
          {pair.baseline_gap.toFixed(1)}
        </span>
        <span
          style={{
            fontFamily: 'Inter',
            fontWeight: 700,
            fontSize: '0.82rem',
            color: deltaColor(pair.delta),
            background: `${deltaColor(pair.delta)}18`,
            borderRadius: 6,
            padding: '2px 8px',
            textAlign: 'center',
          }}
        >
          +{pair.delta.toFixed(1)}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <VelocityIcon velocity={pair.velocity} />
          <span style={{ fontFamily: 'Inter', fontSize: '0.7rem', color: '#5C5C5C' }}>{pair.velocity}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          {expanded ? <ChevronUp size={14} color="#9A9A9A" /> : <ChevronDown size={14} color="#9A9A9A" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                margin: '0 16px 12px',
                padding: '12px 14px',
                background: 'rgba(224,123,57,0.05)',
                border: '1px solid rgba(224,123,57,0.2)',
                borderRadius: 8,
                fontFamily: 'Inter',
                fontSize: '0.78rem',
                color: '#5C5C5C',
                lineHeight: 1.5,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  color: '#E07B39',
                  fontSize: '0.68rem',
                  textTransform: 'uppercase' as const,
                  letterSpacing: '0.08em',
                }}
              >
                Historical Precedent
              </span>
              <p style={{ margin: '6px 0 0' }}>{pair.real_world_precedent}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function DivergencePanel({ divergence }: DivergencePanelProps) {
  const drs = divergence.drs
  const color = drsColor(drs)
  const bg = drsBg(drs)

  return (
    <div
      style={{
        background: '#FFFFFF',
        border: '1px solid #E8E4DC',
        borderRadius: 16,
        overflow: 'hidden',
        boxShadow: '0 2px 16px rgba(0,0,0,0.06)',
        marginTop: 24,
      }}
    >
      <div
        style={{
          padding: '16px 24px',
          borderBottom: '1px solid #E8E4DC',
          background: bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {divergence.alert && (
            <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 2, repeat: Infinity }}>
              <AlertTriangle size={18} color={color} />
            </motion.div>
          )}
          <div>
            <h3 className="font-syne" style={{ fontWeight: 700, fontSize: '0.95rem', color: '#1A1A1A', margin: 0 }}>
              Signal Divergence
            </h3>
            <p style={{ fontFamily: 'Inter', fontSize: '0.75rem', color: '#9A9A9A', margin: '2px 0 0' }}>
              Disagreement between independent signal pairs
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: 'Inter',
                fontSize: '0.65rem',
                color: '#9A9A9A',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
              }}
            >
              DRS
            </div>
            <span className="font-syne" style={{ fontWeight: 800, fontSize: '2rem', color, lineHeight: 1 }}>
              {drs.toFixed(1)}
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div
              style={{
                fontFamily: 'Inter',
                fontSize: '0.65rem',
                color: '#9A9A9A',
                textTransform: 'uppercase' as const,
                letterSpacing: '0.1em',
              }}
            >
              Dominant Gap
            </div>
            <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '0.8rem', color: '#1A1A1A' }}>
              {divergence.dominant_pair}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: '#F0EDE6',
              borderRadius: 20,
              padding: '4px 10px',
            }}
          >
            <VelocityIcon velocity={divergence.velocity} />
            <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '0.72rem', color: '#5C5C5C' }}>
              {divergence.velocity}
            </span>
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 24px', borderBottom: '1px solid #F0EDE6', background: '#FAFAF7' }}>
        <p style={{ fontFamily: 'Inter', fontSize: '0.82rem', color: '#5C5C5C', margin: 0, lineHeight: 1.5 }}>
          {divergence.interpretation}
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 60px 60px 70px 70px 70px 90px 36px',
          padding: '8px 16px',
          gap: 8,
          borderBottom: '1px solid #E8E4DC',
          background: '#F9F8F5',
        }}
      >
        {['Pair', 'Score A', 'Score B', 'Raw Gap', 'Baseline', 'Delta', 'Velocity', ''].map((h, i) => (
          <span
            key={`hdr-${i}`}
            style={{
              fontFamily: 'Inter',
              fontWeight: 600,
              fontSize: '0.65rem',
              color: '#9A9A9A',
              textTransform: 'uppercase' as const,
              letterSpacing: '0.08em',
              textAlign: h === 'Pair' ? 'left' : 'center',
            }}
          >
            {h}
          </span>
        ))}
      </div>

      {divergence.pairs.map(pair => (
        <PairRow key={pair.pair} pair={pair} />
      ))}

      <div
        style={{
          padding: '12px 24px',
          borderTop: '1px solid #E8E4DC',
          display: 'flex',
          gap: 20,
          flexWrap: 'wrap',
        }}
      >
        {[
          { range: '0–15', label: 'In agreement', color: '#2D8A4E' },
          { range: '15–35', label: 'Mild divergence', color: '#D4A017' },
          { range: '35–60', label: 'Significant', color: '#E07B39' },
          { range: '60–100', label: 'Severe — review now', color: '#C94040' },
        ].map(item => (
          <div key={item.range} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: item.color }} />
            <span style={{ fontFamily: 'Inter', fontSize: '0.7rem', color: '#9A9A9A' }}>
              {item.range} {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
