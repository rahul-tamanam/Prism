import logging
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

logger = logging.getLogger(__name__)

analyzer = SentimentIntensityAnalyzer()


def score_sentiment(text: str) -> dict:
    """Run VADER sentiment analysis on a text string."""
    scores = analyzer.polarity_scores(text)
    return {
        "compound": scores["compound"],
        "positive": scores["pos"],
        "negative": scores["neg"],
        "neutral": scores["neu"],
    }


async def get_narrative_summary(token_symbol: str, articles: list[dict]) -> dict:
    """
    Compute an aggregate narrative risk summary from a list of news articles.

    Scores each article's title via VADER, then calculates:
    - avg_sentiment: mean compound score across all articles
    - negative_ratio: fraction of articles with compound < -0.15
    - mention_velocity: articles per day (normalized to 7-day window)
    - spike_detected: True if mention_velocity > 2x the baseline of 5 articles/day
    """
    if not articles:
        return {
            "token_symbol": token_symbol,
            "avg_sentiment": 0.0,
            "negative_ratio": 0.0,
            "mention_velocity": 0.0,
            "spike_detected": False,
            "scored_articles": [],
        }

    scored = []
    compounds = []
    negative_count = 0

    for article in articles:
        title = article.get("title", "")
        sentiment = score_sentiment(title)
        compounds.append(sentiment["compound"])
        if sentiment["compound"] < -0.15:
            negative_count += 1
        scored.append({**article, "sentiment": sentiment})

    avg_sentiment = sum(compounds) / len(compounds) if compounds else 0.0
    negative_ratio = negative_count / len(articles) if articles else 0.0

    mention_velocity = len(articles) / 7.0 * 30.0
    baseline_velocity = 5.0 * (30.0 / 7.0)
    spike_detected = mention_velocity > (baseline_velocity * 2.0)

    return {
        "token_symbol": token_symbol,
        "avg_sentiment": round(avg_sentiment, 3),
        "negative_ratio": round(negative_ratio, 3),
        "mention_velocity": round(mention_velocity, 1),
        "spike_detected": spike_detected,
        "scored_articles": scored,
    }
