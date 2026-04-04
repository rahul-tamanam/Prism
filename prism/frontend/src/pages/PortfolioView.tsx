import { motion } from 'framer-motion'
import { AlertTriangle, Shield, GitBranch, LogOut } from 'lucide-react'
import { usePortfolio } from '../hooks/usePortfolio'
import { ACTION_COLORS } from '../types'
import { formatScore } from '../lib/utils'
import ActionBadge from '../components/cards/ActionBadge'
import CorrelationMatrix from '../components/cards/CorrelationMatrix'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  Tooltip,
} from 'recharts'

const riskLevelConfig: Record<string, { color: string; bg: string; label: string }> = {
  moderate: { color: '#D4A017', bg: 'rgba(212, 160, 23, 0.06)', label: 'MODERATE' },
  high: { color: '#C94040', bg: 'rgba(201, 64, 64, 0.06)', label: 'HIGH' },
  critical: { color: '#C94040', bg: 'rgba(201, 64, 64, 0.08)', label: 'CRITICAL' },
  low: { color: '#2D8A4E', bg: 'rgba(45, 138, 78, 0.06)', label: 'LOW' },
}

const ALLOC_COLORS: Record<string, string> = {
  'Aave V3': '#D4A017',
  'Uniswap V3': '#7EB8D4',
  'Stargate Finance': '#E07B39',
}

export default function PortfolioView() {
  const { portfolio, loading } = usePortfolio()

  if (loading || !portfolio) {
    return (
      <div className="flex items-center justify-center h-64">
        <span style={{ fontFamily: 'Inter', color: '#9A9A9A' }}>Loading portfolio…</span>
      </div>
    )
  }

  const risk = riskLevelConfig[portfolio.overall_risk] || riskLevelConfig.moderate
  const sortedProtocols = [...portfolio.protocols].sort((a, b) => a.score - b.score)

  const allocationData = portfolio.protocols
    .filter(p => p.safe_position_pct > 0)
    .map(p => ({
      name: p.name,
      pct: p.safe_position_pct,
      color: ALLOC_COLORS[p.name] || ACTION_COLORS[p.action] || '#9A9A9A',
    }))

  const exitProtocols = portfolio.protocols.filter(p => p.safe_position_pct <= 0)

  const recommendations = [
    {
      icon: Shield,
      title: 'Position Sizing',
      description:
        'Reduce Uniswap V3 exposure to max 4.5% of portfolio. Exit Stargate Finance entirely — triple convergence signals systemic fragility.',
      borderColor: '#D4A017',
    },
    {
      icon: GitBranch,
      title: 'Correlation Watch',
      description:
        'Aave V3 and Uniswap V3 share ETH collateral dependency. Combined allocation should not exceed 12% during ETH volatility spikes.',
      borderColor: '#7EB8D4',
    },
    {
      icon: LogOut,
      title: 'Exit Sequencing',
      description:
        'If exiting Stargate, bridge assets to Ethereum mainnet first. Avoid cross-chain exits during high gas periods — slippage risk compounds.',
      borderColor: '#E07B39',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}
    >
      {/* Page header */}
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #E8E4DC' }}>
        <h1
          className="font-syne"
          style={{ fontWeight: 700, fontSize: '1.6rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <span style={{ width: 4, height: 24, background: '#D4A017', borderRadius: 2, display: 'inline-block' }} />
          Portfolio View
        </h1>
        <p style={{ color: '#5C5C5C', fontSize: '0.9rem', marginTop: 4, fontFamily: 'Inter' }}>
          Aggregate risk assessment and position recommendations
        </p>
      </div>

      {/* Risk level banner */}
      <div
        style={{
          background: risk.bg,
          borderLeft: `4px solid ${risk.color}`,
          borderRadius: 12,
          padding: '16px 24px',
          marginBottom: 32,
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <AlertTriangle size={20} color={risk.color} />
        <div>
          <span style={{
            fontFamily: 'Inter', fontWeight: 600, fontSize: '0.65rem',
            letterSpacing: '0.12em', textTransform: 'uppercase' as const,
            color: '#9A9A9A', display: 'block', marginBottom: 2,
          }}>
            Portfolio Risk Level
          </span>
          <span className="font-syne" style={{ fontWeight: 800, fontSize: '1.2rem', color: risk.color }}>
            {risk.label}
          </span>
        </div>
      </div>

      {/* Fragility Ranking Table */}
      <div className="prism-card" style={{ marginBottom: 32, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #E8E4DC' }}>
          <p className="card-section-label" style={{ color: '#D4A017', marginBottom: 0 }}>FRAGILITY RANKING</p>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #E8E4DC' }}>
              {['Protocol', 'Score', 'Action', 'Worst Risk', 'Safe Position', 'Alert'].map(header => (
                <th
                  key={header}
                  style={{
                    textAlign: 'left',
                    fontFamily: 'Inter',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase' as const,
                    color: '#9A9A9A',
                    padding: '12px 16px',
                  }}
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedProtocols.map((protocol, idx) => (
              <motion.tr
                key={protocol.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.08 }}
                style={{
                  borderBottom: '1px solid #E8E4DC',
                  backgroundColor: idx % 2 === 1 ? 'rgba(250,248,245,0.6)' : 'transparent',
                }}
              >
                <td style={{ padding: '12px 16px', fontFamily: 'Inter', fontWeight: 400, fontSize: '0.9rem', color: '#1A1A1A' }}>
                  {protocol.name}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span className="font-syne" style={{ fontWeight: 700, color: ACTION_COLORS[protocol.action] }}>
                    {formatScore(protocol.score)}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <ActionBadge action={protocol.action} size="sm" />
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'Inter', fontWeight: 400, fontSize: '0.85rem', color: '#5C5C5C' }}>
                  {protocol.worst_risk}
                </td>
                <td style={{ padding: '12px 16px', fontFamily: 'Inter', fontWeight: 400, fontSize: '0.85rem', color: '#5C5C5C' }}>
                  {protocol.safe_position_pct > 0 ? `${protocol.safe_position_pct}%` : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {protocol.spike_detected && (
                    <span style={{
                      fontFamily: 'Inter', fontWeight: 600, fontSize: '0.7rem',
                      textTransform: 'uppercase' as const,
                      backgroundColor: 'rgba(201,64,64,0.10)',
                      color: '#C94040',
                      border: '1px solid #C94040',
                      borderRadius: 6,
                      padding: '2px 8px',
                    }}>
                      SPIKE
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Safe Allocation */}
      <div className="prism-card" style={{ padding: 24, marginBottom: 32 }}>
        <p className="card-section-label" style={{ color: '#D4A017' }}>SAFE ALLOCATION</p>
        {allocationData.length > 0 ? (
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={allocationData} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 100 }}>
              <XAxis
                type="number"
                domain={[0, 15]}
                tick={{ fill: '#9A9A9A', fontSize: 9, fontFamily: 'Inter' }}
                axisLine={{ stroke: '#E8E4DC' }}
                tickLine={false}
                tickFormatter={(v: number) => `${v}%`}
              />
              <YAxis
                type="category"
                dataKey="name"
                tick={{ fill: '#5C5C5C', fontSize: 11, fontFamily: 'Inter' }}
                axisLine={false}
                tickLine={false}
                width={100}
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
                formatter={(value) => [`${value}%`, 'Safe Position']}
              />
              <Bar dataKey="pct" barSize={16} radius={[0, 4, 4, 0]}>
                {allocationData.map((entry, idx) => (
                  <Cell key={idx} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        ) : null}
        {exitProtocols.length > 0 && (
          <div style={{ marginTop: 12 }}>
            {exitProtocols.map(p => (
              <p key={p.id} style={{ fontFamily: 'Inter', fontSize: '0.8rem', color: '#C94040', fontStyle: 'italic' }}>
                {p.name}: Exit recommended — no safe allocation
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Recommendations */}
      <div style={{ marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #E8E4DC' }}>
        <h2
          className="font-syne"
          style={{ fontWeight: 700, fontSize: '1.6rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: 10 }}
        >
          <span style={{ width: 4, height: 24, background: '#D4A017', borderRadius: 2, display: 'inline-block' }} />
          Recommendations
        </h2>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {recommendations.map((rec, idx) => (
          <motion.div
            key={rec.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            style={{
              background: '#FFFFFF',
              borderRadius: 12,
              border: '1px solid #E8E4DC',
              borderLeft: `3px solid ${rec.borderColor}`,
              padding: 20,
              boxShadow: '0 2px 16px rgba(0,0,0,0.06), 0 1px 4px rgba(0,0,0,0.04)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <rec.icon size={16} color={rec.borderColor} />
              <h4 style={{ fontFamily: 'Inter', fontWeight: 700, fontSize: '0.85rem', color: '#1A1A1A' }}>
                {rec.title}
              </h4>
            </div>
            <p style={{ fontFamily: 'Inter', fontWeight: 400, fontSize: '0.85rem', color: '#5C5C5C', lineHeight: 1.6 }}>
              {rec.description}
            </p>
          </motion.div>
        ))}
      </div>

      <div style={{ marginTop: 32, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid #E8E4DC' }}>
        <h2
          className="font-syne"
          style={{
            fontWeight: 700,
            fontSize: '1.6rem',
            color: '#1A1A1A',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span
            style={{ width: 4, height: 24, background: '#D4A017', borderRadius: 2, display: 'inline-block' }}
          />
          Correlation Risk
        </h2>
      </div>
      <CorrelationMatrix />
    </motion.div>
  )
}
