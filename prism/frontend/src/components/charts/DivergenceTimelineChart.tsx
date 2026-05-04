import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DivergenceResult, DivergenceTimelinePoint, DrsTimelineEvent } from '../../types'

const PAIR_LINE_COLORS: Record<string, string> = {
  liquidity_governance: '#2D8A4E',
  liquidity_narrative: '#7EB8D4',
  supply_governance: '#D4A017',
  liquidation_narrative: '#7B5EA7',
  oracle_liquidity: '#E07B39',
}

function parseISODate(s: string): number {
  const t = Date.parse(s.includes('T') ? s : `${s}T12:00:00Z`)
  return Number.isNaN(t) ? 0 : t
}

function last30DayLabels(): string[] {
  const out: string[] = []
  const end = new Date()
  for (let d = 29; d >= 0; d--) {
    const x = new Date(end)
    x.setDate(x.getDate() - d)
    out.push(x.toISOString().slice(0, 10))
  }
  return out
}

function buildRows(
  timeline: DivergenceTimelinePoint[],
  days: number,
): { rows: Record<string, string | number>[]; pairKeys: string[] } {
  const labels = last30DayLabels().slice(-days)
  if (labels.length === 0) return { rows: [], pairKeys: [] }

  const sorted = [...timeline].sort((a, b) => parseISODate(a.date) - parseISODate(b.date))
  const pairKeys =
    sorted.length > 0 && sorted[sorted.length - 1].pairs?.length
      ? sorted[sorted.length - 1].pairs.map(p => p.pair_key)
      : []

  const rows: Record<string, string | number>[] = []
  for (const ds of labels) {
    const tMs = parseISODate(ds)
    let pick: DivergenceTimelinePoint | undefined
    for (let i = sorted.length - 1; i >= 0; i--) {
      if (parseISODate(sorted[i].date) <= tMs) {
        pick = sorted[i]
        break
      }
    }
    if (!pick && sorted.length) pick = sorted[0]
    const row: Record<string, string | number> = { date: ds.slice(5), drs: pick?.drs ?? 0 }
    for (const pk of pairKeys) {
      const pr = pick?.pairs?.find(p => p.pair_key === pk)
      row[`gap_${pk}`] = pr?.gap ?? 0
      row[`base_${pk}`] = pr?.baseline_gap ?? 0
    }
    rows.push(row)
  }
  return { rows, pairKeys }
}

function EventPins({ events, shortLabels }: { events: DrsTimelineEvent[]; shortLabels: string[] }) {
  const labelSet = new Set(shortLabels)
  const palette: Record<string, string> = {
    governance: '#7B5EA7',
    narrative: '#7EB8D4',
    whale_flow: '#E07B39',
  }
  return (
    <>
      {events.map((ev, i) => {
        const full = ev.date.length >= 10 ? ev.date.slice(0, 10) : ev.date
        const x = full.slice(5)
        if (!labelSet.has(x)) return null
        return (
          <ReferenceLine
            key={`ev-${i}-${full}`}
            x={x}
            stroke={palette[ev.type] || '#9A9A9A'}
            strokeDasharray="4 4"
            strokeWidth={1}
            label={{
              value: ev.type === 'governance' ? 'Gov' : ev.type === 'narrative' ? 'News' : 'Flow',
              position: 'top',
              fill: palette[ev.type] || '#9A9A9A',
              fontSize: 9,
            }}
          />
        )
      })}
    </>
  )
}

export default function DivergenceTimelineChart({
  divergence,
  timeline,
  events,
}: {
  divergence: DivergenceResult
  timeline: DivergenceTimelinePoint[]
  events: DrsTimelineEvent[]
}) {
  const [showBaseline, setShowBaseline] = useState<Record<string, boolean>>({})
  const [hiddenPairs, setHiddenPairs] = useState<Record<string, boolean>>({})

  const { rows, pairKeys } = useMemo(() => buildRows(timeline, 30), [timeline])
  const shortLabels = useMemo(() => rows.map(r => String(r.date)), [rows])

  const toggleBaseline = (pk: string) => setShowBaseline(s => ({ ...s, [pk]: !s[pk] }))
  const togglePair = (pk: string) => setHiddenPairs(s => ({ ...s, [pk]: !s[pk] }))

  if (rows.length === 0) {
    return (
      <p style={{ fontFamily: 'DM Sans', fontSize: '0.8rem', color: '#9A9A9A', margin: '12px 0 0' }}>
        Divergence timeline appears after score snapshots accumulate (or refresh to seed history).
      </p>
    )
  }

  return (
    <div style={{ marginTop: 20 }}>
      <p
        className="card-section-label"
        style={{ color: '#D4A017', marginBottom: 8, fontSize: '0.7rem' }}
      >
        30-DAY DIVERGENCE TIMELINE
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
        {pairKeys.map(pk => (
          <label
            key={pk}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'DM Sans',
              fontSize: '0.68rem',
              color: '#5C5C5C',
              cursor: 'pointer',
            }}
          >
            <input
              type="checkbox"
              checked={!hiddenPairs[pk]}
              onChange={() => togglePair(pk)}
            />
            <span style={{ color: PAIR_LINE_COLORS[pk] || '#666' }}>{pk.replace(/_/g, '·')}</span>
            <button
              type="button"
              onClick={() => toggleBaseline(pk)}
              style={{
                border: 'none',
                background: showBaseline[pk] ? 'rgba(212,160,23,0.2)' : 'transparent',
                borderRadius: 4,
                fontSize: '0.62rem',
                cursor: 'pointer',
                padding: '2px 6px',
                color: '#9A9A9A',
              }}
            >
              baseline
            </button>
          </label>
        ))}
      </div>
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={rows} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E4DC" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#9A9A9A' }} />
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: '#9A9A9A' }}
              label={{ value: 'Pair gap', angle: -90, position: 'insideLeft', fill: '#9A9A9A', fontSize: 10 }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tick={{ fontSize: 9, fill: '#E8E4DC' }}
              label={{ value: 'DRS', angle: 90, position: 'insideRight', fill: '#E8E4DC', fontSize: 10 }}
            />
            <Tooltip
              contentStyle={{ fontFamily: 'DM Sans', fontSize: 11, borderRadius: 8 }}
              formatter={(value, name) => [
                typeof value === 'number' ? value.toFixed(1) : String(value ?? ''),
                String(name),
              ]}
            />
            <Legend wrapperStyle={{ fontSize: 10, fontFamily: 'DM Sans' }} />
            {pairKeys.map(pk => {
              if (hiddenPairs[pk]) return null
              const col = PAIR_LINE_COLORS[pk] || '#888'
              return (
                <Line
                  key={pk}
                  yAxisId="left"
                  type="monotone"
                  dataKey={`gap_${pk}`}
                  name={pk.replace(/_/g, ' vs ')}
                  stroke={col}
                  strokeWidth={1.2}
                  dot={false}
                  isAnimationActive={false}
                />
              )
            })}
            {pairKeys.map(pk =>
              showBaseline[pk] ? (
                <Line
                  key={`b-${pk}`}
                  yAxisId="left"
                  type="monotone"
                  dataKey={`base_${pk}`}
                  name={`${pk} baseline`}
                  stroke={PAIR_LINE_COLORS[pk] || '#888'}
                  strokeDasharray="6 4"
                  strokeOpacity={0.45}
                  dot={false}
                  isAnimationActive={false}
                />
              ) : null,
            )}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="drs"
              name="DRS"
              stroke="#F5F2EB"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive={false}
            />
            <EventPins events={events} shortLabels={shortLabels} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p style={{ fontFamily: 'DM Sans', fontSize: '0.68rem', color: '#9A9A9A', marginTop: 8 }}>
        Pins: purple governance · blue narrative spike · orange large supply flow (Dune). Hover tooltip for values.
        Dominant pair today: {divergence.dominant_pair} ({divergence.velocity}).
      </p>
    </div>
  )
}
