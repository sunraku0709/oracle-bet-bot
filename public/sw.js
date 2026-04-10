// Oracle Bet — Service Worker
// Strategy: network-first for pages/API, cache-first for static assets, offline fallback

const CACHE_VERSION = 'v1'
const CACHE_NAME = `oracle-bet-${CACHE_VERSION}`
const OFFLINE_URL = '/offline.html'

// Assets cached immediately on install (app shell)
const PRECACHE = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
]

// Static asset patterns that get cache-first treatment
const STATIC_PATTERNS = [
  /\.(?:png|jpg|jpeg|gif|webp|svg|ico)$/,
  /\.(?:woff2?|ttf|eot)$/,
  /\/_next\/static\//,
]

// Never cache these
const SKIP_PATTERNS = [
  /\/api\//,
  /\/auth\//,
  /chrome-extension:/,
]

// ─── Install ───────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      // addAll with individual error handling so one bad asset doesn't break install
      Promise.allSettled(PRECACHE.map((url) => cache.add(url)))
    )
  )
  // Take control immediately, don't wait for old SW to die
  self.skipWaiting()
})

// ─── Activate ──────────────────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key.startsWith('oracle-bet-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  )
  // Immediately control all open clients
  self.clients.claim()
})

// ─── Fetch ─────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle GET from same origin (or CDN assets)
  if (request.method !== 'GET') return

  // Skip non-http(s) schemes
  if (!url.protocol.startsWith('http')) return

  // Never intercept these
  if (SKIP_PATTERNS.some((re) => re.test(url.href))) return

  // ── Static assets → cache-first ──────────────────────────────────────────
  if (STATIC_PATTERNS.some((re) => re.test(url.pathname))) {
    event.respondWith(cacheFirst(request))
    return
  }

  // ── Navigation requests → network-first with offline fallback ─────────────
  if (request.mode === 'navigate') {
    event.respondWith(networkFirstWithOfflineFallback(request))
    return
  }

  // ── Everything else → network-first ──────────────────────────────────────
  event.respondWith(networkFirst(request))
})

// ─── Strategies ────────────────────────────────────────────────────────────

/** Cache-first: serve from cache, fall back to network and update cache. */
async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached

  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Asset unavailable offline', { status: 503 })
  }
}

/** Network-first: try network, fall back to cache. */
async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    return cached ?? new Response('Offline', { status: 503 })
  }
}

/** Network-first for pages: fall back to cached page, then offline.html. */
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached

    // Last resort: offline page
    const offline = await caches.match(OFFLINE_URL)
    return offline ?? new Response('<h1>Offline</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html' },
    })
  }
}

// ─── Background Sync (optional, for future API resilience) ─────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})
