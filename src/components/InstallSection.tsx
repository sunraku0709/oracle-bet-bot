'use client'

import { useEffect, useState } from 'react'

type OS = 'ios' | 'android' | 'other'

function detectOS(): OS {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua)) return 'ios' // iPadOS 13+
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

const IOS_STEPS = [
  { icon: '⎙', label: 'Safari', desc: 'Ouvre ce site dans Safari' },
  { icon: '↑', label: 'Partager', desc: 'Appuie sur l'icône Partager en bas' },
  { icon: '+', label: 'Écran d'accueil', desc: '"Sur l\'écran d\'accueil" → Ajouter' },
]

const ANDROID_STEPS = [
  { icon: '⋮', label: 'Chrome', desc: 'Ouvre ce site dans Chrome' },
  { icon: '⊕', label: 'Menu', desc: 'Menu (⋮) en haut à droite' },
  { icon: '↓', label: 'Installer', desc: '"Installer l\'application" → OK' },
]

export default function InstallSection() {
  const [os, setOs] = useState<OS>('other')
  const [tab, setTab] = useState<'ios' | 'android'>('ios')
  const [standalone, setStandalone] = useState(true) // start hidden, reveal after check
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator &&
        (navigator as { standalone?: boolean }).standalone === true)

    setStandalone(isStandalone)

    if (!isStandalone) {
      const detected = detectOS()
      setOs(detected)
      // Pre-select the tab matching the visitor's device; default to iOS on desktop
      setTab(detected === 'android' ? 'android' : 'ios')
      setDismissed(!!localStorage.getItem('install-section-dismissed'))
    }
  }, [])

  // Hide if already installed as PWA or explicitly dismissed
  if (standalone || dismissed) return null

  const steps = tab === 'ios' ? IOS_STEPS : ANDROID_STEPS

  return (
    <section
      aria-label="Installer Oracle Bet"
      style={{
        background: 'linear-gradient(135deg, #120f00 0%, #0e0e0e 50%, #0a0c00 100%)',
        borderBottom: '1px solid rgba(201,168,76,0.25)',
        padding: '16px',
      }}
    >
      <div style={{ maxWidth: 480, margin: '0 auto' }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 20 }}>📲</span>
            <span style={{
              color: '#C9A84C',
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 18,
              letterSpacing: '0.06em',
            }}>
              Installe Oracle Bet sur ton téléphone
            </span>
          </div>
          <button
            onClick={() => {
              setDismissed(true)
              localStorage.setItem('install-section-dismissed', '1')
            }}
            aria-label="Fermer"
            style={{
              background: 'transparent',
              border: 'none',
              color: '#6b7280',
              fontSize: 20,
              cursor: 'pointer',
              lineHeight: 1,
              padding: '0 4px',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* OS tabs */}
        <div style={{
          display: 'flex',
          gap: 6,
          marginBottom: 14,
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 10,
          padding: 4,
        }}>
          {(['ios', 'android'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: '7px 0',
                borderRadius: 7,
                border: 'none',
                fontFamily: "'Rajdhani', sans-serif",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: '0.08em',
                cursor: 'pointer',
                transition: 'all 0.15s',
                background: tab === t ? '#C9A84C' : 'transparent',
                color: tab === t ? '#0a0a0a' : '#9ca3af',
              }}
            >
              {t === 'ios' ? '🍎 iOS / Safari' : '🤖 Android / Chrome'}
            </button>
          ))}
        </div>

        {/* Steps */}
        <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {steps.map((step, i) => (
            <li
              key={i}
              style={{ display: 'flex', alignItems: 'center', gap: 12 }}
            >
              {/* Step number / icon bubble */}
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(201,168,76,0.12)',
                border: '1px solid rgba(201,168,76,0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                fontSize: 16,
                color: '#C9A84C',
                fontWeight: 800,
              }}>
                {step.icon}
              </div>
              <div>
                <span style={{
                  color: '#ffffff',
                  fontWeight: 700,
                  fontFamily: "'Rajdhani', sans-serif",
                  fontSize: 14,
                  display: 'block',
                }}>
                  {step.label}
                </span>
                <span style={{
                  color: '#6b7280',
                  fontSize: 12,
                  fontFamily: "'Rajdhani', sans-serif",
                }}>
                  {step.desc}
                </span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
