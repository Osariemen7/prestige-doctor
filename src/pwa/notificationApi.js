import { request } from '../vnext/api';
import { registerDoctorWorker } from './register';
import { safeDoctorPath } from './safePath';

const APP = 'doctor';
const newId = () => globalThis.crypto?.randomUUID?.() || `doctor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
export const notificationPath = (item) => safeDoctorPath(item?.route);
export const listNotifications = (cursor, signal) => request(`/care/notifications?app=${APP}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, { signal });
export const notificationSummary = (signal) => request(`/care/notifications/summary?app=${APP}`, { signal });
export const readNotification = (id) => request(`/care/notifications/${encodeURIComponent(id)}/read`, { method: 'POST', body: { app: APP }, commandKey: `doctor-notification-read-${id}` });
export const getNotificationPreferences = () => request(`/care/notifications/preferences?app=${APP}`);
export const saveNotificationPreferences = (preferences) => request('/care/notifications/preferences?app=doctor', { method: 'PATCH', body: { ...preferences, app: APP }, commandKey: newId() });

const decodeKey = (key) => {
  const padded = key.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(key.length / 4) * 4, '=');
  return Uint8Array.from(atob(padded), (character) => character.charCodeAt(0));
};

export async function enableDoctorPush() {
  if (!('Notification' in window) || !('PushManager' in window) || !('serviceWorker' in navigator)) throw new Error('Push is unavailable in this browser. On iPhone, add this app to your Home Screen and open it there.');
  // Request permission directly from the button gesture, before network work.
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Notifications are blocked. Enable them in your browser settings to receive alerts.');
  const capabilities = await request('/care/capabilities');
  const config = capabilities.capabilities?.web_push;
  if (!config?.enabled || !config.vapid_public_key) throw new Error('Device notifications are not available yet. Your notifications remain in the app.');
  const registration = await registerDoctorWorker();
  if (!registration) throw new Error('App notifications require the secure production app.');
  await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: decodeKey(config.vapid_public_key) });
  try {
    return await request('/care/notifications/subscriptions', { method: 'POST', body: { app: APP, subscription: subscription.toJSON() }, commandKey: newId() });
  } catch (error) {
    await subscription.unsubscribe().catch(() => false);
    throw error;
  }
}

export async function disableDoctorPush() {
  const registration = await navigator.serviceWorker?.getRegistration('/');
  const subscription = await registration?.pushManager?.getSubscription();
  if (!subscription) return;
  await subscription.unsubscribe();
  let failure;
  try { await request('/care/notifications/subscriptions', { method: 'DELETE', body: { app: APP, endpoint: subscription.endpoint }, commandKey: newId() }); }
  catch (error) { failure = error; }
  if (failure) throw failure;
}
