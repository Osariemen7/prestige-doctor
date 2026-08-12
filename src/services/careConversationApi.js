import { getAccessToken } from '../api';
import {
  careCapabilitySchema,
  careConversationCollectionSchema,
  careConversationReplyResultSchema,
  careConversationSchema,
  careConversationSummarySchema,
  parseContract,
} from './careConversationContract';

const BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'https://api.prestigedelta.com';
const newId = () => globalThis.crypto?.randomUUID?.() || `care-${Date.now()}-${Math.random().toString(16).slice(2)}`;

const featureEnabled = () => (
  typeof window !== 'undefined'
    ? window.__PRESTIGE_CAPABILITIES__?.care_conversation_api === true
    : false
);

const request = async (path, { method = 'GET', body, signal, idempotencyKey, correlationId, skipFeatureCheck = false } = {}) => {
  if (!skipFeatureCheck && !featureEnabled()) {
    const error = new Error('care_conversation_api_disabled');
    error.code = 'feature_disabled';
    throw error;
  }
  const token = await getAccessToken();
  const response = await fetch(`${BASE_URL.replace(/\/$/, '')}${path}`, {
    method,
    headers: {
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(method !== 'GET' ? {
        'Idempotency-Key': idempotencyKey || `doctor-conversation-${newId()}`,
        'X-Correlation-ID': correlationId || newId(),
      } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.detail || payload?.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
};

export const getCareCapabilities = async (options = {}) => {
  const payload = parseContract(careCapabilitySchema, await request('/care/capabilities', {
    signal: options.signal, skipFeatureCheck: true,
  }), 'Care capabilities');
  if (typeof window !== 'undefined') window.__PRESTIGE_CAPABILITIES__ = { ...(window.__PRESTIGE_CAPABILITIES__ || {}), ...payload.capabilities };
  return payload;
};

const queryString = (query = {}) => {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') params.set(key, String(value));
  });
  const encoded = params.toString();
  return encoded ? `?${encoded}` : '';
};

export const listCareConversations = async (query = {}, options = {}) => parseContract(
  careConversationCollectionSchema, await request(`/care/conversations${queryString(query)}`, { signal: options.signal }), 'Care conversations',
);
export const getCareConversationSummary = async (query = {}, options = {}) => parseContract(
  careConversationSummarySchema, await request(`/care/conversations/summary${queryString(query)}`, { signal: options.signal }), 'Care conversation summary',
);
export const getCareConversation = async (conversationId, options = {}) => parseContract(
  careConversationSchema, await request(`/care/conversations/${encodeURIComponent(conversationId)}`, { signal: options.signal }), 'Care conversation',
);
export const replyToCareConversation = async (conversationId, payload, options = {}) => parseContract(
  careConversationReplyResultSchema,
  await request(`/care/conversations/${encodeURIComponent(conversationId)}/reply`, {
    method: 'POST', idempotencyKey: payload.client_turn_id, correlationId: options.correlationId,
    body: {
      client_turn_id: payload.client_turn_id, reply_to_turn_id: payload.reply_to_turn_id,
      expected_loop_state_version: payload.expected_loop_state_version, message: payload.message,
      media: Array.isArray(payload.media) ? payload.media : [],
      ...(payload.selected_action_id ? { selected_action_id: payload.selected_action_id } : {}),
    }, signal: options.signal,
  }),
  'Care conversation reply',
);
export const markCareConversationRead = (conversationId, options = {}) => request(`/care/conversations/${encodeURIComponent(conversationId)}/read`, {
  method: 'POST',
  idempotencyKey: options.idempotencyKey || newId(),
  correlationId: options.correlationId,
  body: {},
  signal: options.signal,
});

export default {
  getCareCapabilities,
  listCareConversations,
  getCareConversationSummary,
  getCareConversation,
  replyToCareConversation,
  markCareConversationRead,
};
