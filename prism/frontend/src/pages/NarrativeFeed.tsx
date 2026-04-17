import { motion } from 'framer-motion'
import { useOutletContext } from 'react-router-dom'
import { useNarrative } from '../hooks/useNarrative'
import { usePrismScore } from '../hooks/usePrismScore'
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts'
import NewsCard from '../components/cards/NewsCard'
import TripleConvergenceAlert from '../components/cards/TripleConvergenceAlert'

export default function NarrativeFeed() {
  const { selectedProtocol } = useOutletContext<{
    selectedProtocol: string
    setSelectedProtocol: (id: string) => void
  }>()
  const { narrative, loading } = useNarrative(selectedProtocol)
  const { score } = usePrismScore(selectedProtocol)

  if (loading || !narrative) {
    return (
      <div className="flex items-center justify-center h-64">
        <span style={{ fontFamily: 'Inter', color: '#9A9A9A' }}>Loading narrative data…</span>
      </div>
    )
  }

  const sentimentColor = narrative.avg_sentiment >= 0.3
    ? '#2D8A4E'
    : narrative.avg_sentiment >= -0.1
      ? '#D4A017'
      : '#C94040'

  const gaugeData = [
    { name: 'Sentiment', value: Math.round((narrative.avg_sentiment + 1) * 50), fill: sentimentColor },
  ]

  const velocityData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${23 - i}h`,
    mentions: Math.max(
      5,
      Math.round(narrative.mention_velocity * (0.3 + 0.7 * Math.sin((i / 24) * Math.PI * 2 + 1)) / 3)
    ),
  })).reverse()

  const statTiles = [
    {
      label: 'AVG SENTIMENT',
      value: narrative.avg_sentiment.toFixed(2),
      color: sentimentColor,
    },
    {
      label: 'NEGATIVE RATIO',
      value: `${(narrative.negative_ratio * 100).toFixed(0)}%`,
      color: '#E07B39',
    },
    {
      label: 'MENTION VELOCITY',
      value: `${narrative.mention_velocity.toFixed(0)}/hr`,
      color: '#7EB8D4',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}
    >
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #E8E4DC' }}>
        <h1
          className="font-syne"
          style={{ fontWeight: 700, fontSize: '1.6rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <span style={{ width: 4, height: 24, background: '#D4A017', borderRadius: 2, display: 'inline-block' }} />
          Narrative Feed
        </h1>
        <p style={{ color: '#5C5C5C', fontSize: '0.9rem', marginTop: 4, fontFamily: 'Inter' }}>
          Sentiment analysis and media monitoring for {score?.name || 'selected protocol'}
        </p>
      </div>

      <TripleConvergenceAlert active={narrative.triple_convergence_active} />

      {/* Stat tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        {statTiles.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.08 }}
            style={{
              background: '#FFFFFF',
              borderRadius: 16,
              border: '1px solid #E8E4DC',
              borderLeft: `3px solid ${stat.color}`,
              padding: '20px 24px',
              boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <span style={{
              fontFamily: 'Inter', fontWeight: 600, fontSize: '0.65rem',
              letterSpacing: '0.12em', textTransform: 'uppercase' as const,
              color: '#9A9A9A', display: 'block', marginBottom: 8,
            }}>
              {stat.label}
            </span>
            <span className="font-syne" style={{ fontWeight: 800, fontSize: '2rem', color: stat.color }}>
              {stat.value}
            </span>
          </motion.div>
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '45% 1fr', gap: 20, marginBottom: 32 }}>
        <div className="prism-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <p className="card-section-label" style={{ alignSelf: 'flex-start' }}>SENTIMENT GAUGE</p>
          <ResponsiveContainer width={200} height={200}>
            <RadialBarChart
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="90%"
              data={gaugeData}
              startAngle={180}
              endAngle={0}
            >
              <RadialBar
                dataKey="value"
                cornerRadius={4}
                background={{ fill: '#F0EDE6' }}
              />
            </RadialBarChart>
          </ResponsiveContainer>
          <span className="font-syne" style={{ fontWeight: 800, fontSize: '1.2rem', color: sentimentColor, marginTop: 8 }}>
            {narrative.avg_sentiment.toFixed(2)}
          </span>
          <span style={{ fontFamily: 'Inter', fontSize: '0.75rem', color: '#9A9A9A', marginTop: 2 }}>
            {narrative.avg_sentiment >= 0.3 ? 'Positive' : narrative.avg_sentiment >= -0.1 ? 'Mixed' : 'Negative'}
          </span>
        </div>

        <div className="prism-card" style={{ padding: 24 }}>
          <p className="card-section-label">MENTION VELOCITY (24H)</p>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={velocityData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
              <defs>
                <linearGradient id="velocityFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7EB8D4" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#7EB8D4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="hour"
                tick={{ fill: '#9A9A9A', fontSize: 9, fontFamily: 'Inter' }}
                axisLine={{ stroke: '#E8E4DC' }}
                tickLine={false}
                interval={3}
              />
              <YAxis
                tick={{ fill: '#9A9A9A', fontSize: 9, fontFamily: 'Inter' }}
                axisLine={{ stroke: '#E8E4DC' }}
                tickLine={false}
                width={32}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E8E4DC',
                  borderRadius: 12,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  fontSize: 11,
                  fontFamily: 'Inter',
                }}
              />
              <Area
                type="monotone"
                dataKey="mentions"
                stroke="#7EB8D4"
                strokeWidth={1.5}
                fill="url(#velocityFill)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Articles */}
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #E8E4DC' }}>
        <h2
          className="font-syne"
          style={{ fontWeight: 700, fontSize: '1.6rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <span style={{ width: 4, height: 24, background: '#D4A017', borderRadius: 2, display: 'inline-block' }} />
          Latest Articles
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {narrative.articles.map((article, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
          >
            <NewsCard article={article} />
          </motion.div>
        ))}
      </div>
    </motion.div>
  )
}
