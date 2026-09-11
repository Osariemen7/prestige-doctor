let registrationPromise;
export const registerDoctorWorker = () => {
  if (!('serviceWorker' in navigator) || process.env.NODE_ENV !== 'production') return Promise.resolve(null);
  if (!registrationPromise) {
    registrationPromise = navigator.serviceWorker.register('/service-worker.js', { scope: '/', updateViaCache: 'none' }).then((registration) => {
      const announce = () => window.dispatchEvent(new CustomEvent('doctor-update-available', { detail: registration }));
      if (registration.waiting) announce();
      registration.addEventListener('updatefound', () => {
        const installing = registration.installing;
        installing?.addEventListener('statechange', () => {
          if (installing.state === 'installed' && navigator.serviceWorker.controller) announce();
        });
      });
      return registration;
    }).catch(() => { registrationPromise = null; return null; });
  }
  return registrationPromise;
};
