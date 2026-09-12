import { vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
const source = fs.readFileSync(path.join(process.cwd(), 'public/service-worker.js'), 'utf8').replace('self.__WB_MANIFEST', '[{url:"/index.html"},{url:"/offline.html"}]');
function worker() {
  const handlers = {};
  const self = { location: { origin: 'https://doctor.test' }, addEventListener: (name, callback) => { handlers[name] = callback; }, registration: { showNotification: vi.fn().mockResolvedValue() }, clients: { matchAll: vi.fn().mockResolvedValue([]), openWindow: vi.fn().mockResolvedValue(), claim: vi.fn() }, skipWaiting: vi.fn() };
  vm.runInNewContext(source, { self, URL, caches: { open: vi.fn(), match: vi.fn(), keys: vi.fn() }, fetch: vi.fn() });
  return { self, handlers };
}
test('never intercepts API, cross-origin reads, or mutation requests', () => {
  const { handlers } = worker();
  for (const [url, method] of [['https://doctor.test/care/timeline', 'GET'], ['https://api.test/care', 'GET'], ['https://doctor.test/assets/clinical.js', 'POST']]) {
    const respondWith = vi.fn(); handlers.fetch({ request: { url, method, mode: 'cors' }, respondWith }); expect(respondWith).not.toHaveBeenCalled();
  }
});
test('push preview is private and unsafe links stay inside the app', async () => {
  const { self, handlers } = worker(); let pending;
  handlers.push({ data: { json: () => ({ app: 'doctor', title: 'Patient name', body: 'Clinical details', route: '//evil.test' }) }, waitUntil: (promise) => { pending = promise; } });
  await pending;
  expect(self.registration.showNotification).toHaveBeenCalledWith('Prestige Doctor', expect.objectContaining({ body: 'You have a new care update. Open the app to view it.', data: { notification_id: null } }));
});
test('a notification for another app is ignored', async () => {
  const { self, handlers } = worker(); let pending;
  handlers.push({ data: { json: () => ({ app: 'patient' }) }, waitUntil: (promise) => { pending = promise; } });
  await pending; expect(self.registration.showNotification).not.toHaveBeenCalled();
});

test('click resolves an opaque notification and never overwrites a case draft', async () => {
  const { self, handlers } = worker(); let pending;
  const target = { url: 'https://doctor.test/app/cases/case-1/documentation', navigate: vi.fn(), focus: vi.fn() };
  self.clients.matchAll.mockResolvedValue([target]);
  const id = 'c4131810-0715-43f7-9481-7ae9c509e594';
  handlers.notificationclick({ notification: { close: vi.fn(), data: { notification_id: id, route: '/app/cases/forged' } }, waitUntil: (promise) => { pending = promise; } });
  await pending;
  expect(target.navigate).not.toHaveBeenCalled();
  expect(self.clients.openWindow).toHaveBeenCalledWith(`/app/notifications/${id}`);
});
