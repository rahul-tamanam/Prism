import { useState, useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useProtocols } from '../../hooks/useProtocols'
import { usePrismScore } from '../../hooks/usePrismScore'

export default function Layout() {
  const { protocols } = useProtocols()
  const [selectedProtocol, setSelectedProtocol] = useState('aave-v3')
  const { score } = usePrismScore(selectedProtocol)
  const navigate = useNavigate()
  const location = useLocation()
  const isHeroRoute = location.pathname === '/'
  const [pastHero, setPastHero] = useState(!isHeroRoute)

  useEffect(() => {
    if (!isHeroRoute) {
      setPastHero(true)
      return
    }
    const handleScroll = () => {
      const heroHeight = window.innerHeight
      setPastHero(window.scrollY > heroHeight * 0.85)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => window.removeEventListener('scroll', handleScroll)
  }, [isHeroRoute])

  const showNavbar = pastHero

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-gradient)' }}>
      <Sidebar
        selectedProtocol={selectedProtocol}
        onProtocolChange={setSelectedProtocol}
        onAlertNavigate={id => {
          setSelectedProtocol(id)
          navigate('/')
        }}
        score={score}
        protocols={protocols}
        showNavbar={showNavbar}
      />
      <main
        style={{
          paddingTop: isHeroRoute ? 0 : 64,
          minHeight: '100vh',
        }}
      >
        <Outlet context={{ selectedProtocol, setSelectedProtocol }} />
      </main>
    </div>
  )
}
