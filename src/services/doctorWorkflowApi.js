import { getAccessToken } from '../api';
import { buildWhatsAppInboundFollowThroughResult } from '../utils/aiReviewWorkflow';

const BASE_URL = process.env.REACT_APP_BACKEND_BASE_URL || 'https://api.prestigedelta.com';
const LOCAL_EVENT_KEY = 'prestige_doctor_workflow_events';

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

const resolveLegacyMedicalReviewId = (reviewPublicId, payload = {}) => (
  payload?.medical_review_public_id ||
  payload?.medicalReviewPublicId ||
  payload?.metadata?.medical_review_public_id ||
  reviewPublicId
);

const setLocalWorkflowEvents = (events) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(LOCAL_EVENT_KEY, JSON.stringify(Array.isArray(events) ? events : []));
};

const recordLocalWorkflowEvent = (event) => {
  if (typeof window === 'undefined') return null;

  const entry = {
    id: `local-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    created_at: new Date().toISOString(),
    ...event,
  };

  try {
    const current = JSON.parse(window.localStorage.getItem(LOCAL_EVENT_KEY) || '[]');
    window.localStorage.setItem(LOCAL_EVENT_KEY, JSON.stringify([entry, ...current].slice(0, 50)));
  } catch {
    window.localStorage.setItem(LOCAL_EVENT_KEY, JSON.stringify([entry]));
  }

  return entry;
};

export const getLocalWorkflowEvents = () => {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LOCAL_EVENT_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const clearLocalWorkflowEvents = (reviewPublicId, eventIds = null) => {
  if (typeof window === 'undefined') return 0;
  const events = getLocalWorkflowEvents();
  const ids = Array.isArray(eventIds) && eventIds.length > 0 ? new Set(eventIds) : null;
  const remaining = events.filter((event) => {
    if (reviewPublicId && event.review_public_id !== reviewPublicId) {
      return true;
    }
    if (ids) {
      return !ids.has(event.id);
    }
    return false;
  });
  setLocalWorkflowEvents(remaining);
  return events.length - remaining.length;
};

const postJson = async (path, body, fallbackMessage, options = {}) => {
  const headers = await getHeaders();
  const response = await fetch(buildUrl(path), {
    method: 'POST',
    headers,
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

const tryLegacySaveNote = async (reviewPublicId, payload) => {
  if (!payload?.note_payload) {
    return null;
  }

  const medicalReviewId = resolveLegacyMedicalReviewId(reviewPublicId, payload);

  return postJson(
    `/medical-reviews/${medicalReviewId}/save-note/`,
    {
      note_payload: payload.note_payload,
      ...(payload.clinical_training_feedback
        ? { clinical_training_feedback: payload.clinical_training_feedback }
        : {}),
    },
    'Failed to save note'
  );
};

const tryLegacyFinalize = async (reviewPublicId, payload) => {
  const medicalReviewId = resolveLegacyMedicalReviewId(reviewPublicId, payload);

  return postJson(
    `/medical-reviews/${medicalReviewId}/finalize/`,
    {
      note_payload: payload.note_payload || {},
      create_patient: true,
      send_summary: Boolean(payload.send_summary),
      patient_first_name: payload.patient?.first_name || payload.patient_first_name || '',
      patient_last_name: payload.patient?.last_name || payload.patient_last_name || '',
      patient_phone_number: payload.patient?.phone || payload.patient_phone_number || '',
      patient_email: payload.patient?.email || payload.patient_email || '',
      run_finalize_workflow: true,
      ...(payload.clinical_training_feedback
        ? { clinical_training_feedback: payload.clinical_training_feedback }
        : {}),
    },
    'Failed to finalize review'
  );
};

export const submitDoctorDecision = async (reviewPublicId, decisionPayload) => {
  if (!reviewPublicId) {
    throw new Error('Review identifier is required');
  }

  try {
    return await postJson(
      `/provider-reviews/${reviewPublicId}/doctor-decision/`,
      decisionPayload,
      'Failed to submit doctor decision'
    );
  } catch (error) {
    if (!error.endpointMissing) {
      throw error;
    }

    const decision = decisionPayload?.decision;
    if (decision === 'approve_as_is' || decision === 'edit_and_approve') {
      await tryLegacySaveNote(reviewPublicId, decisionPayload).catch(() => null);
      const finalizeResult = await tryLegacyFinalize(reviewPublicId, decisionPayload);
      return {
        ...finalizeResult,
        legacy_fallback: true,
        message: 'Review was saved/finalized through the legacy medical review workflow.',
      };
    }

    const localEvent = recordLocalWorkflowEvent({
      kind: 'doctor_decision',
      review_public_id: reviewPublicId,
      payload: decisionPayload,
      reason: 'doctor-decision endpoint unavailable',
    });

    return {
      local_fallback: true,
      local_event: localEvent,
      message: 'Backend decision endpoint is not available yet. The action was captured locally for workflow review.',
    };
  }
};

export const requestPatientInformation = async (reviewPublicId, requestPayload) => {
  if (!reviewPublicId) {
    throw new Error('Review identifier is required');
  }

  try {
    return await postJson(
      `/provider-reviews/${reviewPublicId}/request-more-info/`,
      requestPayload,
      'Failed to request patient information'
    );
  } catch (error) {
    if (!error.endpointMissing) {
      throw error;
    }

    const localEvent = recordLocalWorkflowEvent({
      kind: 'request_more_info',
      review_public_id: reviewPublicId,
      payload: requestPayload,
      reason: 'request-more-info endpoint unavailable',
    });

    return {
      local_fallback: true,
      local_event: localEvent,
      message: 'More-info endpoint is not available yet. The patient questions were captured locally.',
    };
  }
};

export const sendPatientFollowThrough = async (reviewPublicId, followThroughPayload) => {
  if (!reviewPublicId) {
    throw new Error('Review identifier is required');
  }

  try {
    return await postJson(
      `/provider-reviews/${reviewPublicId}/patient-follow-through/`,
      followThroughPayload,
      'Failed to send patient follow-through plan'
    );
  } catch (error) {
    if (!error.endpointMissing) {
      throw error;
    }

    const localEvent = recordLocalWorkflowEvent({
      kind: 'patient_follow_through',
      review_public_id: reviewPublicId,
      payload: followThroughPayload,
      reason: 'patient-follow-through endpoint unavailable',
    });

    return {
      local_fallback: true,
      local_event: localEvent,
      message: 'Patient follow-through endpoint is not available yet. The doctor-approved plan was captured locally.',
    };
  }
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
    const localEvent = recordLocalWorkflowEvent({
      kind: 'patient_follow_through_completion',
      review_public_id: resolvedReviewPublicId,
      payload: {
        task_public_id: resolvedTaskPublicId || null,
        checklist_item_id: resolvedChecklistItemId || null,
        ...payload,
      },
      reason: 'checklist completion identifiers missing',
    });

    return {
      local_fallback: true,
      local_event: localEvent,
      missing_identifiers: true,
      message: 'Completion was captured locally because checklist identifiers are not available yet.',
    };
  }

  try {
    return await postJson(
      `/task-threads/${encodeURIComponent(resolvedTaskPublicId)}/checklist-items/${encodeURIComponent(resolvedChecklistItemId)}/completion/`,
      payload,
      'Failed to record patient follow-through completion'
    );
  } catch (error) {
    if (!error.endpointMissing) {
      throw error;
    }

    const localEvent = recordLocalWorkflowEvent({
      kind: 'patient_follow_through_completion',
      review_public_id: resolvedReviewPublicId,
      payload: {
        task_public_id: resolvedTaskPublicId,
        checklist_item_id: resolvedChecklistItemId,
        ...payload,
      },
      reason: 'checklist completion endpoint unavailable',
    });

    return {
      local_fallback: true,
      local_event: localEvent,
      message: 'Checklist completion endpoint is not available yet. The patient completion was captured locally.',
    };
  }
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

  try {
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
  } catch (error) {
    if (!error.endpointMissing) {
      throw error;
    }

    const localEvent = recordLocalWorkflowEvent({
      ...inboundResult.auditEvent,
      review_public_id: resolvedReviewPublicId,
      payload,
      reason: 'whatsapp follow-through message endpoint unavailable',
    });

    return {
      ...inboundResult,
      local_fallback: true,
      local_event: localEvent,
      message: inboundResult.patientReply,
    };
  }
};

export const reconcileLocalWorkflowEvents = async (reviewPublicId) => {
  if (!reviewPublicId) {
    throw new Error('Review identifier is required');
  }

  const localEvents = getLocalWorkflowEvents().filter((event) => event.review_public_id === reviewPublicId);
  if (localEvents.length === 0) {
    return { reconciled: 0, events: [], local_events_cleared: 0 };
  }

  const payload = await postJson(
    `/provider-reviews/${reviewPublicId}/workflow-events/reconcile/`,
    {
      events: localEvents,
      client_event_ids: localEvents.map((event) => event.id).filter(Boolean),
      metadata: {
        source: 'prestige_doctor_browser_local_fallback',
        event_count: localEvents.length,
      },
    },
    'Failed to reconcile local workflow events'
  );

  const reconciledEventIds = Array.isArray(payload?.reconciled_event_ids)
    ? payload.reconciled_event_ids
    : Array.isArray(payload?.cleared_event_ids)
      ? payload.cleared_event_ids
      : null;
  const failedEventIds = Array.isArray(payload?.failed_event_ids)
    ? new Set(payload.failed_event_ids)
    : new Set();
  const shouldClearAll = !reconciledEventIds
    && !failedEventIds.size
    && (payload?.reconciled === undefined || Number(payload.reconciled) > 0 || payload?.success === true);
  const eventIdsToClear = shouldClearAll
    ? localEvents.map((event) => event.id).filter(Boolean)
    : (reconciledEventIds || []).filter((id) => !failedEventIds.has(id));
  const localEventsCleared = eventIdsToClear.length > 0
    ? clearLocalWorkflowEvents(reviewPublicId, eventIdsToClear)
    : 0;

  return {
    ...payload,
    reconciled: payload?.reconciled ?? localEventsCleared,
    events: payload?.events || localEvents,
    local_events_cleared: localEventsCleared,
    local_events_remaining: getLocalWorkflowEvents().filter((event) => event.review_public_id === reviewPublicId).length,
  };
};

export const createRealtimeSession = async (reviewPublicId, sessionPayload = {}) => {
  if (!reviewPublicId) {
    throw new Error('Review identifier is required');
  }

  try {
    return await postJson(
      `/provider-reviews/${reviewPublicId}/realtime-session/`,
      {
        model: 'gpt-realtime-mini',
        ...sessionPayload,
      },
      'Failed to create realtime session'
    );
  } catch (error) {
    if (!error.endpointMissing) {
      throw error;
    }

    const localEvent = recordLocalWorkflowEvent({
      kind: 'realtime_session_requested',
      review_public_id: reviewPublicId,
      payload: sessionPayload,
      reason: 'realtime-session endpoint unavailable',
    });

    return {
      local_fallback: true,
      local_event: localEvent,
      model: 'gpt-realtime-mini',
      session_id: localEvent?.id,
      message: 'Realtime backend endpoint is not available yet. Continuing in local preview mode.',
    };
  }
};

export const saveLiveCopilotArtifacts = async (reviewPublicId, artifactsPayload = {}) => {
  if (!reviewPublicId) {
    throw new Error('Review identifier is required');
  }

  try {
    return await postJson(
      `/provider-reviews/${reviewPublicId}/live-copilot-artifacts/`,
      artifactsPayload,
      'Failed to save live copilot artifacts'
    );
  } catch (error) {
    if (!error.endpointMissing) {
      throw error;
    }

    const localEvent = recordLocalWorkflowEvent({
      kind: 'live_copilot_artifacts',
      review_public_id: reviewPublicId,
      payload: artifactsPayload,
      reason: 'live-copilot-artifacts endpoint unavailable',
    });

    return {
      local_fallback: true,
      local_event: localEvent,
      message: 'Live copilot artifacts endpoint is not available yet. The session snapshot was captured locally.',
    };
  }
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
