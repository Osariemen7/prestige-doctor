import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { disableDoctorPush, enableDoctorPush, listNotifications, notificationPath, readNotification, getNotificationPreferences, saveNotificationPreferences } from './notificationApi';
import { EmptyState, ErrorState, LoadingState } from '../vnext/components';

export default function NotificationsScreen() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState('');
  const [preferences, setPreferences] = useState(null);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async (next) => {
    setLoading(true); setError(null);
    try { const result = await listNotifications(next); if (!Array.isArray(result.items)) throw new Error('Notifications could not be loaded.'); setItems((current) => next ? [...current, ...result.items] : result.items); setCursor(result.next_cursor); }
    catch (failure) { setError(failure); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); getNotificationPreferences().then(setPreferences).catch(setError); }, [load]);
  const savePreferences = async (event) => {
    event.preventDefault();
    const hours = preferences?.quiet_hours || {};
    if (Object.keys(hours).length && (!/^([01]\d|2[0-3]):[0-5]\d$/.test(hours.start || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(hours.end || ''))) { setError(new Error('Choose valid start and end times.')); return; }
    setSaving(true); setError(null);
    try { setPreferences(await saveNotificationPreferences(preferences)); setNotice('Notification preferences saved.'); } catch (failure) { setError(failure); } finally { setSaving(false); }
  };
  const toggle = async (enable) => {
    setBusy(true); setError(null); setNotice('');
    try { await (enable ? enableDoctorPush() : disableDoctorPush()); if (enable) { const current = preferences || await getNotificationPreferences(); setPreferences(await saveNotificationPreferences({ ...current, push_enabled: true })); } setNotice(enable ? 'Notifications enabled for this device. You can change this at any time.' : 'Notifications disabled for this device.'); }
    catch (failure) { setError(failure); }
    finally { setBusy(false); }
  };
  const open = async (item) => {
    try { await readNotification(item.id || item.public_id); window.dispatchEvent(new Event('doctor-notifications-changed')); navigate(notificationPath(item)); }
    catch (failure) { setError(failure); }
  };
  return <><div className="vnext-page-header"><div><h1>Notifications</h1><p>Your care updates in one place. Device alerts use a private preview; open the app for details.</p></div><button className="vnext-button vnext-button--secondary" onClick={() => load()} disabled={loading}>Refresh</button></div>
    <section className="vnext-panel doctor-notification-settings"><h2>Stay up to date</h2><p>Enable alerts on this device for care updates. On iPhone, first download the app to your Home Screen and open it there.</p><div className="vnext-form-actions"><button type="button" className="vnext-button vnext-button--primary" onClick={() => toggle(true)} disabled={busy}>Enable notifications</button><button type="button" className="vnext-button vnext-button--secondary" onClick={() => toggle(false)} disabled={busy}>Disable on this device</button></div>{notice && <p role="status">{notice}</p>}</section>
    {preferences && <form className="vnext-panel doctor-notification-settings vnext-spaced" onSubmit={savePreferences}><h2>Your preferences</h2><label><input type="checkbox" checked={preferences.push_enabled === true} onChange={(event) => setPreferences({ ...preferences, push_enabled: event.target.checked })} /> Receive device alerts</label><br/><label><input type="checkbox" checked={preferences.whatsapp_fallback_enabled === true} onChange={(event) => setPreferences({ ...preferences, whatsapp_fallback_enabled: event.target.checked })} /> Use WhatsApp when an important update needs a fallback</label><p>Quiet hours use Nigeria time (Africa/Lagos).</p><label><input type="checkbox" checked={Boolean(preferences.quiet_hours?.start)} onChange={(event) => setPreferences({ ...preferences, quiet_hours: event.target.checked ? { start: '21:00', end: '07:00', timezone: 'Africa/Lagos' } : {} })} /> Use quiet hours</label>{preferences.quiet_hours?.start && <div className="vnext-form-actions"><label>From <input aria-label="Quiet hours start" type="time" value={preferences.quiet_hours.start} onChange={(event) => setPreferences({ ...preferences, quiet_hours: { ...preferences.quiet_hours, start: event.target.value, timezone: 'Africa/Lagos' } })}/></label><label>Until <input aria-label="Quiet hours end" type="time" value={preferences.quiet_hours.end} onChange={(event) => setPreferences({ ...preferences, quiet_hours: { ...preferences.quiet_hours, end: event.target.value, timezone: 'Africa/Lagos' } })}/></label></div>}<div className="vnext-form-actions"><button type="submit" className="vnext-button vnext-button--primary" disabled={saving}>{saving ? 'Saving...' : 'Save preferences'}</button></div></form>}
    {error && <ErrorState error={error} onRetry={() => load()} />}
    <section className="vnext-panel vnext-spaced" aria-label="Notifications">{items.map((item) => <button type="button" className="vnext-alert-row" key={item.id || item.public_id} onClick={() => open(item)}><span><strong>{item.title || 'Care update'}{!item.read_at && <span aria-label="Unread"> ·</span>}</strong><small>{item.body || 'Open to view your update'}{item.created_at && ` · ${new Date(item.created_at).toLocaleString('en-NG')}`}</small></span></button>)}{loading ? <LoadingState /> : !items.length && !error ? <EmptyState title="You're up to date" body="New care updates will appear here." /> : null}{cursor && <button type="button" className="vnext-button vnext-button--secondary" onClick={() => load(cursor)} disabled={loading}>Load more</button>}</section>
  </>;
}
