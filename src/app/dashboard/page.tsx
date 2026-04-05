'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PLANS, getPlanById, type PlanId } from '@/lib/plans'

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
  current_period_end: string | null
}

const SPORTS = [
  { value: 'Football', competitions: ['Ligue 1', 'Premier League', 'Champions League', 'La Liga', 'Serie A', 'Bundesliga', 'Ligue Europa', 'Autre'] },
  { value: 'Basketball', competitions: ['NBA', 'Euroleague', 'Pro A', 'Autre'] },
  { value: 'Tennis', competitions: ['Roland Garros', 'Wimbledon', 'US Open', 'Australian Open', 'ATP 1000', 'ATP 500', 'WTA', 'Autre'] },
]

function UsageBadge({ sub }: { sub: SubscriptionInfo }) {
  const plan = PLANS[sub.plan]
  const limit = plan.analysesPerMonth
  const used = sub.analyses_used || 0

  if (limit === null) {
    return (
      <span className="px-3 py-1 rounded-full text-xs font-bold tracking-widest"
        style={{ background: 'rgba(170,255,0,0.1)', color: '#AAFF00', border: '1px solid rgba(170,255,0,0.3)', fontFamily: "'Rajdhani', sans-serif" }}>
        ∞ ILLIMITÉ · {plan.name}
      </span>
    )
  }

  const remaining = limit - used
  const pct = Math.min((used / limit) * 100, 100)
  const color = remaining === 0 ? '#EF4444' : remaining === 1 ? '#F59E0B' : '#AAFF00'

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold" style={{ color: '#C9A84C', fontFamily: "'Rajdhani', sans-serif" }}>
        {plan.name}
      </span>
      <div className="w-20 h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold" style={{ color, fontFamily: "'Rajdhani', sans-serif" }}>
        {remaining}/{limit}
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
      .select('plan, analyses_used, current_period_end, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single()

    if (sub) {
      setSubscription({
        plan: getPlanById(sub.plan),
        analyses_used: sub.analyses_used || 0,
        current_period_end: sub.current_period_end,
      })
    } else {
      setSubscription(null)
    }
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/auth'); return }
      setUser(user)

      await refreshSubscription(user.id)

      const { data: hist } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      if (hist) setAnalyses(hist)
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setTimeout(() => {
        if (user) refreshSubscription(user.id)
      }, 2000)
    }
  }, [searchParams, user])

  const handleSportChange = (s: string) => {
    setSport(s)
    const found = SPORTS.find(x => x.value === s)
    setCompetition(found?.competitions[0] || '')
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
          setError(`Limite atteinte (${data.used}/${data.limit} analyses ce mois). Passez au plan supérieur.`)
        } else if (res.status === 403) {
          setError('Abonnement requis.')
        } else {
          setError(data.error || 'Erreur lors de l\'analyse.')
        }
        return
      }

      setResult(data.result)
      // Refresh subscription counter
      if (user) await refreshSubscription(user.id)

      // Refresh history
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

  const formatDate = (d: string) => new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' })

  const getScoreBadge = (result: string) => {
    if (result.includes('GOLD')) return { label: 'GOLD', color: '#C9A84C' }
    if (result.includes('SILVER')) return { label: 'SILVER', color: '#9CA3AF' }
    if (result.includes('NO BET')) return { label: 'NO BET', color: '#EF4444' }
    return null
  }

  const canAnalyze = () => {
    if (!subscription) return false
    const limit = PLANS[subscription.plan].analysesPerMonth
    if (limit === null) return true
    return subscription.analyses_used < limit
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#C9A84C]" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-[#0A0A0A]/95 backdrop-blur border-b border-[#C9A84C]/10 px-4 md:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <Link href="/" style={{ fontFamily: "'Bebas Neue', sans-serif" }} className="text-2xl tracking-widest flex-shrink-0">
            <span style={{ color: '#C9A84C' }}>⚡ ORACLE</span>
            <span className="text-white"> BET</span>
          </Link>

          <div className="flex items-center gap-3 flex-wrap justify-end">
            {/* Usage display */}
            {subscription && <UsageBadge sub={subscription} />}

            <span className="hidden md:block text-gray-500 text-sm" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              {user?.email}
            </span>

            {!subscription && (
              <Link href="/abonnement" className="btn-gold px-4 py-2 rounded-lg text-xs tracking-widest">
                S&apos;ABONNER
              </Link>
            )}
            {subscription && PLANS[subscription.plan].analysesPerMonth !== null &&
              subscription.analyses_used >= (PLANS[subscription.plan].analysesPerMonth ?? 0) && (
              <Link href="/abonnement" className="btn-gold px-4 py-2 rounded-lg text-xs tracking-widest animate-pulse-gold">
                UPGRADE
              </Link>
            )}

            <button
              onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
              className="btn-outline-gold px-4 py-2 rounded-lg text-xs tracking-widest"
            >
              DÉCONNEXION
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 md:px-6 py-8">
        {/* Success banner */}
        {searchParams.get('success') === 'true' && (
          <div className="mb-6 p-4 bg-[#AAFF00]/10 border border-[#AAFF00]/30 rounded-xl text-center">
            <p className="text-[#AAFF00] font-semibold" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              ✓ Abonnement activé ! Vous pouvez maintenant lancer vos analyses.
            </p>
          </div>
        )}

        {/* No subscription banner */}
        {!subscription && (
          <div className="mb-6 p-4 bg-[#C9A84C]/10 border border-[#C9A84C]/30 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-[#C9A84C]" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                ⚡ Choisissez votre plan pour accéder aux analyses
              </p>
              <p className="text-gray-400 text-sm" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                Starter 4,99€ · Standard 9,99€ · Premium 19,99€/mois
              </p>
            </div>
            <Link href="/abonnement" className="btn-gold px-6 py-2.5 rounded-lg text-sm tracking-widest whitespace-nowrap">
              VOIR LES PLANS
            </Link>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white/[0.03] rounded-xl p-1 border border-white/5 w-fit">
          {(['new', 'history'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-5 py-2.5 rounded-lg text-sm font-semibold tracking-widest transition-all ${activeTab === tab ? 'btn-gold' : 'text-gray-400 hover:text-white'}`}
              style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              {tab === 'new' ? 'NOUVELLE ANALYSE' : `HISTORIQUE (${analyses.length})`}
            </button>
          ))}
        </div>

        {activeTab === 'new' && (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Form */}
            <div className="card-dark rounded-2xl p-6">
              <h2 className="text-2xl mb-6" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em', color: '#C9A84C' }}>
                ANALYSER UN MATCH
              </h2>

              <form onSubmit={handleAnalyze} className="space-y-4">
                {/* Sport selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 tracking-widest" style={{ fontFamily: "'Rajdhani', sans-serif" }}>SPORT</label>
                  <div className="flex gap-2">
                    {SPORTS.map(s => (
                      <button key={s.value} type="button" onClick={() => handleSportChange(s.value)}
                        className={`flex-1 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all ${sport === s.value ? 'btn-gold' : 'bg-white/5 text-gray-400 hover:text-white border border-white/10'}`}
                        style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                        {s.value}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Competition */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 tracking-widest" style={{ fontFamily: "'Rajdhani', sans-serif" }}>COMPÉTITION</label>
                  <select value={competition} onChange={e => setCompetition(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#C9A84C] transition-colors"
                    style={{ fontFamily: "'Rajdhani', sans-serif" }}>
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
                      <label className="block text-xs font-semibold text-gray-400 mb-2 tracking-widest" style={{ fontFamily: "'Rajdhani', sans-serif" }}>{label}</label>
                      <input type="text" value={value} onChange={e => setter(e.target.value)} placeholder={ph}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C] transition-colors"
                        style={{ fontFamily: "'Rajdhani', sans-serif" }} />
                    </div>
                  ))}
                </div>

                {/* Date */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 tracking-widest" style={{ fontFamily: "'Rajdhani', sans-serif" }}>DATE DU MATCH</label>
                  <input type="date" value={matchDate} onChange={e => setMatchDate(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-[#C9A84C] transition-colors"
                    style={{ fontFamily: "'Rajdhani', sans-serif", colorScheme: 'dark' }} />
                </div>

                {/* Odds */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-2 tracking-widest" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                    COTES <span className="text-gray-600 normal-case font-normal">(optionnel)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { ph: '1 (Dom)', val: oddsHome, set: setOddsHome },
                      { ph: 'X (Nul)', val: oddsDraw, set: setOddsDraw },
                      { ph: '2 (Ext)', val: oddsAway, set: setOddsAway },
                    ].map(({ ph, val, set }) => (
                      <input key={ph} type="text" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                        className="bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C] transition-colors text-sm"
                        style={{ fontFamily: "'Rajdhani', sans-serif" }} />
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                    {error}
                    {error.includes('Limite') && (
                      <Link href="/abonnement" className="ml-2 underline text-[#C9A84C]">→ Upgrader</Link>
                    )}
                  </div>
                )}

                <button type="submit" disabled={analysisLoading || !canAnalyze()}
                  className="btn-gold w-full py-4 rounded-xl text-sm tracking-widest disabled:opacity-50 disabled:cursor-not-allowed">
                  {analysisLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
                      ANALYSE EN COURS...
                    </span>
                  ) : canAnalyze() ? '⚡ LANCER L\'ANALYSE IA' : 'LIMITE MENSUELLE ATTEINTE'}
                </button>

                {!canAnalyze() && subscription && (
                  <p className="text-center text-sm text-[#C9A84C]" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                    <Link href="/abonnement" className="underline">Passer au plan supérieur →</Link>
                  </p>
                )}
              </form>
            </div>

            {/* Result */}
            <div ref={resultRef} className="card-dark rounded-2xl p-6 flex flex-col min-h-[400px]">
              <h2 className="text-2xl mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em', color: '#C9A84C' }}>
                RAPPORT D&apos;ANALYSE
              </h2>

              {analysisLoading && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-16 h-16 border-2 border-[#C9A84C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-[#C9A84C] font-semibold" style={{ fontFamily: "'Rajdhani', sans-serif" }}>L&apos;IA analyse le match...</p>
                    <p className="text-gray-500 text-sm mt-1" style={{ fontFamily: "'Rajdhani', sans-serif" }}>20 à 30 secondes</p>
                  </div>
                </div>
              )}

              {!analysisLoading && result && (
                <div className="flex-1 overflow-y-auto">
                  <div className="analysis-output text-gray-200 text-sm leading-relaxed">
                    {result.split('\n').map((line, i) => {
                      if (/^\d+\.\s/.test(line) || /^[A-ZÀÂÆÇÉÈÊËÎÏÔŒÙÛÜ\s]+\s*:/.test(line)) {
                        return <p key={i} className="font-bold mt-4 mb-1" style={{ color: '#C9A84C' }}>{line}</p>
                      }
                      if (line.startsWith('- ') || line.startsWith('• ')) return <p key={i} className="ml-4 text-gray-300">{line}</p>
                      if (line.trim() === '') return <br key={i} />
                      return <p key={i}>{line}</p>
                    })}
                  </div>
                </div>
              )}

              {!analysisLoading && !result && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center text-gray-600">
                    <div className="text-5xl mb-4 opacity-30">⚡</div>
                    <p style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                      {subscription ? 'Remplissez le formulaire et lancez une analyse' : 'Abonnez-vous pour accéder aux analyses'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <h2 className="text-2xl mb-6" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em', color: '#C9A84C' }}>
              HISTORIQUE DES ANALYSES
            </h2>

            {analyses.length === 0 ? (
              <div className="card-dark rounded-2xl p-12 text-center text-gray-600">
                <div className="text-4xl mb-4 opacity-30">📊</div>
                <p style={{ fontFamily: "'Rajdhani', sans-serif" }}>Aucune analyse réalisée pour le moment</p>
              </div>
            ) : (
              <div className="space-y-3">
                {analyses.map(a => {
                  const badge = getScoreBadge(a.result)
                  const isOpen = selectedAnalysis === a.id
                  return (
                    <button key={a.id} onClick={() => setSelectedAnalysis(isOpen ? null : a.id)}
                      className="card-dark rounded-xl p-4 text-left w-full hover:border-[#C9A84C]/40 transition-all">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-white" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                            {a.home_team} vs {a.away_team}
                          </p>
                          <p className="text-gray-500 text-sm" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                            {a.competition} · {formatDate(a.match_date)} · Analysé le {formatDate(a.created_at)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {badge && (
                            <span className="px-2 py-1 rounded text-xs font-bold"
                              style={{ color: badge.color, border: `1px solid ${badge.color}40`, fontFamily: "'Rajdhani', sans-serif" }}>
                              {badge.label}
                            </span>
                          )}
                          <span className="text-[#C9A84C] text-xs px-2 py-1 bg-white/5 rounded" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                            {a.sport}
                          </span>
                          <span className="text-gray-500 text-xs">{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </div>

                      {isOpen && (
                        <div className="mt-4 pt-4 border-t border-white/5 analysis-output text-gray-300 text-sm text-left">
                          {a.result.split('\n').map((line, i) => {
                            if (/^\d+\.\s/.test(line) || /^[A-ZÀÂÆÇÉÈÊËÎÏÔŒÙÛÜ\s]+\s*:/.test(line)) {
                              return <p key={i} className="font-bold mt-4 mb-1" style={{ color: '#C9A84C' }}>{line}</p>
                            }
                            if (line.startsWith('- ') || line.startsWith('• ')) return <p key={i} className="ml-4">{line}</p>
                            if (line.trim() === '') return <br key={i} />
                            return <p key={i}>{line}</p>
                          })}
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

      <footer className="border-t border-white/5 px-6 py-4 text-center">
        <p className="text-xs text-gray-600" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          ⚠️ Les paris sportifs comportent des risques. Jouez de manière responsable. Interdit aux mineurs. Joueurs Info Service : 09 74 75 13 13
        </p>
      </footer>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#C9A84C]" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Chargement...</div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
