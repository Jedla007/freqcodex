/**
 * FreqCodex — Service Worker
 * La liste PRECACHE est injectée automatiquement par scripts/update-sw.js après le build.
 * Stratégie : précache complet à l'install → app 100% offline dès la 1ère ouverture.
 */

// Version à incrémenter à chaque déploiement majeur pour forcer le rechargement du cache
const CACHE = 'freqcodex-v2'

// Rempli par le script post-build (tous les assets du dist/ + sons + JSON)
const PRECACHE = [
  '/freqcodex/apple-touch-icon.png',
  '/freqcodex/assets/index-Cb-G43TW.js',
  '/freqcodex/assets/index-DjPHoOko.css',
  '/freqcodex/data/brainwaves.json',
  '/freqcodex/data/breathing.json',
  '/freqcodex/data/cafl.json',
  '/freqcodex/data/planetary.json',
  '/freqcodex/data/schumann.json',
  '/freqcodex/data/solfeggio.json',
  '/freqcodex/data/speculative.json',
  '/freqcodex/favicon.svg',
  '/freqcodex/icon-192.png',
  '/freqcodex/icon-512.png',
  '/freqcodex/icons.svg',
  '/freqcodex/index.html',
  '/freqcodex/manifest.json',
  '/freqcodex/sounds/432hz-bowl.mp3',
  '/freqcodex/sounds/528hz-bowl.mp3',
  '/freqcodex/sounds/breath-in.mp3',
  '/freqcodex/sounds/breath-out.mp3',
  '/freqcodex/sounds/one-ding.mp3',
  '/freqcodex/sounds/silence.wav',
  '/freqcodex/sounds/trois-ding.mp3',
]

// ── Installation : précache tout ─────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  )
})

// ── Activation : supprime les anciens caches, prend le contrôle immédiatement ─
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ── Fetch : cache-first pour tous les assets ──────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event

  if (request.method !== 'GET') return
  if (!request.url.startsWith(self.location.origin)) return

  // Navigation HTML → network-first, cache en fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response.ok) {
            caches.open(CACHE).then(c => c.put(request, response.clone()))
          }
          return response
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached || caches.match('/freqcodex/index.html'))
        )
    )
    return
  }

  // Assets → cache-first, réseau en fallback + mise à jour cache en arrière-plan
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request)
      if (cached) {
        fetch(request).then(r => { if (r.ok) cache.put(request, r.clone()) }).catch(() => {})
        return cached
      }
      return fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    })
  )
})
