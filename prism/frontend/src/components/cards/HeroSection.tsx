import { Radio, Hexagon, AlertTriangle, ChevronDown } from 'lucide-react'

interface HeroSectionProps {
  onDismiss: () => void
}

const floatingElements = [
  { w: 24, h: 24, top: '8%', left: '6%', bg: 'rgba(126,184,212,0.10)', border: 'rgba(126,184,212,0.25)', dur: '6s', delay: '0s' },
  { w: 40, h: 40, top: '15%', left: '78%', bg: 'rgba(212,160,23,0.08)', border: 'rgba(212,160,23,0.20)', dur: '5s', delay: '0.5s' },
  { w: 20, h: 20, top: '30%', left: '12%', bg: 'rgba(126,184,212,0.10)', border: 'rgba(126,184,212,0.25)', dur: '4s', delay: '1s' },
  { w: 56, h: 56, top: '60%', left: '85%', bg: 'rgba(126,184,212,0.06)', border: 'rgba(126,184,212,0.18)', dur: '7s', delay: '0.8s' },
  { w: 32, h: 32, top: '45%', left: '4%', bg: 'rgba(212,160,23,0.08)', border: 'rgba(212,160,23,0.18)', dur: '6.5s', delay: '1.2s' },
  { w: 28, h: 28, top: '70%', left: '20%', bg: 'rgba(126,184,212,0.09)', border: 'rgba(126,184,212,0.22)', dur: '4s', delay: '0.3s' },
  { w: 48, h: 48, top: '20%', left: '90%', bg: 'rgba(212,160,23,0.07)', border: 'rgba(212,160,23,0.16)', dur: '8s', delay: '1.5s' },
  { w: 22, h: 22, top: '50%', left: '70%', bg: 'rgba(126,184,212,0.11)', border: 'rgba(126,184,212,0.25)', dur: '5s', delay: '0.7s' },
  { w: 36, h: 36, top: '75%', left: '55%', bg: 'rgba(212,160,23,0.09)', border: 'rgba(212,160,23,0.20)', dur: '4s', delay: '1.8s' },
  { w: 26, h: 26, top: '12%', left: '40%', bg: 'rgba(126,184,212,0.08)', border: 'rgba(126,184,212,0.22)', dur: '6s', delay: '2s' },
  { w: 44, h: 44, top: '55%', left: '30%', bg: 'rgba(212,160,23,0.06)', border: 'rgba(212,160,23,0.15)', dur: '5s', delay: '1.1s' },
  { w: 30, h: 30, top: '35%', left: '60%', bg: 'rgba(126,184,212,0.10)', border: 'rgba(126,184,212,0.25)', dur: '7s', delay: '0.6s' },
  { w: 60, h: 60, top: '80%', left: '75%', bg: 'rgba(126,184,212,0.05)', border: 'rgba(126,184,212,0.14)', dur: '8s', delay: '1.3s' },
  { w: 20, h: 20, top: '25%', left: '50%', bg: 'rgba(212,160,23,0.10)', border: 'rgba(212,160,23,0.22)', dur: '5s', delay: '2.2s' },
  { w: 34, h: 34, top: '65%', left: '42%', bg: 'rgba(126,184,212,0.07)', border: 'rgba(126,184,212,0.18)', dur: '6.5s', delay: '0.9s' },
]

const stats = [
  { icon: Radio, value: '3 Protocols', label: 'Monitored', iconColor: '#D4A017' },
  { icon: Hexagon, value: '6 Risk Pillars', label: 'Analyzed', iconColor: '#7EB8D4' },
  { icon: AlertTriangle, value: 'Real-Time', label: 'Exit Signals', iconColor: '#D4A017' },
]

function scrollToDashboard() {
  document.getElementById('dashboard-content')?.scrollIntoView({ behavior: 'smooth' })
}

export default function HeroSection({ onDismiss }: HeroSectionProps) {
  const handleCTA = () => {
    onDismiss()
  }

  return (
    <div>
      <div
        className="relative overflow-hidden"
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(160deg, #FAFAF7 0%, #EEF3F8 45%, #F5F2E8 100%)',
        }}
      >
        <div className="hero-grid absolute inset-0 z-0" />
        <div className="hero-glow absolute inset-0 z-0" />

        {floatingElements.map((el, i) => (
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
              animation: `floatY ${el.dur} ease-in-out infinite`,
              animationDelay: el.delay,
            }}
          />
        ))}

        <div
          className="relative z-10 flex flex-col items-center justify-center text-center"
          style={{ minHeight: '100vh', padding: '80px 24px 60px' }}
        >
          <p
            className="font-medium uppercase tracking-[0.2em] anim-fade-in-up"
            style={{ color: '#7EB8D4', fontSize: 13, marginBottom: 24, animationDelay: '0.1s' }}
          >
            DEFI RISK ENGINE
          </p>

          <h1
            className="font-syne anim-fade-in-up"
            style={{
              fontWeight: 800,
              fontSize: 72,
              color: '#1A1A1A',
              lineHeight: 1.05,
              marginBottom: 24,
              animationDelay: '0.25s',
            }}
          >
            Know When to Exit.
          </h1>

          <p
            className="anim-fade-in-up"
            style={{
              color: '#5C5C5C',
              fontSize: 18,
              maxWidth: 520,
              lineHeight: 1.65,
              marginBottom: 40,
              animationDelay: '0.4s',
            }}
          >
            PRISM measures TVL quality, not TVL level — and tells you whether
            your position size is too large for the protocol's real exit
            liquidity under stress.
          </p>

          <button
            onClick={handleCTA}
            className="font-syne anim-fade-in-up"
            style={{
              background: '#D4A017',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 15,
              padding: '14px 32px',
              borderRadius: 50,
              border: 'none',
              cursor: 'pointer',
              marginBottom: 40,
              boxShadow: '0 4px 20px rgba(212,160,23,0.35)',
              animationDelay: '0.55s',
              transition: 'transform 0.2s ease',
            }}
            onMouseEnter={e => { (e.target as HTMLElement).style.transform = 'scale(1.03)' }}
            onMouseLeave={e => { (e.target as HTMLElement).style.transform = 'scale(1)' }}
          >
            Open Dashboard →
          </button>

          <div
            onClick={scrollToDashboard}
            className="cursor-pointer anim-fade-in-up"
            style={{ animationDelay: '0.7s' }}
          >
            <ChevronDown
              size={28}
              color="#7EB8D4"
              style={{ animation: 'floatY 2s ease-in-out infinite' }}
            />
          </div>
        </div>

        <div
          className="relative z-10"
          style={{ padding: '0 24px 48px', marginTop: -40 }}
        >
          <div
            className="flex justify-center gap-6 flex-wrap"
            style={{ maxWidth: 840, margin: '0 auto' }}
          >
            {stats.map((stat, i) => (
              <div
                key={i}
                className="flex items-center gap-4 anim-fade-in-up"
                style={{
                  background: 'rgba(255,255,255,0.75)',
                  border: '1px solid rgba(126,184,212,0.25)',
                  borderRadius: 20,
                  padding: '20px 28px',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
                  flex: '1 1 200px',
                  maxWidth: 260,
                  animationDelay: `${0.7 + i * 0.15}s`,
                }}
              >
                <stat.icon size={22} color={stat.iconColor} strokeWidth={1.5} />
                <div>
                  <p className="font-syne" style={{ fontWeight: 800, color: '#1A1A1A', fontSize: 16 }}>
                    {stat.value}
                  </p>
                  <p style={{ color: '#5C5C5C', fontSize: 13 }}>
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ height: 60, background: 'linear-gradient(to bottom, #F5F2E8, #FAFAF7)' }} />
    </div>
  )
}
