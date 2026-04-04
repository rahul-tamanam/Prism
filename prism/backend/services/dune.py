"""
Dune Analytics — uses GET /v1/query/{query_id}/results (latest run, no new execution).

Set DUNE_API_KEY in .env. For each protocol, set optional query IDs in protocols.json:
  dune_whale_query_id, dune_users_query_id, dune_liquidations_query_id

Your Dune SQL should return rows with columns PRISM maps (case-insensitive aliases allowed).
"""
from __future__ import annotations

import logging
import os
from typing import Any

import httpx

logger = logging.getLogger(__name__)

DUNE_API_KEY = os.getenv("DUNE_API_KEY", "").strip()
DUNE_BASE = os.getenv("DUNE_BASE_URL", "https://api.dune.com/api/v1").rstrip("/")
TIMEOUT = 45.0

HEADERS = {"Content-Type": "application/json"}


def _headers() -> dict[str, str]:
    h = {**HEADERS, "X-Dune-API-Key": DUNE_API_KEY}
    return h


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
    if not DUNE_API_KEY:
        raise ValueError("DUNE_API_KEY not set")

    url = f"{DUNE_BASE}/query/{query_id}/results"
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


async def get_whale_concentration(protocol_config: dict) -> dict:
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

    if not qid or not DUNE_API_KEY:
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


async def get_protocol_users(protocol_config: dict) -> dict:
    """Active users: columns dau, wau, mau (first row)."""
    qid = protocol_config.get("dune_users_query_id")
    pid = protocol_config.get("id", "unknown")

    if not qid or not DUNE_API_KEY:
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
        return m


def _mock_users(protocol_id: str) -> dict:
    mock_data = {
        "aave-v3": {"dau": 12400, "wau": 34200, "mau": 89700},
        "uniswap-v3": {"dau": 28700, "wau": 72100, "mau": 156000},
        "stargate": {"dau": 1840, "wau": 5230, "mau": 14600},
    }
    return {**mock_data.get(protocol_id, {"dau": 5000, "wau": 15000, "mau": 40000}), "source": "mock"}


async def get_liquidation_history(protocol_config: dict) -> list[dict]:
    """
    Rows: date (or day), liquidation_count (or count), total_liquidated_usd (or volume_usd).
    """
    qid = protocol_config.get("dune_liquidations_query_id")
    pid = protocol_config.get("id", "unknown")

    default = [
        {"date": "2026-04-02", "liquidation_count": 23, "total_liquidated_usd": 4200000},
        {"date": "2026-04-01", "liquidation_count": 18, "total_liquidated_usd": 3100000},
    ]

    if not qid or not DUNE_API_KEY:
        return default

    try:
        qid_int = int(qid)
        rows = await fetch_latest_query_rows(qid_int, limit=100)
        if not rows:
            return default
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
        return out if out else default
    except Exception as e:
        logger.warning("Dune liquidations query failed for %s: %s", pid, e)
        return default
