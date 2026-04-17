import { ACTION_COLORS } from '../../types'

interface ActionBadgeProps {
  action: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses: Record<string, string> = {
  sm: 'text-[10px] px-2.5 py-0.5',
  md: 'text-xs px-3.5 py-1',
  lg: 'text-sm px-5 py-1.5',
}

export default function ActionBadge({ action, size = 'md' }: ActionBadgeProps) {
  const bg = ACTION_COLORS[action] || '#9A9A9A'
  const shouldPulse = action === 'REDUCE' || action === 'EXIT'

  return (
    <span
      className={`inline-block font-syne font-bold uppercase tracking-wider rounded-full ${sizeClasses[size]}${shouldPulse ? ' anim-pulse-badge' : ''}`}
      style={{
        backgroundColor: bg,
        color: '#FFFFFF',
      }}
    >
      {action}
    </span>
  )
}
