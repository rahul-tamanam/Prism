from datetime import datetime, timezone

_in_memory_history: dict[str, list[dict]] = {}


def record_score_snapshot(protocol_id: str, score_data: dict) -> None:
    """
    Persist a score snapshot to the in-memory rolling history.
    Called by the score router every time a fresh score is computed.
    Each entry: {date, score, action, pillar_scores}.
    Keeps last 30 entries per protocol.
    """
    entry = {
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "score": score_data.get("score", 50.0),
        "action": score_data.get("action", "HOLD"),
        "pillar_scores": {
            k: v
            for k, v in score_data.get("pillar_scores", {}).items()
            if k != "triple_convergence_active"
        },
    }
    history = _in_memory_history.setdefault(protocol_id, [])
    if history and history[-1]["date"] == entry["date"]:
        history[-1] = entry
    else:
        history.append(entry)
    if len(history) > 30:
        _in_memory_history[protocol_id] = history[-30:]


def get_score_history(protocol_id: str, days: int = 30) -> list[dict]:
    """Return stored score history for a protocol, newest last."""
    history = _in_memory_history.get(protocol_id, [])
    return history[-days:] if len(history) > days else history
