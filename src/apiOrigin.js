export const DEFAULT_DOCTOR_API_ORIGIN = 'https://api.prestigedelta.com';

const normalizeOrigin = (value) => String(value).trim().replace(/\/+$/, '');

const runtimeOrigin = () => {
  if (typeof globalThis !== 'undefined' && typeof globalThis.__PRESTIGE_API_ORIGIN__ === 'string') {
    return globalThis.__PRESTIGE_API_ORIGIN__;
  }
  return '';
};

/**
 * Resolve the doctor API origin at request time. QA requires an explicit
 * origin, while non-QA callers retain the existing production fallback.
 */
export function getDoctorApiOrigin({ env, runtime } = {}) {
  const sourceEnv = env || process.env;
  const configured = runtime || runtimeOrigin() || sourceEnv.REACT_APP_QA_API_ORIGIN || sourceEnv.REACT_APP_API_BASE_URL || sourceEnv.REACT_APP_BACKEND_BASE_URL || sourceEnv.VITE_API_ORIGIN || sourceEnv.VITE_BACKEND_BASE_URL;
  const qaMode = ['qa', 'test-qa'].includes(String(sourceEnv.REACT_APP_ENV || '').toLowerCase()) || sourceEnv.REACT_APP_QA_MODE === 'true';

  if (configured) return normalizeOrigin(configured);
  if (qaMode) {
    throw new Error('Doctor QA mode requires an explicit API origin.');
  }
  return DEFAULT_DOCTOR_API_ORIGIN;
}

export function resolveDoctorApiUrl(path, options = {}) {
  return `${getDoctorApiOrigin(options)}${path}`;
}
