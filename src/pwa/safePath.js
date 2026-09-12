export const safeDoctorPath = (value, fallback = '/app/queue') => {
  if (typeof value !== 'string' || !value.startsWith('/app') || value.startsWith('//') || /[\\\x00-\x1f]/.test(value)) return fallback;
  try {
    const url = new URL(value, 'https://doctor.invalid');
    const decoded = decodeURIComponent(url.pathname);
    if (/[\\\x00-\x1f]/.test(decoded)) return fallback;
    if (url.origin !== 'https://doctor.invalid' || !/^\/app(?:\/|$)/.test(url.pathname)) return fallback;
    url.searchParams.delete('demo');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return fallback; }
};
export const loginForPath = (value) => `/login?next=${encodeURIComponent(safeDoctorPath(value))}`;
