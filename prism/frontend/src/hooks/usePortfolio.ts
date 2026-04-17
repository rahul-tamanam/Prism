import { useState, useEffect } from 'react'
import type { PortfolioView } from '../types'
import { api } from '../lib/api'

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioView | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getPortfolio().then(data => {
      setPortfolio(data)
      setLoading(false)
    })
  }, [])

  return { portfolio, loading }
}
