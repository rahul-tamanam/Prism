import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import type { ScoreHistoryPoint } from '../../types'

interface ScoreTrendChartProps {
  history: ScoreHistoryPoint[]
  color: string
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

export default function ScoreTrendChart({ history, color }: ScoreTrendChartProps) {
  const data = history.map(h => ({
    ...h,
    label: formatDateLabel(h.date),
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <ReferenceArea y1={80} y2={100} fill="#2D8A4E" fillOpacity={0.06} />
        <ReferenceArea y1={60} y2={80} fill="#D4A017" fillOpacity={0.06} />
        <ReferenceArea y1={40} y2={60} fill="#E07B39" fillOpacity={0.06} />
        <ReferenceArea y1={0} y2={40} fill="#C94040" fillOpacity={0.06} />
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: "'DM Sans', sans-serif" }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 100]}
          tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: "'DM Sans', sans-serif" }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          width={32}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 11,
            boxShadow: 'var(--shadow-card)',
          }}
          labelStyle={{ color: 'var(--text-muted)' }}
          itemStyle={{ color }}
        />
        <Line
          type="monotone"
          dataKey="score"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 3, fill: color, stroke: color }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
