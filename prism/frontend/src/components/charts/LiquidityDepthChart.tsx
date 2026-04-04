import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'

interface LiquidityDepthChartProps {
  data?: { price: number; depth: number }[]
}

const defaultData = [
  { price: 1620, depth: 12.4 },
  { price: 1650, depth: 18.7 },
  { price: 1680, depth: 28.3 },
  { price: 1710, depth: 42.6 },
  { price: 1740, depth: 61.8 },
  { price: 1770, depth: 84.2 },
  { price: 1800, depth: 97.1 },
  { price: 1830, depth: 100 },
  { price: 1860, depth: 94.3 },
  { price: 1890, depth: 78.6 },
  { price: 1920, depth: 56.4 },
  { price: 1950, depth: 38.2 },
  { price: 1980, depth: 24.1 },
  { price: 2010, depth: 15.3 },
  { price: 2040, depth: 9.8 },
]

export default function LiquidityDepthChart({ data = defaultData }: LiquidityDepthChartProps) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
        <XAxis
          dataKey="price"
          tick={{ fill: 'var(--text-muted)', fontSize: 9, fontFamily: "'Inter', sans-serif" }}
          axisLine={{ stroke: 'var(--border)' }}
          tickLine={false}
          tickFormatter={(v: number) => `$${v}`}
        />
        <YAxis
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
        <Area
          type="monotone"
          dataKey="depth"
          stroke="var(--accent-blue)"
          fill="var(--accent-blue)"
          fillOpacity={0.1}
          strokeWidth={1.5}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
