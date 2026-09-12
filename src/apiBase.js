import { getDoctorApiOrigin } from './apiOrigin';

export const DEFAULT_BACKEND_BASE_URL = 'https://api.prestigedelta.com';

/** Resolve backend requests while keeping the deployed production default. */
export const getBackendBaseUrl = () => getDoctorApiOrigin();

export const resolveBackendUrl = (pathOrUrl) => {
  const raw = String(pathOrUrl || '');
  const base = getBackendBaseUrl();
  if (!raw) return base;
  if (/^https?:\/\//i.test(raw)) {
    if (raw === DEFAULT_BACKEND_BASE_URL || raw.startsWith(`${DEFAULT_BACKEND_BASE_URL}/`)) {
      return `${base}${raw.slice(DEFAULT_BACKEND_BASE_URL.length)}`;
    }
    return raw;
  }
  return `${base}/${raw.replace(/^\/+/, '')}`;
};
