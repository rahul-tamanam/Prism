import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import type { PillarScores } from '../../types'

interface PrismRadarChartProps {
  pillarScores: PillarScores
  color: string
  size?: number
}

const pillarShortNames: Record<string, string> = {
  liquidity: 'LIQ',
  liquidation: 'LQD',
  governance: 'GOV',
  oracle: 'ORC',
  supply: 'SUP',
  narrative: 'NAR',
}

export default function PrismRadarChart({ pillarScores, color, size = 200 }: PrismRadarChartProps) {
  const data = Object.entries(pillarShortNames).map(([key, label]) => ({
    pillar: label,
    score: pillarScores[key as keyof PillarScores] as number,
  }))

  return (
    <div style={{ width: size, height: size, minWidth: size, minHeight: size }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={size} minHeight={size}>
        <RadarChart data={data} cx="50%" cy="50%" outerRadius="72%">
          <PolarGrid stroke="var(--border)" strokeDasharray="3 3" />
          <PolarAngleAxis
            dataKey="pillar"
            tick={{
              fill: 'var(--text-muted)',
              fontSize: 10,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 500,
            }}
          />
          <Radar
            dataKey="score"
            stroke={color}
            fill={color}
            fillOpacity={0.12}
            strokeWidth={1.5}
            dot={false}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  )
}
