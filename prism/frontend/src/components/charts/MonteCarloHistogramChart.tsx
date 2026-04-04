import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import type { MonteCarloResult } from '../../types'

interface MonteCarloHistogramChartProps {
  result: MonteCarloResult
}

const BAR = '#7EB8D4'

export default function MonteCarloHistogramChart({ result }: MonteCarloHistogramChartProps) {
  const data = result.histogram.map(h => ({
    label: `${Math.round(h.bin_start)}–${Math.round(h.bin_end)}`,
    count: h.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 0 }}>
        <XAxis
          dataKey="label"
          tick={{ fill: 'var(--text-muted)', fontSize: 8, fontFamily: "'Inter', sans-serif" }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          interval={2}
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: "'Inter', sans-serif" }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          width={36}
          allowDecimals={false}
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
          formatter={(value: number) => [value, 'Paths']}
        />
        <Bar dataKey="count" name="Simulations" radius={[3, 3, 0, 0]} maxBarSize={28}>
          {data.map((_, idx) => (
            <Cell key={idx} fill={BAR} fillOpacity={0.85} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
