'use client'

import { useEffect, useState } from 'react'

// ─── iOS Install Banner ─────────────────────────────────────────────────────

function IOSInstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      // iPad on iPadOS 13+ reports as MacIntel with touch
      (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua))
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true)
    const dismissed = localStorage.getItem('pwa-ios-dismissed')

    if (isIOS && !isStandalone && !dismissed) {
      // Small delay so it doesn't flash immediately on load
      const t = setTimeout(() => setVisible(true), 1800)
      return () => clearTimeout(t)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem('pwa-ios-dismissed', '1')
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Installer Oracle Bet"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#111111',
        borderTop: '1px solid #2a2a2a',
        borderRadius: '16px 16px 0 0',
        padding: '20px 20px 32px',
        boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
        // Slide up animation via CSS classes isn't available without Tailwind here;
        // we use a simple transform trick below
        animation: 'slideUp 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>

      {/* Drag handle */}
      <div
        style={{
          width: 36,
          height: 4,
          background: '#3a3a3a',
          borderRadius: 2,
          margin: '0 auto 16px',
        }}
      />

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
        {/* Mini icon */}
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: '#1a1a1a',
            border: '1.5px solid #FFD700',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            flexShrink: 0,
          }}
        >
          ⚡
        </div>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#fff', fontWeight: 700, fontSize: 15, margin: 0 }}>
            Installer Oracle Bet
          </p>
          <p style={{ color: '#9ca3af', fontSize: 12, margin: '2px 0 0' }}>
            Ajoutez l&apos;app sur votre écran d&apos;accueil
          </p>
        </div>
        <button
          onClick={dismiss}
          aria-label="Fermer"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#6b7280',
            fontSize: 22,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 4,
          }}
        >
          ×
        </button>
      </div>

      {/* Steps */}
      <ol
        style={{
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {[
          {
            icon: '↑',
            text: (
              <>
                Appuyez sur{' '}
                <strong style={{ color: '#fff' }}>Partager</strong>{' '}
                <span style={{ fontSize: 16 }}>⎙</span> en bas de Safari
              </>
            ),
          },
          {
            icon: '+',
            text: (
              <>
                Appuyez sur{' '}
                <strong style={{ color: '#fff' }}>
                  &quot;Sur l&apos;écran d&apos;accueil&quot;
                </strong>
              </>
            ),
          },
          {
            icon: '✓',
            text: (
              <>
                Appuyez sur <strong style={{ color: '#FFD700' }}>Ajouter</strong>
              </>
            ),
          },
        ].map((step, i) => (
          <li
            key={i}
            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: '#FFD70020',
                border: '1px solid #FFD700',
                color: '#FFD700',
                fontWeight: 800,
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {step.icon}
            </span>
            <span style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.4 }}>
              {step.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ─── Android / Desktop Install Button ───────────────────────────────────────

type DeferredPrompt = {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function AndroidInstallButton() {
  const [prompt, setPrompt] = useState<DeferredPrompt | null>(null)
  const [installed, setInstalled] = useState(false)

  useEffect(() => {
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    if (isStandalone) { setInstalled(true); return }

    const handler = (e: Event) => {
      e.preventDefault()
      setPrompt(e as unknown as DeferredPrompt)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setInstalled(true))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const install = async () => {
    if (!prompt) return
    await prompt.prompt()
    const { outcome } = await prompt.userChoice
    if (outcome === 'accepted') setInstalled(true)
    setPrompt(null)
  }

  if (!prompt || installed) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9999,
        background: '#111',
        border: '1px solid #FFD700',
        borderRadius: 14,
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        cursor: 'pointer',
      }}
      onClick={install}
      role="button"
      aria-label="Installer Oracle Bet"
    >
      <span style={{ fontSize: 20 }}>⚡</span>
      <div>
        <p style={{ color: '#fff', fontWeight: 700, fontSize: 13, margin: 0 }}>
          Installer Oracle Bet
        </p>
        <p style={{ color: '#9ca3af', fontSize: 11, margin: '1px 0 0' }}>
          Accès rapide depuis votre bureau
        </p>
      </div>
    </div>
  )
}

// ─── Service Worker Registration ────────────────────────────────────────────

function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

        // Trigger update check on page focus
        const onFocus = () => reg.update()
        window.addEventListener('focus', onFocus)

        // Tell waiting SW to activate immediately
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' })
        }

        reg.addEventListener('updatefound', () => {
          const newSW = reg.installing
          newSW?.addEventListener('statechange', () => {
            if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
              newSW.postMessage({ type: 'SKIP_WAITING' })
            }
          })
        })

        return () => window.removeEventListener('focus', onFocus)
      } catch (err) {
        console.warn('[SW] Registration failed:', err)
      }
    }

    if (document.readyState === 'complete') {
      register()
    } else {
      window.addEventListener('load', register, { once: true })
    }
  }, [])

  return null
}

// ─── Combined export ─────────────────────────────────────────────────────────

export default function PWAProvider() {
  return (
    <>
      <ServiceWorkerRegistration />
      <IOSInstallBanner />
      <AndroidInstallButton />
    </>
  )
}
