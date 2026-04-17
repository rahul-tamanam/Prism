import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts'
import type { PillarScores } from '../../types'
import { PILLAR_COLORS, PILLAR_LABELS } from '../../types'

interface PillarBarChartProps {
  pillarScores: PillarScores
}

export default function PillarBarChart({ pillarScores }: PillarBarChartProps) {
  const pillars = ['liquidity', 'liquidation', 'governance', 'oracle', 'supply', 'narrative']

  const data = pillars.map(p => ({
    name: PILLAR_LABELS[p],
    score: pillarScores[p as keyof PillarScores] as number,
    color: PILLAR_COLORS[p],
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} layout="vertical" margin={{ top: 8, right: 48, bottom: 8, left: 120 }}>
        <XAxis
          type="number"
          domain={[0, 100]}
          tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: "'Inter', sans-serif" }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fill: 'var(--text-secondary)', fontSize: 11, fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
          axisLine={false}
          tickLine={false}
          width={120}
        />
        <Bar dataKey="score" barSize={14} radius={[4, 4, 4, 4]}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={entry.color} fillOpacity={0.8} />
          ))}
          <LabelList
            dataKey="score"
            position="right"
            style={{
              fill: 'var(--text-secondary)',
              fontSize: 10,
              fontFamily: "'Inter', sans-serif",
            }}
            formatter={(v: unknown) => typeof v === 'number' ? v.toFixed(1) : String(v ?? '')}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
