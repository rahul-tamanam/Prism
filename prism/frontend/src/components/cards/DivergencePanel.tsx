import { useMemo, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'
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

/** Line color from current pair delta (excess vs baseline) severity */
function deltaLineColor(delta: number): string {
  if (delta < 5) return '#2D8A4E'
  if (delta < 20) return '#D4A017'
  if (delta < 35) return '#E07B39'
  return '#C94040'
}

function lineKey(pair: DivergencePair): string {
  return `gap_${pair.signal_a}_${pair.signal_b}`
}

/** Reference-style slug: liquidity–governance */
function pairLegendSlug(pair: DivergencePair): string {
  return `${pair.signal_a}–${pair.signal_b}`.toLowerCase()
}

function hashString(s: string): number {
  let h = 1779033703
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353)
  }
  return (h >>> 0) || 1
}

function mulberry32(seed: number): () => number {
  return () => {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function triNoise(rng: () => number): number {
  const u1 = rng() * 2 - 1
  const u2 = rng() * 2 - 1
  const u3 = rng() * 2 - 1
  const n = (u1 + u2 + u3) * 1.5
  return Math.max(-3, Math.min(3, n))
}

/**
 * Synthetic 30-day series for **excess gap vs baseline (Δ)** - same quantity that drives DRS.
 * Today’s last point is exactly `pair.delta`. Path is a linear bridge + smooth mid-series noise
 * so lines aren’t flat at the start and don’t random-walk away from the headline score.
 */
export function generateGapHistory(pair: DivergencePair, days = 30): { date: string; label: string; value: number }[] {
  const seed = hashString(pair.pair + pair.label)
  const rng = mulberry32(seed)
  const target = Math.max(0, Math.min(100, pair.delta))

  const startJitter = triNoise(rng) * 5 + (rng() - 0.5) * 8
  const start = Math.max(0, Math.min(100, target + startJitter))

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const out: { date: string; label: string; value: number }[] = []

  for (let i = 0; i < days; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - (days - 1 - i))
    const t = days <= 1 ? 1 : i / (days - 1)
    const bridge = start * (1 - t) + target * t
    const noiseAmp = Math.sin(Math.PI * t) * 4.5
    let v = bridge + triNoise(rng) * noiseAmp
    v = Math.max(0, Math.min(100, v))
    if (i === days - 1) v = target

    out.push({
      date: d.toISOString().slice(0, 10),
      label: `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`,
      value: Math.round(v * 10) / 10,
    })
  }
  return out
}

function pairAbbrev(pair: DivergencePair): string {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
  const wa = pair.signal_a.split(/[\s_]/)[0] ?? pair.signal_a
  const wb = pair.signal_b.split(/[\s_]/)[0] ?? pair.signal_b
  return `${cap(wa)} vs ${cap(wb)}`
}

function VelocityIcon({ velocity }: { velocity: string }) {
  if (velocity === 'WIDENING') return <ArrowUp size={13} color="#C94040" />
  if (velocity === 'NARROWING') return <ArrowDown size={13} color="#2D8A4E" />
  return <ArrowRight size={13} color="#D4A017" />
}

function PrecedentRow({ pair }: { pair: DivergencePair }) {
  const [expanded, setExpanded] = useState(false)
  const abbr = pairAbbrev(pair)
  return (
    <div
      style={{
        borderBottom: '1px solid #F0EDE6',
        background: expanded ? 'rgba(212,160,23,0.03)' : 'transparent',
        transition: 'background 0.15s ease',
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          padding: '12px 16px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <span style={{ fontFamily: 'Inter', fontWeight: 600, fontSize: '0.8rem', color: '#1A1A1A' }}>
          {abbr}
          <span style={{ fontWeight: 400, color: '#9A9A9A', marginLeft: 8, fontSize: '0.72rem' }}>
            Historical precedent
          </span>
        </span>
        {expanded ? <ChevronUp size={16} color="#9A9A9A" /> : <ChevronDown size={16} color="#9A9A9A" />}
      </button>
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

interface TooltipPayloadRow {
  date: string
  label: string
  drsLevel: number
  [key: string]: string | number
}

function DivergenceGapTooltip({
  active,
  payload,
  label,
  pairs,
  chartData,
}: {
  active?: boolean
  payload?: Array<{ payload?: TooltipPayloadRow }>
  label?: string
  pairs: DivergencePair[]
  chartData: TooltipPayloadRow[]
}) {
  if (!active || !payload?.length) return null
  const fromPayload = payload[0]?.payload as TooltipPayloadRow | undefined
  const row =
    fromPayload ??
    (label != null ? chartData.find(r => r.label === label || r.date === label) : undefined)
  if (!row) return null
  return (
    <div
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 8,
        fontFamily: "'Inter', sans-serif",
        fontSize: 11,
        boxShadow: 'var(--shadow-card)',
        padding: '10px 12px',
        minWidth: 220,
      }}
    >
      <div style={{ color: 'var(--text-muted)', marginBottom: 4, fontWeight: 600 }}>{row.date}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: 10, marginBottom: 8 }}>
        Chart: synthetic Δ path (today = live Δ). DRS reference {typeof row.drsLevel === 'number' ? row.drsLevel.toFixed(1) : '-'}.
      </div>
      {pairs.map(p => {
        const k = lineKey(p)
        const v = row[k]
        const c = deltaLineColor(p.delta)
        return (
          <div key={p.pair} style={{ marginBottom: 6 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                gap: 16,
                alignItems: 'center',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: 999, background: c, flexShrink: 0 }} />
                <span style={{ color: 'var(--text-secondary)' }}>{pairLegendSlug(p)}</span>
              </span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                {typeof v === 'number' ? v.toFixed(1) : '-'}
              </span>
            </div>
            <div style={{ fontSize: 9, color: 'var(--text-muted)', marginLeft: 12, marginTop: 2 }}>
              raw {p.raw_gap.toFixed(1)} · baseline {p.baseline_gap.toFixed(1)} · Δ {p.delta.toFixed(1)}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function DivergencePanel({ divergence }: DivergencePanelProps) {
  const drs = divergence.drs
  const color = drsColor(drs)
  const bg = drsBg(drs)
  const pairs = divergence.pairs

  const [hiddenPairs, setHiddenPairs] = useState<Set<string>>(() => new Set())

  const togglePair = useCallback((k: string) => {
    setHiddenPairs(prev => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })
  }, [])

  const { chartData, pairMeta } = useMemo(() => {
    if (pairs.length === 0) {
      return { chartData: [] as TooltipPayloadRow[], pairMeta: [] as { pair: DivergencePair; key: string; stroke: string; slug: string }[] }
    }
    const series = pairs.map(p => ({ pair: p, points: generateGapHistory(p, 30) }))
    const days = series[0].points.length
    const data: TooltipPayloadRow[] = []
    for (let i = 0; i < days; i++) {
      const row: TooltipPayloadRow = {
        date: series[0].points[i].date,
        label: series[0].points[i].label,
        drsLevel: drs,
      }
      for (const { pair, points } of series) {
        row[lineKey(pair)] = points[i].value
      }
      data.push(row)
    }
    const meta = pairs.map(p => ({
      pair: p,
      key: lineKey(p),
      stroke: deltaLineColor(p.delta),
      slug: pairLegendSlug(p),
    }))
    return { chartData: data, pairMeta: meta }
  }, [pairs, drs])

  const axisMuted = '#9A9A9A'
  const gridStroke = '#E8E4DC'

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

      <div style={{ padding: '16px 20px 8px', width: '100%' }}>
        <h4
          className="font-playfair"
          style={{
            margin: '0 0 8px',
            fontSize: '1.05rem',
            fontWeight: 700,
            color: 'var(--accent-yellow)',
            letterSpacing: '0.04em',
          }}
        >
          30-DAY DIVERGENCE TIMELINE
        </h4>
        <p style={{ margin: '0 0 12px', fontFamily: 'Inter', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
          Each line tracks <strong>excess pair gap vs the rolling baseline (Δ)</strong> - the same input that weights into DRS. Today&apos;s point matches the live Δ per pair. Dashed gray line is aggregate DRS ({drs.toFixed(1)}).
        </p>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px 16px',
            marginBottom: 12,
            alignItems: 'center',
          }}
        >
          {pairMeta.map(({ key, slug, stroke }) => (
            <label
              key={key}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                cursor: 'pointer',
                fontFamily: 'Inter',
                fontSize: 11,
                color: 'var(--text-secondary)',
              }}
            >
              <input
                type="checkbox"
                checked={!hiddenPairs.has(key)}
                onChange={() => togglePair(key)}
                style={{ accentColor: stroke }}
              />
              <span style={{ color: stroke, fontWeight: 600 }}>{slug}</span>
              <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>baseline Δ</span>
            </label>
          ))}
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData} margin={{ top: 8, right: 8, left: 4, bottom: 8 }}>
            <CartesianGrid stroke={gridStroke} strokeDasharray="4 4" vertical />
            <XAxis
              dataKey="label"
              tick={{ fill: axisMuted, fontSize: 9, fontFamily: "'Inter', sans-serif" }}
              axisLine={{ stroke: gridStroke }}
              tickLine={{ stroke: gridStroke }}
              interval="preserveStartEnd"
            />
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tick={{ fill: axisMuted, fontSize: 9, fontFamily: "'Inter', sans-serif" }}
              axisLine={{ stroke: gridStroke }}
              tickLine={{ stroke: gridStroke }}
              width={44}
              label={{
                value: 'Pair Δ',
                angle: -90,
                position: 'insideLeft',
                fill: axisMuted,
                fontSize: 10,
                fontFamily: "'Inter', sans-serif",
                dy: 36,
              }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fill: axisMuted, fontSize: 9, fontFamily: "'Inter', sans-serif" }}
              axisLine={{ stroke: gridStroke }}
              tickLine={{ stroke: gridStroke }}
              width={36}
              label={{
                value: 'DRS',
                angle: 90,
                position: 'insideRight',
                fill: axisMuted,
                fontSize: 10,
                fontFamily: "'Inter', sans-serif",
                dy: 36,
              }}
            />
            <ReferenceLine
              yAxisId="left"
              y={15}
              stroke={axisMuted}
              strokeDasharray="5 5"
              strokeOpacity={0.9}
              label={{
                value: 'Baseline',
                position: 'insideTopRight',
                fill: axisMuted,
                fontSize: 10,
                fontFamily: "'Inter', sans-serif",
              }}
            />
            <Tooltip
              content={props => (
                <DivergenceGapTooltip {...props} pairs={pairs} chartData={chartData} />
              )}
              cursor={{ stroke: gridStroke, strokeWidth: 1 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="drsLevel"
              name="DRS"
              stroke="#9A9A9A"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
              isAnimationActive={false}
              connectNulls
            />
            {pairMeta.map(({ pair, key, stroke }) =>
              hiddenPairs.has(key) ? null : (
                <Line
                  key={key}
                  yAxisId="left"
                  type="monotone"
                  dataKey={key}
                  name={pairLegendSlug(pair)}
                  stroke={stroke}
                  strokeWidth={2}
                  dot={false}
                  activeDot={false}
                  isAnimationActive={false}
                />
              ),
            )}
          </LineChart>
        </ResponsiveContainer>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px 18px',
            justifyContent: 'center',
            marginTop: 10,
            paddingBottom: 4,
          }}
        >
          {pairMeta.map(({ key, slug, stroke }) => (
            <div key={`leg-${key}`} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: 999, background: stroke, opacity: hiddenPairs.has(key) ? 0.25 : 1 }} />
              <span
                style={{
                  fontFamily: 'Inter',
                  fontSize: 11,
                  color: hiddenPairs.has(key) ? axisMuted : 'var(--text-secondary)',
                  textDecoration: hiddenPairs.has(key) ? 'line-through' : 'none',
                }}
              >
                {slug}
              </span>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 12,
                height: 0,
                borderTop: '2px dashed #9A9A9A',
              }}
            />
            <span style={{ fontFamily: 'Inter', fontSize: 11, color: axisMuted }}>DRS</span>
          </div>
        </div>

        <p style={{ margin: '10px 0 0', fontFamily: 'Inter', fontSize: '0.72rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          Hover for per-pair Δ. Dominant pair today: <strong style={{ color: 'var(--text-secondary)' }}>{divergence.dominant_pair}</strong> ({divergence.velocity}).
        </p>
      </div>

      <div style={{ borderTop: '1px solid #E8E4DC' }}>
        <div
          style={{
            padding: '8px 16px 4px',
            fontFamily: 'Inter',
            fontSize: '0.65rem',
            fontWeight: 600,
            color: '#9A9A9A',
            textTransform: 'uppercase' as const,
            letterSpacing: '0.08em',
          }}
        >
          Pair precedents
        </div>
        {pairs.map(pair => (
          <PrecedentRow key={pair.pair} pair={pair} />
        ))}
      </div>

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
          { range: '60–100', label: 'Severe - review now', color: '#C94040' },
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
