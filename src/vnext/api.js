import { getAccessToken, tryRestoreSession, logout } from '../api';
import {
  claimDemoProposal,
  getDemoAlerts,
  getDemoClinicalService,
  getDemoContribution,
  getDemoInbox,
  getDemoInitialState,
  getDemoProgress,
  getDemoProposal,
  getDemoProtocols,
  getDemoTransition,
  resetDemoState,
  submitDemoProtocolDecision,
  submitDemoDecision,
} from './demoFixtures';
import {
  normalizeClinicalService,
  normalizePatientProgress,
  normalizeProposal,
  normalizeQueueItem,
  normalizeTransition,
} from './contract';
import { resolveDoctorApiUrl } from '../apiOrigin';

const CLIENT_VERSION = process.env.REACT_APP_BUILD_SHA || process.env.VITE_BUILD_SHA || 'doctor-vnext-local';
const DEMO_ENABLED = process.env.REACT_APP_ENABLE_DEMO === 'true' || process.env.VITE_ENABLE_DEMO === 'true';
const mutationKeys = new Map();

export class DoctorApiError extends Error {
  constructor(message, details = {}) {
    super(message);
    this.name = 'DoctorApiError';
    Object.assign(this, details);
  }
}

export const isDemoEnabled = (explicit = false) => process.env.NODE_ENV !== 'production' && (explicit || DEMO_ENABLED);

const uuid = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `doctor-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getCommandKey = (scope) => {
  if (!mutationKeys.has(scope)) mutationKeys.set(scope, uuid());
  return mutationKeys.get(scope);
};

export const forgetCommandKey = (scope) => mutationKeys.delete(scope);

const getCorrelationId = (provided, scope) => provided || getCommandKey(`correlation:${scope}`);

const parseBody = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json().catch(() => ({}));
  const text = await response.text().catch(() => '');
  return text ? { raw: text } : {};
};

const errorFromResponse = (response, body, path) => new DoctorApiError(
  body?.detail || body?.error || body?.message || `Request failed with status ${response.status}`,
  {
    status: response.status,
    payload: body,
    path,
    code: body?.code || (response.status === 409 ? 'conflict' : response.status === 403 ? 'forbidden' : response.status === 404 ? 'contract_unavailable' : 'request_failed'),
    staleProposal: body?.code === 'stale_proposal' || Boolean(body?.current_proposal_hash),
  }
);

const validateObject = (value, label) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DoctorApiError(`We could not safely display the latest ${label}.`, { code: 'schema_mismatch' });
  return value;
};

const validateQueue = (value) => {
  const rows = Array.isArray(value) ? value : value?.results || value?.items || value?.inbox;
  if (!Array.isArray(rows)) throw new DoctorApiError('We could not safely display the latest review queue.', { code: 'schema_mismatch' });
  return rows.map(normalizeQueueItem);
};

const validateProposalForReview = (proposal) => {
  if (!proposal.public_id || !proposal.proposal_hash || proposal.hash_contract?.exact_hash_required !== true) {
    throw new DoctorApiError('We could not safely display the latest clinical proposal.', { code: 'schema_mismatch' });
  }
  const malformedRegimen = (proposal.proposed_plan_version?.regimens || []).some((regimen) => {
    if (!regimen.medication_name) return true;
    const authorization = regimen.order_authorization;
    return !regimen.dose_amount || !regimen.dose_unit || !regimen.route || !regimen.frequency_text || !regimen.duration_days || !authorization || authorization.dispense_quantity === undefined || authorization.authorized_quantity === undefined;
  });
  if (malformedRegimen) throw new DoctorApiError('We could not safely display the medication authority in this proposal.', { code: 'schema_mismatch' });
  return proposal;
};

export const request = async (path, options = {}, attempt = 0) => {
  const token = await getAccessToken();
  const method = String(options.method || 'GET').toUpperCase();
  const mutation = method !== 'GET' && method !== 'HEAD';
  const headers = {
    Accept: 'application/json',
    'X-Client-Version': CLIENT_VERSION,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(mutation ? { 'Content-Type': 'application/json', 'Idempotency-Key': options.commandKey || getCommandKey(`mutation:${method}:${path}`), 'X-Correlation-ID': getCorrelationId(options.correlationId, options.correlationScope || path) } : {}),
    ...(options.headers || {}),
  };
  let response;
  try {
    response = await fetch(resolveDoctorApiUrl(path), { method, headers, cache: 'no-store', body: mutation && options.body !== undefined ? JSON.stringify(options.body) : undefined, signal: options.signal });
  } catch (cause) {
    throw new DoctorApiError('The Care Kernel could not be reached. Your current work remains unresolved.', { code: 'network_error', cause, path });
  }
  const body = await parseBody(response);
  if (response.status === 401 && attempt === 0) {
    await tryRestoreSession().catch(() => null);
    return request(path, options, 1);
  }
  if (response.status === 401 && typeof window !== 'undefined') { logout(); window.dispatchEvent(new Event('doctor-auth-required')); }
  if (!response.ok) throw errorFromResponse(response, body, path);
  return body;
};

const demoRequest = async (operation, args = {}) => {
  // Keep the synthetic adapter API-shaped. It is not browser persistence and
  // is only reachable from the explicitly labelled demo route/flag.
  switch (operation) {
    case 'inbox': return { items: getDemoInbox(), summary: { assigned: 3, mine: 0, pool: 2, urgent: 1, needs_attention: 3 } };
    case 'proposal': return getDemoProposal(args.proposalId);
    case 'claim': return claimDemoProposal(args.proposalId, args.action);
    case 'decision': return submitDemoDecision(args.proposalId, args.payload);
    case 'clinical-service': return getDemoClinicalService(args.orderId);
    case 'transition': return getDemoTransition(args.transitionId);
    case 'progress': return getDemoProgress(args.patientId);
    case 'alerts': return getDemoAlerts();
    case 'protocols': return getDemoProtocols();
    case 'protocol-decision': return submitDemoProtocolDecision(args.candidateId, args.payload);
    case 'contribution': return getDemoContribution();
    case 'reset': return { ...getDemoInitialState(), reset: Boolean(resetDemoState()) };
    default: throw new DoctorApiError('Synthetic capability is not available.', { code: 'demo_contract_unavailable' });
  }
};

export const fetchReviewInbox = async ({ queue = 'assigned', urgency, dueBefore, authority, population, cursor, demo = false, signal } = {}) => {
  if (isDemoEnabled(demo)) {
    const result = await demoRequest('inbox');
    return { ...result, items: validateQueue(result.items) };
  }
  const params = new URLSearchParams({ queue });
  if (urgency) params.set('urgency', urgency);
  if (dueBefore) params.set('due_before', dueBefore);
  if (authority) params.set('authority', authority);
  if (population) params.set('population', population);
  if (cursor) params.set('cursor', cursor);
  const result = await request(`/provider/care-review-inbox?${params.toString()}`, { signal });
  return { ...result, items: validateQueue(result) };
};

export const fetchReviewAlerts = async ({ status, demo = false, signal } = {}) => {
  if (isDemoEnabled(demo)) return demoRequest('alerts');
  const params = status ? `?status=${encodeURIComponent(status)}` : '';
  const result = await request(`/provider/clinical-case-alerts${params}`, { signal });
  return Array.isArray(result) ? result : result?.results || result?.items || [];
};

export const fetchProposal = async ({ proposalId, demo = false, signal } = {}) => {
  if (!proposalId) throw new DoctorApiError('A proposal identifier is required.', { code: 'invalid_request' });
  const result = isDemoEnabled(demo) ? await demoRequest('proposal', { proposalId }) : await request(`/care/proposals/${encodeURIComponent(proposalId)}`, { signal });
  if (!result) throw new DoctorApiError('This proposal is not available in the current claim scope.', { code: 'contract_unavailable', status: 404 });
  return validateProposalForReview(normalizeProposal(validateObject(result, 'clinical proposal')));
};

export const mutateReviewClaim = async ({ proposalId, action, commandKey, correlationId, demo = false, signal } = {}) => {
  if (!['claim', 'heartbeat', 'release', 'decline'].includes(action)) throw new DoctorApiError('Unsupported claim action.', { code: 'invalid_request' });
  if (isDemoEnabled(demo)) return demoRequest('claim', { proposalId, action });
  const result = await request(`/care/proposals/${encodeURIComponent(proposalId)}/review-claim`, { method: 'POST', body: { action }, commandKey, correlationId, correlationScope: `proposal:${proposalId}`, signal });
  return normalizeProposal(validateObject(result, 'claim state'));
};

export const submitDoctorDecision = async ({ proposalId, payload, commandKey, correlationId, demo = false, signal } = {}) => {
  if (!proposalId || !payload?.decision || !payload?.proposal_hash) throw new DoctorApiError('The decision and exact proposal hash are required.', { code: 'invalid_request' });
  if (isDemoEnabled(demo)) return demoRequest('decision', { proposalId, payload });
  const result = await request(`/care/proposals/${encodeURIComponent(proposalId)}/doctor-decision`, { method: 'POST', body: payload, commandKey, correlationId, correlationScope: `proposal:${proposalId}`, signal });
  return normalizeProposal(validateObject(result, 'decision response'));
};

export const fetchClinicalServiceOrder = async ({ orderId, demo = false, signal } = {}) => {
  const result = isDemoEnabled(demo) ? await demoRequest('clinical-service', { orderId }) : await request(`/doctor/clinical-service-orders/${encodeURIComponent(orderId)}`, { signal });
  return normalizeClinicalService(validateObject(result, 'clinical-service order'));
};

export const completeClinicalServiceCall = async ({ orderId, payload = {}, commandKey, correlationId, demo = false, signal } = {}) => {
  if (isDemoEnabled(demo)) return fetchClinicalServiceOrder({ orderId, demo });
  const result = await request(`/care/clinical-service-orders/${encodeURIComponent(orderId)}/complete-call`, { method: 'POST', body: payload, commandKey, correlationId, correlationScope: `clinical-service:${orderId}`, signal });
  return normalizeClinicalService(validateObject(result, 'call completion response'));
};

export const fetchProviderTransition = async ({ transitionId, demo = false, signal } = {}) => {
  const result = isDemoEnabled(demo) ? await demoRequest('transition', { transitionId }) : await request(`/care/provider-transitions/${encodeURIComponent(transitionId)}`, { signal });
  return normalizeTransition(validateObject(result, 'provider transition'));
};

export const fetchPatientProgress = async ({ patientId, demo = false, signal } = {}) => {
  if (isDemoEnabled(demo)) return normalizePatientProgress(await demoRequest('progress', { patientId }));
  const result = await Promise.all([
    request(`/provider/patients/${encodeURIComponent(patientId)}/care-summary`, { signal }),
    request(`/care/timeline?patient_id=${encodeURIComponent(patientId)}`, { signal }).catch(() => null),
    request(`/care/team?patient_id=${encodeURIComponent(patientId)}`, { signal }).catch(() => null),
  ]);
  return normalizePatientProgress({ ...(result[0] || {}), timeline: result[1]?.results || result[1], team: result[2]?.results || result[2] });
};

export const fetchProtocolCandidates = async ({ demo = false, signal } = {}) => {
  if (isDemoEnabled(demo)) return demoRequest('protocols');
  const result = await request('/provider/clinical-protocol-candidates', { signal });
  return Array.isArray(result) ? result : result?.results || result?.items || [];
};

export const submitProtocolDecision = async ({ candidateId, payload, commandKey, correlationId, demo = false, signal } = {}) => {
  if (!candidateId || !payload?.decision || !payload?.rationale) throw new DoctorApiError('A governance decision and rationale are required.', { code: 'invalid_request', status: 422 });
  if (isDemoEnabled(demo)) return demoRequest('protocol-decision', { candidateId, payload });
  const result = await request(`/provider/clinical-protocol-candidates/${encodeURIComponent(candidateId)}/decision`, { method: 'POST', body: payload, commandKey, correlationId, correlationScope: `protocol:${candidateId}`, signal });
  return validateObject(result, 'protocol decision response');
};

export const fetchContribution = async ({ from, to, demo = false, signal } = {}) => {
  if (isDemoEnabled(demo)) return demoRequest('contribution');
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  return validateObject(await request(`/provider/work-metrics?${params.toString()}`, { signal }), 'work metrics');
};

export const resetSyntheticDemo = async () => demoRequest('reset');

export const apiDiagnostics = Object.freeze({ apiOriginConfigured: Boolean(process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_BASE_URL || process.env.VITE_API_ORIGIN), clientVersion: CLIENT_VERSION });
