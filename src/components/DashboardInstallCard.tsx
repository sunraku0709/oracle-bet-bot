'use client'

import { useEffect, useState } from 'react'

type OS = 'ios' | 'android' | 'other'

function detectOS(): OS {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

export default function DashboardInstallCard() {
  const [visible, setVisible] = useState(false)
  const [os, setOs] = useState<OS>('other')

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator &&
        (navigator as { standalone?: boolean }).standalone === true)

    if (isStandalone) return
    if (!!localStorage.getItem('dashboard-install-dismissed')) return

    const detected = detectOS()
    if (detected === 'other') return

    setOs(detected)
    setVisible(true)
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem('dashboard-install-dismissed', '1')
  }

  if (!visible) return null

  const hint =
    os === 'ios'
      ? 'Safari → Partager ⎙ → Sur l\'écran d\'accueil'
      : 'Chrome → Menu ⋮ → Installer l\'application'

  return (
    <div
      role="region"
      aria-label="Installer Oracle Bet"
      style={{
        marginBottom: 24,
        background: 'linear-gradient(135deg, #120f00 0%, #0e0e0e 60%, #0a0c00 100%)',
        border: '1px solid rgba(201,168,76,0.25)',
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      {/* Icon */}
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        background: 'rgba(201,168,76,0.1)', border: '1px solid rgba(201,168,76,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, flexShrink: 0,
      }}>
        📲
      </div>

      {/* Text */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: '#C9A84C',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 15,
          letterSpacing: '0.05em',
          margin: 0,
        }}>
          Installe l&apos;app pour une meilleure expérience
        </p>
        <p style={{
          color: '#6b7280',
          fontFamily: "'Rajdhani', sans-serif",
          fontSize: 12,
          margin: '3px 0 0',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}>
          {hint}
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={dismiss}
        aria-label="Fermer"
        style={{
          background: 'transparent',
          border: 'none',
          color: '#6b7280',
          fontSize: 20,
          cursor: 'pointer',
          padding: '0 4px',
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  )
}
