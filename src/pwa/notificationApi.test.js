import { notificationPath, readNotification, listNotifications, disableDoctorPush } from './notificationApi';
import { request } from '../vnext/api';
jest.mock('../vnext/api', () => ({ request: jest.fn() }));
test('uses role-scoped inbox and stable read acknowledgements', async () => {
  await listNotifications('cursor/next'); await readNotification('notice-1');
  expect(request).toHaveBeenCalledWith('/care/notifications?app=doctor&cursor=cursor%2Fnext', expect.any(Object));
  expect(request).toHaveBeenCalledWith('/care/notifications/notice-1/read', expect.objectContaining({ commandKey: 'doctor-notification-read-notice-1', body: { app: 'doctor' } }));
  expect(notificationPath({ route: 'https://evil.test' })).toBe('/app/queue');
});
test('logout unsubscribes this device even when server cleanup cannot be reached', async () => {
  const unsubscribe = jest.fn().mockResolvedValue(true);
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration: jest.fn().mockResolvedValue({ pushManager: { getSubscription: jest.fn().mockResolvedValue({ endpoint: 'https://push.test/device', unsubscribe }) } }) } });
  request.mockRejectedValueOnce(new Error('offline'));
  await expect(disableDoctorPush()).rejects.toThrow('offline');
  expect(unsubscribe).toHaveBeenCalledTimes(1);
});
