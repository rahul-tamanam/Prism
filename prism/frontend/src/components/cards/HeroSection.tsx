import { AlertTriangle, ChevronDown } from 'lucide-react'
import { ACTION_COLORS, PILLAR_LABELS, PILLAR_WEIGHTS } from '../../types'
import { usePrismScore } from '../../hooks/usePrismScore'

interface HeroSectionProps {
  onScrollToDashboard: () => void
}

const floatingSquares = [
  { w: 24, h: 24, top: '8%', left: '6%', bg: 'rgba(126,184,212,0.10)', border: 'rgba(126,184,212,0.25)', anim: 'floatA 5s ease-in-out infinite', delay: '0s' },
  { w: 40, h: 40, top: '15%', left: '78%', bg: 'rgba(212,160,23,0.08)', border: 'rgba(212,160,23,0.20)', anim: 'floatB 7s ease-in-out infinite', delay: '0.8s' },
  { w: 20, h: 20, top: '30%', left: '12%', bg: 'rgba(126,184,212,0.10)', border: 'rgba(126,184,212,0.25)', anim: 'floatC 6s ease-in-out infinite', delay: '1.4s' },
  { w: 56, h: 56, top: '60%', left: '85%', bg: 'rgba(126,184,212,0.06)', border: 'rgba(126,184,212,0.18)', anim: 'floatA 8s ease-in-out infinite', delay: '2.1s' },
  { w: 32, h: 32, top: '45%', left: '4%', bg: 'rgba(212,160,23,0.08)', border: 'rgba(212,160,23,0.18)', anim: 'floatB 5.5s ease-in-out infinite', delay: '0.3s' },
  { w: 28, h: 28, top: '70%', left: '20%', bg: 'rgba(126,184,212,0.09)', border: 'rgba(126,184,212,0.22)', anim: 'floatC 9s ease-in-out infinite', delay: '1.7s' },
  { w: 48, h: 48, top: '20%', left: '90%', bg: 'rgba(212,160,23,0.07)', border: 'rgba(212,160,23,0.16)', anim: 'floatA 6.5s ease-in-out infinite', delay: '3.0s' },
  { w: 22, h: 22, top: '50%', left: '70%', bg: 'rgba(126,184,212,0.11)', border: 'rgba(126,184,212,0.25)', anim: 'floatB 7.5s ease-in-out infinite', delay: '0.6s' },
  { w: 36, h: 36, top: '75%', left: '55%', bg: 'rgba(212,160,23,0.09)', border: 'rgba(212,160,23,0.20)', anim: 'floatC 5s ease-in-out infinite', delay: '2.5s' },
  { w: 26, h: 26, top: '12%', left: '40%', bg: 'rgba(126,184,212,0.08)', border: 'rgba(126,184,212,0.22)', anim: 'floatA 8.5s ease-in-out infinite', delay: '1.1s' },
  { w: 44, h: 44, top: '55%', left: '30%', bg: 'rgba(212,160,23,0.06)', border: 'rgba(212,160,23,0.15)', anim: 'floatB 6s ease-in-out infinite', delay: '3.5s' },
  { w: 30, h: 30, top: '35%', left: '60%', bg: 'rgba(126,184,212,0.10)', border: 'rgba(126,184,212,0.25)', anim: 'floatC 7s ease-in-out infinite', delay: '0.9s' },
]

const CARD_SHELL = {
  background: 'rgba(255,255,255,0.75)',
  border: '1px solid rgba(126,184,212,0.25)',
  borderRadius: 20,
  padding: '20px 28px',
  backdropFilter: 'blur(8px)',
  WebkitBackdropFilter: 'blur(8px)',
  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
} as const

const CARD_HEADER = {
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.65rem',
  fontWeight: 600,
  color: '#9A9A9A',
  textTransform: 'uppercase' as const,
  letterSpacing: '0.1em',
  marginBottom: 14,
}

const HERO_PROTOCOLS = [
  { id: 'aave-v3', name: 'Aave V3' },
  { id: 'uniswap-v3', name: 'Uniswap V3' },
  { id: 'stargate', name: 'Stargate Finance' },
] as const

/** Top 2 / middle 2 / bottom 2 by model weight — dot greys dark → light */
const PILLAR_WEIGHT_TIERS = [
  { keys: ['liquidity', 'liquidation'] as const, dot: '#2A2A2A' },
  { keys: ['governance', 'oracle'] as const, dot: '#6E6E6E' },
  { keys: ['supply', 'narrative'] as const, dot: '#B8B8B8' },
] as const

function ProtocolStatusRow({ protocolId, name }: { protocolId: string; name: string }) {
  const { score } = usePrismScore(protocolId)
  const dotColor =
    score != null ? (ACTION_COLORS[score.action] ?? '#C8C8C8') : '#C8C8C8'

  return (
    <li
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'Inter, sans-serif',
        fontSize: '0.9rem',
        fontWeight: 500,
        color: '#1A1A1A',
      }}
    >
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: 999,
          background: dotColor,
          flexShrink: 0,
        }}
      />
      {name}
    </li>
  )
}

export default function HeroSection({ onScrollToDashboard }: HeroSectionProps) {
  return (
    <div>
      <div
        className="relative overflow-hidden"
        style={{
          position: 'relative',
          zIndex: 1,
          height: '100vh',
          minHeight: '100vh',
          background: 'linear-gradient(160deg, #FAFAF7 0%, #EEF3F8 45%, #F5F2E8 100%)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div className="hero-grid absolute inset-0 z-0 pointer-events-none" />
        <div className="hero-glow hero-glow--pulse absolute inset-0 z-0 pointer-events-none" />

        {floatingSquares.map((el, i) => (
          <div
            key={i}
            className="absolute z-0"
            style={{
              width: el.w,
              height: el.h,
              top: el.top,
              left: el.left,
              background: el.bg,
              border: `1px solid ${el.border}`,
              borderRadius: 4,
              pointerEvents: 'none',
              animation: el.anim,
              animationDelay: el.delay,
            }}
          />
        ))}

        <div
          className="relative z-10 flex flex-col flex-1 min-h-0 text-center"
          style={{ padding: '80px 24px 24px' }}
        >
          <div className="flex flex-col items-center justify-center flex-1 min-h-0">
            <p
              className="font-medium uppercase tracking-[0.2em]"
              style={{
                color: '#7EB8D4',
                fontSize: 13,
                marginBottom: 24,
                opacity: 0,
                animation: 'fadeInUp 0.6s ease forwards',
                animationDelay: '0.2s',
              }}
            >
              DEFI RISK ENGINE
            </p>

            <h1
              className="font-playfair"
              style={{
                fontWeight: 400,
                fontSize: 'clamp(3rem, 5.5vw + 2rem, 7.5rem)',
                color: '#1A1A1A',
                lineHeight: 1.05,
                marginBottom: 24,
                opacity: 0,
                animation: 'fadeInUp 0.6s ease forwards',
                animationDelay: '0.4s',
              }}
            >
              Know When to{' '}
              <span style={{ fontWeight: 700, color: 'var(--action-enter)' }}>Exit</span>
            </h1>

            <p
              style={{
                color: '#5C5C5C',
                fontSize: 18,
                maxWidth: 520,
                lineHeight: 1.65,
                marginBottom: 40,
                opacity: 0,
                animation: 'fadeInUp 0.6s ease forwards',
                animationDelay: '0.6s',
              }}
            >
              PRISM measures TVL quality, not TVL level, and tells you whether
              your position size is too large for the protocol's real exit
              liquidity under stress.
            </p>

            <button
              type="button"
              onClick={onScrollToDashboard}
              className="font-syne"
              style={{
                background: '#D4A017',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: 15,
                padding: '14px 32px',
                borderRadius: 50,
                border: 'none',
                cursor: 'pointer',
                marginBottom: 24,
                boxShadow: '0 4px 20px rgba(212,160,23,0.35)',
                opacity: 0,
                animation: 'fadeInUp 0.6s ease forwards',
                animationDelay: '0.8s',
                transition: 'transform 0.2s ease',
              }}
              onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.03)' }}
              onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)' }}
            >
              Open Dashboard →
            </button>

            <button
              type="button"
              onClick={onScrollToDashboard}
              aria-label="Scroll to dashboard"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 8,
                opacity: 0,
                animation: 'fadeInUp 0.6s ease forwards',
                animationDelay: '0.8s',
              }}
            >
              <ChevronDown
                size={28}
                color="#7EB8D4"
                style={{ display: 'block', animation: 'chevronBounce 1.8s ease-in-out infinite' }}
              />
            </button>
          </div>

          <div
            className="flex justify-center items-stretch gap-5 flex-wrap shrink-0"
            style={{ maxWidth: 1120, margin: '0 auto', width: '100%', paddingBottom: 24 }}
          >
            {/* Card 1 — Monitored Protocols (dot = live PRISM action / exit signal) */}
            <div
              style={{
                ...CARD_SHELL,
                flex: '2 1 240px',
                maxWidth: 320,
                textAlign: 'left',
                opacity: 0,
                animation: 'fadeInUp 0.6s ease forwards',
                animationDelay: '1.0s',
              }}
            >
              <div style={CARD_HEADER}>Monitored Protocols</div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {HERO_PROTOCOLS.map(p => (
                  <ProtocolStatusRow key={p.id} protocolId={p.id} name={p.name} />
                ))}
              </ul>
            </div>

            {/* Card 2 — Real-Time Exit Signals (center) */}
            <div
              className="flex items-center gap-3"
              style={{
                ...CARD_SHELL,
                flex: '0 1 200px',
                maxWidth: 220,
                minWidth: 168,
                opacity: 0,
                animation: 'fadeInUp 0.6s ease forwards',
                animationDelay: '1.15s',
              }}
            >
              <AlertTriangle size={22} color="#D4A017" strokeWidth={1.5} />
              <div style={{ textAlign: 'left' }}>
                <p className="font-syne" style={{ fontWeight: 800, color: '#1A1A1A', fontSize: 16, margin: 0, lineHeight: 1.2 }}>
                  Real-Time
                </p>
                <p style={{ color: '#5C5C5C', fontSize: 13, margin: '4px 0 0' }}>Exit Signals</p>
              </div>
            </div>

            {/* Card 3 — Risk Pillars (weight tiers → grey gradient) */}
            <div
              style={{
                ...CARD_SHELL,
                flex: '2 1 280px',
                maxWidth: 420,
                textAlign: 'left',
                opacity: 0,
                animation: 'fadeInUp 0.6s ease forwards',
                animationDelay: '1.3s',
              }}
            >
              <div style={CARD_HEADER}>Risk Pillars</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {PILLAR_WEIGHT_TIERS.map(tier => (
                  <div
                    key={tier.keys.join('-')}
                    style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}
                  >
                    {tier.keys.map(key => (
                      <div
                        key={key}
                        style={{
                          flex: 1,
                          minWidth: 0,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 8,
                          fontFamily: 'Inter, sans-serif',
                          fontSize: '0.78rem',
                          color: '#1A1A1A',
                          lineHeight: 1.35,
                        }}
                      >
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 999,
                            background: tier.dot,
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ flex: 1, minWidth: 0 }}>{PILLAR_LABELS[key]}</span>
                        <span style={{ color: '#9A9A9A', fontSize: '0.72rem', flexShrink: 0 }}>
                          {PILLAR_WEIGHTS[key]}%
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        style={{
          height: '120px',
          background: 'linear-gradient(to bottom, #F5F2E8 0%, #FAFAF7 100%)',
          marginTop: '-1px',
        }}
      />
    </div>
  )
}
