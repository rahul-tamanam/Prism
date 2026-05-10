import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import Layout from './components/layout/Layout'
import ProtocolRadar from './pages/ProtocolRadar'
import RiskDecomposition from './pages/RiskDecomposition'
import StressLab from './pages/StressLab'
import NarrativeFeed from './pages/NarrativeFeed'
import PortfolioView from './pages/PortfolioView'

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<ProtocolRadar />} />
            <Route path="/decomposition" element={<RiskDecomposition />} />
            <Route path="/stress" element={<StressLab />} />
            <Route path="/narrative" element={<NarrativeFeed />} />
            <Route path="/portfolio" element={<PortfolioView />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App
