/**
 * Compatibility names for legacy components.
 *
 * All new clinical writes go through the Care Kernel vNext proposal claim and
 * exact-hash decision adapter. This module intentionally has no local event
 * store and no legacy save-note/finalize fallback. A missing backend contract
 * is an error, never a local clinical success.
 */
import { getStoredAccessToken } from '../api';
import { submitDoctorDecision as submitVNextDecision, DoctorApiError } from '../vnext/api';

const unsupported = (message = 'This clinical action must be completed through the Care Kernel vNext proposal workflow.') => {
  throw new DoctorApiError(message, { code: 'contract_unavailable', status: 404 });
};

export const getLocalWorkflowEvents = () => [];
export const clearLocalWorkflowEvents = () => 0;

export const submitDoctorDecision = async (reviewPublicId, decisionPayload = {}) => {
  if (!reviewPublicId) throw new DoctorApiError('Proposal identifier is required.', { code: 'invalid_request' });
  if (!decisionPayload.proposal_hash) throw new DoctorApiError('Exact proposal hash is required for every clinical decision.', { code: 'exact_hash_required', status: 422 });
  return submitVNextDecision({ proposalId: reviewPublicId, payload: decisionPayload });
};

export const requestPatientInformation = async (proposalId, requestPayload = {}) => {
  if (!requestPayload.proposal_hash) throw new DoctorApiError('Exact proposal hash is required for an information request.', { code: 'exact_hash_required', status: 422 });
  return submitVNextDecision({ proposalId, payload: { decision: 'request_more_information', proposal_hash: requestPayload.proposal_hash, reason: requestPayload.reason || 'Structured information is required for a safe decision.', questions: requestPayload.questions || [] } });
};

export const sendPatientFollowThrough = async () => unsupported('Patient follow-through is server-owned and is not a doctor-authored local event.');
export const recordPatientFollowThroughCompletion = async () => unsupported('Patient task completion is server-owned and is not a doctor-authored local event.');
export const recordWhatsAppFollowThroughMessage = async () => unsupported('Conversation actions must use the server-authorized patient conversation contract.');
export const reconcileLocalWorkflowEvents = async () => unsupported('There are no local clinical events to reconcile.');
export const createRealtimeSession = async () => unsupported('Realtime sessions require a server-issued clinical capability.');
export const saveLiveCopilotArtifacts = async () => unsupported('Copilot artifacts require a server-issued clinical capability.');

export const forceOpenAiClinicalDocumentation = async (argumentsPayload, { signal } = {}) => {
  if (!argumentsPayload || typeof argumentsPayload !== 'object') throw new DoctorApiError('Documentation arguments are required.', { code: 'invalid_request' });
  const token = getStoredAccessToken();
  const response = await fetch(`${process.env.REACT_APP_API_BASE_URL || process.env.REACT_APP_BACKEND_BASE_URL || 'https://api.prestigedelta.com'}/runfunction/`, { method: 'POST', signal, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ provider: 'openai', model: 'gpt-realtime-mini', function_name: 'document_medical_review', arguments: argumentsPayload }) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new DoctorApiError(body?.detail || 'Clinical documentation capability failed.', { status: response.status, payload: body, code: 'request_failed' });
  return body?.result ?? body;
};
