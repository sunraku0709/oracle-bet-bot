'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { PLANS, type PlanId } from '@/lib/plans'

function CheckIcon({ color }: { color: string }) {
  return <span style={{ color }} className="text-lg flex-shrink-0 font-bold">✓</span>
}

function PlanCard({
  planId,
  isLoading,
  currentPlan,
  onSubscribe,
}: {
  planId: PlanId
  isLoading: string | null
  currentPlan: string | null
  onSubscribe: (planId: PlanId) => void
}) {
  const plan = PLANS[planId]
  const isActive = currentPlan === planId
  const isBusy = isLoading === planId

  return (
    <div
      className={`relative card-dark rounded-2xl p-6 md:p-8 flex flex-col transition-all duration-300 ${
        plan.badge === 'POPULAIRE'
          ? 'border-[#C9A84C] gold-glow scale-[1.02]'
          : plan.badge === 'MEILLEUR CHOIX'
          ? 'border-[#AAFF00]/40'
          : 'border-white/10'
      }`}
    >
      {/* Badge */}
      {plan.badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold tracking-widest"
          style={{
            backgroundColor: plan.badge === 'POPULAIRE' ? '#C9A84C' : '#AAFF00',
            color: '#0A0A0A',
            fontFamily: "'Rajdhani', sans-serif",
          }}
        >
          {plan.badge}
        </div>
      )}

      {/* Plan name */}
      <div className="text-center mb-6">
        <p className="text-xs font-semibold tracking-widest mb-2" style={{ color: plan.color, fontFamily: "'Rajdhani', sans-serif" }}>
          {plan.name}
        </p>
        <div className="flex items-end justify-center gap-1">
          <span className="text-5xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", color: plan.color, letterSpacing: '0.05em' }}>
            {plan.priceLabel}
          </span>
          <span className="text-gray-400 mb-1.5 text-sm" style={{ fontFamily: "'Rajdhani', sans-serif" }}>/mois</span>
        </div>
        <p className="text-xs text-gray-500 mt-1" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          {plan.analysesPerDay === null
            ? 'Analyses & pronostics illimités'
            : `${plan.analysesPerDay} analyse${plan.analysesPerDay > 1 ? 's' : ''}/jour · pronostics inclus`}
        </p>
      </div>

      {/* Features */}
      <ul className="space-y-2.5 mb-8 flex-1">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2.5" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            <CheckIcon color={plan.color} />
            <span className="text-gray-300 text-sm">{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isActive ? (
        <div className="w-full py-3.5 rounded-xl text-sm font-bold tracking-widest text-center border border-[#AAFF00]/40 text-[#AAFF00]"
          style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          ✓ PLAN ACTUEL
        </div>
      ) : (
        <button
          onClick={() => onSubscribe(planId)}
          disabled={!!isLoading}
          className="w-full py-3.5 rounded-xl text-sm font-bold tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            background: plan.badge === 'POPULAIRE'
              ? 'linear-gradient(135deg, #C9A84C, #F0D080)'
              : plan.badge === 'MEILLEUR CHOIX'
              ? 'linear-gradient(135deg, #AAFF00, #88DD00)'
              : 'rgba(255,255,255,0.08)',
            color: plan.badge ? '#0A0A0A' : '#FFFFFF',
            border: plan.badge ? 'none' : '1px solid rgba(255,255,255,0.15)',
          }}
        >
          {isBusy ? 'REDIRECTION...' : 'CHOISIR CE PLAN'}
        </button>
      )}
    </div>
  )
}

function AbonnementContent() {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const [currentPlan, setCurrentPlan] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        supabase.from('subscriptions')
          .select('plan, status')
          .eq('user_id', data.user.id)
          .eq('status', 'active')
          .single()
          .then(({ data: sub }) => {
            if (sub) setCurrentPlan(sub.plan)
          })
      }
    })
  }, [])

  const handleSubscribe = async (planId: PlanId) => {
    if (!user) {
      window.location.href = `/auth?plan=${planId}&mode=register`
      return
    }

    setIsLoading(planId)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })
      const data = await res.json()

      if (!res.ok) {
        alert(data.error || 'Erreur lors de la création du paiement')
        return
      }
      if (data.url) window.location.href = data.url
    } catch {
      alert('Erreur réseau. Veuillez réessayer.')
    } finally {
      setIsLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#C9A84C 1px, transparent 1px), linear-gradient(90deg, #C9A84C 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-[#C9A84C]/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" style={{ fontFamily: "'Bebas Neue', sans-serif" }} className="text-2xl tracking-widest">
          <span style={{ color: '#C9A84C' }}>⚡ ORACLE</span>
          <span className="text-white"> BET</span>
        </Link>
        <Link
          href={user ? '/dashboard' : '/auth'}
          className="btn-outline-gold px-4 py-2 rounded-lg text-sm tracking-widest"
        >
          {user ? 'DASHBOARD' : 'CONNEXION'}
        </Link>
      </header>

      <main className="flex-1 px-4 py-16 relative z-10">
        {canceled && (
          <div className="mb-8 max-w-4xl mx-auto p-4 bg-orange-500/10 border border-orange-500/30 rounded-xl text-orange-400 text-sm text-center"
            style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            Paiement annulé. Vous pouvez réessayer à tout moment.
          </div>
        )}

        {/* Title */}
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full border border-[#AAFF00]/40 text-[#AAFF00] text-xs font-semibold tracking-widest mb-4"
            style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            CHOISISSEZ VOTRE PLAN
          </span>
          <h1 className="text-4xl md:text-6xl mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
            ANALYSES IA POUR
            <br />
            <span style={{ color: '#C9A84C' }}>TOUS LES BUDGETS</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            Sans engagement · Résiliable à tout moment · Paiement sécurisé Stripe
          </p>
        </div>

        {/* 3 Plan cards */}
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {(['essential', 'premium', 'unlimited'] as PlanId[]).map(planId => (
            <PlanCard
              key={planId}
              planId={planId}
              isLoading={isLoading}
              currentPlan={currentPlan}
              onSubscribe={handleSubscribe}
            />
          ))}
        </div>

        {/* Comparison note */}
        <div className="mt-10 max-w-5xl mx-auto">
          <div className="card-dark rounded-xl p-6">
            <h3 className="text-center text-lg mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#C9A84C', letterSpacing: '0.05em' }}>
              TOUS LES PLANS INCLUENT
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              {[
                { icon: '🏆', text: 'Football, Basketball, Tennis' },
                { icon: '📊', text: 'Rapport 10 points structuré' },
                { icon: '🎯', text: 'Classification GOLD / SILVER / NO BET' },
                { icon: '🔒', text: 'Dashboard sécurisé 24h/24' },
              ].map((item, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-gray-400 text-xs" style={{ fontFamily: "'Rajdhani', sans-serif" }}>{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Legal */}
        <div className="mt-8 max-w-2xl mx-auto text-center space-y-3">
          <p className="text-xs text-gray-600" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            Les performances passées ne garantissent pas les performances futures. Les analyses sont fournies à titre informatif uniquement.
          </p>
          <div className="p-4 border border-orange-500/30 rounded-xl bg-orange-500/5">
            <p className="text-xs text-orange-400" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              ⚠️ Les paris sportifs comportent des risques. Jouez de manière responsable.
              Interdit aux mineurs de moins de 18 ans. Joueurs Info Service : 09 74 75 13 13
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function AbonnementPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-[#C9A84C]" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Chargement...</div>
      </div>
    }>
      <AbonnementContent />
    </Suspense>
  )
}
