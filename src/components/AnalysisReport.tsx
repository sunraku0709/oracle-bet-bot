'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  result: string
  homeTeam?: string
  awayTeam?: string
  competition?: string
  matchDate?: string
}

export default function AnalysisReport({ result, homeTeam, awayTeam, competition, matchDate }: Props) {
  const dateDisplay = matchDate
    ? new Date(matchDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  return (
    <div>
      {(homeTeam || awayTeam || competition || dateDisplay) && (
        <div
          style={{
            background: 'linear-gradient(135deg,#0f0d04 0%,#0e0e0e 50%,#050814 100%)',
            border: '1px solid rgba(201,168,76,0.3)',
            borderRadius: 14,
            padding: '18px 16px',
            marginBottom: 18,
            textAlign: 'center',
            boxShadow: '0 0 40px rgba(201,168,76,0.18)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: '#fff', letterSpacing: '0.05em' }}>
              {homeTeam ?? 'Domicile'}
            </span>
            <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.1em' }}>VS</span>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: '#fff', letterSpacing: '0.05em' }}>
              {awayTeam ?? 'Extérieur'}
            </span>
          </div>
          {(competition || dateDisplay) && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.05em' }}>
              {[competition, dateDisplay].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
      )}

      <div className="oracle-markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
      </div>

      <style jsx global>{`
        .oracle-markdown {
          color: rgba(245, 245, 240, 0.85);
          font-family: 'Rajdhani', sans-serif;
          font-size: 14px;
          line-height: 1.75;
        }
        .oracle-markdown h1,
        .oracle-markdown h2,
        .oracle-markdown h3,
        .oracle-markdown h4 {
          color: #c9a84c;
          font-family: 'Bebas Neue', sans-serif;
          letter-spacing: 0.05em;
          margin-top: 1.4em;
          margin-bottom: 0.5em;
          line-height: 1.2;
        }
        .oracle-markdown h1 { font-size: 24px; }
        .oracle-markdown h2 { font-size: 20px; }
        .oracle-markdown h3 { font-size: 17px; }
        .oracle-markdown h4 { font-size: 15px; }
        .oracle-markdown p {
          margin: 0 0 0.9em 0;
        }
        .oracle-markdown strong { color: #f5f5f0; font-weight: 700; }
        .oracle-markdown em { color: rgba(245, 245, 240, 0.95); }
        .oracle-markdown a { color: #c9a84c; text-decoration: underline; }
        .oracle-markdown ul,
        .oracle-markdown ol {
          padding-left: 1.4em;
          margin: 0 0 0.9em 0;
        }
        .oracle-markdown li {
          margin-bottom: 0.35em;
        }
        .oracle-markdown ul li::marker { color: #c9a84c; }
        .oracle-markdown ol li::marker { color: #c9a84c; font-weight: 700; }
        .oracle-markdown blockquote {
          border-left: 3px solid #c9a84c;
          padding: 0.2em 0.9em;
          margin: 0.9em 0;
          color: rgba(245, 245, 240, 0.7);
          background: rgba(201, 168, 76, 0.05);
          border-radius: 4px;
        }
        .oracle-markdown code {
          background: rgba(255, 255, 255, 0.06);
          color: #c9a84c;
          padding: 0.1em 0.35em;
          border-radius: 4px;
          font-size: 0.9em;
        }
        .oracle-markdown pre {
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 8px;
          padding: 0.8em;
          overflow-x: auto;
          margin: 0.9em 0;
        }
        .oracle-markdown pre code {
          background: transparent;
          color: rgba(245, 245, 240, 0.85);
          padding: 0;
        }
        .oracle-markdown hr {
          border: none;
          border-top: 1px solid rgba(201, 168, 76, 0.2);
          margin: 1.5em 0;
        }
        .oracle-markdown table {
          width: 100%;
          border-collapse: collapse;
          margin: 0.9em 0;
        }
        .oracle-markdown th,
        .oracle-markdown td {
          border: 1px solid rgba(255, 255, 255, 0.08);
          padding: 0.5em 0.7em;
          text-align: left;
        }
        .oracle-markdown th {
          background: rgba(201, 168, 76, 0.1);
          color: #c9a84c;
          font-weight: 700;
        }
      `}</style>
    </div>
  )
}
