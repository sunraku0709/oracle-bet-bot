'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'

function AbonnementContent() {
  const [loading, setLoading] = useState(false)
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null)
  const searchParams = useSearchParams()
  const canceled = searchParams.get('canceled')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
    })
  }, [])

  const handleSubscribe = async () => {
    if (!user) {
      window.location.href = '/auth'
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', { method: 'POST' })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } catch {
      alert('Erreur lors de la création du paiement')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    'Analyses illimitées Football, Basketball, Tennis',
    'Rapport structuré en 10 points obligatoires',
    'Classification GOLD / SILVER / NO BET',
    'Probabilités estimées par résultat',
    'Données H2H et forme récente',
    'Absences et contexte physique',
    'Red flags et détection de value bets',
    'Historique complet de vos analyses',
    'Accès dashboard 24h/24 et 7j/7',
    'Support prioritaire',
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* Background grid */}
      <div
        className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: 'linear-gradient(#C9A84C 1px, transparent 1px), linear-gradient(90deg, #C9A84C 1px, transparent 1px)',
          backgroundSize: '50px 50px',
        }}
      />

      {/* Header */}
      <header className="relative z-10 border-b border-[#C9A84C]/10 px-6 py-4 flex items-center justify-between">
        <Link href="/" className="font-bebas text-2xl tracking-widest" style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
          <span style={{ color: '#C9A84C' }}>⚡ ORACLE</span>
          <span className="text-white"> BET</span>
        </Link>
        <Link href={user ? '/dashboard' : '/auth'} className="btn-outline-gold px-4 py-2 rounded-lg text-sm tracking-widest">
          {user ? 'DASHBOARD' : 'CONNEXION'}
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative z-10">
        {canceled && (
          <div className="mb-8 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg text-orange-400 text-sm text-center" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            Paiement annulé. Vous pouvez réessayer à tout moment.
          </div>
        )}

        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full border border-[#AAFF00]/40 text-[#AAFF00] text-xs font-semibold tracking-widest mb-4" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            ACCÈS COMPLET
          </span>
          <h1 className="text-5xl md:text-6xl mb-4" style={{ fontFamily: "'Bebas Neue', sans-serif", letterSpacing: '0.05em' }}>
            UN SEUL ABONNEMENT,
            <br />
            <span style={{ color: '#C9A84C' }}>TOUT EST INCLUS</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-xl mx-auto" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            Accédez à toutes les analyses IA sans restriction. Sans engagement, résiliable à tout moment.
          </p>
        </div>

        {/* Pricing Card */}
        <div className="card-dark rounded-2xl p-8 md:p-10 w-full max-w-md gold-glow animate-pulse-gold relative overflow-hidden">
          {/* Shine effect */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#C9A84C]/5 rounded-full -translate-y-16 translate-x-16" />

          <div className="text-center mb-8">
            <div className="flex items-end justify-center gap-2 mb-2">
              <span className="text-6xl font-bold" style={{ fontFamily: "'Bebas Neue', sans-serif", color: '#C9A84C', letterSpacing: '0.05em' }}>20€</span>
              <span className="text-gray-400 mb-3 text-lg" style={{ fontFamily: "'Rajdhani', sans-serif" }}>/mois</span>
            </div>
            <p className="text-gray-500 text-sm" style={{ fontFamily: "'Rajdhani', sans-serif" }}>Facturation mensuelle • Résiliable à tout moment</p>
          </div>

          <ul className="space-y-3 mb-8">
            {features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
                <span style={{ color: '#AAFF00' }} className="text-lg flex-shrink-0">✓</span>
                <span className="text-gray-200">{feature}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="btn-gold w-full py-4 rounded-xl text-base tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'REDIRECTION...' : "S'ABONNER MAINTENANT"}
          </button>

          <p className="text-center text-xs text-gray-600 mt-4" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            🔒 Paiement sécurisé par Stripe
          </p>
        </div>

        {/* Legal */}
        <div className="mt-8 max-w-md text-center">
          <p className="text-xs text-gray-600" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            Les performances passées ne garantissent pas les performances futures.
            Les analyses sont fournies à titre informatif uniquement.
          </p>
        </div>

        {/* Responsible gambling warning */}
        <div className="mt-6 p-4 border border-orange-500/30 rounded-xl bg-orange-500/5 max-w-md">
          <p className="text-xs text-orange-400 text-center" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
            ⚠️ Les paris sportifs comportent des risques. Jouez de manière responsable.
            Interdit aux mineurs de moins de 18 ans.
          </p>
        </div>
      </main>
    </div>
  )
}

export default function AbonnementPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center"><div className="text-[#C9A84C]">Chargement...</div></div>}>
      <AbonnementContent />
    </Suspense>
  )
}
