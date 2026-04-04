import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

interface TripleConvergenceAlertProps {
  active: boolean
}

export default function TripleConvergenceAlert({ active }: TripleConvergenceAlertProps) {
  if (!active) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-4 mb-6"
      style={{
        backgroundColor: 'rgba(201, 64, 64, 0.06)',
        border: '1px solid var(--border)',
        borderLeft: '4px solid #C94040',
        padding: '16px 24px',
        borderRadius: 12,
      }}
    >
      <motion.div
        animate={{ opacity: [1, 0.4, 1] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <AlertTriangle size={20} color="#C94040" />
      </motion.div>
      <div>
        <h4 className="font-syne text-xs font-bold uppercase tracking-[0.12em] mb-1" style={{ color: '#C94040' }}>
          Triple Convergence Active
        </h4>
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          Negative sentiment spike + governance proposal + TVL drawdown detected simultaneously.
          Action escalated one level.
        </p>
      </div>
    </motion.div>
  )
}
