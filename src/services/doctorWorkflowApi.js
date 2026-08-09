import { getAccessToken } from '../api';
import { buildWhatsAppInboundFollowThroughResult } from '../utils/aiReviewWorkflow';

const BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'https://api.prestigedelta.com';

const buildUrl = (path) => `${BASE_URL.replace(/\/$/, '')}/${path.replace(/^\//, '')}`;

const getHeaders = async () => {
  const token = await getAccessToken();
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
};

const parseResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.toLowerCase().includes('application/json')) {
    return response.json().catch(() => ({}));
  }

  const rawText = await response.text().catch(() => '');
  return rawText ? { rawText } : {};
};

const getErrorMessage = (response, body, fallback) => {
  if (body?.detail || body?.error || body?.message) {
    return body.detail || body.error || body.message;
  }

  if (response.status === 404 || response.status === 405) {
    return 'This backend workflow endpoint is not available yet.';
  }

  return fallback || `Request failed with status ${response.status}`;
};

const isMissingEndpoint = (response) => response.status === 404 || response.status === 405;

const postJson = async (path, body, fallbackMessage, options = {}) => {
  const headers = await getHeaders();
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers: {
      ...headers,
      ...(options.headers || {}),
    },
    body: JSON.stringify(body || {}),
    signal: options.signal,
  });

  const payload = await parseResponse(response);
  if (!response.ok) {
    const error = new Error(getErrorMessage(response, payload, fallbackMessage));
    error.status = response.status;
    error.payload = payload;
    error.endpointMissing = isMissingEndpoint(response);
    throw error;
  }

  return payload;
};

export const submitDoctorDecision = async (reviewPublicId, decisionPayload) => {
  if (!reviewPublicId) {
    throw new Error('Review identifier is required');
  }

  return postJson(
    `/provider-reviews/${reviewPublicId}/doctor-decision/`,
    decisionPayload,
    'Failed to submit doctor decision'
  );
};

export const requestPatientInformation = async (reviewPublicId, requestPayload) => {
  if (!reviewPublicId) {
    throw new Error('Review identifier is required');
  }

  return postJson(
    `/provider-reviews/${reviewPublicId}/request-more-info/`,
    requestPayload,
    'Failed to request patient information'
  );
};

export const sendPatientFollowThrough = async (reviewPublicId, followThroughPayload) => {
  if (!reviewPublicId) {
    throw new Error('Review identifier is required');
  }

  return postJson(
    `/provider-reviews/${reviewPublicId}/patient-follow-through/`,
    followThroughPayload,
    'Failed to send patient follow-through plan'
  );
};

export const recordPatientFollowThroughCompletion = async ({
  reviewPublicId,
  taskPublicId,
  checklistItemId,
  completed = true,
  note = '',
  recordCompliance = true,
  sourceChannel,
  actorRole,
  actorName = '',
  completionIntent = '',
  metadata = {},
  completionCommand = null,
} = {}) => {
  const commandPayload = completionCommand?.payload || {};
  const resolvedReviewPublicId = reviewPublicId || commandPayload?.metadata?.review_public_id;
  const resolvedTaskPublicId = taskPublicId || completionCommand?.taskPublicId;
  const resolvedChecklistItemId = checklistItemId || completionCommand?.checklistItemId;

  if (!resolvedReviewPublicId) {
    throw new Error('Review identifier is required');
  }

  const payload = {
    completed: commandPayload.completed ?? Boolean(completed),
    note: note || commandPayload.note || '',
    record_compliance: recordCompliance !== false && commandPayload.record_compliance !== false,
    source_channel: sourceChannel || commandPayload.source_channel || 'whatsapp_ai_agent',
    actor_role: actorRole || commandPayload.actor_role || 'patient',
    actor_name: actorName || commandPayload.actor_name || '',
    completion_intent: completionIntent || commandPayload.completion_intent || '',
    metadata: {
      completion_loop: 'whatsapp_ai_agent',
      review_public_id: resolvedReviewPublicId,
      ...(commandPayload.metadata || {}),
      ...metadata,
    },
  };

  if (!resolvedTaskPublicId || !resolvedChecklistItemId) {
    throw new Error('Server task and checklist identifiers are required to record completion');
  }

  return postJson(
    `/task-threads/${encodeURIComponent(resolvedTaskPublicId)}/checklist-items/${encodeURIComponent(resolvedChecklistItemId)}/completion/`,
    payload,
    'Failed to record patient follow-through completion'
  );
};

export const recordWhatsAppFollowThroughMessage = async ({
  review,
  reviewPublicId,
  message = '',
  actorRole,
  actorName = '',
  tasks,
  patientSummary,
  safetyNetTriggers,
  metadata = {},
} = {}) => {
  const reviewContext = {
    ...(review || {}),
    public_id: review?.public_id || reviewPublicId,
  };
  const inboundResult = buildWhatsAppInboundFollowThroughResult(reviewContext, {
    patientMessage: message,
    actorRole,
    actorName,
    tasks,
    patientSummary,
    safetyNetTriggers,
  });
  const resolvedReviewPublicId = inboundResult.reviewPublicId || reviewPublicId;

  if (!resolvedReviewPublicId) {
    throw new Error('Review identifier is required');
  }

  if (inboundResult.shouldRecordCompletion && inboundResult.command?.canRecord) {
    const completionResult = await recordPatientFollowThroughCompletion({
      completionCommand: inboundResult.command,
      metadata: {
        inbound_whatsapp_message: message,
        backend_action: inboundResult.backendAction,
        ...(metadata || {}),
      },
    });

    return {
      ...inboundResult,
      completion_result: completionResult,
      message: completionResult?.message || inboundResult.patientReply,
    };
  }

  const payload = {
    source_channel: 'whatsapp_ai_agent',
    message,
    actor_role: actorRole || inboundResult.command?.payload?.actor_role || 'patient',
    actor_name: actorName || inboundResult.command?.payload?.actor_name || '',
    action: inboundResult.backendAction,
    patient_reply: inboundResult.patientReply,
    intent_classification: inboundResult.intentClassification,
    completion_command: inboundResult.command,
    audit_event: inboundResult.auditEvent,
    metadata: {
      completion_loop: 'whatsapp_ai_agent',
      review_public_id: resolvedReviewPublicId,
      should_notify_provider: inboundResult.shouldNotifyProvider,
      should_ask_clarifying_question: inboundResult.shouldAskClarifyingQuestion,
      should_escalate: inboundResult.shouldEscalate,
      ...(metadata || {}),
    },
  };

  const response = await postJson(
    `/provider-reviews/${resolvedReviewPublicId}/patient-follow-through/whatsapp-message/`,
    payload,
    'Failed to record WhatsApp follow-through message'
  );

  return {
    ...inboundResult,
    ...response,
    message: response?.message || inboundResult.patientReply,
  };
};

export const createRealtimeSession = async (reviewPublicId, sessionPayload = {}) => {
  if (!reviewPublicId) {
    throw new Error('Review identifier is required');
  }

  return postJson(
    `/provider-reviews/${reviewPublicId}/realtime-session/`,
    {
      model: 'gpt-realtime-mini',
      ...sessionPayload,
    },
    'Failed to create realtime session'
  );
};

export const saveLiveCopilotArtifacts = async (reviewPublicId, artifactsPayload = {}) => {
  if (!reviewPublicId) {
    throw new Error('Review identifier is required');
  }

  return postJson(
    `/provider-reviews/${reviewPublicId}/live-copilot-artifacts/`,
    artifactsPayload,
    'Failed to save live copilot artifacts'
  );
};

export const forceOpenAiClinicalDocumentation = async (argumentsPayload, { signal } = {}) => {
  if (!argumentsPayload || typeof argumentsPayload !== 'object') {
    throw new Error('Documentation arguments are required');
  }

  return postJson(
    '/runfunction/',
    {
      provider: 'openai',
      model: 'gpt-realtime-mini',
      function_name: 'document_medical_review',
      arguments: argumentsPayload,
    },
    'Failed to execute OpenAI clinical documentation function',
    { signal }
  ).then((payload) => payload?.result ?? payload ?? null);
};
