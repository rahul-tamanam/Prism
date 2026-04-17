import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { Radio, BarChart3, Zap, Newspaper, Briefcase } from 'lucide-react'
import type { Protocol, PrismScore } from '../../types'
import { ACTION_COLORS, ACTION_BG } from '../../types'
import { formatScore, getRelativeTime } from '../../lib/utils'
import { mockScores } from '../../data/mockData'
import AlertPanel from './AlertPanel'

const navItems = [
  { to: '/', label: 'Protocol Radar', icon: Radio },
  { to: '/portfolio', label: 'Portfolio View', icon: Briefcase },
  { to: '/decomposition', label: 'Risk Decomposition', icon: BarChart3 },
  { to: '/stress', label: 'Stress Lab', icon: Zap },
  { to: '/narrative', label: 'Narrative Feed', icon: Newspaper },
]

const PROTOCOL_DOT: Record<string, string> = {
  'aave-v3': '#D4A017',
  'uniswap-v3': '#7EB8D4',
  stargate: '#E07B39',
}

interface NavBarProps {
  selectedProtocol: string
  onProtocolChange: (id: string) => void
  onAlertNavigate?: (protocolId: string) => void
  score?: PrismScore | null
  protocols: Protocol[]
  showNavbar?: boolean
}

function ProtocolMenu({
  selectedProtocol,
  onProtocolChange,
  protocols,
}: {
  selectedProtocol: string
  onProtocolChange: (id: string) => void
  protocols: Protocol[]
}) {
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const current = protocols.find(p => p.id === selectedProtocol)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const dotColor = PROTOCOL_DOT[selectedProtocol] || '#9A9A9A'

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 14px',
          background: '#FFFFFF',
          border: `1px solid ${open ? '#D4A017' : '#E8E4DC'}`,
          borderRadius: 10,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          fontSize: '0.875rem',
          color: '#1A1A1A',
          minWidth: 180,
          justifyContent: 'space-between',
          transition: 'border-color 0.2s ease',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: dotColor,
              flexShrink: 0,
            }}
          />
          {current?.name ?? 'Protocol'}
        </span>
        <svg
          width={14}
          height={14}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            color: '#9A9A9A',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0,
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && (
        <div
          className="dropdown-panel-enter"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            minWidth: 200,
            background: '#FFFFFF',
            border: '1px solid #E8E4DC',
            borderRadius: 12,
            boxShadow: '0 8px 32px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06)',
            overflow: 'hidden',
            zIndex: 1000,
          }}
        >
          {protocols.map((protocol, index) => {
            const ms = mockScores[protocol.id]
            const selected = protocol.id === selectedProtocol
            const rowDot = PROTOCOL_DOT[protocol.id] || protocol.color
            const actionColor = ms ? ACTION_COLORS[ms.action] : '#9A9A9A'
            const actionBg = ms ? ACTION_BG[ms.action] : 'rgba(0,0,0,0.06)'
            const isLast = index === protocols.length - 1
            return (
              <div
                key={protocol.id}
                role="button"
                tabIndex={0}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    onProtocolChange(protocol.id)
                    setOpen(false)
                  }
                }}
                onClick={() => {
                  onProtocolChange(protocol.id)
                  setOpen(false)
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '11px 16px',
                  cursor: 'pointer',
                  fontFamily: 'Inter, sans-serif',
                  fontWeight: selected ? 600 : 400,
                  fontSize: '0.875rem',
                  color: '#1A1A1A',
                  background: selected ? 'rgba(212,160,23,0.07)' : 'transparent',
                  transition: 'background 0.15s ease',
                  borderBottom: isLast ? 'none' : '1px solid #F0EDE6',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(212,160,23,0.05)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = selected ? 'rgba(212,160,23,0.07)' : 'transparent'
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: rowDot,
                    flexShrink: 0,
                  }}
                />
                <span style={{ flex: 1 }}>{protocol.name}</span>
                {ms && (
                  <span
                    style={{
                      fontSize: '0.75rem',
                      fontFamily: 'Inter, sans-serif',
                      fontWeight: 700,
                      color: actionColor,
                      background: actionBg,
                      padding: '2px 8px',
                      borderRadius: 20,
                    }}
                  >
                    {formatScore(ms.score)}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Sidebar(props?: NavBarProps) {
  const {
    selectedProtocol = 'aave-v3',
    onProtocolChange,
    onAlertNavigate,
    score,
    protocols,
    showNavbar = true,
  } = props || {}
  const isFresh = score
    ? Date.now() - new Date(score.timestamp).getTime() < 900000
    : false

  return (
    <header
      className={`navbar flex items-center justify-between px-6${showNavbar ? ' visible' : ''}`}
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

      <nav className="nav-cluster">
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              `nav-cluster-link ${isActive ? 'nav-cluster-link--active' : ''}`
            }
          >
            <item.icon size={14} />
            <span className="hidden lg:inline">{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="flex items-center gap-3 shrink-0">
        {protocols && protocols.length > 0 && onProtocolChange && (
          <ProtocolMenu
            selectedProtocol={selectedProtocol}
            onProtocolChange={onProtocolChange}
            protocols={protocols}
          />
        )}

        <AlertPanel
          onNavigate={id => {
            if (onAlertNavigate) onAlertNavigate(id)
            else if (onProtocolChange) onProtocolChange(id)
          }}
        />

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
