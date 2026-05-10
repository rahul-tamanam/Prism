import { useState, useEffect, useRef } from 'react'
import { NavLink } from 'react-router-dom'
import { Radio, BarChart3, Zap, Newspaper, Briefcase, Moon, Sun } from 'lucide-react'
import type { Protocol, PrismScore } from '../../types'
import { ACTION_COLORS, ACTION_BG } from '../../types'
import { formatScore } from '../../lib/utils'
import { mockScores } from '../../data/mockData'
import AlertPanel from './AlertPanel'
import { useTheme } from '../../contexts/ThemeContext'

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
  dropdownAlign = 'right',
}: {
  selectedProtocol: string
  onProtocolChange: (id: string) => void
  protocols: Protocol[]
  /** Anchor edge for the open panel (use left when the trigger sits on the header left) */
  dropdownAlign?: 'left' | 'right'
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

  const dotColor = PROTOCOL_DOT[selectedProtocol] || 'var(--text-muted)'

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
          background: 'var(--bg-card)',
          border: `1px solid ${open ? '#D4A017' : 'var(--border)'}`,
          borderRadius: 10,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
          cursor: 'pointer',
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          fontSize: '0.875rem',
          color: 'var(--text-primary)',
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
            color: 'var(--text-muted)',
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
            ...(dropdownAlign === 'left' ? { left: 0, right: 'auto' } : { right: 0, left: 'auto' }),
            minWidth: 200,
            background: 'var(--bg-card)',
            border: '1px solid var(--border)',
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
            const actionColor = ms ? ACTION_COLORS[ms.action] : 'var(--text-muted)'
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
                  color: 'var(--text-primary)',
                  background: selected ? 'rgba(212,160,23,0.07)' : 'transparent',
                  transition: 'background 0.15s ease',
                  borderBottom: isLast ? 'none' : '1px solid var(--border)',
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

  const { theme, toggleTheme } = useTheme()

  return (
    <header
      className={`navbar px-6${showNavbar ? ' visible' : ''}`}
      style={{
        height: 64,
        background: 'var(--navbar-surface)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div className="navbar-brand">
        <span
          className="font-syne font-extrabold leading-none tracking-[-0.03em]"
          style={{
            color: '#D4A017',
            fontSize: '1.375rem',
            lineHeight: 1,
          }}
        >
          PRISM
        </span>
        {protocols && protocols.length > 0 && onProtocolChange && (
          <ProtocolMenu
            dropdownAlign="left"
            selectedProtocol={selectedProtocol}
            onProtocolChange={onProtocolChange}
            protocols={protocols}
          />
        )}
      </div>

      <nav className="nav-cluster" aria-label="Primary">
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

      <div className="navbar-actions">
        <AlertPanel
          scoreTimestamp={score?.timestamp ?? null}
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
        <button
          type="button"
          className="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={18} strokeWidth={2} /> : <Moon size={18} strokeWidth={2} />}
        </button>
      </div>
    </header>
  )
}
