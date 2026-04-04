import type { NarrativeArticle } from '../../types'
import { getRelativeTime } from '../../lib/utils'

interface NewsCardProps {
  article: NarrativeArticle
}

const SENTIMENT_CONFIG: Record<string, { bg: string; label: string }> = {
  positive: { bg: '#2D8A4E', label: 'Positive' },
  neutral: { bg: '#D4A017', label: 'Neutral' },
  negative: { bg: '#C94040', label: 'Negative' },
}

function getSentimentKey(score: number): string {
  if (score >= 0.3) return 'positive'
  if (score >= -0.3) return 'neutral'
  return 'negative'
}

export default function NewsCard({ article }: NewsCardProps) {
  const key = getSentimentKey(article.sentiment_score)
  const config = SENTIMENT_CONFIG[key]

  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block"
      style={{
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E4DC',
        borderRadius: 12,
        padding: '16px 20px',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'box-shadow 0.2s ease, transform 0.2s ease',
        textDecoration: 'none',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 16px rgba(0,0,0,0.08)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'
        ;(e.currentTarget as HTMLElement).style.transform = 'translateY(0)'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
        <div style={{ flex: 1 }}>
          <h4 style={{ fontFamily: 'DM Sans', fontWeight: 600, fontSize: '0.9rem', color: '#1A1A1A', lineHeight: 1.4, marginBottom: 6 }}>
            {article.title}
          </h4>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontFamily: 'DM Sans', fontWeight: 400, fontSize: '0.8rem', color: '#9A9A9A' }}>
              {article.source}
            </span>
            <span style={{ fontFamily: 'DM Sans', fontWeight: 400, fontSize: '0.8rem', color: '#9A9A9A' }}>
              {getRelativeTime(article.published_at)}
            </span>
          </div>
        </div>
        <span
          style={{
            fontFamily: 'DM Sans',
            fontWeight: 700,
            fontSize: '0.7rem',
            color: '#FFFFFF',
            backgroundColor: config.bg,
            borderRadius: 6,
            padding: '3px 10px',
            flexShrink: 0,
            textTransform: 'uppercase' as const,
          }}
        >
          {config.label}
        </span>
      </div>
    </a>
  )
}
