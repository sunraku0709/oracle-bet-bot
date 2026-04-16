'use client'

import { useState, useEffect } from 'react'

const STEPS = [
  { icon: '📡', label: 'Collecte des données du match…' },
  { icon: '📈', label: 'Analyse de la forme récente…' },
  { icon: '⚔️', label: 'Étude des confrontations directes…' },
  { icon: '🎯', label: 'Évaluation des styles de jeu…' },
  { icon: '🚑', label: 'Vérification des absences…' },
  { icon: '📅', label: 'Analyse du calendrier et contexte…' },
  { icon: '🏆', label: 'Évaluation des enjeux du match…' },
  { icon: '📊', label: 'Calcul des statistiques avancées…' },
  { icon: '🎲', label: 'Calcul des probabilités…' },
  { icon: '⚡', label: 'Génération du rapport final…' },
]

export default function AnalysisLoader() {
  const [step, setStep] = useState(0)
  const [fade, setFade] = useState(true)

  useEffect(() => {
    const id = setInterval(() => {
      setFade(false)
      setTimeout(() => {
        setStep(s => (s + 1) % STEPS.length)
        setFade(true)
      }, 250)
    }, 2600)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex-1 flex items-center justify-center py-8">
      <div className="text-center w-full max-w-xs">

        {/* Spinner with glow */}
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full border-2 border-[#C9A84C]/20 animate-ping" />
          <div className="absolute inset-0 rounded-full border-2 border-[#C9A84C] border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-3xl">
            ⚡
          </div>
        </div>

        {/* Title */}
        <p style={{ fontFamily: "'Bebas Neue', sans-serif" }}
          className="text-xl tracking-widest text-[#C9A84C] mb-1">
          ANALYSE EN COURS
        </p>
        <p className="text-[11px] text-white/25 tracking-wider mb-6">
          DeepSeek + Claude &nbsp;·&nbsp; Double IA indépendante
        </p>

        {/* Rotating step message */}
        <div
          className="rounded-xl px-5 py-3 mb-5 transition-all duration-250"
          style={{
            background: 'rgba(201,168,76,0.06)',
            border: '1px solid rgba(201,168,76,0.18)',
            opacity: fade ? 1 : 0,
            transform: fade ? 'translateY(0)' : 'translateY(5px)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}
        >
          <span className="mr-2 text-base">{STEPS[step].icon}</span>
          <span style={{ fontFamily: "'Rajdhani', sans-serif" }}
            className="text-sm font-semibold text-white/75 tracking-wide">
            {STEPS[step].label}
          </span>
        </div>

        {/* Progress dots */}
        <div className="flex gap-1.5 justify-center">
          {STEPS.map((_, i) => (
            <div
              key={i}
              style={{
                height: 5,
                borderRadius: 3,
                width: i === step ? 20 : 6,
                background: i === step
                  ? '#C9A84C'
                  : i < step
                  ? 'rgba(201,168,76,0.3)'
                  : 'rgba(255,255,255,0.08)',
                transition: 'all 0.3s ease',
              }}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
