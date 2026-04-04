export const STRESS_SCENARIOS = [
  { id: 'eth_drop_10', label: 'ETH -10%', description: 'Moderate ETH price correction', icon: 'TrendingDown' },
  { id: 'eth_drop_20', label: 'ETH -20%', description: 'Severe ETH price crash', icon: 'TrendingDown' },
  { id: 'whale_exit_15', label: 'Whale Exits 15%', description: 'Large holder withdraws 15% of TVL', icon: 'Waves' },
  { id: 'bridge_outflow_spike', label: 'Bridge Outflow', description: 'Massive cross-chain capital flight', icon: 'ArrowRightLeft' },
  { id: 'governance_spike', label: 'Governance Spike', description: 'Unusual governance proposal activity', icon: 'Users' },
  { id: 'oracle_staleness', label: 'Oracle Staleness', description: 'Price feeds become stale', icon: 'Clock' },
] as const
