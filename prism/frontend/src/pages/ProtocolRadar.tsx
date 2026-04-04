import { useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { useProtocols } from '../hooks/useProtocols'
import { usePrismScore } from '../hooks/usePrismScore'
import { ACTION_COLORS } from '../types'
import { generateScoreHistory } from '../data/mockData'
import { mockScores } from '../data/mockData'
import ProtocolCard from '../components/cards/ProtocolCard'
import ScoreTrendChart from '../components/charts/ScoreTrendChart'
import HeroSection from '../components/cards/HeroSection'

function ProtocolScoreCard({ protocolId, onNavigate }: { protocolId: string; onNavigate: () => void }) {
  const { protocols } = useProtocols()
  const { score } = usePrismScore(protocolId)
  const protocol = protocols.find(p => p.id === protocolId)

  if (!protocol || !score) return null

  return <ProtocolCard protocol={protocol} score={score} onClick={onNavigate} index={0} />
}

export default function ProtocolRadar() {
  const navigate = useNavigate()
  const { setSelectedProtocol } = useOutletContext<{
    selectedProtocol: string
    setSelectedProtocol: (id: string) => void
  }>()

  const protocolIds = ['aave-v3', 'uniswap-v3', 'stargate']

  const handleNavigate = (id: string) => {
    setSelectedProtocol(id)
    navigate('/decomposition')
  }

  const handleScrollToDashboard = () => {
    document.getElementById('dashboard-content')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const el = document.getElementById('dashboard-content')
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('visible')
          observer.disconnect()
        }
      },
      { threshold: 0.05 }
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <>
      <HeroSection onScrollToDashboard={handleScrollToDashboard} />
      <div
        id="dashboard-content"
        className="dashboard-section"
        style={{ maxWidth: 1280, margin: '0 auto', padding: '32px 24px' }}
      >
        <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #E8E4DC' }}>
          <h1
            className="font-syne"
            style={{ fontWeight: 700, fontSize: '1.6rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <span style={{ width: 4, height: 24, background: '#D4A017', borderRadius: 2, display: 'inline-block' }} />
            Protocol Radar
          </h1>
          <p style={{ color: '#5C5C5C', fontSize: '0.9rem', marginTop: 4, fontFamily: 'DM Sans' }}>
            Real-time PRISM scores across monitored protocols
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 48 }}>
          {protocolIds.map(id => (
            <ProtocolScoreCard
              key={id}
              protocolId={id}
              onNavigate={() => handleNavigate(id)}
            />
          ))}
        </div>

        <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '1px solid #E8E4DC' }}>
          <h2
            className="font-syne"
            style={{ fontWeight: 700, fontSize: '1.6rem', color: '#1A1A1A', display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <span style={{ width: 4, height: 24, background: '#D4A017', borderRadius: 2, display: 'inline-block' }} />
            Score History
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {protocolIds.map(id => {
            const score = mockScores[id]
            const history = generateScoreHistory(id)
            const color = ACTION_COLORS[score.action]
            return (
              <div key={id} className="prism-card" style={{ padding: 24 }}>
                <p className="card-section-label">
                  {score.name} — 30D TREND
                </p>
                <div style={{ height: 160 }}>
                  <ScoreTrendChart history={history} color={color} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
