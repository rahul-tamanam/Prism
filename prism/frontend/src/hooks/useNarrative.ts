import { useState, useEffect } from 'react'
import type { NarrativeSummary } from '../types'
import { api } from '../lib/api'

export function useNarrative(protocolId: string) {
  const [narrative, setNarrative] = useState<NarrativeSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!protocolId) return
    setLoading(true)
    api.getNarrative(protocolId).then(data => {
      setNarrative(data)
      setLoading(false)
    })
  }, [protocolId])

  return { narrative, loading }
}
