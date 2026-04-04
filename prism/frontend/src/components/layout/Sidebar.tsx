import { NavLink } from 'react-router-dom'
import { Radio, BarChart3, Zap, Newspaper, Briefcase } from 'lucide-react'
import type { Protocol, PrismScore } from '../../types'
import { ACTION_COLORS } from '../../types'
import { formatScore, getRelativeTime } from '../../lib/utils'

const navItems = [
  { to: '/', label: 'Protocol Radar', icon: Radio },
  { to: '/decomposition', label: 'Risk Decomposition', icon: BarChart3 },
  { to: '/stress', label: 'Stress Lab', icon: Zap },
  { to: '/narrative', label: 'Narrative Feed', icon: Newspaper },
  { to: '/portfolio', label: 'Portfolio View', icon: Briefcase },
]

interface NavBarProps {
  selectedProtocol: string
  onProtocolChange: (id: string) => void
  score?: PrismScore | null
  protocols: Protocol[]
}

export default function Sidebar(props?: NavBarProps) {
  const { selectedProtocol, onProtocolChange, score, protocols } = props || {}
  const isFresh = score
    ? Date.now() - new Date(score.timestamp).getTime() < 900000
    : false

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6"
      style={{
        height: 64,
        background: 'rgba(250, 250, 247, 0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="flex items-center gap-2 shrink-0">
        <span
          className="font-syne text-xl font-extrabold tracking-tight"
          style={{ color: '#D4A017' }}
        >
          PRISM
        </span>
        <span
          className="text-[0.65rem] font-medium uppercase tracking-[0.15em] hidden sm:inline"
          style={{ color: 'var(--text-muted)' }}
        >
          DeFi Risk Engine
        </span>
      </div>

      <nav className="absolute left-1/2 -translate-x-1/2 flex items-center gap-1">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium transition-all rounded-[20px]"
            style={({ isActive }) => ({
              color: isActive ? '#FFFFFF' : 'var(--text-secondary)',
              backgroundColor: isActive ? '#D4A017' : 'transparent',
            })}
            onMouseEnter={e => {
              const el = e.currentTarget
              if (!el.classList.contains('active')) {
                el.style.backgroundColor = 'rgba(126,184,212,0.12)'
              }
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              if (!el.classList.contains('active')) {
                el.style.backgroundColor = ''
              }
            }}
          >
            <item.icon size={14} />
            <span className="hidden lg:inline">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3 shrink-0">
        {protocols && protocols.length > 0 && (
          <select
            value={selectedProtocol}
            onChange={e => onProtocolChange?.(e.target.value)}
            className="text-sm font-medium px-3 py-1.5 outline-none cursor-pointer rounded-lg"
            style={{
              backgroundColor: 'var(--bg-card)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border)',
            }}
          >
            {protocols.map(p => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}

        {score && (
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-full"
            style={{
              backgroundColor: ACTION_COLORS[score.action],
              color: '#FFFFFF',
            }}
          >
            <span className="font-syne text-sm font-bold">{formatScore(score.score)}</span>
            <span className="text-xs font-semibold uppercase tracking-wide">{score.action}</span>
          </div>
        )}

        {score && (
          <span className="text-xs hidden xl:inline" style={{ color: '#7EB8D4' }}>
            {getRelativeTime(score.timestamp)}
          </span>
        )}
        <span
          className="block w-2 h-2 rounded-full"
          style={{
            backgroundColor: isFresh ? '#2D8A4E' : '#E07B39',
            boxShadow: isFresh
              ? '0 0 6px rgba(45, 138, 78, 0.5)'
              : '0 0 6px rgba(224, 123, 57, 0.5)',
            animation: 'pulse-glow 2s ease-in-out infinite',
          }}
        />
      </div>
    </header>
  )
}
