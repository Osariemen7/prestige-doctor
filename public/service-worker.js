const CACHE = 'prestige-doctor-shell-v1';
const PRECACHE_ENTRIES = self.__WB_MANIFEST;
const SHELL = Array.isArray(PRECACHE_ENTRIES)
  ? PRECACHE_ENTRIES.map((entry) => typeof entry === 'string' ? entry : entry.url)
  : [];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL))));
self.addEventListener('activate', (event) => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter((key) => key !== CACHE && (key.startsWith('prestige-doctor-') || key.startsWith('workbox-precache'))).map((key) => caches.delete(key)));
  await self.clients.claim();
})()));
self.addEventListener('message', (event) => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(fetch(event.request).catch(async () => caches.match('/offline.html')));
    return;
  }
  // Only public build assets are cached. Never cache API responses or mutations.
  if (!url.pathname.startsWith('/assets/')) return;
  event.respondWith(caches.open(CACHE).then(async (cache) => {
    const cached = await cache.match(event.request);
    if (cached) return cached;
    const response = await fetch(event.request);
    if (response.ok && response.type === 'basic') await cache.put(event.request, response.clone());
    return response;
  }));
});
const safeRoute = (value) => {
  if (typeof value !== 'string' || !/^\/app(?:\/|$)/.test(value) || /[\\\x00-\x1f]/.test(value)) return '/app/notifications';
  try { const url = new URL(value, self.location.origin); return url.origin === self.location.origin && /^\/app(?:\/|$)/.test(url.pathname) ? url.pathname + url.search + url.hash : '/app/notifications'; } catch { return '/app/notifications'; }
};
self.addEventListener('push', (event) => event.waitUntil((async () => {
  let payload = {}; try { payload = event.data?.json() || {}; } catch { /* Preserve a private preview. */ }
  if (payload.app && payload.app !== 'doctor') return;
  await self.registration.showNotification('Prestige Doctor', { body: 'You have a new care update. Open the app to view it.', icon: '/logo192.png', badge: '/logo192.png', tag: String(payload.id || payload.notification_id || 'care-update'), data: { route: safeRoute(payload.route) } });
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: 'DOCTOR_PUSH_RECEIVED' }));
})()));
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = safeRoute(event.notification.data?.route);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const target = windows.find((client) => new URL(client.url).origin === self.location.origin);
    if (target) { await target.navigate(route); return target.focus(); }
    return self.clients.openWindow(route);
  })());
});
