import logging
from services.cryptopanic import get_news
from services.sentiment import get_narrative_summary

logger = logging.getLogger(__name__)


def _sentiment_score(avg_compound: float) -> float:
    """
    Convert average VADER compound sentiment to a 0-100 risk score.

    Formula: ((avg_compound + 1) / 2) * 100
    VADER compound ranges from -1 (most negative) to +1 (most positive).
    Mapping: -1→0, 0→50, +1→100 (higher = safer / more positive sentiment).

    Data source: VADER analysis of CryptoPanic news titles.
    """
    return max(0.0, min(100.0, ((avg_compound + 1) / 2) * 100))


def _negative_ratio_score(negative_ratio: float) -> float:
    """
    Score the fraction of articles with negative sentiment.

    A high ratio of negative articles signals sustained FUD or real problems:
    - >70% negative: extreme FUD → 8
    - 50-70%: predominantly negative → 25
    - 30-50%: mixed-negative → 50
    - 15-30%: normal variation → 75
    - <15%: predominantly positive → 92

    Data source: VADER sentiment classification of news articles.
    """
    if negative_ratio > 0.70:
        return 8.0
    elif negative_ratio > 0.50:
        return 8.0 + 17.0 * ((0.70 - negative_ratio) / 0.20)
    elif negative_ratio > 0.30:
        return 25.0 + 25.0 * ((0.50 - negative_ratio) / 0.20)
    elif negative_ratio > 0.15:
        return 50.0 + 25.0 * ((0.30 - negative_ratio) / 0.15)
    else:
        return 75.0 + 17.0 * min((0.15 - negative_ratio) / 0.15, 1.0)


def _mention_spike_score(spike_detected: bool, mention_velocity: float) -> float:
    """
    Score mention velocity and spike detection.

    Sudden spikes in mentions often precede or accompany market events.
    High velocity without a spike is normal for popular protocols.

    - Spike detected + high velocity: panic/FUD signal → 15
    - Spike detected + moderate velocity: concerning → 35
    - No spike + high velocity: high attention → 65
    - No spike + moderate velocity: normal → 80
    - No spike + low velocity: quiet period → 90

    Data source: CryptoPanic article frequency analysis.
    """
    if spike_detected:
        if mention_velocity > 60:
            return 15.0
        elif mention_velocity > 30:
            return 15.0 + 20.0 * ((60 - mention_velocity) / 30)
        else:
            return 35.0 + 15.0 * ((30 - mention_velocity) / 30)
    else:
        if mention_velocity > 60:
            return 65.0
        elif mention_velocity > 30:
            return 65.0 + 15.0 * ((60 - mention_velocity) / 30)
        else:
            return 80.0 + 10.0 * min((30 - mention_velocity) / 30, 1.0)


async def calculate_narrative_score(protocol_id: str, protocol_config: dict) -> dict:
    """
    Calculate the Narrative pillar score (Pillar 6) for a protocol.

    Aggregation formula:
      Pillar 6 = (sentiment * 0.40) + (negative_ratio * 0.35) + (mention_spike * 0.25)

    Narrative risk captures the reflexive feedback loop between market sentiment,
    media coverage, and capital flows. FUD-driven exits can become self-fulfilling.
    """
    token = protocol_config.get("token_symbol", "")
    articles = await get_news([token])
    summary = await get_narrative_summary(token, articles)

    avg_compound = summary.get("avg_sentiment", 0.0)
    neg_ratio = summary.get("negative_ratio", 0.3)
    velocity = summary.get("mention_velocity", 30.0)
    spike = summary.get("spike_detected", False)

    sent_s = _sentiment_score(avg_compound)
    neg_s = _negative_ratio_score(neg_ratio)
    spike_s = _mention_spike_score(spike, velocity)

    composite = (
        sent_s * 0.40
        + neg_s * 0.35
        + spike_s * 0.25
    )

    return {
        "score": round(composite, 1),
        "sentiment_score": round(sent_s, 1),
        "negative_ratio_score": round(neg_s, 1),
        "mention_spike_score": round(spike_s, 1),
        "avg_compound_sentiment": round(avg_compound, 3),
        "negative_ratio": round(neg_ratio, 3),
        "mention_velocity": round(velocity, 1),
        "spike_detected": spike,
        "articles_analyzed": len(articles),
    }
