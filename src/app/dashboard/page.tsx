'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PLANS, getPlanById, type PlanId } from '@/lib/plans'
import DashboardInstallCard from '@/components/DashboardInstallCard'
import AnalysisReport, { parseAnalysisResult } from '@/components/AnalysisReport'
import AnalysisLoader from '@/components/AnalysisLoader'

type Analysis = {
  id: string
  home_team: string
  away_team: string
  sport: string
  competition: string
  match_date: string
  result: string
  created_at: string
}

type SubscriptionInfo = {
  plan: PlanId
  analyses_used: number
  analyses_today: number
  current_period_end: string | null
  stripe_subscription_id: string | null
}

function CancelModal({ onConfirm, onClose, loading }: {
  onConfirm: () => void
  onClose: () => void
  loading: boolean
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}>
      <div className="glass-card rounded-2xl p-8 max-w-sm w-full relative"
        style={{ border: '1px solid rgba(239,68,68,0.3)' }}>
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
          </div>
          <h3 className="text-xl text-white mb-2" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
            RÉSILIER L&apos;ABONNEMENT
          </h3>
          <p className="text-white/50 text-sm leading-relaxed">
            Votre abonnement sera annulé <strong className="text-white/70">immédiatement</strong>. Vous perdrez l&apos;accès aux analyses dès maintenant.
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold tracking-wider text-white/60 hover:text-white border border-white/10 hover:border-white/25 transition-all disabled:opacity-40">
            ANNULER
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-3 rounded-xl text-sm font-semibold tracking-wider transition-all disabled:opacity-40"
            style={{ background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.4)', color: '#EF4444' }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                EN COURS...
              </span>
            ) : 'OUI, RÉSILIER'}
          </button>
        </div>
      </div>
    </div>
  )
}

const SPORTS = [
  { value: 'Football', competitions: ['Ligue 1', 'Premier League', 'Champions League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue Europa', 'Autre'] },
  { value: 'Basketball', competitions: ['NBA', 'Euroleague', 'Pro A', 'Autre'] },
  { value: 'Tennis', competitions: ['Roland Garros', 'Wimbledon', 'US Open', 'Australian Open', 'ATP 1000', 'ATP 500', 'WTA', 'Autre'] },
]

function UsageBadge({ sub }: { sub: SubscriptionInfo }) {
  const plan = PLANS[sub.plan]
  const limit = plan.analysesPerDay
  const used = sub.analyses_today || 0

  if (limit === null) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold tracking-widest"
        style={{ background: 'rgba(201,168,76,0.1)', color: '#C9A84C', border: '1px solid rgba(201,168,76,0.25)' }}>
        ∞ ILLIMITÉ · {plan.name}
      </span>
    )
  }

  const remaining = limit - used
  const pct = Math.min((used / limit) * 100, 100)
  const color = remaining === 0 ? '#EF4444' : remaining === 1 ? '#F59E0B' : '#C9A84C'

  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs font-semibold" style={{ color: '#C9A84C' }}>{plan.name}</span>
      <div className="w-16 h-1 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>
        {remaining}/{limit}/jr
      </span>
    </div>
  )
}

function DashboardContent() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [analyses, setAnalyses] = useState<Analysis[]>([])
  const [selectedAnalysis, setSelectedAnalysis] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new')
  const [showCancelModal, setShowCancelModal] = useState(false)
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()

  const [sport, setSport] = useState('Football')
  const [competition, setCompetition] = useState('Champions League')
  const [homeTeam, setHomeTeam] = useState('')
  const [awayTeam, setAwayTeam] = useState('')
  const [matchDate, setMatchDate] = useState(new Date().toISOString().split('T')[0])
  const [oddsHome, setOddsHome] = useState('')
  const [oddsDraw, setOddsDraw] = useState('')
  const [oddsAway, setOddsAway] = useState('')
  const [result, setResult] = useState('')
  const [error, setError] = useState('')

  const resultRef = useRef<HTMLDivElement>(null)

  const refreshSubscription = async (userId: string) => {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, analyses_used, current_period_end, status, stripe_subscription_id')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (sub) {
      const todayStart = new Date()
      todayStart.setHours(0, 0, 0, 0)
      const { count } = await supabase
        .from('analyses')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .gte('created_at', todayStart.toISOString())

      setSubscription({
        plan: getPlanById(sub.plan),
        analyses_used: sub.analyses_used || 0,
        analyses_today: count ?? 0,
        current_period_end: sub.current_period_end,
        stripe_subscription_id: sub.stripe_subscription_id ?? null,
      })
    } else {
      setSubscription(null)
    }
  }

  const handleCancelSubscription = async () => {
    setCancelLoading(true)
    setCancelError('')
    try {
      const res = await fetch('/api/stripe/cancel', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setCancelError(data.error || 'Erreur lors de la résiliation.')
        setCancelLoading(false)
        return
      }
      setShowCancelModal(false)
      setSubscription(null)
    } catch {
      setCancelError('Erreur réseau. Veuillez réessayer.')
      setCancelLoading(false)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)
      await refreshSubscription(user.id)
      const { data: hist } = await supabase
        .from('analyses').select('*').eq('user_id', user.id)
        .order('created_at', { ascending: false }).limit(30)
      if (hist) setAnalyses(hist)
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setTimeout(() => { if (user) refreshSubscription(user.id) }, 2000)
    }
  }, [searchParams, user])

  const handleSportChange = (s: string) => {
    setSport(s)
    setCompetition(SPORTS.find(x => x.value === s)?.competitions[0] || '')
  }

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!homeTeam.trim() || !awayTeam.trim()) { setError('Veuillez renseigner les deux équipes.'); return }
    setError(''); setAnalysisLoading(true); setResult('')

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeTeam, awayTeam, sport, competition, matchDate, oddsHome, oddsDraw, oddsAway }),
      })
      const data = await res.json()

      if (!res.ok) {
        if (res.status === 403 && data.limitReached) {
          setError(`Limite atteinte (${data.used}/${data.limit} analyses aujourd'hui). Passez au plan supérieur.`)
        } else if (res.status === 403) {
          setError('Abonnement requis.')
        } else {
          setError(data.error || 'Erreur lors de l\'analyse.')
        }
        return
      }

      setResult(data.result)
      if (user) await refreshSubscription(user.id)

      const { data: hist } = await supabase
        .from('analyses').select('*').eq('user_id', user!.id)
        .order('created_at', { ascending: false }).limit(30)
      if (hist) setAnalyses(hist)

      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
    } finally {
      setAnalysisLoading(false)
    }
  }

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const getScoreBadge = (result: string) => {
    const data = parseAnalysisResult(result)
    const cls = data?.classification
      ?? (result.includes('GOLD') ? 'GOLD' : result.includes('SILVER') ? 'SILVER' : result.includes('NO BET') ? 'NO BET' : null)
    if (cls === 'GOLD')   return { label: 'GOLD',   color: '#C9A84C' }
    if (cls === 'SILVER') return { label: 'SILVER', color: '#9CA3AF' }
    if (cls === 'NO BET') return { label: 'NO BET', color: '#EF4444' }
    return null
  }

  const canAnalyze = () => {
    if (!subscription) return false
    const limit = PLANS[subscription.plan].analysesPerDay
    if (limit === null) return true
    return (subscription.analyses_today || 0) < limit
  }

  const inputClass = "w-full bg-white/[0.04] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/25 focus:outline-none focus:border-[#C9A84C]/60 focus:bg-white/[0.06] transition-all text-sm"
  const labelClass = "block text-xs font-semibold text-white/40 mb-2 tracking-widest uppercase"

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#C9A84C] text-sm">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">

      {/* Cancel confirmation modal */}
      {showCancelModal && (
        <CancelModal
          onConfirm={handleCancelSubscription}
          onClose={() => { setShowCancelModal(false); setCancelError('') }}
          loading={cancelLoading}
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/[0.06] px-4 md:px-6 py-3"
        style={{ background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(20px)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" className="text-2xl tracking-widest flex-shrink-0"
            style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
            <span className="gold-gradient">⚡ ORACLE</span>
            <span className="text-white"> BET</span>
          </Link>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            {subscription && <UsageBadge sub={subscription} />}

            <span className="hidden md:block text-white/25 text-xs">{user?.email}</span>

            {!subscription && (
              <Link href="/auth?mode=register" className="btn-gold px-4 py-2 rounded-lg text-xs tracking-widest">
                S&apos;ABONNER
              </Link>
            )}
            {subscription && PLANS[subscription.plan].analysesPerDay !== null &&
              (subscription.analyses_today || 0) >= (PLANS[subscription.plan].analysesPerDay ?? 0) && (
              <Link href="/auth?mode=register" className="btn-gold px-4 py-2 rounded-lg text-xs tracking-widest animate-pulse-gold">
                UPGRADE
              </Link>
            )}

            <button
              onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
              className="btn-outline-gold px-4 py-2 rounded-lg text-xs tracking-widest">
              DÉCONNEXION
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-8">

        {/* Success banner */}
        {searchParams.get('success') === 'true' && (
          <div className="mb-6 p-4 bg-emerald-500/8 border border-emerald-500/25 rounded-xl text-center">
            <p className="text-emerald-400 font-semibold text-sm">
              ✓ Abonnement activé ! Vous pouvez maintenant lancer vos analyses.
            </p>
          </div>
        )}

        {/* No subscription banner */}
        {!subscription && (
          <div className="mb-6 p-5 glass-card rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 border-[#C9A84C]/25">
            <div>
              <p className="font-semibold text-[#C9A84C] text-sm">⚡ Choisissez votre plan pour accéder aux analyses</p>
              <p className="text-white/35 text-xs mt-1">Starter 4,99€ · Standard 9,99€ · Premium 19,99€/mois</p>
            </div>
            <Link href="/auth?mode=register" className="btn-gold px-6 py-2.5 rounded-lg text-xs tracking-widest whitespace-nowrap">
              VOIR LES PLANS
            </Link>
          </div>
        )}

        <DashboardInstallCard />

        {/* Tabs */}
        <div className="flex gap-1.5 mb-8 bg-white/[0.03] rounded-xl p-1 border border-white/[0.05] w-fit">
          {(['new', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-lg text-xs font-semibold tracking-widest transition-all ${activeTab === tab ? 'btn-gold' : 'text-white/40 hover:text-white'}`}>
              {tab === 'new' ? 'NOUVELLE ANALYSE' : `HISTORIQUE (${analyses.length})`}
            </button>
          ))}
        </div>

        {/* ── New analysis tab ── */}
        {activeTab === 'new' && (
          <div className="grid md:grid-cols-2 gap-6">

            {/* Form */}
            <div className="glass-card rounded-2xl p-6">
              <h2 className="text-2xl mb-6 gold-gradient"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
                ANALYSER UN MATCH
              </h2>

              <form onSubmit={handleAnalyze} className="space-y-4">
                {/* Sport */}
                <div>
                  <label className={labelClass}>Sport</label>
                  <div className="flex gap-2">
                    {SPORTS.map(s => (
                      <button key={s.value} type="button" onClick={() => handleSportChange(s.value)}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-semibold tracking-wider transition-all ${sport === s.value ? 'btn-gold' : 'bg-white/[0.04] text-white/40 hover:text-white border border-white/8'}`}>
                        {s.value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Competition */}
                <div>
                  <label className={labelClass}>Compétition</label>
                  <select value={competition} onChange={e => setCompetition(e.target.value)} className={inputClass}
                    style={{ colorScheme: 'dark' }}>
                    {SPORTS.find(s => s.value === sport)?.competitions.map(c => (
                      <option key={c} value={c} className="bg-[#1a1a1a]">{c}</option>
                    ))}
                  </select>
                </div>

                {/* Teams */}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'DOMICILE', value: homeTeam, setter: setHomeTeam, ph: 'Ex: PSG' },
                    { label: 'EXTÉRIEUR', value: awayTeam, setter: setAwayTeam, ph: 'Ex: Bayern' },
                  ].map(({ label, value, setter, ph }) => (
                    <div key={label}>
                      <label className={labelClass}>{label}</label>
                      <input type="text" value={value} onChange={e => setter(e.target.value)}
                        placeholder={ph} className={inputClass} />
                    </div>
                  ))}
                </div>

                {/* Date */}
                <div>
                  <label className={labelClass}>Date du match</label>
                  <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)}
                    className={inputClass} style={{ colorScheme: 'dark' }} />
                </div>

                {/* Odds */}
                <div>
                  <label className={labelClass}>
                    Cotes <span className="text-white/20 normal-case font-normal">(optionnel)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { ph: '1 (Dom.)', val: oddsHome, set: setOddsHome },
                      { ph: 'X (Nul)', val: oddsDraw, set: setOddsDraw },
                      { ph: '2 (Ext.)', val: oddsAway, set: setOddsAway },
                    ].map(({ ph, val, set }) => (
                      <input key={ph} type="text" value={val} onChange={e => set(e.target.value)}
                        placeholder={ph}
                        className="bg-white/[0.04] border border-white/8 rounded-xl px-3 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-[#C9A84C]/60 transition-all text-sm" />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/8 border border-red-500/25 rounded-xl text-red-400 text-xs">
                    {error}
                    {error.includes('Limite') && (
                      <Link href="/auth?mode=register" className="ml-2 underline text-[#C9A84C]">→ Upgrader</Link>
                    )}
                  </div>
                )}

                <button type="submit" disabled={analysisLoading || !canAnalyze()}
                  className="btn-gold w-full py-4 rounded-xl text-xs tracking-widest disabled:opacity-40 disabled:cursor-not-allowed">
                  {analysisLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                      ANALYSE EN COURS...
                    </span>
                  ) : canAnalyze() ? '⚡ LANCER L\'ANALYSE IA' : 'LIMITE JOURNALIÈRE ATTEINTE'}
                </button>

                {!canAnalyze() && subscription && (
                  <p className="text-center text-xs text-[#C9A84C]">
                    <Link href="/auth?mode=register" className="underline">Passer au plan supérieur →</Link>
                  </p>
                )}
              </form>
            </div>

            {/* Result */}
            <div ref={resultRef} className="glass-card rounded-2xl p-6 flex flex-col min-h-[400px]">
              <h2 className="text-2xl mb-4 gold-gradient"
                style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
                RAPPORT D&apos;ANALYSE
              </h2>

              {analysisLoading && <AnalysisLoader />}

              {!analysisLoading && result && (
                <div className="flex-1 overflow-y-auto">
                  <AnalysisReport result={result} homeTeam={homeTeam} awayTeam={awayTeam}
                    competition={competition} matchDate={matchDate} />
                </div>
              )}

              {!analysisLoading && !result && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-white/20">
                    <div className="text-5xl mb-4 opacity-20">⚡</div>
                    <p className="text-sm">
                      {subscription ? 'Remplissez le formulaire et lancez une analyse' : 'Abonnez-vous pour accéder aux analyses'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── History tab ── */}
        {activeTab === 'history' && (
          <div>
            <h2 className="text-2xl mb-6 gold-gradient"
              style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
              HISTORIQUE DES ANALYSES
            </h2>

            {analyses.length === 0 ? (
              <div className="glass-card rounded-2xl p-12 text-center text-white/20">
                <div className="text-4xl mb-4 opacity-20">📊</div>
                <p className="text-sm">Aucune analyse réalisée pour le moment</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {analyses.map(a => {
                  const badge = getScoreBadge(a.result)
                  const isOpen = selectedAnalysis === a.id
                  return (
                    <button key={a.id} onClick={() => setSelectedAnalysis(isOpen ? null : a.id)}
                      className={`glass-card rounded-xl p-4 text-left w-full transition-all ${isOpen ? 'border-[#C9A84C]/35' : 'hover:border-[#C9A84C]/20'}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-white text-sm">
                            {a.home_team} vs {a.away_team}
                          </p>
                          <p className="text-white/30 text-xs mt-0.5">
                            {a.competition} · {formatDate(a.match_date)} · analysé le {formatDate(a.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {badge && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold"
                              style={{ color: badge.color, border: `1px solid ${badge.color}35` }}>
                              {badge.label}
                            </span>
                          )}
                          <span className="text-[#C9A84C] text-[10px] px-2 py-0.5 bg-white/[0.04] rounded border border-white/8">
                            {a.sport}
                          </span>
                          <span className="text-white/25 text-xs">{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="mt-4 pt-4 border-t border-white/[0.06] text-left"
                          onClick={e => e.stopPropagation()}>
                          <AnalysisReport result={a.result} homeTeam={a.home_team} awayTeam={a.away_team}
                            competition={a.competition} matchDate={a.match_date} />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="border-t border-white/[0.05] px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/20 text-center sm:text-left">
            ⚠️ Les paris sportifs comportent des risques. Jouez de manière responsable. Interdit aux mineurs. Joueurs Info Service : 09 74 75 13 13
          </p>
          {subscription && (
            <div className="flex flex-col items-end gap-1 shrink-0">
              {cancelError && (
                <p className="text-red-400 text-xs">{cancelError}</p>
              )}
              <button
                onClick={() => { setCancelError(''); setShowCancelModal(true) }}
                className="text-xs text-white/25 hover:text-red-400 transition-colors underline underline-offset-2"
              >
                Se désabonner
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="text-[#C9A84C] text-sm">Chargement...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
