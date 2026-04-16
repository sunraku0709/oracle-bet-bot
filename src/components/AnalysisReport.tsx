'use client'

import { useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

type Classification = 'GOLD' | 'SILVER' | 'NO BET'

type SectionItem = { n: number; title: string; content: string }

export type AnalysisData = {
  classification: Classification
  score: number
  probabilities: {
    home: { pct: number; odds: string | null }
    draw: { pct: number; odds: string | null }
    away: { pct: number; odds: string | null }
  }
  sections: SectionItem[]
  verdict: {
    bet: string
    odds: string | null
    edge_pct: number | null
    value_bet: boolean
    top_bets: string[]
  }
}

type Props = {
  result: string
  homeTeam?: string
  awayTeam?: string
  competition?: string
  matchDate?: string
}

// ── Constants ─────────────────────────────────────────────────────────────────

const SECTION_ICONS: Record<number, string> = {
  1: '📈', 2: '⚔️', 3: '🎯', 4: '🚑', 5: '📅',
  6: '🏆', 7: '🎙️', 8: '📊', 9: '🚩', 10: '⚡',
}

const BADGE: Record<Classification, { bg: string; text: string; glow: string }> = {
  'GOLD':   { bg: '#C9A84C', text: '#0a0a0a', glow: 'rgba(201,168,76,0.35)' },
  'SILVER': { bg: '#9CA3AF', text: '#0a0a0a', glow: 'rgba(156,163,175,0.25)' },
  'NO BET': { bg: '#EF4444', text: '#ffffff', glow: 'rgba(239,68,68,0.25)' },
}

function classifColor(c: Classification) {
  return c === 'GOLD' ? '#C9A84C' : c === 'SILVER' ? '#9CA3AF' : '#EF4444'
}

// ── Sub-components ────────────────────────────────────────────────────────────

function ScoreCircle({ score, color }: { score: number; color: string }) {
  const r = 38
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - Math.min(100, Math.max(0, score)) / 100)
  return (
    <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto' }}>
      <svg width="96" height="96" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="48" cy="48" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="7" />
        <circle cx="48" cy="48" r={r} fill="none"
          stroke={color} strokeWidth="7" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.04em' }}>/100</span>
      </div>
    </div>
  )
}

function ProbBar({ label, pct, odds, accent, highlight }: {
  label: string; pct: number; odds: string | null; accent: string; highlight: boolean
}) {
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{
          fontSize: 12, fontWeight: 700,
          color: highlight ? accent : 'rgba(255,255,255,0.55)',
          fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.05em',
        }}>{label}</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {odds && (
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontFamily: "'Rajdhani', sans-serif" }}>@{odds}</span>
          )}
          <span style={{ fontSize: 13, fontWeight: 700, color: highlight ? accent : 'rgba(255,255,255,0.55)', fontFamily: "'Rajdhani', sans-serif" }}>{pct}%</span>
        </div>
      </div>
      <div style={{ height: 5, background: 'rgba(255,255,255,0.07)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${pct}%`, borderRadius: 3,
          background: highlight ? accent : 'rgba(255,255,255,0.12)',
          transition: 'width 0.7s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
    </div>
  )
}

function SectionContent({ text }: { text: string }) {
  const lines = text.split('\n').filter(l => l.trim())
  return (
    <div style={{ fontSize: 13, lineHeight: 1.75, color: 'rgba(255,255,255,0.72)', fontFamily: "'Rajdhani', sans-serif" }}>
      {lines.map((line, i) => {
        if (line.startsWith('- ') || line.startsWith('• ')) {
          return (
            <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 5 }}>
              <span style={{ color: '#C9A84C', flexShrink: 0, marginTop: 1 }}>▸</span>
              <span>{line.replace(/^[-•]\s/, '')}</span>
            </div>
          )
        }
        return <p key={i} style={{ marginBottom: 5 }}>{line}</p>
      })}
    </div>
  )
}

function SectionCard({ section, open, onToggle, shade }: {
  section: SectionItem; open: boolean; onToggle: () => void; shade: boolean
}) {
  const icon = SECTION_ICONS[section.n] ?? '📋'
  return (
    <div style={{
      borderRadius: 10,
      border: open ? '1px solid rgba(201,168,76,0.22)' : '1px solid rgba(255,255,255,0.06)',
      background: shade ? 'rgba(255,255,255,0.025)' : 'rgba(255,255,255,0.015)',
      overflow: 'hidden',
      marginBottom: 6,
      transition: 'border-color 0.2s',
    }}>
      <button onClick={onToggle} style={{
        width: '100%', padding: '12px 14px',
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
      }}>
        <span style={{ fontSize: 15, flexShrink: 0 }}>{icon}</span>
        <span style={{
          flex: 1, fontFamily: "'Rajdhani', sans-serif", fontWeight: 700,
          fontSize: 12, letterSpacing: '0.07em', color: open ? '#C9A84C' : 'rgba(255,255,255,0.8)',
          transition: 'color 0.2s',
        }}>
          {section.n}. {section.title}
        </span>
        <span style={{
          color: open ? '#C9A84C' : 'rgba(255,255,255,0.25)',
          fontSize: 10,
          display: 'inline-block',
          transform: open ? 'rotate(180deg)' : 'none',
          transition: 'transform 0.2s, color 0.2s',
        }}>▼</span>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div style={{ paddingTop: 12 }}>
            <SectionContent text={section.content} />
          </div>
        </div>
      )}
    </div>
  )
}

// ── Legacy text fallback ──────────────────────────────────────────────────────

function LegacyReport({ result }: { result: string }) {
  return (
    <div style={{ fontSize: 13, lineHeight: 1.7, color: 'rgba(255,255,255,0.75)', fontFamily: "'Rajdhani', sans-serif" }}>
      {result.split('\n').map((line, i) => {
        if (/^\d+\.\s/.test(line) || /^[A-ZÀÂÆÇÉÈÊËÎÏÔŒÙÛÜ\s]{4,}\s*:/.test(line))
          return <p key={i} style={{ fontWeight: 700, marginTop: 16, marginBottom: 4, color: '#C9A84C' }}>{line}</p>
        if (line.startsWith('- ') || line.startsWith('• '))
          return <p key={i} style={{ marginLeft: 14 }}>{line}</p>
        if (!line.trim()) return <br key={i} />
        return <p key={i}>{line}</p>
      })}
    </div>
  )
}

// ── JSON parser helpers ───────────────────────────────────────────────────────

export function parseAnalysisResult(result: string): AnalysisData | null {
  try {
    const firstBrace = result.indexOf('{')
    const lastBrace = result.lastIndexOf('}')
    if (firstBrace === -1 || lastBrace === -1 || firstBrace >= lastBrace) return null
    const clean = result.slice(firstBrace, lastBrace + 1)
    const data = JSON.parse(clean) as AnalysisData
    if (!data.classification || !data.sections || !data.verdict) return null
    return data
  } catch {
    return null
  }
}

type DualResult = { mode: 'dual'; deepseek: string; claude: string }

function parseDualResult(result: string): DualResult | null {
  try {
    const data = JSON.parse(result)
    if (data?.mode === 'dual' && data.deepseek && data.claude) return data as DualResult
    return null
  } catch {
    return null
  }
}

// ── Dual analysis view ────────────────────────────────────────────────────────

function SinglePane({ result, homeTeam, awayTeam, competition, matchDate }: Props) {
  const data = parseAnalysisResult(result)
  const [open, setOpen] = useState<Set<number>>(new Set([10]))

  if (!data) return <LegacyReport result={result} />

  const badge = BADGE[data.classification] ?? BADGE['NO BET']
  const accent = classifColor(data.classification)
  const p = data.probabilities
  const maxPct = Math.max(p.home.pct, p.draw.pct, p.away.pct)
  const topLabel = p.home.pct === maxPct ? '1' : p.draw.pct === maxPct ? 'X' : '2'

  const dateDisplay = matchDate
    ? new Date(matchDate + 'T12:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
    : null

  const toggle = (n: number) => setOpen(prev => {
    const next = new Set(prev)
    next.has(n) ? next.delete(n) : next.add(n)
    return next
  })

  return (
    <div>
      <div style={{
        background: 'linear-gradient(135deg,#0f0d04 0%,#0e0e0e 50%,#050814 100%)',
        border: `1px solid ${badge.bg}50`,
        borderRadius: 14,
        padding: '18px 16px 20px',
        marginBottom: 14,
        textAlign: 'center',
        boxShadow: `0 0 40px ${badge.glow}`,
      }}>
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
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', fontFamily: "'Rajdhani', sans-serif", marginBottom: 14, letterSpacing: '0.05em' }}>
            {[competition, dateDisplay].filter(Boolean).join(' · ')}
          </p>
        )}
        <div style={{
          display: 'inline-block',
          background: badge.bg, color: badge.text,
          fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, letterSpacing: '0.14em',
          padding: '5px 28px', borderRadius: 100,
          boxShadow: `0 4px 22px ${badge.glow}`,
        }}>
          {data.classification}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: '0 0 112px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 8px', textAlign: 'center' }}>
          <ScoreCircle score={data.score} color={accent} />
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: "'Rajdhani', sans-serif", marginTop: 7, letterSpacing: '0.07em' }}>CONFIANCE</p>
        </div>
        <div style={{ flex: '1 1 160px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '14px 16px' }}>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: "'Rajdhani', sans-serif", marginBottom: 14, letterSpacing: '0.07em' }}>PROBABILITÉS</p>
          <ProbBar label={`1 — ${homeTeam ?? 'Domicile'}`} pct={p.home.pct} odds={p.home.odds} accent={accent} highlight={topLabel === '1'} />
          <ProbBar label="X — Nul" pct={p.draw.pct} odds={p.draw.odds} accent={accent} highlight={topLabel === 'X'} />
          <ProbBar label={`2 — ${awayTeam ?? 'Extérieur'}`} pct={p.away.pct} odds={p.away.odds} accent={accent} highlight={topLabel === '2'} />
        </div>
      </div>

      <div style={{ marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em' }}>ANALYSE DETAILLEE</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setOpen(new Set(data.sections.map(s => s.n)))} style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em' }}>TOUT OUVRIR</button>
            <button onClick={() => setOpen(new Set())} style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.06em' }}>REPLIER</button>
          </div>
        </div>
        {data.sections.map((section, i) => (
          <SectionCard key={section.n} section={section} shade={i % 2 === 0} open={open.has(section.n)} onToggle={() => toggle(section.n)} />
        ))}
      </div>

      <div style={{ background: 'linear-gradient(135deg,#120f00 0%,#0f0f0f 100%)', border: '1.5px solid rgba(201,168,76,0.45)', borderRadius: 14, padding: '18px 18px 20px', boxShadow: '0 4px 30px rgba(201,168,76,0.12)' }}>
        <p style={{ fontSize: 9, color: 'rgba(201,168,76,0.6)', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.12em', marginBottom: 10 }}>VERDICT FINAL</p>
        <p style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: '#fff', letterSpacing: '0.05em', lineHeight: 1.1, marginBottom: 12 }}>{data.verdict.bet}</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          {data.verdict.odds && (
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Rajdhani', sans-serif", color: '#C9A84C', background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.25)', padding: '3px 10px', borderRadius: 100 }}>Cote {data.verdict.odds}</span>
          )}
          {data.verdict.edge_pct != null && (
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Rajdhani', sans-serif", color: '#AAFF00', background: 'rgba(170,255,0,0.08)', border: '1px solid rgba(170,255,0,0.2)', padding: '3px 10px', borderRadius: 100 }}>Edge +{data.verdict.edge_pct}%</span>
          )}
          {data.verdict.value_bet && (
            <span style={{ fontSize: 11, fontWeight: 700, fontFamily: "'Rajdhani', sans-serif", color: '#fff', background: 'rgba(201,168,76,0.12)', border: '1px solid rgba(201,168,76,0.28)', padding: '3px 10px', borderRadius: 100 }}>VALUE BET</span>
          )}
        </div>
        {data.verdict.top_bets?.length > 0 && (
          <div>
            <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em', marginBottom: 8 }}>TOP PARIS</p>
            <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 7 }}>
              {data.verdict.top_bets.map((bet, i) => (
                <li key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: '#C9A84C', flexShrink: 0, minWidth: 16 }}>{i + 1}.</span>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', fontFamily: "'Rajdhani', sans-serif", lineHeight: 1.5 }}>{bet}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}

function DualAnalysisView({ deepseek, claude, homeTeam, awayTeam, competition, matchDate }: {
  deepseek: string; claude: string; homeTeam?: string; awayTeam?: string; competition?: string; matchDate?: string
}) {
  const [tab, setTab] = useState<'deepseek' | 'claude'>('deepseek')
  const active = tab === 'deepseek' ? deepseek : claude
  const label = tab === 'deepseek' ? 'DeepSeek' : 'Claude'

  const tabStyle = (t: 'deepseek' | 'claude') => ({
    flex: 1,
    padding: '8px 0',
    background: tab === t ? (t === 'deepseek' ? 'rgba(201,168,76,0.15)' : 'rgba(107,154,255,0.15)') : 'transparent',
    border: 'none',
    borderBottom: tab === t ? `2px solid ${t === 'deepseek' ? '#C9A84C' : '#6B9AFF'}` : '2px solid rgba(255,255,255,0.07)',
    color: tab === t ? (t === 'deepseek' ? '#C9A84C' : '#6B9AFF') : 'rgba(255,255,255,0.35)',
    cursor: 'pointer',
    fontFamily: "'Rajdhani', sans-serif",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: '0.08em',
    transition: 'all 0.2s',
  })

  return (
    <div>
      {/* Tab selector */}
      <div style={{ display: 'flex', marginBottom: 16, borderRadius: 10, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.07)' }}>
        <button style={tabStyle('deepseek')} onClick={() => setTab('deepseek')}>⚡ DEEPSEEK</button>
        <button style={tabStyle('claude')} onClick={() => setTab('claude')}>🔵 CLAUDE</button>
      </div>

      <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: "'Rajdhani', sans-serif", letterSpacing: '0.08em', marginBottom: 12, textAlign: 'center' }}>
        ANALYSE {label.toUpperCase()} — Double IA indépendante
      </div>

      <SinglePane result={active} homeTeam={homeTeam} awayTeam={awayTeam} competition={competition} matchDate={matchDate} />
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────

export default function AnalysisReport({ result, homeTeam, awayTeam, competition, matchDate }: Props) {
  const dual = parseDualResult(result)
  if (dual) {
    return (
      <DualAnalysisView
        deepseek={dual.deepseek}
        claude={dual.claude}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        competition={competition}
        matchDate={matchDate}
      />
    )
  }
  return (
    <SinglePane
      result={result}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      competition={competition}
      matchDate={matchDate}
    />
  )
}
