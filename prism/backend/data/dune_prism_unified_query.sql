-- =============================================================================
-- PRISM unified Dune query - ONE query, ONE result row for all pillar snippets
-- =============================================================================
-- 1. Paste this into Dune (new query), replace the SELECT literals / CTEs with
--    real logic for your protocol (Aave, Uniswap, etc.).
-- 2. Run the query once on Dune.
-- 3. Set "dune_prism_query_id": <your_query_id> for that protocol in data/protocols.json
--    (you can clear dune_whale_query_id / dune_users_query_id / dune_liquidations_query_id
--     if you only want this single query).
--
-- Column names are matched case-insensitively by the backend. Use these aliases.
-- =============================================================================

-- Example skeleton (smoke test): returns one row of literals.
-- Replace with your CTEs joining dex.trades, aave.*, erc20.*, etc.

SELECT
  -- ----- Governance (holder concentration) - need at least top_10_pct_supply OR gini -----
  34.2  AS top_10_pct_supply,
  58.7  AS top_50_pct_supply,
  0.72  AS gini_coefficient,
  147   AS whale_count_over_1m,

  -- ----- Narrative (activity) - need at least one of dau / wau / mau -----
  12400 AS dau,
  34200 AS wau,
  89700 AS mau,

  -- ----- Liquidation summary (rolling window you define in SQL) - all three required for Dune liq card -----
  '2026-04-04' AS liquidation_asof_date,
  45    AS liquidation_count_7d,
  12500000.0 AS liquidation_usd_7d,

  -- ----- Liquidity (optional display on Liquidity card) -----
  11000000000.0 AS prism_liquidity_tvl_usd,
  8200000000.0  AS prism_borrowed_usd,

  -- ----- Oracle (optional display) - max deviation vs reference, basis points -----
  12.5 AS prism_oracle_max_deviation_bps,

  -- ----- Supply (optional display) - net flow over 30d, USD (negative = net out) -----
  -25000000.0 AS prism_supply_net_flow_30d_usd
;

-- =============================================================================
-- Liquidation window: name your aggregates liquidation_count_7d / liquidation_usd_7d
-- (or aliases: liq_count_7d, total_liquidated_usd, etc. - see services/dune.py).
-- liquidation_asof_date: end date of the window (DATE or string).
--
-- For a time SERIES (many rows), use a separate dune_liquidations_query_id instead;
-- this unified row is optimized for one dashboard snapshot.
-- =============================================================================
