'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function UpdatePasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    // Supabase exchanges the recovery token from the URL hash automatically.
    // Wait for PASSWORD_RECOVERY event before showing the form.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirm) {
      setMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
      return
    }
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'Le mot de passe doit contenir au moins 8 caractères.' })
      return
    }
    setLoading(true)
    setMessage(null)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      setMessage({ type: 'error', text: error.message })
    } else {
      setMessage({ type: 'success', text: 'Mot de passe mis à jour ! Redirection...' })
      setTimeout(() => router.push('/auth'), 2000)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(135deg, #060606 0%, #0d0d0d 50%, #060606 100%)' }}>
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-2xl" style={{ filter: 'drop-shadow(0 0 8px rgba(201,168,76,0.6))' }}>⚡</span>
            <span className="text-2xl tracking-widest gold-gradient"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}>
              ORACLE BET
            </span>
          </div>
          <p className="text-white/40 text-sm">Réinitialisation du mot de passe</p>
        </div>

        <div className="glass-card rounded-2xl p-8">
          {!ready ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-[#C9A84C]/30 border-t-[#C9A84C] rounded-full animate-spin mx-auto mb-4" />
              <p className="text-white/50 text-sm">Vérification du lien de réinitialisation…</p>
              <p className="text-white/25 text-xs mt-2">
                Si cette page reste bloquée, le lien a peut-être expiré.{' '}
                <a href="/auth" className="text-[#C9A84C] hover:underline">Réessayer</a>
              </p>
            </div>
          ) : (
            <>
              <h1 className="text-xl font-bold text-white mb-6 text-center">
                Nouveau mot de passe
              </h1>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="8 caractères minimum"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(201,168,76,0.2)',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(201,168,76,0.6)'; e.target.style.background = 'rgba(255,255,255,0.07)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(201,168,76,0.2)'; e.target.style.background = 'rgba(255,255,255,0.04)' }}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Répétez le mot de passe"
                    className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all duration-200"
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(201,168,76,0.2)',
                    }}
                    onFocus={(e) => { e.target.style.borderColor = 'rgba(201,168,76,0.6)'; e.target.style.background = 'rgba(255,255,255,0.07)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'rgba(201,168,76,0.2)'; e.target.style.background = 'rgba(255,255,255,0.04)' }}
                  />
                </div>

                {message && (
                  <div className={`px-4 py-3 rounded-xl text-sm ${
                    message.type === 'success'
                      ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                      : 'bg-red-500/10 border border-red-500/20 text-red-300'
                  }`}>
                    {message.text}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold w-full py-3.5 rounded-xl text-sm font-bold tracking-wider text-black disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                      Mise à jour…
                    </span>
                  ) : 'METTRE À JOUR →'}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-white/25 text-xs mt-6">
          <a href="/auth" className="hover:text-[#C9A84C] transition-colors">← Retour à la connexion</a>
        </p>
      </div>
    </div>
  )
}
