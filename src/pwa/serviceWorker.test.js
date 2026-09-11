import fs from 'fs';
import path from 'path';
import vm from 'vm';
const source = fs.readFileSync(path.join(process.cwd(), 'public/service-worker.js'), 'utf8').replace('__SHELL_ASSETS__', '["/index.html", "/offline.html"]');
function worker() {
  const handlers = {};
  const self = { location: { origin: 'https://doctor.test' }, addEventListener: (name, callback) => { handlers[name] = callback; }, registration: { showNotification: jest.fn().mockResolvedValue() }, clients: { matchAll: jest.fn().mockResolvedValue([]), openWindow: jest.fn().mockResolvedValue(), claim: jest.fn() }, skipWaiting: jest.fn() };
  vm.runInNewContext(source, { self, URL, caches: { open: jest.fn(), match: jest.fn(), keys: jest.fn() }, fetch: jest.fn() });
  return { self, handlers };
}
test('never intercepts API, cross-origin reads, or mutation requests', () => {
  const { handlers } = worker();
  for (const [url, method] of [['https://doctor.test/care/timeline', 'GET'], ['https://api.test/care', 'GET'], ['https://doctor.test/assets/clinical.js', 'POST']]) {
    const respondWith = jest.fn(); handlers.fetch({ request: { url, method, mode: 'cors' }, respondWith }); expect(respondWith).not.toHaveBeenCalled();
  }
});
test('push preview is private and unsafe links stay inside the app', async () => {
  const { self, handlers } = worker(); let pending;
  handlers.push({ data: { json: () => ({ app: 'doctor', title: 'Patient name', body: 'Clinical details', route: '//evil.test' }) }, waitUntil: (promise) => { pending = promise; } });
  await pending;
  expect(self.registration.showNotification).toHaveBeenCalledWith('Prestige Doctor', expect.objectContaining({ body: 'You have a new care update. Open the app to view it.', data: { route: '/app/notifications' } }));
});
test('a notification for another app is ignored', async () => {
  const { self, handlers } = worker(); let pending;
  handlers.push({ data: { json: () => ({ app: 'patient' }) }, waitUntil: (promise) => { pending = promise; } });
  await pending; expect(self.registration.showNotification).not.toHaveBeenCalled();
});
