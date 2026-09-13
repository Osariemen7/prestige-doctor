const PRECACHE_ENTRIES = self.__WB_MANIFEST;
const CACHE_REVISION = Array.isArray(PRECACHE_ENTRIES) ? PRECACHE_ENTRIES.map((entry) => typeof entry === 'string' ? entry : `${entry.url}:${entry.revision || ""}`).join('|').slice(-32) : 'local';
const CACHE = `prestige-doctor-shell-${CACHE_REVISION || 'local'}`;
const SHELL = Array.isArray(PRECACHE_ENTRIES)
  ? PRECACHE_ENTRIES.map((entry) => typeof entry === 'string' ? entry : entry.url)
  : [];
self.addEventListener('install', (event) => event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL.map((url) => new Request(new URL(url, self.location.origin), { cache: 'reload' }))))));
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
const notificationRoute = (id) => typeof id === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? `/app/notifications/${id}` : '/app/notifications';
self.addEventListener('push', (event) => event.waitUntil((async () => {
  let payload = {}; try { payload = event.data?.json() || {}; } catch { /* Preserve a private preview. */ }
  if (payload.app && payload.app !== 'doctor') return;
  await self.registration.showNotification('Prestige Doctor', { body: 'You have a new care update. Open the app to view it.', icon: '/logo192.png', badge: '/logo192.png', tag: String(payload.id || payload.notification_id || 'care-update'), data: { notification_id: payload.notification_id || payload.id || null } });
  const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
  clients.forEach((client) => client.postMessage({ type: 'DOCTOR_PUSH_RECEIVED' }));
})()));
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const route = notificationRoute(event.notification.data?.notification_id);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const target = windows.find((client) => client.url === new URL(route, self.location.origin).href);
    if (target) return target.focus();
    return self.clients.openWindow(route);
  })());
});
