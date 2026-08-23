// Privacy-safe doctor analytics. Only operational, non-clinical dimensions
// leave the browser. Never send names, IDs, diagnoses, results, transcript
// text, proposal hashes, drafts, phone numbers, or funding amounts.

const ALLOWED_EVENTS = new Set([
  'queue_viewed',
  'case_opened',
  'case_claimed',
  'case_released',
  'decision_started',
  'decision_result',
  'documentation_opened',
  'documentation_edit_started',
  'documentation_confirmation_opened',
  'documentation_decision_result',
  'clinical_service_opened',
  'transition_opened',
  'low_bandwidth_state',
  'contract_error',
]);

const ANALYTICS_ENDPOINT = process.env.REACT_APP_DOCTOR_ANALYTICS_ENDPOINT || '';

const cleanValue = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length <= 80 && !/[+@/\\]/.test(value)) return value;
  return undefined;
};

export const trackDoctorEvent = (event, properties = {}) => {
  if (!ALLOWED_EVENTS.has(event) || typeof window === 'undefined') return;
  const safeProperties = Object.entries(properties).reduce((result, [key, value]) => {
    const cleaned = cleanValue(value);
    if (cleaned !== undefined && !/(name|phone|email|diagnos|result|transcript|hash|draft|token|amount|price|fund|sponsor|margin|settlement|revenue|patient|proposal|episode|goal|task|order|transition|service)/i.test(key)) result[key] = cleaned;
    return result;
  }, {});
  const payload = JSON.stringify({ event, occurred_at: new Date().toISOString(), properties: safeProperties });
  if (ANALYTICS_ENDPOINT && typeof navigator?.sendBeacon === 'function') {
    try { navigator.sendBeacon(ANALYTICS_ENDPOINT, new Blob([payload], { type: 'application/json' })); } catch { /* telemetry must never interrupt care */ }
  }
};
