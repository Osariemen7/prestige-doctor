import React, { useEffect, useState } from 'react';
import { registerDoctorWorker } from './register';
import { isDoctorUpdateGuarded } from './updateGuard';

export default function PwaStatus() {
  const [update, setUpdate] = useState(null);
  const [guarded, setGuarded] = useState(() => isDoctorUpdateGuarded());
  useEffect(() => {
    const found = (event) => setUpdate(event.detail);
    window.addEventListener('doctor-update-available', found);
    const guardChanged = () => setGuarded(isDoctorUpdateGuarded());
    window.addEventListener('doctor-update-guard-changed', guardChanged);
    registerDoctorWorker();
    return () => { window.removeEventListener('doctor-update-available', found); window.removeEventListener('doctor-update-guard-changed', guardChanged); }
  }, []);
  if (!update?.waiting) return null;
  const apply = () => {
    if (!window.confirm('Reload to update the app? Submit or copy any unfinished notes first.')) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    update.waiting.postMessage({ type: 'SKIP_WAITING' });
  };
  return <div className="doctor-update" role="status">An app update is ready. {guarded ? <span>Finish the active clinical form or submission before updating.</span> : <button type="button" onClick={apply}>Update when ready</button>}</div>;
}
