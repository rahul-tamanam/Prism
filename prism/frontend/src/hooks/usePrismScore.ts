import { useState, useEffect, useCallback } from 'react'
import type { PrismScore, ScoreHistoryPoint } from '../types'
import { api } from '../lib/api'

export function usePrismScore(protocolId: string) {
  const [score, setScore] = useState<PrismScore | null>(null)
  const [history, setHistory] = useState<ScoreHistoryPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

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

  /** Recompute score from live APIs (busts backend cache). Use after editing Dune SQL or .env. */
  const refreshScore = useCallback(async () => {
    if (!protocolId) return
    setRefreshing(true)
    try {
      const scoreData = await api.getScore(protocolId, { refresh: true })
      setScore(scoreData)
    } finally {
      setRefreshing(false)
    }
  }, [protocolId])

  return { score, history, loading, refreshing, refreshScore }
}
