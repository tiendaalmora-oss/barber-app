// BarberOS Progressive Web App Service Worker
// 100% Offline Resilience for Latin America & Venezuela
const CACHE_NAME = 'barberos-cache-v2'

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png'
]

// 1. Install Event: Cache App Shell immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('Precache partial warning:', err)
      })
    }).then(() => self.skipWaiting())
  )
})

// 2. Activate Event: Clean old caches and claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// 3. Fetch Event: Intelligent offline interceptor
self.addEventListener('fetch', (event) => {
  const request = event.request
  const url = new URL(request.url)

  // Only handle GET requests
  if (request.method !== 'GET') {
    // For POST/PUT when offline, return safe JSON fallback
    if (!navigator.onLine && url.pathname.startsWith('/api/')) {
      event.respondWith(
        new Response(
          JSON.stringify({ ok: true, offline: true, message: 'Guardado local en teléfono' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      )
    }
    return
  }

  // A. Navigation Requests (HTML / Page Reload): Network with Cache Fallback
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return networkResponse
        })
        .catch(async () => {
          // Device is offline or network failed -> Return cached index.html immediately!
          const cachedResponse = await caches.match('/index.html') || await caches.match('/')
          if (cachedResponse) {
            return cachedResponse
          }
          return new Response(
            '<!doctype html><html><body style="background:#090a0d;color:#fff;font-family:sans-serif;text-align:center;padding:50px;"><h2>BarberOS Modo Local</h2><p>Recarga la app en tu navegador.</p></body></html>',
            { headers: { 'Content-Type': 'text/html' } }
          )
        })
    )
    return
  }

  // B. Backend API calls (/api/*): Try Network, Fallback to Mock Offline JSON
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          if (url.pathname === '/api/bootstrap') {
            return new Response(
              JSON.stringify({ ok: true, offline: true, tenants: [], saasConfig: null }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            )
          }
          return new Response(
            JSON.stringify({ ok: true, offline: true }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          )
        })
    )
    return
  }

  // C. Static Assets (/assets/*, .js, .css, fonts, images): Cache-First Strategy
  const isStaticAsset = (
    url.pathname.startsWith('/assets/') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.webmanifest')
  )

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return networkResponse
        }).catch(() => {
          // If offline and not in cache, fallback
          return new Response('', { status: 408 })
        })
      })
    )
    return
  }

  // D. Default: Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const networked = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return networkResponse
      }).catch(() => cached)

      return cached || networked
    })
  )
})
