"""
Dune Analytics — uses GET /v1/query/{query_id}/results (latest run, no new execution).

**Single query (recommended):** set `dune_prism_query_id` to one query whose **first row**
contains all columns listed in `data/dune_prism_unified_query.sql`. One HTTP call feeds every
pillar Dune snippet. If that fetch fails, falls back to the per-pillar IDs below.
You can also set `DUNE_PRISM_QUERY_ID_<PROTOCOL>` (e.g. `DUNE_PRISM_QUERY_ID_AAVE_V3`) when the JSON field is null.

**Split queries (optional):**
  dune_whale_query_id, dune_users_query_id, dune_liquidations_query_id

Column names are matched case-insensitive (see _norm_row).
"""
from __future__ import annotations

import logging
import os
from datetime import datetime, timezone
from typing import Any

import httpx

logger = logging.getLogger(__name__)

TIMEOUT = 45.0

HEADERS = {"Content-Type": "application/json"}


def _dune_api_key() -> str:
    """Read at call time so .env is always visible after load_dotenv()."""
    return os.getenv("DUNE_API_KEY", "").strip()


def _dune_base() -> str:
    return os.getenv("DUNE_BASE_URL", "https://api.dune.com/api/v1").rstrip("/")


def _headers() -> dict[str, str]:
    return {**HEADERS, "X-Dune-API-Key": _dune_api_key()}


def _norm_key(k: str) -> str:
    return k.lower().replace(" ", "_").replace("-", "_")


def _norm_row(row: dict[str, Any]) -> dict[str, Any]:
    return {_norm_key(str(k)): v for k, v in row.items()}


def _pick_float(row: dict[str, Any], *names: str) -> float | None:
    for n in names:
        nk = _norm_key(n)
        if nk not in row:
            continue
        val = row[nk]
        try:
            if val is None:
                continue
            return float(val)
        except (TypeError, ValueError):
            continue
    return None


def _pick_int(row: dict[str, Any], *names: str) -> int | None:
    v = _pick_float(row, *names)
    if v is None:
        return None
    return int(v)


def _pick_str(row: dict[str, Any], *names: str) -> str:
    for n in names:
        nk = _norm_key(n)
        if nk in row and row[nk] is not None:
            return str(row[nk]).strip()
    return ""


async def fetch_latest_query_rows(query_id: int, limit: int = 500) -> list[dict[str, Any]]:
    """Return result rows from the latest successful execution of a Dune query."""
    if not _dune_api_key():
        raise ValueError("DUNE_API_KEY not set")

    url = f"{_dune_base()}/query/{query_id}/results"
    params = {"limit": min(limit, 1000)}

    async with httpx.AsyncClient(timeout=TIMEOUT) as client:
        resp = await client.get(url, headers=_headers(), params=params)
        resp.raise_for_status()
        body = resp.json()

    if not body.get("is_execution_finished", True):
        raise RuntimeError(f"Dune query {query_id} latest run not finished")

    if body.get("error"):
        raise RuntimeError(str(body.get("error")))

    result = body.get("result") or {}
    rows = result.get("rows") or []
    return [_norm_row(r) if isinstance(r, dict) else r for r in rows]


def _resolved_prism_query_id(protocol_config: dict) -> int | None:
    """
    Unified query id: protocols.json `dune_prism_query_id`, else env
    DUNE_PRISM_QUERY_ID_<PROTO> (e.g. DUNE_PRISM_QUERY_ID_AAVE_V3).
    """
    raw = protocol_config.get("dune_prism_query_id")
    if raw is not None:
        try:
            return int(raw)
        except (TypeError, ValueError):
            pass
    pid = str(protocol_config.get("id", "")).strip()
    if not pid:
        return None
    suffix = pid.upper().replace("-", "_")
    env_v = os.getenv(f"DUNE_PRISM_QUERY_ID_{suffix}", "").strip()
    if not env_v:
        return None
    try:
        return int(env_v)
    except ValueError:
        return None


async def fetch_unified_prism_row(
    protocol_config: dict,
) -> tuple[dict[str, Any] | None, int | None, str | None]:
    """
    Load first result row from dune_prism_query_id.

    Returns (normalized_row, query_id, error_message).
    On skip (no id / no key): (None, None, None).
    """
    qid_int_resolved = _resolved_prism_query_id(protocol_config)
    pid = protocol_config.get("id", "unknown")
    if not qid_int_resolved or not _dune_api_key():
        return None, None, None
    try:
        qid_int = qid_int_resolved
        rows = await fetch_latest_query_rows(qid_int, limit=5)
        if not rows:
            logger.warning("Dune unified query %s returned no rows (%s)", qid_int, pid)
            return None, qid_int, "no rows"
        return rows[0], qid_int, None
    except Exception as e:
        logger.warning("Dune unified query failed for %s: %s", pid, e)
        return None, qid_int_resolved, str(e)


def unified_extra_pillar_fields(row: dict[str, Any] | None) -> dict[str, dict[str, Any]]:
    """Optional display/score context from unified row for liquidity, oracle, supply."""
    if not row:
        return {"liquidity": {}, "oracle": {}, "supply": {}}
    liq: dict[str, Any] = {}
    tvl = _pick_float(row, "prism_liquidity_tvl_usd", "dune_tvl_usd", "protocol_tvl_usd")
    if tvl is not None:
        liq["dune_liquidity_tvl_usd"] = round(tvl, 2)
        liq["dune_liquidity_source"] = "dune"
    borrowed = _pick_float(row, "prism_borrowed_usd", "total_borrowed_usd", "borrowed_usd")
    if borrowed is not None:
        liq["dune_borrowed_usd"] = round(borrowed, 2)

    ora: dict[str, Any] = {}
    dev = _pick_float(
        row,
        "prism_oracle_max_deviation_bps",
        "oracle_max_deviation_bps",
        "max_oracle_deviation_bps",
    )
    if dev is not None:
        ora["dune_oracle_max_deviation_bps"] = round(dev, 4)
        ora["dune_oracle_source"] = "dune"

    sup: dict[str, Any] = {}
    flow = _pick_float(
        row,
        "prism_supply_net_flow_30d_usd",
        "supply_net_flow_30d_usd",
        "net_mint_flow_30d_usd",
    )
    if flow is not None:
        sup["dune_supply_net_flow_30d_usd"] = round(flow, 2)
        sup["dune_supply_source"] = "dune"

    return {"liquidity": liq, "oracle": ora, "supply": sup}


async def get_whale_concentration(
    protocol_config: dict,
    *,
    unified_row: dict[str, Any] | None = None,
    unified_query_id: int | None = None,
) -> dict:
    """
    Token / holder concentration from Dune.

    Expected columns (first row), any matching name:
      top_10_pct_supply, top10_pct, top_10_pct
      top_50_pct_supply, top50_pct
      gini_coefficient, gini
      whale_count_over_1m, whale_count
    """
    qid = protocol_config.get("dune_whale_query_id")
    pid = protocol_config.get("id", "unknown")

    if unified_row is not None:
        t10 = _pick_float(unified_row, "top_10_pct_supply", "top10_pct", "top_10_pct")
        gini = _pick_float(unified_row, "gini_coefficient", "gini")
        if t10 is not None or gini is not None:
            return {
                "top_10_pct_supply": t10 or 40.0,
                "top_50_pct_supply": _pick_float(unified_row, "top_50_pct_supply", "top50_pct", "top_50_pct") or 65.0,
                "gini_coefficient": gini or 0.75,
                "whale_count_over_1m": _pick_int(unified_row, "whale_count_over_1m", "whale_count", "whales_over_1m") or 50,
                "source": "dune",
                "dune_query_id": unified_query_id,
            }

    if not qid or not _dune_api_key():
        return _mock_whale(pid)

    try:
        qid_int = int(qid)
        rows = await fetch_latest_query_rows(qid_int, limit=50)
        if not rows:
            logger.warning("Dune whale query %s returned no rows", qid_int)
            return _mock_whale(pid)

        r = rows[0]
        out = {
            "top_10_pct_supply": _pick_float(r, "top_10_pct_supply", "top10_pct", "top_10_pct") or 40.0,
            "top_50_pct_supply": _pick_float(r, "top_50_pct_supply", "top50_pct", "top_50_pct") or 65.0,
            "gini_coefficient": _pick_float(r, "gini_coefficient", "gini") or 0.75,
            "whale_count_over_1m": _pick_int(r, "whale_count_over_1m", "whale_count", "whales_over_1m") or 50,
            "source": "dune",
            "dune_query_id": qid_int,
        }
        return out
    except Exception as e:
        logger.warning("Dune whale concentration failed for %s: %s", pid, e)
        m = _mock_whale(pid)
        m["source"] = "mock"
        m["dune_error"] = str(e)
        return m


def _mock_whale(protocol_id: str) -> dict:
    mock_data = {
        "aave-v3": {
            "top_10_pct_supply": 34.2,
            "top_50_pct_supply": 58.7,
            "gini_coefficient": 0.72,
            "whale_count_over_1m": 147,
        },
        "uniswap-v3": {
            "top_10_pct_supply": 48.6,
            "top_50_pct_supply": 71.3,
            "gini_coefficient": 0.81,
            "whale_count_over_1m": 89,
        },
        "stargate": {
            "top_10_pct_supply": 62.1,
            "top_50_pct_supply": 84.7,
            "gini_coefficient": 0.89,
            "whale_count_over_1m": 23,
        },
    }
    base = mock_data.get(protocol_id, {
        "top_10_pct_supply": 40.0,
        "top_50_pct_supply": 65.0,
        "gini_coefficient": 0.75,
        "whale_count_over_1m": 50,
    })
    return {**base, "source": "mock"}


async def get_protocol_users(
    protocol_config: dict,
    *,
    unified_row: dict[str, Any] | None = None,
    unified_query_id: int | None = None,
) -> dict:
    """Active users: columns dau, wau, mau (first row)."""
    qid = protocol_config.get("dune_users_query_id")
    pid = protocol_config.get("id", "unknown")

    if unified_row is not None:
        dau_v = _pick_float(unified_row, "dau", "daily_active_users")
        wau_v = _pick_float(unified_row, "wau", "weekly_active_users")
        mau_v = _pick_float(unified_row, "mau", "monthly_active_users")
        if dau_v is not None or wau_v is not None or mau_v is not None:
            return {
                "dau": int(dau_v or 5000),
                "wau": int(wau_v or 15000),
                "mau": int(mau_v or 40000),
                "source": "dune",
                "dune_query_id": unified_query_id,
            }

    if not qid or not _dune_api_key():
        return _mock_users(pid)

    try:
        qid_int = int(qid)
        rows = await fetch_latest_query_rows(qid_int, limit=10)
        if not rows:
            return _mock_users(pid)
        r = rows[0]
        return {
            "dau": int(_pick_float(r, "dau", "daily_active_users") or 5000),
            "wau": int(_pick_float(r, "wau", "weekly_active_users") or 15000),
            "mau": int(_pick_float(r, "mau", "monthly_active_users") or 40000),
            "source": "dune",
            "dune_query_id": qid_int,
        }
    except Exception as e:
        logger.warning("Dune users query failed for %s: %s", pid, e)
        m = _mock_users(pid)
        m["source"] = "mock"
        m["dune_error"] = str(e)
        return m


def _mock_users(protocol_id: str) -> dict:
    mock_data = {
        "aave-v3": {"dau": 12400, "wau": 34200, "mau": 89700},
        "uniswap-v3": {"dau": 28700, "wau": 72100, "mau": 156000},
        "stargate": {"dau": 1840, "wau": 5230, "mau": 14600},
    }
    return {**mock_data.get(protocol_id, {"dau": 5000, "wau": 15000, "mau": 40000}), "source": "mock"}


def _default_liquidation_rows() -> list[dict]:
    return [
        {"date": "2026-04-02", "liquidation_count": 23, "total_liquidated_usd": 4200000},
        {"date": "2026-04-01", "liquidation_count": 18, "total_liquidated_usd": 3100000},
    ]


async def get_liquidation_history(
    protocol_config: dict,
    *,
    unified_row: dict[str, Any] | None = None,
    unified_query_id: int | None = None,
) -> dict:
    """
    Return parsed liquidation time series plus Dune source metadata.

    Rows: date (or day), liquidation_count (or count), total_liquidated_usd (or volume_usd).
    Unified row: use liquidation_asof_date + liquidation_count_7d + liquidation_usd_7d (aliases below).
    Response keys: rows, source ("dune"|"mock"), optional dune_query_id, dune_error.
    """
    qid = protocol_config.get("dune_liquidations_query_id")
    pid = protocol_config.get("id", "unknown")
    default_rows = _default_liquidation_rows()

    if unified_row is not None:
        date_s = _pick_str(
            unified_row,
            "liquidation_asof_date",
            "liq_asof_date",
            "liquidation_date",
            "liq_date",
            "date",
        )
        cnt = _pick_int(
            unified_row,
            "liquidation_count_7d",
            "liquidation_count",
            "liq_count_7d",
            "liq_count",
            "n_liquidations_7d",
        )
        usd = _pick_float(
            unified_row,
            "liquidation_usd_7d",
            "total_liquidated_usd",
            "liq_volume_usd_7d",
            "liquidated_usd_7d",
        )
        if cnt is not None and usd is not None:
            if date_s:
                dnorm = date_s[:10] if len(date_s) >= 10 else date_s
            else:
                # Dune/API may omit or stringify dates oddly; still surface counts + USD.
                dnorm = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            return {
                "rows": [{"date": dnorm, "liquidation_count": cnt, "total_liquidated_usd": usd}],
                "source": "dune",
                "dune_query_id": unified_query_id,
            }

    if not qid or not _dune_api_key():
        return {"rows": default_rows, "source": "mock"}

    try:
        qid_int = int(qid)
        rows = await fetch_latest_query_rows(qid_int, limit=100)
        if not rows:
            return {"rows": default_rows, "source": "mock"}
        out = []
        for r in rows:
            date_s = _pick_str(r, "date", "day", "dt", "block_date", "block_time")
            cnt = _pick_int(r, "liquidation_count", "count", "liquidations", "n_liquidations")
            usd = _pick_float(r, "total_liquidated_usd", "volume_usd", "liquidated_usd", "amount_usd")
            if date_s and cnt is not None and usd is not None:
                out.append({
                    "date": date_s[:10] if len(date_s) >= 10 else date_s,
                    "liquidation_count": cnt,
                    "total_liquidated_usd": usd,
                })
        use = out if out else default_rows
        return {
            "rows": use,
            "source": "dune" if out else "mock",
            "dune_query_id": qid_int,
        }
    except Exception as e:
        logger.warning("Dune liquidations query failed for %s: %s", pid, e)
        return {"rows": default_rows, "source": "mock", "dune_error": str(e)}
