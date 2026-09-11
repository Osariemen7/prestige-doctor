import React, { useEffect, useState } from 'react';
import { registerDoctorWorker } from './register';

export default function PwaStatus() {
  const [update, setUpdate] = useState(null);
  useEffect(() => {
    const found = (event) => setUpdate(event.detail);
    window.addEventListener('doctor-update-available', found);
    registerDoctorWorker();
    return () => window.removeEventListener('doctor-update-available', found);
  }, []);
  if (!update?.waiting) return null;
  const apply = () => {
    if (!window.confirm('Reload to update the app? Submit or copy any unfinished notes first.')) return;
    navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload(), { once: true });
    update.waiting.postMessage({ type: 'SKIP_WAITING' });
  };
  return <div className="doctor-update" role="status">An app update is ready. <button type="button" onClick={apply}>Update when ready</button></div>;
}
