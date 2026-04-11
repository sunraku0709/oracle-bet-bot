'use client'

import { useEffect, useRef, useState } from 'react'

// ─── Types ─────────────────────────────────────────────────────────────────

type DeferredPrompt = {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

type OS = 'ios' | 'android' | 'other'

function detectOS(): OS {
  const ua = navigator.userAgent
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios'
  if (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua)) return 'ios'
  if (/android/i.test(ua)) return 'android'
  return 'other'
}

function isMobileViewport() {
  return window.innerWidth < 768
}

// ─── Service Worker Registration ───────────────────────────────────────────

function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    const register = async () => {
      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })

        const onFocus = () => reg.update()
        window.addEventListener('focus', onFocus)

        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' })

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

    if (document.readyState === 'complete') register()
    else window.addEventListener('load', register, { once: true })
  }, [])

  return null
}

// ─── iOS auto-rising install banner (delayed, one-time) ────────────────────

function IOSInstallBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent
    const isIOS =
      /iphone|ipad|ipod/i.test(ua) ||
      (navigator.maxTouchPoints > 1 && /macintosh/i.test(ua))
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator &&
        (navigator as { standalone?: boolean }).standalone === true)
    const dismissed = localStorage.getItem('pwa-ios-banner-dismissed')

    if (isIOS && !isStandalone && !dismissed) {
      const t = setTimeout(() => setVisible(true), 3000)
      return () => clearTimeout(t)
    }
  }, [])

  const dismiss = () => {
    setVisible(false)
    localStorage.setItem('pwa-ios-banner-dismissed', '1')
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Installer Oracle Bet sur iOS"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 10000,
        background: '#111111',
        borderTop: '1px solid rgba(201,168,76,0.3)',
        borderRadius: '16px 16px 0 0',
        padding: '18px 18px 36px',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        animation: 'pwaBannerUp 0.32s cubic-bezier(0.32,0.72,0,1)',
      }}
    >
      <style>{`@keyframes pwaBannerUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

      {/* handle */}
      <div style={{ width:36, height:4, background:'#2a2a2a', borderRadius:2, margin:'0 auto 16px' }} />

      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
        <div style={{
          width:46, height:46, borderRadius:11, background:'#1a1a1a',
          border:'1.5px solid #C9A84C', display:'flex', alignItems:'center',
          justifyContent:'center', fontSize:22, flexShrink:0,
        }}>⚡</div>
        <div style={{ flex:1 }}>
          <p style={{ color:'#fff', fontWeight:700, fontSize:15, margin:0, fontFamily:"'Bebas Neue', sans-serif", letterSpacing:'0.05em' }}>
            INSTALLER ORACLE BET
          </p>
          <p style={{ color:'#9ca3af', fontSize:12, margin:'2px 0 0', fontFamily:"'Rajdhani', sans-serif" }}>
            Accès rapide depuis votre écran d&apos;accueil
          </p>
        </div>
        <button onClick={dismiss} aria-label="Fermer"
          style={{ background:'transparent', border:'none', color:'#6b7280', fontSize:22, cursor:'pointer', padding:4 }}>×</button>
      </div>

      <ol style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:10 }}>
        {[
          { icon:'↑', text: <><strong style={{ color:'#fff' }}>Partager</strong> — icône ⎙ en bas de Safari</> },
          { icon:'+', text: <><strong style={{ color:'#fff' }}>&quot;Sur l&apos;écran d&apos;accueil&quot;</strong> dans le menu</> },
          { icon:'✓', text: <>Appuie sur <strong style={{ color:'#C9A84C' }}>Ajouter</strong> en haut à droite</> },
        ].map((s, i) => (
          <li key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{
              width:28, height:28, borderRadius:'50%',
              background:'rgba(201,168,76,0.12)', border:'1px solid rgba(201,168,76,0.35)',
              color:'#C9A84C', fontWeight:800, fontSize:13,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            }}>{s.icon}</span>
            <span style={{ color:'#9ca3af', fontSize:13, fontFamily:"'Rajdhani', sans-serif", lineHeight:1.4 }}>{s.text}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ─── Universal mobile floating install button ───────────────────────────────

function MobileInstallFAB() {
  const [visible, setVisible] = useState(false)
  const [os, setOs]           = useState<OS>('other')
  const [showSheet, setShowSheet] = useState(false)
  const promptRef = useRef<DeferredPrompt | null>(null)

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      ('standalone' in navigator &&
        (navigator as { standalone?: boolean }).standalone === true)

    if (isStandalone) return

    const detected = detectOS()
    setOs(detected)

    // Show on any mobile browser
    if (isMobileViewport()) setVisible(true)

    const handler = (e: Event) => {
      e.preventDefault()
      promptRef.current = e as unknown as DeferredPrompt
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setVisible(false))

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleClick = async () => {
    if (promptRef.current && os !== 'ios') {
      await promptRef.current.prompt()
      const { outcome } = await promptRef.current.userChoice
      if (outcome === 'accepted') setVisible(false)
      promptRef.current = null
    } else {
      setShowSheet(true)
    }
  }

  if (!visible) return null

  const steps = os === 'ios'
    ? [
        { icon: '↑', text: 'Appuie sur Partager ⎙ (bas de Safari)' },
        { icon: '+', text: '"Sur l\'écran d\'accueil"' },
        { icon: '✓', text: 'Appuie sur Ajouter' },
      ]
    : [
        { icon: '⋮', text: 'Menu Chrome (haut à droite)' },
        { icon: '↓', text: '"Installer l\'application"' },
        { icon: '✓', text: 'Confirme' },
      ]

  return (
    <>
      {/* FAB — centred at bottom, mobile only */}
      <button
        onClick={handleClick}
        aria-label="Installer Oracle Bet"
        style={{
          position: 'fixed',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9000,
          background: 'linear-gradient(135deg, #b8902a 0%, #C9A84C 50%, #e6c96a 100%)',
          color: '#0a0a0a',
          border: 'none',
          borderRadius: 100,
          padding: '13px 24px',
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 16,
          letterSpacing: '0.08em',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 4px 24px rgba(201,168,76,0.45), 0 0 0 1px rgba(201,168,76,0.2)',
          whiteSpace: 'nowrap',
          // Only shown on mobile via JS; CSS guard for safety
        }}
        className="md:hidden"
      >
        <span style={{ fontSize: 18 }}>📲</span>
        INSTALLER L&apos;APP
      </button>

      {/* Instructions bottom sheet */}
      {showSheet && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Instructions d'installation"
          style={{
            position: 'fixed', inset: 0, zIndex: 10001,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
          }}
        >
          {/* Backdrop */}
          <div
            onClick={() => setShowSheet(false)}
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
          />

          {/* Sheet */}
          <div style={{
            position: 'relative', zIndex: 1,
            background: '#111', borderTop: '1px solid rgba(201,168,76,0.25)',
            borderRadius: '18px 18px 0 0',
            padding: '18px 20px 40px',
            boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
            animation: 'pwaBannerUp 0.3s cubic-bezier(0.32,0.72,0,1)',
          }}>
            <style>{`@keyframes pwaBannerUp{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}`}</style>

            <div style={{ width:36, height:4, background:'#2a2a2a', borderRadius:2, margin:'0 auto 16px' }} />

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <p style={{ color:'#C9A84C', fontFamily:"'Bebas Neue', sans-serif", fontSize:18, letterSpacing:'0.05em', margin:0 }}>
                {os === 'ios' ? '🍎 Installation iOS' : '🤖 Installation Android'}
              </p>
              <button onClick={() => setShowSheet(false)}
                style={{ background:'transparent', border:'none', color:'#6b7280', fontSize:22, cursor:'pointer' }}>×</button>
            </div>

            <ol style={{ listStyle:'none', margin:0, padding:0, display:'flex', flexDirection:'column', gap:12 }}>
              {steps.map((s, i) => (
                <li key={i} style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <span style={{
                    width:32, height:32, borderRadius:'50%',
                    background:'rgba(201,168,76,0.12)', border:'1px solid rgba(201,168,76,0.35)',
                    color:'#C9A84C', fontWeight:800, fontSize:14,
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
                  }}>{s.icon}</span>
                  <span style={{ color:'#d1d5db', fontSize:14, fontFamily:"'Rajdhani', sans-serif", lineHeight:1.4 }}>{s.text}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Public export ─────────────────────────────────────────────────────────

export default function PWAProvider() {
  return (
    <>
      <ServiceWorkerRegistration />
      <IOSInstallBanner />
      <MobileInstallFAB />
    </>
  )
}
