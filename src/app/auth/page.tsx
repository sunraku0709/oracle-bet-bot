'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PLANS, getPlanById, type PlanId } from '@/lib/plans'

function PlanPicker({ selected, onSelect }: { selected: PlanId; onSelect: (p: PlanId) => void }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-400 mb-3 tracking-widest text-center" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
        CHOISISSEZ VOTRE FORFAIT
      </p>
      <div className="grid grid-cols-3 gap-2">
        {(['starter', 'standard', 'premium'] as PlanId[]).map((planId) => {
          const plan = PLANS[planId]
          const isSelected = selected === planId
          return (
            <button
              key={planId}
              type="button"
              onClick={() => onSelect(planId)}
              className="flex flex-col items-center p-3 rounded-xl border transition-all text-center"
              style={{
                borderColor: isSelected ? plan.color : 'rgba(255,255,255,0.08)',
                background: isSelected ? `${plan.color}15` : 'rgba(255,255,255,0.03)',
              }}
            >
              <span className="text-xs font-bold tracking-widest" style={{ color: plan.color, fontFamily: "'Rajdhani', sans-serif" }}>
                {plan.name}
              </span>
              <span className="text-base font-bold mt-1" style={{ color: isSelected ? plan.color : 'rgba(255,255,255,0.7)', fontFamily: "'Bebas Neue', sans-serif" }}>
                {plan.priceLabel}
              </span>
              <span className="text-[10px] text-gray-500 mt-0.5" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                {plan.analysesPerDay === null ? '∞/jr' : `${plan.analysesPerDay}/jr`}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function AuthContent() {
  const searchParams = useSearchParams()
  const initialMode = searchParams.get('mode') === 'register' ? 'register' : 'login'
  const initialPlan = getPlanById(searchParams.get('plan'))

  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(initialPlan)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  // Keep plan in sync when URL changes
  useEffect(() => {
    const plan = searchParams.get('plan')
    if (plan) setSelectedPlan(getPlanById(plan))
    if (searchParams.get('mode') === 'register') setMode('register')
  }, [searchParams])

  const redirectToCheckout = async (planId: PlanId) => {
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: planId }),
    })
    const data = await res.json()
    if (data.url) {
      window.location.href = data.url
    } else {
      router.push('/dashboard')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'register') {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || "Erreur lors de l'inscription." })
        setLoading(false)
        return
      }
      // Auto sign-in
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
      if (signInError) {
        setMessage({ type: 'success', text: 'Compte créé ! Connectez-vous maintenant.' })
        setMode('login')
        setLoading(false)
        return
      }
      // Redirect to Stripe checkout with selected plan
      await redirectToCheckout(selectedPlan)
      return
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage({ type: 'error', text: 'Email ou mot de passe incorrect.' })
        setLoading(false)
        return
      }
      // If a plan was passed in URL, go to checkout; otherwise dashboard
      const planParam = searchParams.get('plan')
      if (planParam) {
        await redirectToCheckout(getPlanById(planParam))
      } else {
        router.push('/dashboard')
      }
      return
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col items-center justify-center px-4">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#C9A84C 1px, transparent 1px), linear-gradient(90deg, #C9A84C 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Logo */}
      <Link href="/" className="mb-8 group">
        <span className="font-bebas text-3xl tracking-widest" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          <span style={{ color: '#C9A84C' }}>⚡ ORACLE</span>
          <span className="text-white"> BET</span>
        </span>
      </Link>

      {/* Card */}
      <div className="card-dark rounded-2xl p-8 w-full max-w-md relative z-10">
        {/* Tabs */}
        <div className="flex mb-8 bg-white/5 rounded-xl p-1">
          <button
            onClick={() => { setMode('login'); setMessage(null) }}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm tracking-widest transition-all ${
              mode === 'login' ? 'btn-gold' : 'text-gray-400 hover:text-white'
            }`}
            style={{ fontFamily: "'Rajdhani', sans-serif" }}
          >
            CONNEXION
          </button>
          <button
            onClick={() => { setMode('register'); setMessage(null) }}
            className={`flex-1 py-2.5 rounded-lg font-semibold text-sm tracking-widest transition-all ${
              mode === 'register' ? 'btn-gold' : 'text-gray-400 hover:text-white'
            }`}
            style={{ fontFamily: "'Rajdhani', sans-serif" }}
          >
            INSCRIPTION
          </button>
        </div>

        <h1
          className="text-3xl text-center mb-2"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em', color: '#C9A84C' }}
        >
          {mode === 'login' ? 'BIENVENUE' : 'CRÉER UN COMPTE'}
        </h1>
        <p className="text-gray-400 text-center mb-6 text-sm" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          {mode === 'login' ? 'Accédez à vos analyses IA' : "Choisissez votre forfait et commencez"}
        </p>

        {/* Plan picker — only on register */}
        {mode === 'register' && (
          <PlanPicker selected={selectedPlan} onSelect={setSelectedPlan} />
        )}

        {/* Login: plan reminder if plan in URL */}
        {mode === 'login' && searchParams.get('plan') && (
          <div className="mb-4 p-3 rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/5 text-center">
            <p className="text-xs text-[#C9A84C]" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              Connectez-vous pour activer le plan <strong>{PLANS[getPlanById(searchParams.get('plan'))].name}</strong> — {PLANS[getPlanById(searchParams.get('plan'))].priceLabel}/mois
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2 tracking-wider" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              ADRESSE EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C] transition-colors"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2 tracking-wider" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              MOT DE PASSE
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C] transition-colors"
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            />
          </div>

          {message && (
            <div
              className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-green-500/10 border border-green-500/30 text-green-400'}`}
              style={{ fontFamily: "'Rajdhani', sans-serif" }}
            >
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full py-3.5 rounded-xl text-sm tracking-widest disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            style={{ fontFamily: "'Rajdhani', sans-serif" }}
          >
            {loading
              ? 'CHARGEMENT...'
              : mode === 'login'
              ? 'SE CONNECTER'
              : `S'INSCRIRE · ${PLANS[selectedPlan].priceLabel}/mois`}
          </button>
        </form>

        {mode === 'register' && (
          <p className="mt-6 text-xs text-gray-500 text-center" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            En vous inscrivant, vous acceptez nos{' '}
            <Link href="#" className="text-[#C9A84C] hover:underline">Conditions d&apos;utilisation</Link>{' '}
            et notre{' '}
            <Link href="#" className="text-[#C9A84C] hover:underline">Politique de confidentialité</Link>.
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-gray-600" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            ⚠️ Les paris sportifs comportent des risques. +18 uniquement.
          </p>
        </div>
      </div>

      <Link href="/" className="mt-6 text-gray-500 hover:text-[#C9A84C] text-sm transition-colors" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
        ← Retour à l&apos;accueil
      </Link>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#C9A84C]" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Chargement...</div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  )
}
