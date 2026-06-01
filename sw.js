/**
 * FreqCodex — Service Worker
 * Stratégie : cache-first pour les assets, network-first pour la navigation HTML
 * Après la première visite complète en ligne, l'app fonctionne entièrement hors ligne.
 */

const CACHE = 'freqcodex-v1'

// ── Installation : précache TOUT le contenu statique dès la 1ère ouverture ────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll([
        // Shell
        '/freqcodex/',
        '/freqcodex/index.html',
        // Données fréquences
        '/freqcodex/data/solfeggio.json',
        '/freqcodex/data/brainwaves.json',
        '/freqcodex/data/schumann.json',
        '/freqcodex/data/planetary.json',
        '/freqcodex/data/cafl.json',
        '/freqcodex/data/speculative.json',
        '/freqcodex/data/breathing.json',
        // Sons — précachés immédiatement, pas besoin de les jouer d'abord
        '/freqcodex/sounds/silence.wav',
        '/freqcodex/sounds/one-ding.mp3',
        '/freqcodex/sounds/trois-ding.mp3',
        '/freqcodex/sounds/432hz-bowl.mp3',
        '/freqcodex/sounds/528hz-bowl.mp3',
        // Icônes
        '/freqcodex/apple-touch-icon.png',
        '/freqcodex/icon-192.png',
        '/freqcodex/icon-512.png',
        '/freqcodex/favicon.svg',
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
