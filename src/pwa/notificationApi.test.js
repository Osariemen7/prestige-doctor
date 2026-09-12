import { vi } from 'vitest';
import { notificationPath, readNotification, listNotifications, disableDoctorPush } from './notificationApi';
import { request } from '../vnext/api';
vi.mock('../vnext/api', () => ({ request: vi.fn() }));
test('uses role-scoped inbox and stable read acknowledgements', async () => {
  await listNotifications('cursor/next'); await readNotification('notice-1');
  expect(request).toHaveBeenCalledWith('/care/notifications?app=doctor&cursor=cursor%2Fnext', expect.any(Object));
  expect(request).toHaveBeenCalledWith('/care/notifications/notice-1/read', expect.objectContaining({ commandKey: 'doctor-notification-read-notice-1', body: { app: 'doctor' } }));
  expect(notificationPath({ route: 'https://evil.test' })).toBe('/app/notifications');
});
test('logout unsubscribes this device even when server cleanup cannot be reached', async () => {
  const unsubscribe = vi.fn().mockResolvedValue(true);
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: vi.fn().mockResolvedValue({ pushManager: { getSubscription: vi.fn().mockResolvedValue({ endpoint: 'https://push.test/device', unsubscribe }) } }) } });
  localStorage.setItem('prestige.doctor.push-binding', JSON.stringify({ id: 'subscription-1' }));
  request.mockRejectedValueOnce(new Error('offline'));
  await expect(disableDoctorPush()).rejects.toThrow('offline');
  expect(unsubscribe).toHaveBeenCalledTimes(1);
  expect(request).toHaveBeenCalledWith('/care/notifications/subscriptions/subscription-1', expect.objectContaining({ method: 'DELETE', body: { app: 'doctor' } }));
});
