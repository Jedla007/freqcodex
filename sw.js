/**
 * FreqCodex — Service Worker
 * Stratégie : cache-first pour les assets, network-first pour la navigation HTML
 * Après la première visite complète en ligne, l'app fonctionne entièrement hors ligne.
 */

const CACHE = 'freqcodex-v1'

// ── Installation : précache le shell minimal ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll([
        '/freqcodex/',
        '/freqcodex/index.html',
      ]))
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

// ── Fetch : sert depuis le cache ou le réseau ─────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event

  // Ignorer les requêtes non-GET et cross-origin
  if (request.method !== 'GET') return
  if (!request.url.startsWith(self.location.origin)) return

  // Navigation HTML → network-first (app toujours à jour), cache en fallback
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

  // Assets (JS, CSS, JSON, MP3, images) → cache-first, réseau en fallback + mise à jour cache
  event.respondWith(
    caches.open(CACHE).then(async cache => {
      const cached = await cache.match(request)
      if (cached) {
        // Mise à jour en arrière-plan (stale-while-revalidate)
        fetch(request).then(r => { if (r.ok) cache.put(request, r.clone()) }).catch(() => {})
        return cached
      }
      // Pas en cache : fetch réseau et mettre en cache
      return fetch(request).then(response => {
        if (response.ok) cache.put(request, response.clone())
        return response
      })
    })
  )
})
