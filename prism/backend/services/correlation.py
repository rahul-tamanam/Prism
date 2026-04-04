import math

STATIC_CORRELATIONS = {
    ("aave-v3", "uniswap-v3"): 0.72,
    ("aave-v3", "stargate"): 0.41,
    ("uniswap-v3", "stargate"): 0.38,
}

CORRELATION_DRIVERS = {
    ("aave-v3", "uniswap-v3"): ["ETH price", "Ethereum gas", "stablecoin demand"],
    ("aave-v3", "stargate"): ["Bridge liquidity", "stablecoin flows"],
    ("uniswap-v3", "stargate"): ["Cross-chain volume", "L2 migration"],
}


def _pearson_from_score_histories(hist_a: list[dict], hist_b: list[dict]) -> float | None:
    """
    Compute Pearson correlation between two score history arrays.
    Each entry must have a 'score' field and a 'date' field.
    Only dates present in both histories are used.
    """
    dates_a = {h["date"]: h["score"] for h in hist_a if "date" in h and "score" in h}
    dates_b = {h["date"]: h["score"] for h in hist_b if "date" in h and "score" in h}
    common = sorted(set(dates_a) & set(dates_b))
    if len(common) < 7:
        return None

    xs = [dates_a[d] for d in common]
    ys = [dates_b[d] for d in common]
    n = len(xs)
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    num = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    den_x = math.sqrt(sum((x - mean_x) ** 2 for x in xs))
    den_y = math.sqrt(sum((y - mean_y) ** 2 for y in ys))
    if den_x == 0 or den_y == 0:
        return None
    return round(num / (den_x * den_y), 3)


def compute_correlation_matrix(score_histories: dict[str, list[dict]]) -> dict:
    """
    Build a full N×N correlation matrix from per-protocol score histories.
    Falls back to static correlations if insufficient live history exists.

    score_histories: {protocol_id: [{"date": "2024-01-01", "score": 67.3}, ...]}
    """
    protocols = sorted(score_histories.keys())
    pairs = []
    matrix: dict[str, dict[str, float]] = {p: {} for p in protocols}

    for i, a in enumerate(protocols):
        matrix[a][a] = 1.0
        for b in protocols[i + 1 :]:
            live = _pearson_from_score_histories(
                score_histories.get(a, []),
                score_histories.get(b, []),
            )
            key = tuple(sorted([a, b]))
            corr = live if live is not None else STATIC_CORRELATIONS.get(key, 0.5)
            matrix[a][b] = corr
            matrix[b][a] = corr

            pair_key = (min(a, b), max(a, b))
            drivers = CORRELATION_DRIVERS.get(pair_key, ["Market-wide DeFi risk"])
            pairs.append(
                {
                    "protocol_a": a,
                    "protocol_b": b,
                    "correlation": corr,
                    "source": "live" if live is not None else "static",
                    "diversification_benefit": _diversification_benefit(corr),
                    "risk_note": _risk_note(a, b, corr),
                    "drivers": drivers,
                }
            )

    overall_diversification = _portfolio_diversification_score(matrix, protocols)
    high_corr_pairs = [p for p in pairs if p["correlation"] > 0.65]

    return {
        "protocols": protocols,
        "matrix": matrix,
        "pairs": sorted(pairs, key=lambda x: -x["correlation"]),
        "overall_diversification_score": overall_diversification,
        "high_correlation_warnings": high_corr_pairs,
    }


def _diversification_benefit(corr: float) -> str:
    if corr > 0.8:
        return "Minimal - near-identical stress response"
    elif corr > 0.6:
        return "Low - moderate co-movement during crashes"
    elif corr > 0.4:
        return "Moderate - partial diversification"
    elif corr > 0.2:
        return "Good - meaningful risk reduction"
    else:
        return "Strong - near-independent risk drivers"


def _risk_note(a: str, b: str, corr: float) -> str:
    if corr > 0.7:
        return f"Holding {a} and {b} together provides limited protection during simultaneous ETH stress events."
    elif corr > 0.5:
        return f"{a} and {b} move together in roughly {int(corr * 100)}% of stress scenarios."
    else:
        return f"{a} and {b} have sufficiently independent risk drivers for meaningful diversification."


def _portfolio_diversification_score(matrix: dict, protocols: list[str]) -> float:
    if len(protocols) < 2:
        return 100.0
    pairs = [matrix[a][b] for i, a in enumerate(protocols) for b in protocols[i + 1 :]]
    avg_corr = sum(pairs) / len(pairs) if pairs else 0.5
    return round((1 - avg_corr) * 100, 1)
