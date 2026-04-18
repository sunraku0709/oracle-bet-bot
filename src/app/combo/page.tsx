'use client'

import { useEffect, useState } from 'react'

export default function ComboPage() {
  const [combo, setCombo] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/combo')
      .then(r => r.json().then((d: { combo?: Record<string, unknown>; error?: string }) => ({ ok: r.ok, d })))
      .then(({ ok, d }) => {
        if (ok) setCombo(d.combo ?? null)
        else setError(d.error || 'Erreur')
        setLoading(false)
      })
      .catch(() => { setError('Erreur reseau'); setLoading(false) })
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center text-yellow-500">Chargement du combo...</div>
  if (error) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 gap-4">
      <h1 className="text-2xl font-bold text-yellow-500">Combo Ultra Safe</h1>
      <p className="text-red-400">{error}</p>
      <a href="/abonnement" className="bg-yellow-500 text-black px-6 py-3 font-bold">Activer pour 8.99€/mois</a>
    </div>
  )
  if (!combo) return null

  type ComboLeg = { match: string; competition: string; bet: string; odds: number; probability_pct: number; reasoning: string }

  return (
    <div className="container mx-auto max-w-4xl p-8">
      <h1 className="text-4xl font-bold text-center mb-4">Combo Ultra Safe</h1>
      <p className="text-center text-zinc-400 mb-8">{combo.date as string}</p>

      <div className="bg-zinc-900 border border-yellow-500/30 rounded-lg p-8 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <div className="text-sm text-zinc-400 uppercase">Cote totale</div>
            <div className="text-4xl font-bold text-yellow-500">@{combo.combo_odds as number}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-zinc-400 uppercase">Confiance</div>
            <div className="text-xl font-bold">{combo.confidence_level as string}</div>
          </div>
        </div>

        <div className="space-y-4">
          {(combo.legs as ComboLeg[])?.map((leg, i) => (
            <div key={i} className="border-l-2 border-yellow-500 pl-4">
              <div className="font-bold">{leg.match}</div>
              <div className="text-xs text-zinc-500 uppercase">{leg.competition}</div>
              <div className="mt-2 flex justify-between">
                <span>{leg.bet}</span>
                <span className="text-yellow-500 font-bold">@{leg.odds}</span>
              </div>
              <div className="text-xs text-zinc-400 mt-1">Proba {leg.probability_pct}% · {leg.reasoning}</div>
            </div>
          ))}
        </div>

        <div className="mt-6 pt-6 border-t border-zinc-800">
          <div className="text-sm text-zinc-400 mb-2">Analyse globale</div>
          <p className="text-zinc-200">{combo.global_reasoning as string}</p>
        </div>

        {(combo.risk_flags as string[])?.length > 0 && (
          <div className="mt-4 bg-red-900/20 border border-red-900 p-4 rounded">
            <div className="font-bold text-red-400 mb-2">Points d&apos;attention</div>
            <ul className="list-disc pl-5 text-sm">
              {(combo.risk_flags as string[]).map((f, i) => <li key={i}>{f}</li>)}
            </ul>
          </div>
        )}

        <div className="mt-6 text-center">
          <div className="text-xs text-zinc-500">Mise suggeree : {combo.stake_suggestion as string} de votre bankroll</div>
        </div>
      </div>

      <p className="text-xs text-center text-zinc-600">Les combines comportent des risques. Jouez de maniere responsable.</p>
    </div>
  )
}
