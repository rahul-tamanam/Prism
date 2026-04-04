import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Legend,
  Cell,
  Tooltip,
} from 'recharts'
import type { StressResult, PillarScores } from '../../types'
import { PILLAR_COLORS, PILLAR_LABELS } from '../../types'

interface StressComparisonChartProps {
  result: StressResult
  baseScores: PillarScores
}

export default function StressComparisonChart({ result, baseScores }: StressComparisonChartProps) {
  const pillars = ['liquidity', 'liquidation', 'governance', 'oracle', 'supply', 'narrative']

  const data = pillars.map(p => {
    const base = baseScores[p as keyof PillarScores] as number
    const delta = result.pillar_deltas[p] || 0
    return {
      name: PILLAR_LABELS[p].split(' ')[0],
      base,
      stressed: Math.max(0, base + delta),
      color: PILLAR_COLORS[p],
    }
  })

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <XAxis
          dataKey="name"
          tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: "'Inter', sans-serif" }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: "'Inter', sans-serif" }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontFamily: "'Inter', sans-serif",
            fontSize: 11,
            boxShadow: 'var(--shadow-card)',
          }}
        />
        <Legend
          wrapperStyle={{
            fontFamily: "'Inter', sans-serif",
            fontSize: 10,
            color: 'var(--text-muted)',
          }}
        />
        <Bar dataKey="base" name="Original" barSize={18} fillOpacity={0.35} radius={[4, 4, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
        </Bar>
        <Bar dataKey="stressed" name="Stressed" barSize={18} radius={[4, 4, 0, 0]}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
