import { getAccessToken } from '../api';

const BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'https://api.prestigedelta.com';

const buildUrl = (path, query = {}) => {
  const url = new URL(`${BASE_URL.replace(/\/$/, '')}/${String(path).replace(/^\//, '')}`);
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, String(value));
    }
  });
  return url.toString();
};

const createRequestId = (prefix) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const parseResponse = async (response) => {
  const contentType = response.headers?.get?.('content-type') || '';
  if (contentType.toLowerCase().includes('application/json')) {
    return response.json().catch(() => ({}));
  }
  const rawText = await response.text().catch(() => '');
  return rawText ? { rawText } : {};
};

const getErrorMessage = (response, payload, fallback) => (
  payload?.detail || payload?.error || payload?.message || payload?.code ||
  (response.status === 404 || response.status === 405
    ? 'This doctor CareLoop endpoint is not available yet.'
    : fallback || `Request failed with status ${response.status}`)
);

const requestJson = async (path, {
  method = 'GET',
  body,
  query,
  signal,
  idempotencyKey,
  correlationId,
} = {}) => {
  const token = await getAccessToken();
  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
  };

  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }
  if (method !== 'GET') {
    headers['Idempotency-Key'] = idempotencyKey || createRequestId('doctor-careloop');
    headers['X-Correlation-ID'] = correlationId || createRequestId('doctor-correlation');
  }

  const response = await fetch(buildUrl(path, query), {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const payload = await parseResponse(response);

  if (!response.ok) {
    const error = new Error(getErrorMessage(response, payload, 'Doctor CareLoop request failed'));
    error.status = response.status;
    error.payload = payload;
    error.endpointMissing = response.status === 404 || response.status === 405;
    error.retryAfter = response.headers?.get?.('Retry-After') || null;
    throw error;
  }

  return payload;
};

const requireObject = (payload, label) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error(`Unexpected ${label} response from server`);
  }
  return payload;
};

export const normalizeCollectionResponse = (payload, label = 'collection') => {
  if (Array.isArray(payload)) {
    return { results: payload, next_cursor: null, schema_version: null };
  }
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload.results)) {
    throw new Error(`Unexpected ${label} response from server`);
  }
  return {
    ...payload,
    results: payload.results,
    next_cursor: payload.next_cursor ?? null,
  };
};

export const listDoctorCareTransitions = async (filters = {}, options = {}) => {
  const payload = await requestJson('/doctor/care-transitions', {
    query: {
      transition_kind: filters.transition_kind,
      status: filters.status,
      business_unit_id: filters.business_unit_id,
      current_owner_role: filters.current_owner_role,
      due_before: filters.due_before,
      blocker: filters.blocker,
      review_public_id: filters.review_public_id,
      cursor: filters.cursor,
    },
    signal: options.signal,
  });
  return normalizeCollectionResponse(payload, 'doctor transition collection');
};

export const listDoctorClinicalServiceOrders = async (filters = {}, options = {}) => {
  const payload = await requestJson('/doctor/clinical-service-orders', {
    query: {
      status: filters.status,
      service_class: filters.service_class,
      modality: filters.modality,
      due_before: filters.due_before,
      evidence_gap: filters.evidence_gap,
      cursor: filters.cursor,
    },
    signal: options.signal,
  });
  return normalizeCollectionResponse(payload, 'doctor clinical-service collection');
};

export const getDoctorClinicalServiceOrder = async (orderId, options = {}) => {
  if (!orderId) throw new Error('Clinical-service order identifier is required');
  return requireObject(
    await requestJson(`/doctor/clinical-service-orders/${encodeURIComponent(orderId)}`, { signal: options.signal }),
    'doctor clinical-service detail'
  );
};

export const getClinicalProposal = async (proposalId, options = {}) => {
  if (!proposalId) throw new Error('Clinical proposal identifier is required');
  return requireObject(
    await requestJson(`/care/proposals/${encodeURIComponent(proposalId)}`, { signal: options.signal }),
    'clinical proposal detail'
  );
};

export const claimClinicalProposal = async (proposalId, {
  action = 'claim',
  idempotencyKey,
  correlationId,
} = {}) => {
  if (!proposalId) throw new Error('Clinical proposal identifier is required');
  return requireObject(
    await requestJson(`/care/proposals/${encodeURIComponent(proposalId)}/review-claim`, {
      method: 'POST',
      body: { action },
      idempotencyKey,
      correlationId,
    }),
    'clinical proposal claim'
  );
};

export const submitClinicalProposalDecision = async (proposalId, {
  proposalHash,
  aiDraftHash,
  decision,
  editedProposal,
  planPayload,
  reason = '',
  questions = [],
  clinicalAttestations,
  reviewStartedAt,
  decisionAt,
  decisionCategory,
  idempotencyKey,
  correlationId,
} = {}) => {
  if (!proposalId) throw new Error('Clinical proposal identifier is required');
  if (!proposalHash) throw new Error('The exact server proposal hash is required');
  if (!decision) throw new Error('Clinical proposal decision is required');
  if (['approve_as_written', 'edit_and_approve'].includes(decision) && !aiDraftHash) {
    throw new Error('The exact server AI draft hash is required for approval');
  }

  const body = {
    decision,
    proposal_hash: proposalHash,
    ...(aiDraftHash ? { ai_draft_hash: aiDraftHash } : {}),
    ...(editedProposal !== undefined ? { edited_proposal: editedProposal } : {}),
    ...(planPayload !== undefined ? { plan_payload: planPayload } : {}),
    ...(reason ? { reason } : {}),
    ...(Array.isArray(questions) && questions.length ? { questions } : {}),
    ...(clinicalAttestations ? { clinical_attestations: clinicalAttestations } : {}),
    ...(reviewStartedAt ? { review_started_at: reviewStartedAt } : {}),
    ...(decisionAt ? { decision_at: decisionAt } : {}),
    ...(decisionCategory ? { decision_category: decisionCategory } : {}),
  };

  return requireObject(
    await requestJson(`/care/proposals/${encodeURIComponent(proposalId)}/doctor-decision`, {
      method: 'POST',
      body,
      idempotencyKey,
      correlationId,
    }),
    'clinical proposal decision'
  );
};

export const getClinicalServiceJoin = async (orderId, options = {}) => {
  if (!orderId) throw new Error('Clinical-service order identifier is required');
  return requireObject(
    await requestJson(`/care/clinical-service-orders/${encodeURIComponent(orderId)}/join`, { signal: options.signal }),
    'clinical-service join projection'
  );
};

export const scheduleClinicalService = async (orderId, payload = {}, options = {}) => {
  if (!orderId) throw new Error('Clinical-service order identifier is required');
  return requireObject(
    await requestJson(`/care/clinical-service-orders/${encodeURIComponent(orderId)}/schedule`, {
      method: 'POST',
      body: payload,
      idempotencyKey: options.idempotencyKey,
      correlationId: options.correlationId,
    }),
    'clinical-service schedule'
  );
};

export const completeClinicalServiceCall = async (orderId, payload = {}, options = {}) => {
  if (!orderId) throw new Error('Clinical-service order identifier is required');
  return requireObject(
    await requestJson(`/care/clinical-service-orders/${encodeURIComponent(orderId)}/complete-call`, {
      method: 'POST',
      body: payload,
      idempotencyKey: options.idempotencyKey,
      correlationId: options.correlationId,
    }),
    'clinical-service call completion'
  );
};
