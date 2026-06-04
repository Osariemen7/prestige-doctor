import { getAccessToken } from '../api';

const DEFAULT_BACKEND_BASE = process.env.REACT_APP_BACKEND_BASE_URL || 'https://api.prestigedelta.com';
const DEFAULT_WS_BASE = process.env.REACT_APP_GEMINI_LIVE_WS_URL || 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';
const DEFAULT_MODEL = 'gemini-3.1-flash-live-preview';

const ENDPOINTS = {
  instructions: '/ai-processing/triage-instructions/',
  liveReviewInstructions: '/ai-processing/live-review-instructions/',
  customInstructions: '/ai-processing/custom-instructions/',
  functionSchemas: '/runfunction/schemas/',
  ephemeralToken: '/ai-processing/generate-ephemeral-token/',
  toolCalls: '/runfunction/',
  forceDocumentation: '/ai-processing/force-documentation/'
};

export async function authenticatedFetch(url, options = {}) {
  const token = await getAccessToken();
  const headers = {
    ...options.headers,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  };
  return fetch(url, { ...options, headers });
}

const resolveEndpoint = (path = '') => {
  if (!path) {
    throw new Error('Endpoint path is required');
  }
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  return `${DEFAULT_BACKEND_BASE.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;
};

async function parseJsonResponse(response, fallbackMessage) {
  if (!response) {
    throw new Error(fallbackMessage || 'Unknown error');
  }

  let data;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(fallbackMessage || error.message || 'Failed to parse response');
  }

  if (!response.ok) {
    const detail = data?.detail || data?.error || response.statusText;
    const error = new Error(typeof detail === 'string' ? detail : fallbackMessage || 'Request failed');
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

export async function fetchSystemInstructions({ reviewId, publicId, signal } = {}) {
  const hasLiveReviewContext = Boolean(reviewId || publicId);
  const url = new URL(resolveEndpoint(hasLiveReviewContext ? ENDPOINTS.liveReviewInstructions : ENDPOINTS.instructions));
  if (reviewId) {
    url.searchParams.set('review_id', String(reviewId));
  }
  if (publicId) {
    url.searchParams.set('medical_review_public_id', String(publicId));
  }

  const response = await authenticatedFetch(url.toString(), { method: 'GET', signal });
  return parseJsonResponse(response, 'Failed to load system instructions');
}

export async function fetchFunctionSchemas({ mode, reviewId, publicId, threadPublicId, patientId, signal } = {}) {
  const url = new URL(resolveEndpoint(ENDPOINTS.functionSchemas));
  if (mode) {
    url.searchParams.set('mode', String(mode));
  }
  if (reviewId) {
    url.searchParams.set('review_id', String(reviewId));
  }
  if (publicId) {
    url.searchParams.set('medical_review_public_id', String(publicId));
  }
  if (threadPublicId) {
    url.searchParams.set('thread_public_id', String(threadPublicId));
  }
  if (patientId) {
    url.searchParams.set('patient_id', String(patientId));
  }

  const payload = await authenticatedFetch(url.toString(), { method: 'GET', signal });
  const data = await parseJsonResponse(payload, 'Failed to load function schemas');

  const functions = Array.isArray(data?.functions)
    ? data.functions.filter(Boolean)
    : Array.isArray(data)
      ? data.filter(Boolean)
      : [];
  const builtinTools = Array.isArray(data?.builtin_tools)
    ? data.builtin_tools.filter(Boolean)
    : [];
  return [...builtinTools, ...functions];
}

export async function requestEphemeralToken(sessionConfig = {}, { signal } = {}) {
  const normalizedConfig = sessionConfig && typeof sessionConfig === 'object' ? sessionConfig : {};
  const hasConfig = Object.keys(normalizedConfig).length > 0;

  const response = await authenticatedFetch(resolveEndpoint(ENDPOINTS.ephemeralToken), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(hasConfig ? { session_config: normalizedConfig } : {}),
    signal
  });

  return parseJsonResponse(response, 'Failed to request ephemeral token');
}

export async function executeFunctionCall(toolCall, { signal } = {}) {
  if (!toolCall) {
    throw new Error('Tool call payload is required');
  }

  const callId = toolCall.callId || toolCall.call_id || toolCall.id || null;
  const functionName = toolCall.name || toolCall.function_name;
  const args = toolCall.arguments || toolCall.args || {};

  const requestBody = {
    call_id: callId,
    function_name: functionName,
    arguments: args
  };

  const response = await authenticatedFetch(resolveEndpoint(ENDPOINTS.toolCalls), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody),
    signal
  });

  const payload = await parseJsonResponse(response, 'Failed to execute function call');

  return {
    callId: payload?.call_id || callId || null,
    result: payload?.result ?? payload ?? null
  };
}

export function buildRealtimeWsUrl({ token, model = DEFAULT_MODEL, sessionId } = {}) {
  if (!token) {
    throw new Error('Ephemeral token is required to build the realtime WebSocket URL.');
  }

  const url = new URL(DEFAULT_WS_BASE);
  url.searchParams.set('access_token', token);
  if (sessionId) {
    url.searchParams.set('session', sessionId);
  }
  return url.toString();
}

export async function fetchCustomInstructions({ signal } = {}) {
  const url = resolveEndpoint(ENDPOINTS.customInstructions);
  const response = await authenticatedFetch(url, { method: 'GET', signal });
  return parseJsonResponse(response, 'Failed to fetch custom system instructions');
}

export async function createCustomInstructions(instructionPayload, { signal } = {}) {
  const url = resolveEndpoint(ENDPOINTS.customInstructions);
  const response = await authenticatedFetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(instructionPayload),
    signal
  });
  return parseJsonResponse(response, 'Failed to create custom system instructions');
}

export async function forceClinicalDocumentation(argumentsPayload, { signal } = {}) {
  const requestBody = {
    function_name: 'document_medical_review',
    arguments: argumentsPayload
  };

  const response = await authenticatedFetch(resolveEndpoint(ENDPOINTS.toolCalls), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody),
    signal
  });

  const payload = await parseJsonResponse(response, 'Failed to execute document_medical_review function call');
  return payload?.result ?? payload ?? null;
}

