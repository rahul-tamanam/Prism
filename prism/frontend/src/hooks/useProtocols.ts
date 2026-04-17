import { useState, useEffect } from 'react'
import type { Protocol } from '../types'
import { api } from '../lib/api'

export function useProtocols() {
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getProtocols().then(data => {
      setProtocols(data)
      setLoading(false)
    })
  }, [])

  return { protocols, loading }
}
