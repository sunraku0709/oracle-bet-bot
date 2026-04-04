'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    if (mode === 'register') {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: `${window.location.origin}/dashboard` },
      })
      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ type: 'success', text: 'Inscription réussie ! Vérifiez votre email pour confirmer votre compte.' })
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) {
        setMessage({ type: 'error', text: 'Email ou mot de passe incorrect.' })
      } else {
        router.push('/dashboard')
      }
    }

    setLoading(false)
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
        <p className="text-gray-400 text-center mb-8 text-sm" style={{ fontFamily: "'Rajdhani', sans-serif" }}>
          {mode === 'login' ? 'Accédez à vos analyses IA' : 'Rejoignez Oracle Bet aujourd\'hui'}
        </p>

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
            <div className={`p-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-red-500/10 border border-red-500/30 text-red-400' : 'bg-green-500/10 border border-green-500/30 text-green-400'}`} style={{ fontFamily: "'Rajdhani', sans-serif" }}>
              {message.text}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full py-3.5 rounded-xl text-sm tracking-widest disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {loading ? 'CHARGEMENT...' : mode === 'login' ? 'SE CONNECTER' : "S'INSCRIRE"}
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
