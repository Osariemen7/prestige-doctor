import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { notificationSummary } from './notificationApi';

export default function NotificationLink() {
  const [count, setCount] = useState(null);
  useEffect(() => {
    let active = true;
    const refresh = () => { if (!navigator.onLine || document.hidden) return; notificationSummary().then((result) => { if (active) setCount(result.unread_count); }).catch(() => { if (active) setCount(null); }); };
    refresh(); const interval = setInterval(refresh, 30000);
    window.addEventListener('online', refresh); window.addEventListener('doctor-notifications-changed', refresh); document.addEventListener('visibilitychange', refresh);
    const message = (event) => { if (event.data?.type === 'DOCTOR_PUSH_RECEIVED') refresh(); };
    navigator.serviceWorker?.addEventListener('message', message);
    return () => { active = false; clearInterval(interval); window.removeEventListener('online', refresh); window.removeEventListener('doctor-notifications-changed', refresh); document.removeEventListener('visibilitychange', refresh); navigator.serviceWorker?.removeEventListener('message', message); };
  }, []);
  return <NavLink className="vnext-button vnext-button--secondary vnext-button--small" to="/app/notifications">Notifications{count > 0 ? ` (${count > 99 ? '99+' : count})` : ''}</NavLink>;
}
