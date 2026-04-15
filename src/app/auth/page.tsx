'use client'

import { useState, useEffect, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { PLANS, getPlanById, type PlanId } from '@/lib/plans'

const ACTIVE_PLANS: PlanId[] = ['starter', 'standard', 'premium']

function PlanPicker({ selected, onSelect }: { selected: PlanId; onSelect: (p: PlanId) => void }) {
  return (
    <div className="mb-6">
      <p className="text-xs font-semibold text-gray-400 mb-3 tracking-widest text-center uppercase">
        Choisissez votre forfait
      </p>
      <div className="grid grid-cols-3 gap-2">
        {ACTIVE_PLANS.map((planId) => {
          const plan = PLANS[planId]
          const isSelected = selected === planId
          return (
            <button
              key={planId}
              type="button"
              onClick={() => onSelect(planId)}
              className="relative flex flex-col items-center p-3 rounded-xl border transition-all text-center"
              style={{
                borderColor: isSelected ? plan.color : 'rgba(255,255,255,0.08)',
                background: isSelected ? `${plan.color}18` : 'rgba(255,255,255,0.03)',
                boxShadow: isSelected ? `0 0 16px ${plan.color}30` : 'none',
              }}
            >
              {plan.badge && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-widest whitespace-nowrap"
                  style={{ backgroundColor: plan.color, color: '#0A0A0A' }}>
                  {plan.badge}
                </span>
              )}
              <span className="text-xs font-bold tracking-widest mt-1" style={{ color: plan.color }}>
                {plan.name}
              </span>
              <span className="text-base font-bold mt-1" style={{ color: isSelected ? plan.color : 'rgba(255,255,255,0.7)', fontFamily: "'Bebas Neue', sans-serif" }}>
                {plan.priceLabel}
              </span>
              <span className="text-[10px] text-gray-500 mt-0.5">
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
  const rawPlan = searchParams.get('plan')
  const initialPlan: PlanId = (ACTIVE_PLANS as string[]).includes(rawPlan ?? '')
    ? (rawPlan as PlanId)
    : 'standard'

  const [mode, setMode] = useState<'login' | 'register'>(initialMode)
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(initialPlan)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  useEffect(() => {
    const plan = searchParams.get('plan')
    if (plan && (ACTIVE_PLANS as string[]).includes(plan)) setSelectedPlan(plan as PlanId)
    if (searchParams.get('mode') === 'register') setMode('register')
  }, [searchParams])

  const redirectToCheckout = async (planId: PlanId) => {
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
      setMessage({
        type: 'error',
        text: data.error || 'Erreur paiement Stripe. Réessayez depuis la page abonnement.',
      })
      setLoading(false)
    } catch {
      setMessage({
        type: 'error',
        text: 'Erreur réseau lors du paiement. Réessayez depuis la page abonnement.',
      })
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      if (mode === 'register') {
        // Step 1: create account (no payment yet)
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
        // Step 2: sign in
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
        if (signInError) {
          setMessage({ type: 'success', text: 'Compte créé ! Connectez-vous maintenant.' })
          setMode('login')
          setLoading(false)
          return
        }
        // Step 3: redirect to Stripe checkout
        await redirectToCheckout(selectedPlan)
      } else {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          const msg = error.message?.toLowerCase() || ''
          if (msg.includes('invalid') || msg.includes('credentials')) {
            setMessage({ type: 'error', text: 'Email ou mot de passe incorrect.' })
          } else if (msg.includes('email') && msg.includes('confirm')) {
            setMessage({ type: 'error', text: 'Email non confirmé. Contactez le support.' })
          } else {
            setMessage({ type: 'error', text: error.message || 'Erreur de connexion.' })
          }
          setLoading(false)
          return
        }
        const planParam = searchParams.get('plan')
        if (planParam && signInData.user) {
          const { data: existingSub } = await supabase
            .from('subscriptions')
            .select('status')
            .eq('user_id', signInData.user.id)
            .eq('status', 'active')
            .single()
          if (existingSub) {
            router.push('/dashboard')
          } else {
            await redirectToCheckout(getPlanById(planParam))
          }
        } else {
          router.push('/dashboard')
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erreur inconnue'
      setMessage({ type: 'error', text: 'Erreur réseau : ' + msg })
      setLoading(false)
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
      {/* Radial glow */}
      <div className="fixed inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(201,168,76,0.06) 0%, transparent 70%)' }} />

      {/* Logo */}
      <Link href="/" className="mb-8 group">
        <span className="font-bebas text-3xl tracking-widest" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          <span className="gold-gradient">⚡ ORACLE</span>
          <span className="text-white"> BET</span>
        </span>
      </Link>

      {/* Card */}
      <div className="glass-card rounded-2xl p-8 w-full max-w-md relative z-10">
        {/* Tabs */}
        <div className="flex mb-8 bg-white/5 rounded-xl p-1">
          {(['login', 'register'] as const).map((m) => (
            <button key={m}
              onClick={() => { setMode(m); setMessage(null) }}
              className={`flex-1 py-2.5 rounded-lg font-semibold text-sm tracking-widest transition-all ${
                mode === m ? 'btn-gold' : 'text-gray-400 hover:text-white'
              }`}>
              {m === 'login' ? 'CONNEXION' : 'INSCRIPTION'}
            </button>
          ))}
        </div>

        <h1 className="text-3xl text-center mb-2 gold-gradient"
          style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
          {mode === 'login' ? 'BIENVENUE' : 'CRÉER UN COMPTE'}
        </h1>
        <p className="text-gray-400 text-center mb-6 text-sm">
          {mode === 'login' ? 'Accédez à vos analyses IA' : 'Compte gratuit · paiement à l\'étape suivante'}
        </p>

        {mode === 'register' && (
          <PlanPicker selected={selectedPlan} onSelect={setSelectedPlan} />
        )}

        {mode === 'login' && searchParams.get('plan') && (
          <div className="mb-4 p-3 rounded-xl border border-[#C9A84C]/30 bg-[#C9A84C]/5 text-center">
            <p className="text-xs text-[#C9A84C]">
              Connectez-vous pour activer le plan{' '}
              <strong>{PLANS[getPlanById(searchParams.get('plan'))].name}</strong>{' '}
              — {PLANS[getPlanById(searchParams.get('plan'))].priceLabel}/mois
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2 tracking-wider uppercase">
              Adresse email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="votre@email.com"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C] transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-2 tracking-wider uppercase">
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#C9A84C] transition-colors"
            />
          </div>

          {message && (
            <div className={`p-3 rounded-lg text-sm ${
              message.type === 'error'
                ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                : 'bg-green-500/10 border border-green-500/30 text-green-400'
            }`}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full py-3.5 rounded-xl text-sm tracking-widest disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading
              ? 'CHARGEMENT...'
              : mode === 'login'
              ? 'SE CONNECTER'
              : 'CRÉER MON COMPTE →'}
          </button>

          {mode === 'register' && !loading && (
            <p className="text-center text-xs text-gray-500">
              Paiement sécurisé Stripe à l&apos;étape suivante
            </p>
          )}
        </form>

        {mode === 'register' && (
          <p className="mt-6 text-xs text-gray-500 text-center">
            En vous inscrivant, vous acceptez nos{' '}
            <Link href="#" className="text-[#C9A84C] hover:underline">CGU</Link>{' '}
            et notre{' '}
            <Link href="#" className="text-[#C9A84C] hover:underline">Politique de confidentialité</Link>.
          </p>
        )}

        <div className="mt-6 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-gray-600">
            ⚠️ Les paris sportifs comportent des risques. +18 uniquement.
          </p>
        </div>
      </div>

      <Link href="/" className="mt-6 text-gray-500 hover:text-[#C9A84C] text-sm transition-colors">
        ← Retour à l&apos;accueil
      </Link>
    </div>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#C9A84C]">Chargement...</div>
      </div>
    }>
      <AuthContent />
    </Suspense>
  )
}
