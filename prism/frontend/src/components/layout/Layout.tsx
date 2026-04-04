import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useProtocols } from '../../hooks/useProtocols'
import { usePrismScore } from '../../hooks/usePrismScore'

export default function Layout() {
  const { protocols } = useProtocols()
  const [selectedProtocol, setSelectedProtocol] = useState('aave-v3')
  const { score } = usePrismScore(selectedProtocol)

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-gradient)' }}>
      <Sidebar
        selectedProtocol={selectedProtocol}
        onProtocolChange={setSelectedProtocol}
        score={score}
        protocols={protocols}
      />
      <main style={{ paddingTop: 64, minHeight: '100vh' }}>
        <Outlet context={{ selectedProtocol, setSelectedProtocol }} />
      </main>
    </div>
  )
}
