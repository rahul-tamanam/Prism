import logging
import httpx
import os
from datetime import datetime, timezone
from email.message import EmailMessage

import aiosmtplib

logger = logging.getLogger(__name__)

WEBHOOK_URL = os.getenv("ALERT_WEBHOOK_URL", "").strip()

_alert_history: list[dict] = []
_previous_states: dict[str, dict] = {}

ACTION_RANK = {"ENTER": 3, "HOLD": 2, "REDUCE": 1, "EXIT": 0}


def _rank(action: str) -> int:
    return ACTION_RANK.get(action, 2)


async def _fire_webhook(payload: dict) -> None:
    if not WEBHOOK_URL:
        return
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            await client.post(WEBHOOK_URL, json=payload)
    except Exception as e:
        logger.warning("Webhook delivery failed: %s", e)


def _alert_email_text(alert: dict) -> tuple[str, str]:
    """Subject and plain-text body for SMTP."""
    name = alert.get("protocol_name", "Protocol")
    atype = alert.get("type", "")
    subject = f"[PRISM] {name} — {atype.replace('_', ' ')}"
    lines = [
        alert.get("message", ""),
        "",
        f"Severity: {alert.get('severity', '')}",
        f"Protocol: {name} ({alert.get('protocol_id', '')})",
        f"Time (UTC): {alert.get('timestamp', '')}",
    ]
    if alert.get("prev_action") is not None:
        lines.append(f"Action: {alert.get('prev_action')} → {alert.get('new_action')}")
    if alert.get("score_before") is not None:
        lines.append(
            f"Score: {alert.get('score_before')} → {alert.get('score_after')}"
        )
    lines.append(f"Composite score: {alert.get('score', '')}")
    lines.append(f"Alert id: {alert.get('id', '')}")
    return subject, "\n".join(lines)


async def _send_smtp_email(alert: dict) -> None:
    host = os.getenv("ALERT_SMTP_HOST", "").strip()
    to_raw = os.getenv("ALERT_EMAIL_TO", "").strip()
    if not host or not to_raw:
        return

    recipients = [e.strip() for e in to_raw.split(",") if e.strip()]
    if not recipients:
        return

    port = int(os.getenv("ALERT_SMTP_PORT", "587"))
    user = os.getenv("ALERT_SMTP_USER", "").strip()
    password = os.getenv("ALERT_SMTP_PASSWORD", "").strip()
    mail_from = os.getenv("ALERT_EMAIL_FROM", user).strip() or "prism-alerts@localhost"

    use_tls = os.getenv("ALERT_SMTP_USE_TLS", "0").strip().lower() in ("1", "true", "yes")
    start_tls = os.getenv("ALERT_SMTP_STARTTLS", "1").strip().lower() not in ("0", "false", "no")
    if use_tls:
        start_tls = False

    subject, body = _alert_email_text(alert)
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = mail_from
    msg["To"] = ", ".join(recipients)
    msg.set_content(body)

    try:
        await aiosmtplib.send(
            msg,
            hostname=host,
            port=port,
            username=user or None,
            password=password or None,
            use_tls=use_tls,
            start_tls=start_tls,
            timeout=20.0,
        )
    except Exception as e:
        logger.warning("SMTP alert delivery failed: %s", e)


async def _dispatch_external(alert: dict) -> None:
    await _fire_webhook(alert)
    await _send_smtp_email(alert)


def _record(alert: dict) -> None:
    _alert_history.insert(0, alert)
    if len(_alert_history) > 200:
        _alert_history.pop()


async def check_and_dispatch(protocol_id: str, name: str, new_score: dict) -> list[dict]:
    """
    Compare new score state to previous. Fire alerts for:
    - Action downgrade (HOLD→REDUCE, REDUCE→EXIT, HOLD→EXIT)
    - Action upgrade (EXIT→REDUCE, REDUCE→HOLD)
    - Triple convergence newly activated
    - Score drop >10 points in one cycle
    Returns list of alerts fired this cycle.
    """
    prev = _previous_states.get(protocol_id)
    fired = []
    now = datetime.now(timezone.utc).isoformat()

    new_action = new_score.get("action", "HOLD")
    new_composite = new_score.get("score", 50.0)
    new_triple = new_score.get("triple_convergence_active", False)

    if prev:
        prev_action = prev.get("action", "HOLD")
        prev_composite = prev.get("score", 50.0)
        prev_triple = prev.get("triple_convergence_active", False)

        if _rank(new_action) < _rank(prev_action):
            alert = {
                "id": f"{protocol_id}-downgrade-{now}",
                "type": "ACTION_DOWNGRADE",
                "severity": "HIGH" if new_action == "EXIT" else "MEDIUM",
                "protocol_id": protocol_id,
                "protocol_name": name,
                "message": f"{name} downgraded from {prev_action} to {new_action}",
                "prev_action": prev_action,
                "new_action": new_action,
                "score": new_composite,
                "timestamp": now,
                "acknowledged": False,
            }
            _record(alert)
            fired.append(alert)
            await _dispatch_external(alert)

        elif _rank(new_action) > _rank(prev_action):
            alert = {
                "id": f"{protocol_id}-upgrade-{now}",
                "type": "ACTION_UPGRADE",
                "severity": "LOW",
                "protocol_id": protocol_id,
                "protocol_name": name,
                "message": f"{name} upgraded from {prev_action} to {new_action}",
                "prev_action": prev_action,
                "new_action": new_action,
                "score": new_composite,
                "timestamp": now,
                "acknowledged": False,
            }
            _record(alert)
            fired.append(alert)
            await _fire_webhook(alert)

        if new_triple and not prev_triple:
            alert = {
                "id": f"{protocol_id}-triple-{now}",
                "type": "TRIPLE_CONVERGENCE",
                "severity": "CRITICAL",
                "protocol_id": protocol_id,
                "protocol_name": name,
                "message": f"Triple Convergence Alert activated for {name}",
                "score": new_composite,
                "timestamp": now,
                "acknowledged": False,
            }
            _record(alert)
            fired.append(alert)
            await _dispatch_external(alert)

        score_drop = prev_composite - new_composite
        if score_drop >= 10.0:
            alert = {
                "id": f"{protocol_id}-drop-{now}",
                "type": "SCORE_DROP",
                "severity": "MEDIUM",
                "protocol_id": protocol_id,
                "protocol_name": name,
                "message": f"{name} score dropped {score_drop:.1f} points ({prev_composite:.1f} → {new_composite:.1f})",
                "score_before": prev_composite,
                "score_after": new_composite,
                "score": new_composite,
                "timestamp": now,
                "acknowledged": False,
            }
            _record(alert)
            fired.append(alert)
            await _dispatch_external(alert)

    _previous_states[protocol_id] = {
        "action": new_action,
        "score": new_composite,
        "triple_convergence_active": new_triple,
    }

    return fired


def get_alert_history(limit: int = 50) -> list[dict]:
    return _alert_history[:limit]


def acknowledge_alert(alert_id: str) -> bool:
    for alert in _alert_history:
        if alert["id"] == alert_id:
            alert["acknowledged"] = True
            return True
    return False


def get_unacknowledged_count() -> int:
    return sum(1 for a in _alert_history if not a.get("acknowledged", False))
