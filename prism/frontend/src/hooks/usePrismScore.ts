import { useState, useEffect } from 'react'
import type { PrismScore, ScoreHistoryPoint } from '../types'
import { api } from '../lib/api'

export function usePrismScore(protocolId: string) {
  const [score, setScore] = useState<PrismScore | null>(null)
  const [history, setHistory] = useState<ScoreHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!protocolId) return
    setLoading(true)

    Promise.all([api.getScore(protocolId), api.getScoreHistory(protocolId)]).then(
      ([scoreData, historyData]) => {
        setScore(scoreData)
        setHistory(historyData)
        setLoading(false)
      }
    )
  }, [protocolId])

  return { score, history, loading }
}
