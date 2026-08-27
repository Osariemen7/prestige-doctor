/*
 * PrestigeHealth Provider – minimal service worker.
 *
 * Policy:
 *   - Cache-first ONLY for built static assets under /static/ (content-hashed
 *     bundles produced by the build tool). These are immutable, so serving
 *     them from cache is always safe.
 *   - NEVER cache API traffic: any request to /api/* or to an external host
 *     (including the clinical API) goes straight to the network untouched.
 *   - Navigations are never served from cache except as a last-resort
 *     offline fallback to the app shell.
 */
const CACHE_NAME = 'prestige-provider-static-v1';
const STATIC_PREFIX = '/static/';

self.addEventListener('install', (event) => {
  // No precaching: assets are added opportunistically on first fetch.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('prestige-provider-') && name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  // Only same-origin GET requests are eligible for caching.
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // API hosts & CDNs: network only

  const path = url.pathname;

  if (path.startsWith(STATIC_PREFIX)) {
    // Immutable hashed bundle -> cache first.
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        try {
          const response = await fetch(request);
          if (response && response.ok) {
            cache.put(request, response.clone());
          }
          return response;
        } catch (error) {
          return new Response('', { status: 504, statusText: 'Offline' });
        }
      })()
    );
    return;
  }

  if (request.mode === 'navigate') {
    // App shell: network first so clinicians always get current UI,
    // with a cached-shell fallback when offline.
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          cache.put('/index.html', response.clone());
          return response;
        } catch (error) {
          const cache = await caches.open(CACHE_NAME);
          const shell = await cache.match('/index.html');
          return (
            shell ||
            new Response('You are offline.', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            })
          );
        }
      })()
    );
    return;
  }

  // Everything else (API calls, manifests, images): straight network.
});
