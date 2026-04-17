import { useState, useCallback } from 'react'
import type { StressResult } from '../types'
import { api } from '../lib/api'

export function useStressScenario(protocolId: string) {
  const [result, setResult] = useState<StressResult | null>(null)
  const [loading, setLoading] = useState(false)

  const runScenario = useCallback(
    async (scenario: string) => {
      setLoading(true)
      setResult(null)
      const data = await api.runStress(protocolId, scenario)
      setResult(data)
      setLoading(false)
    },
    [protocolId]
  )

  return { runScenario, result, loading }
}
