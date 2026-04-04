import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, AlertTriangle, TrendingDown, TrendingUp, Activity, CheckCheck } from 'lucide-react'
import type { PrismAlert } from '../../types'
import { api } from '../../lib/api'
import { getRelativeTime } from '../../lib/utils'

const SEVERITY_CONFIG = {
  CRITICAL: { color: '#C94040', bg: 'rgba(201,64,64,0.08)', border: '#C94040' },
  HIGH: { color: '#E07B39', bg: 'rgba(224,123,57,0.08)', border: '#E07B39' },
  MEDIUM: { color: '#D4A017', bg: 'rgba(212,160,23,0.08)', border: '#D4A017' },
  LOW: { color: '#2D8A4E', bg: 'rgba(45,138,78,0.08)', border: '#2D8A4E' },
}

const TYPE_ICONS = {
  ACTION_DOWNGRADE: TrendingDown,
  ACTION_UPGRADE: TrendingUp,
  TRIPLE_CONVERGENCE: AlertTriangle,
  SCORE_DROP: Activity,
}

interface AlertPanelProps {
  onNavigate: (protocolId: string) => void
}

export default function AlertPanel({ onNavigate }: AlertPanelProps) {
  const [open, setOpen] = useState(false)
  const [alerts, setAlerts] = useState<PrismAlert[]>([])
  const [unread, setUnread] = useState(0)

  const fetchAlerts = useCallback(async () => {
    const data = await api.getAlerts()
    setAlerts(data.alerts)
    setUnread(data.unacknowledged_count)
  }, [])

  useEffect(() => {
    void fetchAlerts()
    const interval = setInterval(() => void fetchAlerts(), 30_000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  const handleAck = async (alertId: string) => {
    await api.acknowledgeAlert(alertId)
    setAlerts(prev => prev.map(a => (a.id === alertId ? { ...a, acknowledged: true } : a)))
    setUnread(prev => Math.max(0, prev - 1))
  }

  const handleAckAll = async () => {
    for (const alert of alerts.filter(a => !a.acknowledged)) {
      await api.acknowledgeAlert(alert.id)
    }
    setAlerts(prev => prev.map(a => ({ ...a, acknowledged: true })))
    setUnread(0)
  }

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          color: unread > 0 ? '#C94040' : '#9A9A9A',
        }}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span
            style={{
              position: 'absolute',
              top: 2,
              right: 2,
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: '#C94040',
              color: '#FFF',
              fontFamily: 'Inter',
              fontWeight: 700,
              fontSize: '0.6rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              width: 380,
              maxHeight: 520,
              background: '#FFFFFF',
              border: '1px solid #E8E4DC',
              borderRadius: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
              zIndex: 2000,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                padding: '14px 18px',
                borderBottom: '1px solid #E8E4DC',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span className="font-syne" style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1A1A1A' }}>
                Alerts {unread > 0 && <span style={{ color: '#C94040' }}>({unread} new)</span>}
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={() => void handleAckAll()}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontFamily: 'Inter',
                      fontSize: '0.75rem',
                      color: '#7EB8D4',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <CheckCheck size={13} /> Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9A9A9A' }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div style={{ overflowY: 'auto', flex: 1 }}>
              {alerts.length === 0 ? (
                <div
                  style={{
                    padding: 32,
                    textAlign: 'center',
                    color: '#9A9A9A',
                    fontFamily: 'Inter',
                    fontSize: '0.85rem',
                  }}
                >
                  No alerts yet. Scores are being monitored.
                </div>
              ) : (
                alerts.map(alert => {
                  const sev = SEVERITY_CONFIG[alert.severity]
                  const Icon = TYPE_ICONS[alert.type] || AlertTriangle
                  return (
                    <div
                      key={alert.id}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #F0EDE6',
                        borderLeft: `3px solid ${alert.acknowledged ? '#E8E4DC' : sev.border}`,
                        background: alert.acknowledged ? 'transparent' : sev.bg,
                        opacity: alert.acknowledged ? 0.65 : 1,
                        transition: 'all 0.2s ease',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <Icon
                          size={15}
                          color={alert.acknowledged ? '#9A9A9A' : sev.color}
                          style={{ marginTop: 2, flexShrink: 0 }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontFamily: 'Inter',
                              fontWeight: 600,
                              fontSize: '0.82rem',
                              color: '#1A1A1A',
                              margin: '0 0 3px',
                              lineHeight: 1.4,
                            }}
                          >
                            {alert.message}
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontFamily: 'Inter', fontSize: '0.7rem', color: '#9A9A9A' }}>
                              {getRelativeTime(alert.timestamp)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                onNavigate(alert.protocol_id)
                                setOpen(false)
                              }}
                              style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                fontFamily: 'Inter',
                                fontSize: '0.7rem',
                                color: '#7EB8D4',
                                padding: 0,
                              }}
                            >
                              View →
                            </button>
                          </div>
                        </div>
                        {!alert.acknowledged && (
                          <button
                            type="button"
                            onClick={() => void handleAck(alert.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              color: '#9A9A9A',
                              padding: 2,
                              flexShrink: 0,
                            }}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
