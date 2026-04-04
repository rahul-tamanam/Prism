import type { Protocol, PrismScore } from '../../types'

interface TopBarProps {
  selectedProtocol: string
  onProtocolChange: (id: string) => void
  score?: PrismScore | null
  protocols: Protocol[]
}

export default function TopBar(_props: TopBarProps) {
  return null
}
