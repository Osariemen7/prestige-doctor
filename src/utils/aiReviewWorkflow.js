export const REVIEW_ORIGINS = {
  AI_TRIAGE: 'ai_triage',
  LIVE_ENCOUNTER: 'live_encounter',
  HYBRID: 'hybrid',
  MANUAL: 'manual',
  IMPORTED: 'imported',
};

export const REVIEW_STATUS = {
  DRAFT_FROM_AI: 'draft_from_ai',
  PENDING_DOCTOR_REVIEW: 'pending_doctor_review',
  IN_REVIEW: 'in_review',
  NEEDS_PATIENT_INFO: 'needs_patient_info',
  LIVE_CLARIFICATION_NEEDED: 'live_clarification_needed',
  LIVE_CLARIFICATION_SCHEDULED: 'live_clarification_scheduled',
  READY_TO_APPROVE: 'ready_to_approve',
  APPROVED: 'approved',
  FINALIZED: 'finalized',
  ESCALATED: 'escalated',
  REJECTED: 'rejected',
  CLOSED: 'closed',
};

const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
};

const compact = (values) => values.filter((value) => value !== null && value !== undefined && value !== '');

const lower = (value) => String(value || '').toLowerCase();

const parseTimestamp = (value) => {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toTitle = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
};

const normalizeToken = (value) => lower(value).replace(/[^a-z0-9]/g, '');
const lastValue = (items) => (items.length > 0 ? items[items.length - 1] : null);
const lastStringValue = (items) => [...items].reverse().find((item) => typeof item === 'string') || null;

const SOURCE_CATEGORY_CONFIG = {
  clinician_verified: {
    label: 'Clinician verified',
    color: 'success',
    variant: 'filled',
    needsVerification: false,
  },
  clinician_observed: {
    label: 'Clinician observed',
    color: 'success',
    variant: 'outlined',
    needsVerification: false,
  },
  lab_result: {
    label: 'Lab result',
    color: 'success',
    variant: 'outlined',
    needsVerification: false,
  },
  device_measurement: {
    label: 'Device measurement',
    color: 'info',
    variant: 'outlined',
    needsVerification: false,
  },
  prior_record: {
    label: 'Prior record',
    color: 'info',
    variant: 'outlined',
    needsVerification: false,
  },
  uploaded_document: {
    label: 'Uploaded document',
    color: 'info',
    variant: 'outlined',
    needsVerification: true,
  },
  patient_reported: {
    label: 'Patient reported',
    color: 'warning',
    variant: 'outlined',
    needsVerification: true,
  },
  caregiver_reported: {
    label: 'Caregiver reported',
    color: 'warning',
    variant: 'outlined',
    needsVerification: true,
  },
  ai_inferred: {
    label: 'AI inferred',
    color: 'warning',
    variant: 'outlined',
    needsVerification: true,
  },
  unverified: {
    label: 'Unverified',
    color: 'warning',
    variant: 'outlined',
    needsVerification: true,
  },
  unknown: {
    label: 'Source',
    color: 'default',
    variant: 'outlined',
    needsVerification: true,
  },
};

const SOURCE_ALIASES = [
  [['doctor', 'clinicianverified', 'providerverified', 'verifiedbydoctor', 'verifiedbyclinician'], 'clinician_verified'],
  [['clinicianobserved', 'doctorobserved', 'physicalexam', 'exam', 'observed', 'providerobserved'], 'clinician_observed'],
  [['lab', 'labresult', 'laboratory', 'pathology'], 'lab_result'],
  [['device', 'wearable', 'homebp', 'glucometer', 'pulseoximeter', 'remotevitals', 'vitalsdevice'], 'device_measurement'],
  [['priorrecord', 'medicalrecord', 'ehr', 'emr', 'chart', 'historyrecord'], 'prior_record'],
  [['upload', 'uploaded', 'uploadeddocument', 'document', 'image', 'attachment', 'photo', 'pdf'], 'uploaded_document'],
  [['patient', 'patientreported', 'selfreported', 'selfreport', 'whatsapp', 'chat', 'patientchat'], 'patient_reported'],
  [['caregiver', 'caregiverreported', 'familyreported', 'parentreported', 'guardianreported'], 'caregiver_reported'],
  [['ai', 'model', 'modelinferred', 'aiinferred', 'generated', 'inferred', 'assistant'], 'ai_inferred'],
  [['unverified', 'notverified', 'uncorroborated', 'unknown'], 'unverified'],
];

const SECTION_ALIASES = {
  subjective: ['subjective', 'history', 'hpi', 'complaint', 'symptom', 'patientstory'],
  objective: ['objective', 'vitals', 'observation', 'observations', 'exam', 'physicalexam', 'measurement'],
  assessment: ['assessment', 'diagnosis', 'diagnoses', 'impression', 'differential', 'risk'],
  plan: ['plan', 'management', 'treatment', 'order', 'orders', 'prescription', 'investigation', 'followup'],
};

const EVIDENCE_TEXT_KEYS = [
  'quote',
  'text',
  'value',
  'description',
  'finding',
  'claim',
  'summary',
  'observation',
  'content',
  'answer',
];

const EVIDENCE_CONTAINER_KEYS = [
  'entries',
  'items',
  'evidence',
  'sources',
  'anchors',
  'supporting_evidence',
  'support',
  'facts',
];

const getRawSource = (source) => (
  source?.source_type ||
  source?.source ||
  source?.reported_by ||
  source?.submitted_by ||
  source?.origin ||
  source?.channel ||
  source?.type ||
  source?.provenance ||
  ''
);

export const getSourceCategory = (source) => {
  const verification = normalizeToken(source?.verification_status || source?.verified_status || source?.status);
  const raw = normalizeToken(getRawSource(source));

  if (source?.clinician_verified || source?.verified_by_clinician || source?.verified_by_doctor) {
    return 'clinician_verified';
  }

  if (verification.includes('unverified') || verification.includes('uncorroborated')) {
    return 'unverified';
  }

  const matched = SOURCE_ALIASES.find(([aliases]) => aliases.some((alias) => raw.includes(alias)));
  if (matched) return matched[1];
  if (verification === 'verified') return 'clinician_verified';
  return 'unknown';
};

export const getSourceConfig = (source) => SOURCE_CATEGORY_CONFIG[getSourceCategory(source)] || SOURCE_CATEGORY_CONFIG.unknown;

export const getTriagePayload = (review) => {
  if (!review || typeof review !== 'object') return {};
  return (
    review.ai_triage ||
    review.triage ||
    review.ai_triage_summary ||
    review.triage_summary ||
    review.patient_triage ||
    review.metadata?.ai_triage ||
    review.metadata?.triage ||
    {}
  );
};

export const getReviewOrigin = (review) => {
  if (!review) return REVIEW_ORIGINS.MANUAL;

  const rawOrigin = lower(
    review.origin ||
    review.review_origin ||
    review.source_origin ||
    review.workflow_origin ||
    review.source_channel ||
    review.review_context
  );

  if (rawOrigin.includes('hybrid')) return REVIEW_ORIGINS.HYBRID;
  if (rawOrigin.includes('triage') || rawOrigin.includes('caregiver')) return REVIEW_ORIGINS.AI_TRIAGE;
  if (rawOrigin.includes('live') || rawOrigin.includes('encounter')) return REVIEW_ORIGINS.LIVE_ENCOUNTER;
  if (rawOrigin.includes('import')) return REVIEW_ORIGINS.IMPORTED;
  if (rawOrigin.includes('manual')) return REVIEW_ORIGINS.MANUAL;

  if (review.triage_session_public_id || review.ai_triage || review.triage_summary) {
    return REVIEW_ORIGINS.AI_TRIAGE;
  }

  const hasEncounter = Array.isArray(review.in_person_encounters) && review.in_person_encounters.length > 0;
  const hasLiveArtifacts = Boolean(review.live_visit_entry_count || review.has_live_visual_captures);

  if (review.conducted_by_ai && hasEncounter && hasLiveArtifacts) return REVIEW_ORIGINS.HYBRID;
  if (review.conducted_by_ai && !hasEncounter) return REVIEW_ORIGINS.AI_TRIAGE;
  if (hasEncounter || hasLiveArtifacts) return REVIEW_ORIGINS.LIVE_ENCOUNTER;

  return REVIEW_ORIGINS.MANUAL;
};

export const isAiTriageReview = (review) => {
  const origin = getReviewOrigin(review);
  return origin === REVIEW_ORIGINS.AI_TRIAGE || origin === REVIEW_ORIGINS.HYBRID;
};

export const getReviewWorkflowStatus = (review) => {
  if (!review) return REVIEW_STATUS.PENDING_DOCTOR_REVIEW;
  if (review.is_finalized) return REVIEW_STATUS.FINALIZED;

  const rawStatus = lower(review.review_status || review.workflow_status || review.status);
  if (!rawStatus || rawStatus === 'pending') return REVIEW_STATUS.PENDING_DOCTOR_REVIEW;
  if (rawStatus === 'approved') return REVIEW_STATUS.APPROVED;
  if (rawStatus === 'finalized') return REVIEW_STATUS.FINALIZED;
  return rawStatus;
};

export const getUrgencyConfig = (review) => {
  const triage = getTriagePayload(review);
  const urgency = lower(review?.urgency_level || triage.urgency_level || triage.urgency || review?.priority);

  if (['emergency', 'critical', 'red'].includes(urgency)) {
    return { value: urgency || 'emergency', label: 'Emergency', color: 'error', severity: 'error' };
  }
  if (['urgent', 'high', 'orange'].includes(urgency)) {
    return { value: urgency || 'urgent', label: 'Urgent', color: 'warning', severity: 'warning' };
  }
  if (['soon', 'medium', 'moderate', 'yellow'].includes(urgency)) {
    return { value: urgency || 'soon', label: 'Soon', color: 'info', severity: 'info' };
  }
  return { value: urgency || 'routine', label: 'Routine', color: 'success', severity: 'success' };
};

const normalizeFlag = (flag, index) => {
  if (typeof flag === 'string') {
    return { id: `flag-${index}`, label: flag, severity: 'warning' };
  }
  return {
    id: flag.id || flag.key || `flag-${index}`,
    label: flag.label || flag.title || flag.name || flag.message || 'Clinical risk',
    severity: flag.severity || flag.level || flag.priority || 'warning',
    description: flag.description || flag.detail || flag.reason || flag.rationale || '',
  };
};

export const getRiskFlags = (review) => {
  const triage = getTriagePayload(review);
  return [
    ...asArray(review?.risk_flags),
    ...asArray(review?.red_flags),
    ...asArray(review?.safety_flags),
    ...asArray(review?.safety_gate?.emergency_flags),
    ...asArray(triage.risk_flags),
    ...asArray(triage.red_flags),
  ].map(normalizeFlag);
};

const normalizeMissingItem = (item, index) => {
  if (typeof item === 'string') {
    return { id: `missing-${index}`, label: item };
  }
  return {
    id: item.id || item.key || `missing-${index}`,
    label: item.label || item.question || item.name || item.field || 'Missing information',
    reason: item.reason || item.rationale || item.description || '',
    importance: item.importance || item.priority || '',
  };
};

export const getMissingInformation = (review) => {
  const triage = getTriagePayload(review);
  return [
    ...asArray(review?.missing_information),
    ...asArray(review?.missing_data),
    ...asArray(triage.missing_information),
    ...asArray(triage.missing_data),
    ...asArray(triage.unanswered_questions),
  ].map(normalizeMissingItem);
};

export const getFollowThroughTasks = (review) => asArray(
  review?.patient_follow_through?.tasks ||
  review?.follow_through_tasks ||
  review?.patient_tasks ||
  review?.care_plan_tasks
);

const getFollowThroughTaskStatus = (task) => lower(
  task?.status ||
  task?.patient_status ||
  task?.completion_status ||
  (task?.is_completed ? 'completed' : 'pending')
);

const isFollowThroughTaskComplete = (task) => (
  task?.is_completed ||
  ['completed', 'done', 'confirmed'].includes(getFollowThroughTaskStatus(task))
);

const getFollowThroughSentTimestamp = (review) => {
  const followThrough = review?.patient_follow_through || {};
  return (
    parseTimestamp(followThrough.sent_at) ||
    parseTimestamp(followThrough.created_at) ||
    parseTimestamp(followThrough.updated_at) ||
    parseTimestamp(review?.patient_summary_sent_at) ||
    parseTimestamp(review?.summary_sent_at) ||
    parseTimestamp(review?.patient_follow_through_sent_at) ||
    null
  );
};

const getFollowThroughCompletionTimestamp = (completion) => (
  parseTimestamp(completion?.completed_at) ||
  parseTimestamp(completion?.confirmed_at) ||
  parseTimestamp(completion?.created_at) ||
  parseTimestamp(completion?.updated_at) ||
  null
);

const getFollowThroughTaskDueTimestamp = (task) => (
  parseTimestamp(task?.due_at) ||
  parseTimestamp(task?.due_date) ||
  parseTimestamp(task?.scheduled_time) ||
  parseTimestamp(task?.scheduled_at) ||
  parseTimestamp(task?.expected_completion_at) ||
  parseTimestamp(task?.target_completion_at) ||
  parseTimestamp(task?.reminder_due_at) ||
  parseTimestamp(task?.follow_up_at) ||
  null
);

export const getFollowThroughTaskCompletionRecord = (task) => {
  if (!task || typeof task !== 'object') return null;
  if (task.latest_completion) return task.latest_completion;
  if (task.latestCompletion) return task.latestCompletion;
  if (task.completion) return task.completion;
  if (task.completed_event) return task.completed_event;
  if (task.completion_event) return task.completion_event;
  if (task.completed_at || task.confirmed_at || task.confirmation_note || task.completed_via) return task;
  return null;
};

const getLatestCompletionRecord = (followThrough) => (
  followThrough.latest_completion ||
  followThrough.latestCompletion ||
  followThrough.completed_event ||
  followThrough.completion ||
  null
);

const getLatestTaskCompletionRecord = (tasks) => {
  const completions = asArray(tasks).map(getFollowThroughTaskCompletionRecord).filter(Boolean);
  if (completions.length === 0) return null;
  return completions
    .map((completion, index) => ({
      completion,
      index,
      timestamp: getFollowThroughCompletionTimestamp(completion) || 0,
    }))
    .sort((left, right) => {
      if (right.timestamp !== left.timestamp) return right.timestamp - left.timestamp;
      return right.index - left.index;
    })[0].completion;
};

const getFollowThroughCompletionIntent = (completion) => lower(
  completion?.completion_intent ||
  completion?.intent ||
  completion?.metadata?.completion_intent ||
  completion?.metadata?.intent ||
  completion?.classification?.intent ||
  ''
);

const getFollowThroughCompletionEscalationAction = (completion) => lower(
  completion?.escalation_action ||
  completion?.metadata?.escalation_action ||
  completion?.escalation?.action ||
  completion?.metadata?.escalation?.action ||
  ''
);

const getFollowThroughCompletionNote = (completion) => (
  completion?.note ||
  completion?.confirmation_note ||
  completion?.message ||
  completion?.metadata?.note ||
  completion?.metadata?.message ||
  completion?.escalation?.reason ||
  completion?.metadata?.escalation_reason ||
  ''
);

const isFollowThroughSafetyEscalation = (completion) => {
  const intent = getFollowThroughCompletionIntent(completion);
  const action = getFollowThroughCompletionEscalationAction(completion);
  return Boolean(
    intent.includes('safety_escalation') ||
    intent.includes('worsening') ||
    action.includes('escalate') ||
    action.includes('urgent') ||
    completion?.should_escalate === true ||
    completion?.metadata?.should_escalate === true
  );
};

const isFollowThroughBarrierCompletion = (completion) => {
  const intent = getFollowThroughCompletionIntent(completion);
  const action = getFollowThroughCompletionEscalationAction(completion);
  const completedValue = completion?.completed ?? completion?.is_completed ?? completion?.metadata?.completed;
  return Boolean(
    intent.includes('unable_to_complete') ||
    intent.includes('barrier') ||
    intent.includes('not_done') ||
    action.includes('barrier') ||
    (
      completedValue === false &&
      lower(completion?.source_channel || completion?.metadata?.source_channel).includes('whatsapp')
    )
  );
};

const getFollowThroughCompletionSignals = (review, progress, tasks) => {
  const followThrough = review?.patient_follow_through || {};
  return [
    progress?.latestCompletion,
    getLatestCompletionRecord(followThrough),
    followThrough.latest_event,
    followThrough.latestEvent,
    ...asArray(followThrough.events),
    ...asArray(followThrough.task_events),
    ...asArray(review?.follow_through_events),
    ...asArray(tasks).map(getFollowThroughTaskCompletionRecord),
  ].filter(Boolean);
};

const coerceCount = (value, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const getFollowThroughProgress = (review) => {
  const followThrough = review?.patient_follow_through || {};
  const tasks = getFollowThroughTasks(review);
  const completedFromTasks = tasks.filter(isFollowThroughTaskComplete).length;
  const totalTasks = coerceCount(followThrough.total_tasks, tasks.length);
  const completedTasks = coerceCount(followThrough.completed_tasks, completedFromTasks);
  const remainingTasks = coerceCount(
    followThrough.remaining_tasks,
    Math.max(totalTasks - completedTasks, 0)
  );
  const explicitStatus = lower(
    followThrough.progress_status ||
    followThrough.status ||
    review?.patient_follow_through_status
  );
  const hasFollowThroughRecord = Boolean(
    review?.patient_follow_through ||
    followThrough.sent_at ||
    review?.patient_summary_sent_at ||
    review?.summary_sent_at ||
    explicitStatus === 'sent'
  );

  let status = explicitStatus;
  if (!status || status === 'sent') {
    if (hasFollowThroughRecord && totalTasks > 0 && remainingTasks <= 0) {
      status = 'completed';
    } else if (hasFollowThroughRecord && completedTasks > 0) {
      status = 'in_progress';
    } else if (hasFollowThroughRecord) {
      status = 'active';
    }
  }

  const completionPercentage = coerceCount(
    followThrough.completion_percentage,
    totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0
  );

  return {
    sent: hasFollowThroughRecord,
    status: status || 'not_sent',
    totalTasks,
    completedTasks,
    remainingTasks,
    completionPercentage,
    sentAt: getFollowThroughSentTimestamp(review),
    latestCompletion: getLatestCompletionRecord(followThrough) || getLatestTaskCompletionRecord(tasks),
  };
};

export const getFollowThroughAttention = (review, options = {}) => {
  const now = options.now ?? Date.now();
  const noCompletionHours = options.noCompletionHours ?? 48;
  const staleProgressHours = options.staleProgressHours ?? 96;
  const progress = getFollowThroughProgress(review);
  const followThrough = review?.patient_follow_through || {};
  const tasks = getFollowThroughTasks(review);
  const completionSignals = getFollowThroughCompletionSignals(review, progress, tasks);
  const incompleteTasks = tasks.filter((task) => !isFollowThroughTaskComplete(task));
  const failedTasks = incompleteTasks.filter((task) => (
    ['missed', 'overdue', 'failed', 'cancelled', 'canceled', 'error'].includes(getFollowThroughTaskStatus(task))
  ));
  const overdueTasks = incompleteTasks.filter((task) => {
    const dueAt = getFollowThroughTaskDueTimestamp(task);
    return dueAt && dueAt < now;
  });
  const sentAt = progress.sentAt || getFollowThroughSentTimestamp(review);
  const latestCompletionAt = getFollowThroughCompletionTimestamp(progress.latestCompletion);
  const noCompletionHoursElapsed = sentAt && progress.completedTasks === 0
    ? Math.max(0, (now - sentAt) / 36e5)
    : 0;
  const staleProgressHoursElapsed = latestCompletionAt && progress.remainingTasks > 0
    ? Math.max(0, (now - latestCompletionAt) / 36e5)
    : 0;
  const explicitAttentionStatus = lower(
    followThrough.attention_status ||
    followThrough.risk_status ||
    followThrough.escalation_status ||
    review?.patient_follow_through_attention_status
  );
  const reasons = [];

  if (!progress.sent) {
    return {
      needsAttention: false,
      status: 'not_sent',
      severity: 'info',
      label: 'Not sent',
      shortLabel: 'Not sent',
      color: 'default',
      variant: 'outlined',
      reasons,
      nextAction: 'Approve the review and send patient next steps.',
      overdueTasks: [],
      failedTasks: [],
      completionSignal: null,
      noCompletionHoursElapsed,
      staleProgressHoursElapsed,
    };
  }

  const safetyCompletion = completionSignals.find(isFollowThroughSafetyEscalation);
  if (safetyCompletion) {
    const note = getFollowThroughCompletionNote(safetyCompletion);
    reasons.push(note || 'WhatsApp AI detected worsening symptoms or a safety-net trigger.');
    return {
      needsAttention: true,
      status: 'safety_escalation',
      severity: 'error',
      label: 'WhatsApp safety escalation',
      shortLabel: 'Escalate',
      color: 'error',
      variant: 'filled',
      reasons,
      nextAction: 'Review the patient or caregiver message and escalate clinically before continuing routine follow-through.',
      overdueTasks,
      failedTasks,
      completionSignal: safetyCompletion,
      noCompletionHoursElapsed,
      staleProgressHoursElapsed,
    };
  }

  const barrierCompletion = completionSignals.find(isFollowThroughBarrierCompletion);
  if (barrierCompletion) {
    const note = getFollowThroughCompletionNote(barrierCompletion);
    reasons.push(note || 'Patient or caregiver reported a barrier to completing the next step.');
    return {
      needsAttention: true,
      status: 'completion_barrier',
      severity: 'warning',
      label: 'Follow-through barrier',
      shortLabel: 'Barrier',
      color: 'warning',
      variant: 'filled',
      reasons,
      nextAction: 'Resolve the barrier or ask the WhatsApp agent to collect more detail before the plan stalls.',
      overdueTasks,
      failedTasks,
      completionSignal: barrierCompletion,
      noCompletionHoursElapsed,
      staleProgressHoursElapsed,
    };
  }

  if (progress.status === 'completed' || (progress.totalTasks > 0 && progress.remainingTasks <= 0)) {
    return {
      needsAttention: false,
      status: 'completed',
      severity: 'success',
      label: 'Follow-through complete',
      shortLabel: 'Complete',
      color: 'success',
      variant: 'filled',
      reasons,
      nextAction: 'No doctor follow-up needed from task completion state.',
      overdueTasks: [],
      failedTasks: [],
      completionSignal: null,
      noCompletionHoursElapsed,
      staleProgressHoursElapsed,
    };
  }

  if (failedTasks.length > 0 || ['failed', 'error', 'missed'].includes(progress.status) || ['failed', 'error', 'missed'].includes(explicitAttentionStatus)) {
    reasons.push(`${failedTasks.length || 1} task${failedTasks.length === 1 ? '' : 's'} missed or failed`);
    return {
      needsAttention: true,
      status: 'failed',
      severity: 'error',
      label: 'Follow-through failed',
      shortLabel: 'Needs attention',
      color: 'error',
      variant: 'filled',
      reasons,
      nextAction: 'Contact the patient or caregiver and consider escalation.',
      overdueTasks,
      failedTasks,
      completionSignal: progress.latestCompletion || null,
      noCompletionHoursElapsed,
      staleProgressHoursElapsed,
    };
  }

  if (overdueTasks.length > 0 || explicitAttentionStatus === 'overdue') {
    reasons.push(`${overdueTasks.length || 1} task${overdueTasks.length === 1 ? '' : 's'} overdue`);
    return {
      needsAttention: true,
      status: 'overdue',
      severity: 'warning',
      label: 'Follow-through overdue',
      shortLabel: 'Overdue',
      color: 'warning',
      variant: 'filled',
      reasons,
      nextAction: 'Send a follow-up nudge or call the patient.',
      overdueTasks,
      failedTasks,
      completionSignal: progress.latestCompletion || null,
      noCompletionHoursElapsed,
      staleProgressHoursElapsed,
    };
  }

  if (noCompletionHoursElapsed >= noCompletionHours && progress.remainingTasks > 0) {
    reasons.push(`No completed task after ${noCompletionHoursElapsed.toFixed(1)}h`);
    return {
      needsAttention: true,
      status: 'stalled',
      severity: 'warning',
      label: 'Follow-through stalled',
      shortLabel: 'Stalled',
      color: 'warning',
      variant: 'outlined',
      reasons,
      nextAction: 'Ask the WhatsApp agent to nudge the patient or caregiver.',
      overdueTasks,
      failedTasks,
      completionSignal: progress.latestCompletion || null,
      noCompletionHoursElapsed,
      staleProgressHoursElapsed,
    };
  }

  if (staleProgressHoursElapsed >= staleProgressHours && progress.remainingTasks > 0) {
    reasons.push(`No new completion for ${staleProgressHoursElapsed.toFixed(1)}h`);
    return {
      needsAttention: true,
      status: 'stale_progress',
      severity: 'warning',
      label: 'Follow-through needs nudge',
      shortLabel: 'Needs nudge',
      color: 'warning',
      variant: 'outlined',
      reasons,
      nextAction: 'Check progress and send a targeted reminder.',
      overdueTasks,
      failedTasks,
      completionSignal: progress.latestCompletion || null,
      noCompletionHoursElapsed,
      staleProgressHoursElapsed,
    };
  }

  return {
    needsAttention: false,
    status: progress.status === 'in_progress' ? 'on_track' : 'active',
    severity: 'info',
    label: progress.status === 'in_progress' ? 'Follow-through progressing' : 'Follow-through active',
    shortLabel: progress.status === 'in_progress' ? 'Progressing' : 'Active',
    color: progress.status === 'in_progress' ? 'info' : 'primary',
    variant: 'outlined',
    reasons,
    nextAction: 'Continue automated reminders and WhatsApp completion tracking.',
    overdueTasks,
    failedTasks,
    completionSignal: progress.latestCompletion || null,
    noCompletionHoursElapsed,
    staleProgressHoursElapsed,
  };
};

export const getFollowThroughStatusConfig = (progressOrReview) => {
  const looksLikeProgress = Boolean(
    progressOrReview &&
    ('sent' in progressOrReview || 'totalTasks' in progressOrReview || 'completionPercentage' in progressOrReview)
  );
  const progress = looksLikeProgress ? progressOrReview : getFollowThroughProgress(progressOrReview);

  switch (progress.status) {
    case 'completed':
      return { label: 'Follow-through Complete', shortLabel: 'Complete', color: 'success', variant: 'filled' };
    case 'overdue':
    case 'stalled':
    case 'stale_progress':
    case 'completion_barrier':
      return { label: 'Follow-through Needs Attention', shortLabel: 'Needs Attention', color: 'warning', variant: 'outlined' };
    case 'safety_escalation':
      return { label: 'Follow-through Safety Escalation', shortLabel: 'Escalate', color: 'error', variant: 'filled' };
    case 'in_progress':
      return { label: 'Follow-through Progressing', shortLabel: 'Progressing', color: 'info', variant: 'outlined' };
    case 'active':
      return { label: 'Follow-through Active', shortLabel: 'Active', color: 'primary', variant: 'outlined' };
    case 'failed':
    case 'error':
      return { label: 'Follow-through Needs Attention', shortLabel: 'Needs Attention', color: 'error', variant: 'outlined' };
    default:
      return { label: 'No Follow-through', shortLabel: 'No Follow-through', color: 'default', variant: 'outlined' };
  }
};

export const getFollowThroughOperationalSignals = (review, options = {}) => {
  const attention = options.attention || getFollowThroughAttention(review, options);
  const status = attention.status || 'not_sent';
  return {
    attention,
    needsAttention: Boolean(attention.needsAttention),
    status,
    isSafetyEscalation: status === 'safety_escalation',
    isCompletionBarrier: status === 'completion_barrier',
    isPatientOutcomeRisk: ['safety_escalation', 'completion_barrier', 'failed', 'overdue', 'stalled', 'stale_progress'].includes(status),
    severity: attention.severity,
    latestSignal: attention.completionSignal || null,
    reason: attention.reasons?.[0] || attention.nextAction || '',
  };
};

export const getFollowThroughRecommendedAction = (review, options = {}) => {
  const signals = options.signals || getFollowThroughOperationalSignals(review, options);
  const attention = signals.attention || getFollowThroughAttention(review, options);
  const reason = signals.reason || attention.reasons?.[0] || attention.nextAction || '';
  const base = {
    attentionStatus: attention.status,
    reason,
    requiresDoctorReview: Boolean(attention.needsAttention),
    canUseWhatsAppAgent: true,
    shouldSendPatientMessage: true,
    deliveryChannels: ['whatsapp', 'patient_app', 'chat'],
    payload: {
      attention_status: attention.status,
      attention_reason: reason,
      source: 'doctor_review_detail',
    },
  };

  switch (attention.status) {
    case 'safety_escalation':
      return {
        ...base,
        id: 'escalate_follow_through_safety',
        label: 'Escalate WhatsApp safety concern',
        buttonLabel: 'Record Safety Escalation',
        severity: 'error',
        intent: 'provider_safety_escalation',
        nextStep: 'Review the patient message, contact the patient or emergency pathway, and document the escalation.',
        canUseWhatsAppAgent: false,
        shouldSendPatientMessage: false,
        deliveryChannels: ['provider_queue'],
        payload: {
          ...base.payload,
          escalation_action: 'escalate_to_doctor_queue',
          patient_message_delivery: false,
          create_provider_task: true,
        },
      };
    case 'completion_barrier':
      return {
        ...base,
        id: 'resolve_completion_barrier',
        label: 'Resolve completion barrier',
        buttonLabel: 'Send Barrier Follow-up',
        severity: 'warning',
        intent: 'barrier_resolution_follow_up',
        nextStep: 'Ask the WhatsApp agent to collect the barrier details and offer a practical next step.',
        deliveryChannels: ['whatsapp', 'patient_app', 'chat'],
        payload: {
          ...base.payload,
          escalation_action: 'flag_provider_follow_through_barrier',
          collect_barrier_details: true,
          patient_message_delivery: true,
        },
      };
    case 'failed':
      return {
        ...base,
        id: 'contact_failed_follow_through',
        label: 'Contact patient about failed task',
        buttonLabel: 'Send Follow-up',
        severity: 'error',
        intent: 'failed_task_follow_up',
        nextStep: 'Contact the patient or caregiver and decide whether escalation is needed.',
      };
    case 'overdue':
      return {
        ...base,
        id: 'nudge_overdue_follow_through',
        label: 'Nudge overdue task',
        buttonLabel: 'Send Overdue Nudge',
        severity: 'warning',
        intent: 'overdue_task_nudge',
        nextStep: 'Send a targeted reminder for the overdue task and keep provider attention open.',
      };
    case 'stalled':
    case 'stale_progress':
      return {
        ...base,
        id: 'nudge_stalled_follow_through',
        label: 'Restart stalled follow-through',
        buttonLabel: 'Send Progress Nudge',
        severity: 'warning',
        intent: 'stalled_follow_through_nudge',
        nextStep: 'Ask the WhatsApp agent to restart the checklist and identify barriers.',
      };
    case 'not_sent':
      return {
        ...base,
        id: 'send_initial_next_steps',
        label: 'Send doctor-approved next steps',
        buttonLabel: 'Send Next Steps',
        severity: 'info',
        intent: 'send_initial_follow_through_plan',
        requiresDoctorReview: false,
        nextStep: 'Send the doctor-approved patient plan and start completion tracking.',
      };
    default:
      return {
        ...base,
        id: 'send_or_resend_next_steps',
        label: 'Continue patient follow-through',
        buttonLabel: 'Re-send Next Steps',
        severity: attention.needsAttention ? 'warning' : 'info',
        intent: attention.needsAttention ? 'targeted_follow_through_nudge' : 'resend_follow_through_plan',
        requiresDoctorReview: Boolean(attention.needsAttention),
        nextStep: attention.needsAttention
          ? attention.nextAction
          : 'Continue automated reminders and completion tracking.',
      };
  }
};

export const getFollowThroughCompletionChannel = (completion) => {
  const channel = lower(
    completion?.source_channel ||
    completion?.channel ||
    completion?.completed_via ||
    completion?.metadata?.source_channel ||
    completion?.metadata?.channel
  );
  const actorRole = lower(completion?.actor_role || completion?.metadata?.actor_role);

  if (channel.includes('whatsapp')) {
    return actorRole.includes('agent') || actorRole.includes('ai') ? 'WhatsApp AI agent' : 'WhatsApp';
  }
  if (channel.includes('patient_app') || channel.includes('app')) return 'Patient app';
  if (channel.includes('chat')) return 'AI chat';
  if (actorRole.includes('caregiver')) return 'Caregiver';
  if (actorRole.includes('patient')) return 'Patient';
  if (actorRole.includes('agent') || actorRole.includes('ai')) return 'AI agent';
  return '';
};

const getFollowThroughTaskTitle = (task) => (
  task?.title ||
  task?.name ||
  task?.label ||
  task?.instructions ||
  task?.description ||
  task?.test_type ||
  task?.medication_name ||
  'Follow-through task'
);

const getFollowThroughTaskDetail = (task) => (
  task?.detail ||
  task?.notes ||
  task?.reason ||
  task?.description ||
  task?.instructions ||
  ''
);

const getHandoffPreview = (review) => (
  review?.patient_follow_through_preview ||
  review?.patient_handoff_preview ||
  review?.patient_follow_through ||
  {}
);

const normalizeHandoffItem = (item, index, defaults = {}) => {
  if (typeof item === 'string') {
    return {
      id: `${defaults.prefix || 'handoff'}-${index}`,
      label: item,
      detail: '',
      severity: defaults.severity || 'info',
      action: defaults.action || 'educate_patient',
      source: defaults.source || '',
    };
  }

  return {
    id: item?.id || item?.key || item?.public_id || `${defaults.prefix || 'handoff'}-${index}`,
    label: item?.label || item?.title || item?.name || item?.message || item?.trigger || item?.symptom || defaults.label || 'Patient guidance',
    detail: item?.detail || item?.description || item?.instructions || item?.reason || item?.rationale || '',
    severity: item?.severity || item?.level || item?.priority || defaults.severity || 'info',
    action: item?.action || item?.next_action || item?.escalation_action || defaults.action || 'educate_patient',
    source: item?.source || defaults.source || '',
  };
};

const uniqueHandoffItems = (items) => {
  const seen = new Set();
  return asArray(items).filter((item) => {
    const key = normalizeToken(`${item.label || ''}-${item.detail || ''}`);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const getNotePlan = (note) => {
  if (!note || typeof note !== 'object') return {};
  return note.plan && typeof note.plan === 'object' ? note.plan : {};
};

const getTaskTypes = (tasks) => new Set(asArray(tasks).map((task) => lower(task.type || task.raw?.type || task.raw?.task_type || task.raw?.action_type)));

export const buildPatientHandoffPlan = (review, options = {}) => {
  const note = options.note || getGeneratedNote(review) || {};
  const notePlan = getNotePlan(note);
  const handoffPreview = getHandoffPreview(review);
  const tasks = asArray(options.tasks);
  const taskTypes = getTaskTypes(tasks);
  const riskFlags = getRiskFlags(review);
  const missingInformation = getMissingInformation(review);
  const caregiverContext = getCaregiverContext(review);
  const patientSummary = (
    options.patientSummary ||
    review?.patient_follow_through?.patient_summary ||
    handoffPreview?.patient_summary ||
    review?.patient_summary ||
    review?.approved_patient_summary ||
    note?.patient_summary ||
    notePlan.patient_education ||
    notePlan.management ||
    ''
  );

  const explicitSafetyNet = [
    ...asArray(handoffPreview.safety_net || handoffPreview.safetyNet),
    ...asArray(review?.safety_net),
    ...asArray(notePlan.safety_net || notePlan.safetyNet),
    ...asArray(note?.safety_net || note?.safetyNet),
  ].map((item, index) => normalizeHandoffItem(item, index, {
    prefix: 'safety-net',
    severity: 'warning',
    action: 'contact_care_team',
    source: 'doctor_plan',
  }));
  const riskSafetyNet = riskFlags.map((flag, index) => normalizeHandoffItem({
    label: flag.label,
    detail: flag.description,
    severity: flag.severity || 'warning',
    action: ['emergency', 'critical', 'severe'].includes(lower(flag.severity)) ? 'seek_urgent_care' : 'contact_care_team',
  }, index, {
    prefix: 'risk',
    source: 'risk_flags',
  }));
  const defaultSafetyNet = riskFlags.length || explicitSafetyNet.length
    ? []
    : [normalizeHandoffItem('If symptoms worsen, new danger signs appear, or you feel unsafe, contact the care team or seek urgent care.', 0, {
        prefix: 'default-safety',
        severity: 'warning',
        action: 'contact_care_team',
        source: 'default',
      })];
  const safetyNet = uniqueHandoffItems([...explicitSafetyNet, ...riskSafetyNet, ...defaultSafetyNet]).slice(0, 8);

  const explicitTeachBack = [
    ...asArray(handoffPreview.teach_back_prompts || handoffPreview.teachBackPrompts),
    ...asArray(review?.teach_back_prompts),
    ...asArray(notePlan.teach_back_prompts || notePlan.teachBackPrompts || notePlan.teach_back),
  ].map((item, index) => normalizeHandoffItem(item, index, {
    prefix: 'teach-back',
    severity: 'info',
    action: 'ask_patient_reply',
    source: 'doctor_plan',
  }));
  const taskTeachBack = tasks.slice(0, 3).map((task, index) => normalizeHandoffItem(
    `Please reply with when you will complete: ${task.title || task.raw?.title || 'your next task'}.`,
    index,
    {
      prefix: 'task-teach-back',
      severity: 'info',
      action: 'confirm_patient_understanding',
      source: 'follow_through_task',
    }
  ));
  const safetyTeachBack = safetyNet.slice(0, 2).map((item, index) => normalizeHandoffItem(
    `Please reply with what you will do if this happens: ${item.label}.`,
    index,
    {
      prefix: 'safety-teach-back',
      severity: item.severity || 'warning',
      action: 'confirm_safety_net_understanding',
      source: 'safety_net',
    }
  ));
  const teachBackPrompts = uniqueHandoffItems([...explicitTeachBack, ...taskTeachBack, ...safetyTeachBack]).slice(0, 8);

  const escalationTriggers = safetyNet.map((item, index) => ({
    id: item.id || `escalation-${index}`,
    trigger: item.label,
    detail: item.detail,
    severity: item.severity,
    action: ['emergency', 'critical', 'severe'].includes(lower(item.severity)) || item.action === 'seek_urgent_care'
      ? 'seek_urgent_care'
      : 'escalate_to_doctor_queue',
    source: item.source || 'safety_net',
  }));

  const adherenceSupports = [
    caregiverContext.isCaregiverSubmitted && {
      id: 'caregiver-support',
      label: caregiverContext.authorizedRecipient === true
        ? 'Include authorized caregiver in reminders.'
        : 'Confirm caregiver authorization before sharing patient instructions.',
      severity: caregiverContext.authorizedRecipient === true ? 'info' : 'warning',
      action: caregiverContext.authorizedRecipient === true ? 'include_caregiver' : 'confirm_authorization',
    },
    taskTypes.has('medication') && {
      id: 'medication-support',
      label: 'Ask about missed doses, side effects, cost, and access before marking medication tasks complete.',
      severity: 'info',
      action: 'screen_medication_barriers',
    },
    (taskTypes.has('investigation') || taskTypes.has('lab') || taskTypes.has('test')) && {
      id: 'investigation-support',
      label: 'Ask whether the patient knows where, when, and how to complete tests.',
      severity: 'info',
      action: 'screen_test_access_barriers',
    },
    missingInformation.length > 0 && {
      id: 'missing-info-support',
      label: 'Use follow-up messages to collect unresolved information before the next doctor review.',
      severity: 'warning',
      action: 'collect_missing_information',
    },
  ].filter(Boolean);

  return {
    patientSummary,
    safetyNet,
    teachBackPrompts,
    escalationTriggers,
    adherenceSupports,
    whatsappAgentGoals: [
      'Confirm the patient or authorized caregiver understands the plan.',
      'Ask one task-completion question at a time.',
      'Use teach-back before marking high-risk or medication tasks complete.',
      'Escalate worsening symptoms, safety-net triggers, missed critical tasks, or caregiver authorization issues.',
    ],
    counts: {
      safetyNet: safetyNet.length,
      teachBackPrompts: teachBackPrompts.length,
      escalationTriggers: escalationTriggers.length,
      adherenceSupports: adherenceSupports.length,
    },
  };
};

const normalizeAgentFollowThroughTask = (task, index) => {
  const completion = getFollowThroughTaskCompletionRecord(task);
  const status = getFollowThroughTaskStatus(task);
  const isCompleted = isFollowThroughTaskComplete(task);
  const checklistItemId = (
    task?.checklist_item_id ||
    task?.checklistItemId ||
    task?.checklist_item_public_id ||
    task?.checklistItemPublicId ||
    task?.public_id ||
    task?.id ||
    null
  );
  const taskThreadId = (
    task?.task_public_id ||
    task?.taskPublicId ||
    task?.task_thread_public_id ||
    task?.taskThreadPublicId ||
    task?.workflow_task_public_id ||
    task?.workflowTaskPublicId ||
    task?.workflow_state?.task_public_id ||
    task?.workflow_state?.public_id ||
    null
  );
  const isNextInLine = Boolean(
    task?.is_next_in_line ||
    task?.next_in_line ||
    task?.is_active ||
    task?.is_current ||
    task?.workflow_state?.is_next_in_line ||
    task?.workflow_state?.status === 'current'
  );

  return {
    id: checklistItemId || `follow-through-${index}`,
    checklistItemId,
    taskThreadId,
    title: getFollowThroughTaskTitle(task),
    detail: getFollowThroughTaskDetail(task),
    type: task?.type || task?.task_type || task?.action_type || 'task',
    status: status || 'pending',
    isCompleted,
    isNextInLine,
    dueAt: (
      task?.due_at ||
      task?.due_date ||
      task?.scheduled_time ||
      task?.scheduled_at ||
      task?.expected_completion_at ||
      task?.target_completion_at ||
      null
    ),
    responsiblePartyRole: task?.responsible_party_role || task?.responsible_role || task?.assignee_role || 'patient',
    completion,
    completionChannel: getFollowThroughCompletionChannel(completion),
    raw: task,
  };
};

export const getWhatsAppFollowThroughAgentState = (review, options = {}) => {
  const now = options.now ?? Date.now();
  const optionTasks = asArray(options.tasks).map((task) => (
    task?.raw
      ? {
          ...task.raw,
          title: task.title || task.raw.title,
          detail: task.detail || task.raw.detail,
          type: task.type || task.raw.type,
        }
      : task
  ));
  const rawTasks = optionTasks.length > 0 ? optionTasks : getFollowThroughTasks(review);
  const tasks = rawTasks.map(normalizeAgentFollowThroughTask);
  const progress = getFollowThroughProgress(review);
  const attention = getFollowThroughAttention(review, { now });
  const allowedCompletionChannels = asArray(
    review?.patient_follow_through?.completion_tracking?.allowed_channels ||
    review?.patient_follow_through?.allowed_completion_channels ||
    review?.metadata?.allowed_completion_channels ||
    options.allowedCompletionChannels ||
    ['whatsapp_ai_agent', 'patient_app', 'chat']
  );
  const whatsappEnabled = allowedCompletionChannels.length === 0 || allowedCompletionChannels.some((channel) => lower(channel).includes('whatsapp'));
  const incompleteTasks = tasks.filter((task) => !task.isCompleted);
  const nextTask = (
    incompleteTasks.find((task) => task.isNextInLine) ||
    incompleteTasks[0] ||
    null
  );
  const latestCompletion = progress.latestCompletion || getLatestTaskCompletionRecord(rawTasks);
  const completedByWhatsAppCount = tasks.filter((task) => lower(task.completionChannel).includes('whatsapp')).length;
  const activeTaskReadyForCompletion = Boolean(nextTask?.checklistItemId && nextTask?.taskThreadId);

  return {
    enabled: whatsappEnabled,
    channel: 'whatsapp_ai_agent',
    label: 'WhatsApp AI follow-through',
    canMarkItemsComplete: Boolean(whatsappEnabled && nextTask && tasks.length > 0),
    activeTaskReadyForCompletion,
    nextTask,
    nextTaskId: nextTask?.id || null,
    activeChecklistItemId: nextTask?.checklistItemId || null,
    activeTaskThreadId: nextTask?.taskThreadId || null,
    tasks,
    pendingTasks: incompleteTasks,
    completedTasks: tasks.filter((task) => task.isCompleted),
    pendingTaskCount: incompleteTasks.length,
    completedByWhatsAppCount,
    latestCompletion,
    latestCompletionChannel: getFollowThroughCompletionChannel(latestCompletion),
    shouldPromoteNextTaskAfterCompletion: true,
    attention,
    progress,
    nextAction: attention.needsAttention
      ? attention.nextAction
      : nextTask
        ? `Ask whether "${nextTask.title}" is complete, then promote the next task.`
        : 'All visible follow-through tasks are complete.',
  };
};

const COMPLETION_CONFIRMATION_PATTERNS = [
  /\b(done|completed|finished|taken|took|did it|i have done|we have done|it is done)\b/,
  /\b(booked|scheduled|attended|submitted|collected|paid|picked up)\b/,
  /\b(the lab is done|test is done|medication was taken|medicine was taken)\b/,
];

const COMPLETION_BARRIER_PATTERNS = [
  /\b(can't|cannot|couldn't|could not|unable|not able)\b/,
  /\b(not yet|haven't|have not|didn't|did not|missed|forgot)\b/,
  /\b(no money|too expensive|cost|transport|closed|unavailable|out of stock)\b/,
  /\b(side effect|vomit|vomiting|rash|dizzy|dizziness|reaction)\b/,
];

const SAFETY_ESCALATION_PATTERNS = [
  /\b(worse|worsening|getting worse|severe|unbearable)\b/,
  /\b(chest pain|shortness of breath|can't breathe|cannot breathe|difficulty breathing)\b/,
  /\b(faint|fainted|collapse|collapsed|confused|confusion|seizure)\b/,
  /\b(bleeding|swelling|allergic|anaphylaxis|emergency)\b/,
  /\b(high fever|persistent fever|danger sign|unsafe)\b/,
];

const matchesAnyPattern = (text, patterns) => patterns.some((pattern) => pattern.test(text));

export const classifyWhatsAppCompletionIntent = (message = '', options = {}) => {
  const rawMessage = String(message || '').trim();
  const normalized = lower(rawMessage);
  const safetyNetTriggers = asArray(options.safetyNetTriggers || options.escalationTriggers);
  const matchedSafetyTrigger = safetyNetTriggers.find((trigger) => {
    const triggerText = lower(trigger?.trigger || trigger?.label || trigger?.title || trigger);
    return triggerText && normalized.includes(triggerText);
  });
  const safetyMatch = Boolean(
    rawMessage &&
    (matchedSafetyTrigger || matchesAnyPattern(normalized, SAFETY_ESCALATION_PATTERNS))
  );
  const barrierMatch = Boolean(rawMessage && matchesAnyPattern(normalized, COMPLETION_BARRIER_PATTERNS));
  const completedMatch = Boolean(rawMessage && matchesAnyPattern(normalized, COMPLETION_CONFIRMATION_PATTERNS));

  if (safetyMatch) {
    return {
      intent: 'safety_escalation',
      completed: false,
      shouldRecordCompletion: false,
      shouldEscalate: true,
      recordCompliance: false,
      note: rawMessage,
      confidence: 'high',
      escalation: {
        severity: matchedSafetyTrigger?.severity || 'warning',
        action: matchedSafetyTrigger?.action || 'escalate_to_doctor_queue',
        reason: matchedSafetyTrigger?.trigger || matchedSafetyTrigger?.label || 'Patient or caregiver reported worsening symptoms.',
      },
    };
  }

  if (barrierMatch) {
    return {
      intent: 'unable_to_complete',
      completed: false,
      shouldRecordCompletion: true,
      shouldEscalate: true,
      recordCompliance: true,
      note: rawMessage,
      confidence: 'medium',
      escalation: {
        severity: 'warning',
        action: 'flag_provider_follow_through_barrier',
        reason: 'Patient or caregiver reported a barrier or non-completion.',
      },
    };
  }

  if (completedMatch) {
    return {
      intent: 'completed',
      completed: true,
      shouldRecordCompletion: true,
      shouldEscalate: false,
      recordCompliance: true,
      note: rawMessage,
      confidence: 'medium',
      escalation: null,
    };
  }

  return {
    intent: rawMessage ? 'unclear' : 'template',
    completed: true,
    shouldRecordCompletion: !rawMessage,
    shouldEscalate: false,
    recordCompliance: true,
    note: rawMessage,
    confidence: rawMessage ? 'low' : 'template',
    escalation: null,
  };
};

export const buildWhatsAppCompletionCommand = (review, options = {}) => {
  const agentState = options.agentState || getWhatsAppFollowThroughAgentState(review, options);
  const caregiverContext = options.caregiverContext || getCaregiverContext(review);
  const patientMessage = compact([options.patientMessage, options.message, options.completionMessage])[0] || '';
  const hasPatientMessage = Boolean(String(patientMessage || '').trim());
  const handoffPlan = hasPatientMessage
    ? buildPatientHandoffPlan(review, { tasks: options.tasks, patientSummary: options.patientSummary, note: options.notePayload })
    : null;
  const intentClassification = options.intentClassification || classifyWhatsAppCompletionIntent(patientMessage, {
    safetyNetTriggers: options.safetyNetTriggers || handoffPlan?.escalationTriggers || [],
  });
  const actorRole = options.actorRole || (
    caregiverContext.isCaregiverSubmitted && caregiverContext.authorizedRecipient === true
      ? 'authorized_caregiver'
      : 'patient'
  );
  const actorName = options.actorName || (
    actorRole === 'authorized_caregiver'
      ? caregiverContext.caregiverName
      : ''
  );
  const taskPublicId = agentState.activeTaskThreadId || agentState.nextTask?.taskThreadId || null;
  const checklistItemId = agentState.activeChecklistItemId || agentState.nextTask?.checklistItemId || null;
  const blockers = [];

  if (!agentState.enabled) {
    blockers.push({
      id: 'whatsapp_disabled',
      label: 'WhatsApp completion tracking is not enabled for this plan.',
    });
  }
  if (!agentState.nextTask) {
    blockers.push({
      id: 'no_active_task',
      label: 'No incomplete follow-through task is ready for completion.',
    });
  }
  if (!taskPublicId || !checklistItemId) {
    blockers.push({
      id: 'missing_checklist_identifiers',
      label: 'Checklist identifiers are required before the WhatsApp agent can reconcile completion.',
    });
  }
  if (caregiverContext.authorizationBlocked) {
    blockers.push({
      id: 'caregiver_authorization_blocked',
      label: 'The caregiver is not authorized to complete patient-facing tasks.',
    });
  }
  if (caregiverContext.isCaregiverSubmitted && caregiverContext.authorizationUnknown && actorRole !== 'patient') {
    blockers.push({
      id: 'caregiver_authorization_unknown',
      label: 'Confirm caregiver authorization before accepting caregiver completion.',
    });
  }
  if (hasPatientMessage && intentClassification.intent === 'unclear') {
    blockers.push({
      id: 'completion_intent_unclear',
      label: 'Ask a clearer completion question before reconciling the checklist item.',
    });
  }
  if (hasPatientMessage && intentClassification.intent === 'safety_escalation') {
    blockers.push({
      id: 'safety_escalation_detected',
      label: 'Escalate the patient or caregiver safety message instead of marking the task complete.',
    });
  }

  const endpoint = taskPublicId && checklistItemId
    ? `/task-threads/${encodeURIComponent(taskPublicId)}/checklist-items/${encodeURIComponent(checklistItemId)}/completion/`
    : '';

  return {
    enabled: agentState.enabled,
    canRecord: blockers.length === 0,
    blockers,
    endpoint,
    method: 'POST',
    taskPublicId,
    checklistItemId,
    activeTaskTitle: agentState.nextTask?.title || '',
    activeTaskDetail: agentState.nextTask?.detail || '',
    intentClassification,
    shouldEscalate: intentClassification.shouldEscalate,
    escalation: intentClassification.escalation,
    shouldPromoteNextTaskAfterCompletion: agentState.shouldPromoteNextTaskAfterCompletion,
    payload: {
      completed: options.completed ?? intentClassification.completed,
      note: options.note || intentClassification.note || '',
      record_compliance: options.recordCompliance ?? intentClassification.recordCompliance,
      source_channel: 'whatsapp_ai_agent',
      actor_role: actorRole,
      actor_name: actorName || '',
      completion_intent: options.completionIntent || (
        intentClassification.intent === 'template'
          ? 'patient_or_caregiver_confirmed_done'
          : intentClassification.intent
      ),
      metadata: {
        review_public_id: review?.public_id || review?.id || '',
        completion_loop: 'whatsapp_ai_agent',
        active_task_title: agentState.nextTask?.title || '',
        should_promote_next_task_after_completion: agentState.shouldPromoteNextTaskAfterCompletion,
        intent_confidence: intentClassification.confidence,
        should_escalate: intentClassification.shouldEscalate,
        escalation_action: intentClassification.escalation?.action || '',
      },
    },
  };
};

export const buildWhatsAppInboundFollowThroughResult = (review, options = {}) => {
  const patientMessage = compact([options.patientMessage, options.message, options.completionMessage])[0] || '';
  const command = options.command || buildWhatsAppCompletionCommand(review, {
    ...options,
    patientMessage,
  });
  const intentClassification = command.intentClassification || classifyWhatsAppCompletionIntent(patientMessage, options);
  const blockerIds = command.blockers.map((blocker) => blocker.id);
  const reviewPublicId = review?.public_id || review?.id || command.payload?.metadata?.review_public_id || '';
  const canRecordCompletion = Boolean(command.canRecord && intentClassification.shouldRecordCompletion);
  const hasSafetyEscalation = intentClassification.intent === 'safety_escalation' || blockerIds.includes('safety_escalation_detected');
  const hasBarrier = intentClassification.intent === 'unable_to_complete';
  const hasUnclearIntent = intentClassification.intent === 'unclear' || blockerIds.includes('completion_intent_unclear');
  const hasReconciliationBlocker = command.blockers.some((blocker) => (
    blocker.id !== 'completion_intent_unclear' &&
    blocker.id !== 'safety_escalation_detected'
  ));

  let backendAction = 'record_completion';
  let patientReply = 'Thanks, I have marked this step as complete and will keep tracking the next step.';

  if (hasSafetyEscalation) {
    backendAction = 'escalate_safety_message';
    patientReply = 'Thanks for telling us. I am flagging this for the care team now. Please seek urgent care immediately if symptoms are severe or worsening.';
  } else if (hasUnclearIntent) {
    backendAction = 'ask_clarifying_completion_question';
    patientReply = command.activeTaskTitle
      ? `Please reply DONE if "${command.activeTaskTitle}" is complete, or tell us what stopped you.`
      : 'Please reply DONE if the step is complete, or tell us what stopped you.';
  } else if (hasBarrier && canRecordCompletion) {
    backendAction = 'record_completion_barrier';
    patientReply = 'Thanks, I have shared this barrier with the care team so they can help with the next step.';
  } else if (hasReconciliationBlocker) {
    backendAction = 'capture_for_provider_reconciliation';
    patientReply = 'Thanks, I have captured your update for the care team to review.';
  }

  return {
    reviewPublicId,
    sourceChannel: 'whatsapp_ai_agent',
    patientMessage,
    backendAction,
    patientReply,
    canRecordCompletion,
    shouldRecordCompletion: canRecordCompletion,
    shouldEscalate: Boolean(intentClassification.shouldEscalate || hasSafetyEscalation || hasBarrier),
    shouldNotifyProvider: Boolean(intentClassification.shouldEscalate || hasSafetyEscalation || hasBarrier || hasReconciliationBlocker),
    shouldAskClarifyingQuestion: hasUnclearIntent,
    shouldPromoteNextTaskAfterCompletion: command.shouldPromoteNextTaskAfterCompletion,
    command,
    intentClassification,
    blockers: command.blockers,
    auditEvent: {
      kind: 'whatsapp_follow_through_message',
      review_public_id: reviewPublicId,
      source_channel: 'whatsapp_ai_agent',
      action: backendAction,
      message: patientMessage,
      task_public_id: command.taskPublicId,
      checklist_item_id: command.checklistItemId,
      active_task_title: command.activeTaskTitle,
      intent: intentClassification.intent,
      completed: command.payload?.completed,
      should_escalate: Boolean(intentClassification.shouldEscalate),
      escalation_action: intentClassification.escalation?.action || command.payload?.metadata?.escalation_action || '',
      blockers: command.blockers,
    },
  };
};

export const getGeneratedNote = (review) => {
  const triage = getTriagePayload(review);
  return (
    review?.ai_generated_note ||
    review?.generated_doctor_note ||
    review?.suggested_doctor_note ||
    triage.generated_note ||
    triage.doctor_note ||
    triage.soap_note ||
    review?.doctor_note ||
    review?.note_payload ||
    null
  );
};

export const getPatientStory = (review) => {
  const triage = getTriagePayload(review);
  const transcript = asArray(
    review?.triage_transcript ||
    triage.transcript ||
    triage.messages ||
    triage.conversation
  );

  if (transcript.length > 0) {
    return transcript
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        const speaker = entry.speaker || entry.role || entry.author || 'patient';
        const text = entry.text || entry.content || entry.message || '';
        return text ? `${toTitle(speaker)}: ${text}` : '';
      })
      .filter(Boolean)
      .join('\n');
  }

  return compact([
    review?.chief_complaint && `Chief complaint: ${review.chief_complaint}`,
    triage.summary,
    triage.patient_story,
    review?.patient_summary,
    review?.assistant_response,
  ]).join('\n\n');
};

const getEvidenceText = (entry) => (
  EVIDENCE_TEXT_KEYS.map((key) => entry?.[key]).find((value) => value !== null && value !== undefined && String(value).trim()) || ''
);

const looksLikeEvidenceLeaf = (entry) => {
  if (!entry || typeof entry !== 'object') return false;
  return Boolean(
    getEvidenceText(entry) ||
    getRawSource(entry) ||
    entry.verification_status ||
    entry.confidence ||
    entry.confidence_score ||
    entry.source_type ||
    entry.field ||
    entry.soap_field ||
    entry.note_field
  );
};

const normalizeEvidenceEntry = (entry, section, index, field = null) => {
  if (!entry || typeof entry !== 'object') {
    return {
      id: `${section || 'evidence'}-${field || 'item'}-${index}`,
      section,
      field,
      quote: entry,
    };
  }

  const normalizedSection = entry.section || entry.soap_section || entry.note_section || entry.category || section;
  const normalizedField = entry.field || entry.soap_field || entry.note_field || entry.key || entry.attribute || field;

  return {
    ...entry,
    id: entry.id || entry.public_id || `${normalizedSection || 'evidence'}-${normalizedField || 'item'}-${index}`,
    section: normalizedSection,
    field: normalizedField,
    quote: entry.quote || entry.text || entry.value || entry.description || entry.finding || entry.claim || '',
  };
};

const flattenEvidenceValue = (value, section = null, path = []) => {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.flatMap((entry, index) => flattenEvidenceValue(entry, section, [...path, index]));
  }

  if (typeof value !== 'object') {
    return [normalizeEvidenceEntry(value, section, 0, lastStringValue(path) || lastValue(path))];
  }

  const field = value.field || value.soap_field || value.note_field || value.key || lastStringValue(path);
  const entries = [];

  if (looksLikeEvidenceLeaf(value)) {
    entries.push(normalizeEvidenceEntry(value, section, entries.length, field));
  }

  EVIDENCE_CONTAINER_KEYS.forEach((key) => {
    if (value[key]) {
      entries.push(...flattenEvidenceValue(value[key], value.section || section, [...path, field || key]));
    }
  });

  if (entries.length === 0) {
    Object.entries(value).forEach(([key, nested]) => {
      entries.push(...flattenEvidenceValue(nested, section, [...path, key]));
    });
  }

  return entries;
};

export const getEvidenceEntries = (review) => {
  const triage = getTriagePayload(review);
  const evidence = review?.evidence_map || triage.evidence_map || review?.evidence || triage.evidence;

  if (!evidence) return [];
  if (Array.isArray(evidence)) {
    return flattenEvidenceValue(evidence).map((entry, index) => normalizeEvidenceEntry(entry, entry.section, index, entry.field));
  }

  if (typeof evidence === 'object') {
    return Object.entries(evidence).flatMap(([section, entries]) =>
      flattenEvidenceValue(entries, section).map((entry, index) => normalizeEvidenceEntry(entry, section, index, entry.field))
    );
  }

  return [];
};

const matchesSection = (entrySection, sectionKey) => {
  if (!sectionKey) return true;
  const expected = normalizeToken(sectionKey);
  const actual = normalizeToken(entrySection);
  if (!actual) return false;
  if (actual === expected || actual.includes(expected) || expected.includes(actual)) return true;
  return (SECTION_ALIASES[expected] || []).some((alias) => actual.includes(normalizeToken(alias)));
};

const matchesField = (entryField, fieldKey) => {
  if (!fieldKey) return true;
  const actual = normalizeToken(entryField);
  if (!actual) return false;
  const expected = normalizeToken(fieldKey);
  return actual === expected || actual.includes(expected) || expected.includes(actual);
};

export const filterEvidenceForSoapField = (evidenceEntries, sectionKey, fieldKey = null) => (
  asArray(evidenceEntries).filter((entry) => (
    matchesSection(entry.section, sectionKey) && matchesField(entry.field, fieldKey)
  ))
);

export const getEvidenceForSoapField = (review, sectionKey, fieldKey = null) => (
  filterEvidenceForSoapField(getEvidenceEntries(review), sectionKey, fieldKey)
);

export const needsEvidenceVerification = (entry) => {
  const config = getSourceConfig(entry);
  const verification = normalizeToken(entry?.verification_status || entry?.verified_status || entry?.status);
  const confidenceScore = Number(entry?.confidence_score ?? entry?.confidence);

  if (verification.includes('unverified') || verification.includes('uncorroborated')) return true;
  if (verification.includes('verified')) return false;
  if (Number.isFinite(confidenceScore) && confidenceScore < 0.75) return true;
  return config.needsVerification;
};

export const getEvidenceConfidenceLabel = (entry) => {
  const verification = normalizeToken(entry?.verification_status || entry?.verified_status || entry?.status);
  const confidenceScore = Number(entry?.confidence_score ?? entry?.confidence);
  const confidenceLevel = entry?.confidence_level || entry?.confidence_bucket;

  if (verification.includes('unverified') || verification.includes('uncorroborated')) return 'Needs verification';
  if (verification.includes('verified')) return 'Verified';
  if (Number.isFinite(confidenceScore)) return `${Math.round(confidenceScore > 1 ? confidenceScore : confidenceScore * 100)}% confidence`;
  if (confidenceLevel) return `${toTitle(confidenceLevel)} confidence`;
  if (needsEvidenceVerification(entry)) return 'Needs verification';
  return '';
};

export const summarizeEvidenceSources = (evidenceEntries) => {
  const entries = asArray(evidenceEntries);
  const sourceCounts = entries.reduce((acc, entry) => {
    const category = getSourceCategory(entry);
    const config = getSourceConfig(entry);
    const current = acc[category] || { key: category, ...config, count: 0 };
    acc[category] = { ...current, count: current.count + 1 };
    return acc;
  }, {});

  const confidenceLabels = Array.from(new Set(entries.map(getEvidenceConfidenceLabel).filter(Boolean)));

  return {
    count: entries.length,
    sources: Object.values(sourceCounts),
    needsVerification: entries.some(needsEvidenceVerification),
    confidenceLabel: confidenceLabels[0] || '',
  };
};

const noteActions = (note) => [
  ...asArray(note?.prescription).map((item) => ({
    type: 'prescription',
    label: item.medication_name || item.name || 'Medication',
    reason: item.instructions || item.reason || '',
  })),
  ...asArray(note?.investigation).map((item) => ({
    type: 'investigation',
    label: item.test_type || item.name || 'Investigation',
    reason: item.reason || item.instructions || '',
  })),
  ...asArray(note?.other_actions).map((item) => ({
    type: item.action_type || item.type || 'clinical_action',
    label: item.name || item.label || 'Clinical action',
    reason: item.notes || item.reason || '',
  })),
];

export const getRecommendedActions = (review) => {
  const triage = getTriagePayload(review);
  const note = getGeneratedNote(review);
  const explicit = [
    ...asArray(review?.recommended_actions),
    ...asArray(review?.suggested_actions),
    ...asArray(triage.recommended_actions),
    ...asArray(triage.suggested_actions),
  ].map((action, index) => {
    if (typeof action === 'string') {
      return { id: `action-${index}`, type: 'clinical_action', label: action };
    }
    return {
      id: action.id || action.key || `action-${index}`,
      type: action.type || action.action_type || 'clinical_action',
      label: action.label || action.title || action.name || action.test_type || action.medication_name || 'Clinical action',
      reason: action.reason || action.rationale || action.notes || action.description || '',
    };
  });

  return [...explicit, ...noteActions(note)];
};

export const getSubmitterLabel = (review) => {
  const triage = getTriagePayload(review);
  const submittedBy = review?.submitted_by || triage.submitted_by || review?.source_channel;
  const relationship = review?.caregiver_relationship || triage.caregiver_relationship;

  if (relationship) return `Caregiver: ${toTitle(relationship)}`;
  if (submittedBy) return toTitle(submittedBy);
  return isAiTriageReview(review) ? 'Patient or caregiver' : 'Clinician';
};

export const getSourceLabel = (source) => {
  if (source && typeof source === 'object') {
    return getSourceConfig(source).label;
  }
  const raw = source?.source_type || source?.type || source?.verification_status || source;
  if (!raw) return 'Source';
  return toTitle(raw);
};

export const hasUnacknowledgedEmergencyRisk = (review) => {
  if (review?.safety_gate?.blocked) return true;
  if (review?.safety_gate?.requires_escalation && !review?.safety_gate?.escalation_recorded) return true;
  const urgency = getUrgencyConfig(review);
  if (urgency.value === 'emergency' || urgency.value === 'critical') return true;
  return getRiskFlags(review).some((flag) => ['emergency', 'critical', 'severe'].includes(lower(flag.severity)));
};

const getPatientIdentityValue = (review, patient, keys) => (
  keys.map((key) => patient?.[key] || review?.[key]).find((value) => value !== null && value !== undefined && String(value).trim()) || ''
);

const firstValue = (...values) => values.find((value) => value !== null && value !== undefined && value !== '');

const booleanValue = (value) => {
  if (value === true || value === false) return value;
  const normalized = lower(value);
  if (['true', 'yes', 'y', '1', 'confirmed', 'verified', 'authorized', 'present'].includes(normalized)) return true;
  if (['false', 'no', 'n', '0', 'denied', 'unverified', 'unauthorized', 'absent'].includes(normalized)) return false;
  return null;
};

const CLINICAL_SCORE_KEYS = [
  'safety_score',
  'diagnostic_quality_score',
  'management_quality_score',
  'patient_communication_score',
  'local_feasibility_score',
];

const CORRECTION_SEVERITY_RANK = {
  none: 0,
  minor: 1,
  moderate: 2,
  major: 3,
  critical: 4,
};

const clinicalTextParts = (value) => {
  if (value === null || value === undefined || value === '') return [];
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return [String(value)];
  }
  if (Array.isArray(value)) {
    return value.flatMap(clinicalTextParts);
  }
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => !['id', 'public_id', 'created_at', 'updated_at', 'metadata'].includes(key))
      .flatMap(([key, entry]) => [
        key.replace(/_/g, ' '),
        ...clinicalTextParts(entry),
      ]);
  }
  return [];
};

export const flattenClinicalText = (value) => (
  clinicalTextParts(value)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const tokenizeClinicalText = (value) => (
  flattenClinicalText(value)
    .toLowerCase()
    .replace(/[^a-z0-9+./%-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
);

const tokenFrequency = (tokens) => tokens.reduce((acc, token) => {
  acc[token] = (acc[token] || 0) + 1;
  return acc;
}, {});

export const getNoteEditBurden = (draftNote, finalNote) => {
  const draftTokens = tokenizeClinicalText(draftNote);
  const finalTokens = tokenizeClinicalText(finalNote);
  const draftCount = draftTokens.length;
  const finalCount = finalTokens.length;
  const total = draftCount + finalCount;

  if (!total) {
    return {
      estimatedChangeRatio: 0,
      percentChanged: 0,
      level: 'none',
      label: 'No note text',
      color: 'default',
      originalWordCount: 0,
      revisedWordCount: 0,
      wordDelta: 0,
      meaningfulEdits: false,
    };
  }

  if (!draftCount || !finalCount) {
    return {
      estimatedChangeRatio: 1,
      percentChanged: 100,
      level: 'heavy',
      label: 'Heavy edit burden',
      color: 'warning',
      originalWordCount: draftCount,
      revisedWordCount: finalCount,
      wordDelta: finalCount - draftCount,
      meaningfulEdits: true,
    };
  }

  const draftFrequency = tokenFrequency(draftTokens);
  const finalFrequency = tokenFrequency(finalTokens);
  const overlap = Object.keys(draftFrequency).reduce((count, token) => (
    count + Math.min(draftFrequency[token], finalFrequency[token] || 0)
  ), 0);
  const estimatedChangeRatio = Math.max(0, Math.min(1, 1 - ((2 * overlap) / total)));
  const percentChanged = Math.round(estimatedChangeRatio * 100);
  const wordDelta = finalCount - draftCount;

  if (estimatedChangeRatio >= 0.6) {
    return {
      estimatedChangeRatio,
      percentChanged,
      level: 'heavy',
      label: 'Heavy edit burden',
      color: 'warning',
      originalWordCount: draftCount,
      revisedWordCount: finalCount,
      wordDelta,
      meaningfulEdits: true,
    };
  }

  if (estimatedChangeRatio >= 0.35) {
    return {
      estimatedChangeRatio,
      percentChanged,
      level: 'moderate',
      label: 'Moderate edit burden',
      color: 'info',
      originalWordCount: draftCount,
      revisedWordCount: finalCount,
      wordDelta,
      meaningfulEdits: true,
    };
  }

  if (estimatedChangeRatio >= 0.12 || Math.abs(wordDelta) >= 15) {
    return {
      estimatedChangeRatio,
      percentChanged,
      level: 'light',
      label: 'Light edit burden',
      color: 'success',
      originalWordCount: draftCount,
      revisedWordCount: finalCount,
      wordDelta,
      meaningfulEdits: true,
    };
  }

  return {
    estimatedChangeRatio,
    percentChanged,
    level: 'minimal',
    label: 'Minimal edits',
    color: 'success',
    originalWordCount: draftCount,
    revisedWordCount: finalCount,
    wordDelta,
    meaningfulEdits: false,
  };
};

export const getClinicalFeedbackSummary = (feedback = {}, options = {}) => {
  const source = feedback || {};
  const scores = CLINICAL_SCORE_KEYS.reduce((acc, key) => {
    const score = Number(source[key]);
    if (Number.isInteger(score) && score >= 1 && score <= 5) {
      acc[key] = score;
    }
    return acc;
  }, {});
  const scoreValues = Object.values(scores);
  const averageScore = scoreValues.length
    ? Math.round((scoreValues.reduce((sum, value) => sum + value, 0) / scoreValues.length) * 10) / 10
    : null;
  const lowScoreKeys = Object.entries(scores)
    .filter(([, value]) => value <= 2)
    .map(([key]) => key);
  const acceptedDiagnosis = booleanValue(source.accepted_ai_diagnosis);
  const acceptedPlan = booleanValue(source.accepted_ai_plan);
  const correctionCategories = asArray(source.correction_categories);
  const correctionSeverity = lower(source.correction_severity || '');
  const correctionSeverityRank = CORRECTION_SEVERITY_RANK[correctionSeverity] ?? 0;
  const editReason = String(source.edit_reason || '').trim();
  const correctionRecorded = Boolean(
    acceptedDiagnosis === false ||
    acceptedPlan === false ||
    correctionCategories.length > 0 ||
    correctionSeverityRank >= 2 ||
    lowScoreKeys.length > 0 ||
    editReason
  );
  const acceptedAll = Boolean(
    acceptedDiagnosis === true &&
    acceptedPlan === true &&
    !correctionRecorded
  );
  const feedbackCaptured = Boolean(
    Object.keys(scores).length > 0 ||
    acceptedDiagnosis !== null ||
    acceptedPlan !== null ||
    correctionCategories.length > 0 ||
    correctionSeverity ||
    editReason
  );
  const decision = lower(options.decision || source.workflow_decision || '');

  return {
    feedbackCaptured,
    scores,
    averageScore,
    lowScoreKeys,
    acceptedDiagnosis,
    acceptedPlan,
    acceptedAll: acceptedAll || (decision === 'approve_as_is' && !correctionRecorded),
    correctionRecorded,
    correctionCategories,
    correctionSeverity,
    correctionSeverityRank,
    editReason,
    hasMajorCorrection: correctionSeverityRank >= 3 || lowScoreKeys.length > 0,
  };
};

export const getCaregiverContext = (review = {}) => {
  const triage = getTriagePayload(review);
  const submittedBy = firstValue(review?.submitted_by, triage.submitted_by, review?.source_channel, triage.source_channel, '');
  const sourceChannel = firstValue(review?.source_channel, triage.source_channel, triage.entry_channel, review?.entry_channel, '');
  const relationship = firstValue(
    review?.caregiver_relationship,
    triage.caregiver_relationship,
    review?.caregiver?.relationship,
    triage.caregiver?.relationship,
    review?.submitter?.caregiver_relationship,
    ''
  );
  const caregiverName = firstValue(
    review?.caregiver_name,
    triage.caregiver_name,
    review?.caregiver?.name,
    triage.caregiver?.name,
    review?.submitter?.name,
    ''
  );
  const isCaregiverSubmitted = Boolean(
    relationship ||
    lower(submittedBy).includes('caregiver') ||
    lower(submittedBy).includes('family') ||
    lower(submittedBy).includes('guardian') ||
    lower(submittedBy).includes('parent') ||
    lower(sourceChannel).includes('caregiver')
  );
  const patientPresent = booleanValue(firstValue(
    review?.patient_present,
    review?.patient_was_present,
    review?.patient_available,
    triage.patient_present,
    triage.patient_was_present,
    triage.patient_available,
    review?.submitter?.patient_present
  ));
  const patientIdentityConfirmed = booleanValue(firstValue(
    review?.patient_identity_confirmed,
    review?.patient_identity_verified,
    review?.identity_verified,
    triage.patient_identity_confirmed,
    triage.patient_identity_verified,
    triage.identity_verified,
    review?.submitter?.patient_identity_confirmed
  ));
  const authorizedRecipient = booleanValue(firstValue(
    review?.caregiver_authorized,
    review?.caregiver_authorization_confirmed,
    review?.authorized_recipient,
    review?.authorized_to_receive_instructions,
    review?.consent_to_share_with_caregiver,
    triage.caregiver_authorized,
    triage.caregiver_authorization_confirmed,
    triage.authorized_recipient,
    triage.authorized_to_receive_instructions,
    triage.consent_to_share_with_caregiver,
    review?.submitter?.authorized_recipient
  ));

  return {
    isCaregiverSubmitted,
    submittedBy,
    sourceChannel,
    relationship,
    caregiverName,
    patientPresent,
    patientIdentityConfirmed,
    authorizedRecipient,
    needsRelationship: isCaregiverSubmitted && !relationship,
    needsIdentityVerification: isCaregiverSubmitted && patientIdentityConfirmed !== true,
    needsPatientPresenceCheck: isCaregiverSubmitted && patientPresent !== true,
    authorizationBlocked: isCaregiverSubmitted && authorizedRecipient === false,
    authorizationUnknown: isCaregiverSubmitted && authorizedRecipient === null,
  };
};

export const getDoctorApprovalReadiness = (review, patient = {}) => {
  const blockers = [];
  const warnings = [];
  const riskFlags = getRiskFlags(review);
  const missingInformation = getMissingInformation(review);
  const evidenceEntries = getEvidenceEntries(review);
  const sourceSummary = summarizeEvidenceSources(evidenceEntries);
  const caregiverContext = getCaregiverContext(review);
  const firstName = getPatientIdentityValue(review, patient, ['first_name', 'patient_first_name']);
  const lastName = getPatientIdentityValue(review, patient, ['last_name', 'patient_last_name']);
  const phone = getPatientIdentityValue(review, patient, ['phone', 'patient_phone_number', 'patient_phone']);

  if (hasUnacknowledgedEmergencyRisk(review)) {
    blockers.push({
      id: 'emergency_risk',
      severity: 'error',
      label: 'Escalate unresolved emergency risk before approval.',
    });
  }

  if (!firstName || !lastName || !phone) {
    blockers.push({
      id: 'patient_identity',
      severity: 'warning',
      label: 'Confirm patient name and phone before approval.',
    });
  }

  if (caregiverContext.needsRelationship) {
    blockers.push({
      id: 'caregiver_relationship',
      severity: 'warning',
      label: 'Confirm caregiver relationship before approving caregiver-submitted triage.',
    });
  }

  if (caregiverContext.authorizationBlocked) {
    blockers.push({
      id: 'caregiver_authorization',
      severity: 'error',
      label: 'Caregiver is not authorized to receive patient-facing instructions.',
    });
  }

  if (isAiTriageReview(review) && evidenceEntries.length === 0) {
    blockers.push({
      id: 'source_labels',
      severity: 'warning',
      label: 'Source labels are required before approving AI-generated clinical content.',
    });
  }

  if (missingInformation.length > 0) {
    warnings.push({
      id: 'missing_information',
      severity: 'warning',
      label: `${missingInformation.length} missing or uncertain item${missingInformation.length === 1 ? '' : 's'} should be resolved or acknowledged.`,
    });
  }

  if (riskFlags.length > 0 && !hasUnacknowledgedEmergencyRisk(review)) {
    warnings.push({
      id: 'risk_flags',
      severity: 'warning',
      label: `${riskFlags.length} risk flag${riskFlags.length === 1 ? '' : 's'} need doctor review.`,
    });
  }

  if (sourceSummary.needsVerification) {
    warnings.push({
      id: 'source_verification',
      severity: 'warning',
      label: 'Patient/caregiver-reported or AI-inferred evidence needs clinician verification.',
    });
  }

  if (caregiverContext.needsIdentityVerification) {
    warnings.push({
      id: 'caregiver_patient_identity',
      severity: 'warning',
      label: 'Verify the caregiver correctly identified the patient before signing.',
    });
  }

  if (caregiverContext.needsPatientPresenceCheck) {
    warnings.push({
      id: 'caregiver_patient_presence',
      severity: 'warning',
      label: 'Document whether the patient was present for the caregiver-submitted triage.',
    });
  }

  if (caregiverContext.authorizationUnknown) {
    warnings.push({
      id: 'caregiver_authorization_unknown',
      severity: 'warning',
      label: 'Confirm the authorized recipient before sending patient-facing instructions.',
    });
  }

  return {
    canApprove: blockers.length === 0,
    blockers,
    warnings,
    riskFlags,
    missingInformation,
    evidenceEntries,
    sourceSummary,
    caregiverContext,
  };
};

const getReviewFeedbackPayload = (review) => (
  review?.clinical_training_feedback ||
  review?.doctor_feedback ||
  review?.clinical_training?.latest_feedback ||
  review?.clinical_training?.doctor_feedback ||
  review?.approval_metadata?.doctor_feedback ||
  review?.finalization_metadata?.clinical_training_feedback ||
  {}
);

const getGovernanceRiskConfig = (risk) => {
  switch (risk) {
    case 'high':
      return { label: 'High governance risk', shortLabel: 'High risk', color: 'error', variant: 'filled' };
    case 'medium':
      return { label: 'Governance watch', shortLabel: 'Watch', color: 'warning', variant: 'outlined' };
    case 'low':
      return { label: 'Governance clear', shortLabel: 'Clear', color: 'success', variant: 'outlined' };
    default:
      return { label: 'Governance unknown', shortLabel: 'Unknown', color: 'default', variant: 'outlined' };
  }
};

export const getAiGovernanceSignals = (review, options = {}) => {
  const patient = options.patient || {};
  const decision = lower(
    options.decision ||
    review?.doctor_decision ||
    review?.latest_doctor_decision ||
    review?.review_status ||
    ''
  );
  const readiness = getDoctorApprovalReadiness(review, patient);
  const optionFeedbackSummary = getClinicalFeedbackSummary(options.feedback || {}, { decision });
  const feedbackPayload = optionFeedbackSummary.feedbackCaptured
    ? options.feedback
    : getReviewFeedbackPayload(review);
  const feedbackSummary = getClinicalFeedbackSummary(feedbackPayload, { decision });
  const finalNote = options.notePayload || options.finalNote || review?.doctor_note || review?.note_payload || {};
  const draftNote = options.generatedNote || review?.ai_generated_note || review?.generated_doctor_note || getGeneratedNote(review) || {};
  const editBurden = getNoteEditBurden(draftNote, finalNote);
  const sourceVerificationCount = readiness.evidenceEntries.filter(needsEvidenceVerification).length;
  const unresolvedGateCount = readiness.blockers.length + readiness.warnings.length;
  const reasons = [];

  if (!readiness.canApprove) {
    reasons.push(`${readiness.blockers.length} approval blocker${readiness.blockers.length === 1 ? '' : 's'}`);
  }
  if (readiness.warnings.length > 0) {
    reasons.push(`${readiness.warnings.length} approval warning${readiness.warnings.length === 1 ? '' : 's'}`);
  }
  if (sourceVerificationCount > 0) {
    reasons.push(`${sourceVerificationCount} source anchor${sourceVerificationCount === 1 ? '' : 's'} need verification`);
  }
  if (feedbackSummary.hasMajorCorrection) {
    reasons.push('Major or low-score doctor correction recorded');
  } else if (feedbackSummary.correctionRecorded) {
    reasons.push('Doctor correction recorded');
  }
  if (editBurden.level === 'heavy') {
    reasons.push('Heavy doctor edit burden');
  } else if (editBurden.level === 'moderate') {
    reasons.push('Moderate doctor edit burden');
  }

  let qualityRisk = 'low';
  if (!readiness.canApprove || feedbackSummary.hasMajorCorrection || editBurden.level === 'heavy') {
    qualityRisk = 'high';
  } else if (
    readiness.warnings.length > 0 ||
    sourceVerificationCount > 0 ||
    feedbackSummary.correctionRecorded ||
    editBurden.level === 'moderate'
  ) {
    qualityRisk = 'medium';
  }

  const acceptanceState = feedbackSummary.correctionRecorded
    ? 'corrected'
    : feedbackSummary.acceptedAll
      ? 'accepted'
      : editBurden.meaningfulEdits
        ? 'edited'
        : feedbackSummary.feedbackCaptured
          ? 'reviewed'
          : 'unreviewed';
  const riskConfig = getGovernanceRiskConfig(qualityRisk);

  return {
    qualityRisk,
    ...riskConfig,
    reasons,
    acceptanceState,
    feedbackCaptured: feedbackSummary.feedbackCaptured,
    feedbackSummary,
    editBurden,
    sourceVerificationCount,
    evidenceAnchorCount: readiness.evidenceEntries.length,
    unresolvedGateCount,
    approvalBlockerCount: readiness.blockers.length,
    approvalWarningCount: readiness.warnings.length,
    sourceSummary: readiness.sourceSummary,
    canApprove: readiness.canApprove,
    doctorFeedbackRequired: Boolean(isAiTriageReview(review) && !review?.is_finalized && !feedbackSummary.feedbackCaptured),
  };
};

export const getReviewCreatedTimestamp = (review) => (
  parseTimestamp(review?.created) ||
  parseTimestamp(review?.created_at) ||
  parseTimestamp(review?.requested_at) ||
  parseTimestamp(review?.submitted_at) ||
  parseTimestamp(review?.updated_at) ||
  0
);

const getPatientWaitingTimestamp = (review) => (
  parseTimestamp(review?.patient_reply_waiting_since) ||
  parseTimestamp(review?.patient_replied_at) ||
  parseTimestamp(review?.patient_reply_at) ||
  parseTimestamp(review?.last_patient_message_at) ||
  parseTimestamp(review?.last_patient_response_at) ||
  parseTimestamp(review?.more_info_response_at) ||
  parseTimestamp(review?.callback_booking_request?.requested_at) ||
  null
);

const isDoctorActionRequired = (review) => {
  const status = getReviewWorkflowStatus(review);
  if (review?.requires_doctor_action === true) return true;
  if (review?.requires_doctor_action === false) return false;
  return ![
    REVIEW_STATUS.APPROVED,
    REVIEW_STATUS.FINALIZED,
    REVIEW_STATUS.REJECTED,
    REVIEW_STATUS.CLOSED,
    'cancelled',
    'canceled',
  ].includes(status);
};

const hasPatientWaitingSignal = (review) => {
  const rawStatus = lower(review?.review_status || review?.workflow_status || review?.status);
  return Boolean(
    review?.patient_waiting ||
    review?.patient_reply_waiting ||
    review?.patient_reply_waiting_since ||
    review?.patient_replied_at ||
    review?.patient_reply_at ||
    review?.last_patient_message_at ||
    review?.last_patient_response_at ||
    review?.more_info_response_at ||
    review?.callback_booking_request?.requested_at ||
    ['patient_replied', 'patient_reply_waiting', 'ready_after_patient_reply'].includes(rawStatus)
  );
};

const isCleanReadyAiReview = (review, riskFlags, missingInformation) => (
  isAiTriageReview(review) &&
  isDoctorActionRequired(review) &&
  riskFlags.length === 0 &&
  missingInformation.length === 0 &&
  !hasUnacknowledgedEmergencyRisk(review)
);

export const getDoctorQueuePriority = (review, options = {}) => {
  const now = options.now ?? Date.now();
  const createdAt = getReviewCreatedTimestamp(review);
  const ageHours = createdAt ? Math.max(0, (now - createdAt) / 36e5) : 0;
  const waitingAt = getPatientWaitingTimestamp(review);
  const waitingHours = waitingAt ? Math.max(0, (now - waitingAt) / 36e5) : 0;
  const status = getReviewWorkflowStatus(review);
  const urgency = getUrgencyConfig(review);
  const riskFlags = getRiskFlags(review);
  const missingInformation = getMissingInformation(review);
  const followThrough = getFollowThroughProgress(review);
  const followThroughAttention = getFollowThroughAttention(review, { now });
  const doctorActionRequired = isDoctorActionRequired(review);
  const emergencyRisk = hasUnacknowledgedEmergencyRisk(review);
  const urgentRisk = ['urgent', 'emergency', 'critical'].includes(urgency.value) || riskFlags.length > 0;
  const patientWaiting = hasPatientWaitingSignal(review);
  const slaHours = options.slaHours ?? (isAiTriageReview(review) ? 4 : 24);
  const slaBreached = doctorActionRequired && ageHours >= slaHours;
  const readyAi = isCleanReadyAiReview(review, riskFlags, missingInformation);
  const activeFollowThrough = followThrough.sent && ['active', 'in_progress', 'failed', 'error'].includes(followThrough.status);
  const reasons = [];

  let rank = 8;
  let score = 0;
  let label = 'Routine';
  let color = 'default';

  if (emergencyRisk) {
    rank = 0;
    score += 100000;
    label = 'Emergency risk';
    color = 'error';
    reasons.push('Emergency or critical risk needs doctor action');
  } else if (urgentRisk) {
    rank = 1;
    score += 90000 + (riskFlags.length * 500);
    label = 'Urgent review';
    color = 'warning';
    reasons.push(riskFlags.length ? `${riskFlags.length} risk flag${riskFlags.length === 1 ? '' : 's'}` : `${urgency.label} urgency`);
  } else if (patientWaiting) {
    rank = 2;
    score += 80000 + waitingHours;
    label = 'Patient waiting';
    color = 'info';
    reasons.push(waitingHours ? `Patient response waiting ${waitingHours.toFixed(1)}h` : 'Patient response waiting');
  } else if (followThroughAttention.needsAttention) {
    rank = 3;
    score += 75000 + followThrough.remainingTasks + followThroughAttention.overdueTasks.length;
    label = 'Follow-up risk';
    color = followThroughAttention.color;
    reasons.push(followThroughAttention.reasons[0] || followThroughAttention.nextAction);
  } else if (slaBreached) {
    rank = 4;
    score += 70000 + ageHours;
    label = 'SLA pressure';
    color = 'warning';
    reasons.push(`Open ${ageHours.toFixed(1)}h`);
  } else if (readyAi) {
    rank = 5;
    score += 60000;
    label = 'Ready to approve';
    color = 'success';
    reasons.push('Clean AI triage review');
  } else if (missingInformation.length > 0 || status === REVIEW_STATUS.NEEDS_PATIENT_INFO) {
    rank = 6;
    score += 50000 + missingInformation.length;
    label = 'Needs info';
    color = 'secondary';
    reasons.push(`${missingInformation.length || 1} clarification item${missingInformation.length === 1 ? '' : 's'}`);
  } else if (activeFollowThrough) {
    rank = 7;
    score += 40000 + followThrough.remainingTasks;
    label = 'Follow-through';
    color = followThrough.status === 'failed' || followThrough.status === 'error' ? 'error' : 'primary';
    reasons.push(`${followThrough.remainingTasks} patient task${followThrough.remainingTasks === 1 ? '' : 's'} remaining`);
  } else if (doctorActionRequired) {
    rank = 8;
    score += 30000;
    label = 'Doctor action';
    color = 'primary';
    reasons.push('Doctor action required');
  }

  if (isAiTriageReview(review)) score += 100;
  if (doctorActionRequired) score += 50;
  score += ageHours;

  return {
    rank,
    score,
    label,
    color,
    reasons,
    ageHours,
    waitingHours,
    urgentRisk,
    emergencyRisk,
    patientWaiting,
    slaBreached,
    readyAi,
    followThroughAttention,
    doctorActionRequired,
  };
};

export const sortReviewsForDoctorQueue = (reviews, options = {}) => (
  asArray(reviews)
    .map((review, index) => ({
      review,
      index,
      priority: getDoctorQueuePriority(review, options),
      createdAt: getReviewCreatedTimestamp(review),
    }))
    .sort((left, right) => {
      if (left.priority.rank !== right.priority.rank) {
        return left.priority.rank - right.priority.rank;
      }
      if (right.priority.score !== left.priority.score) {
        return right.priority.score - left.priority.score;
      }
      if (left.createdAt !== right.createdAt) {
        return left.createdAt - right.createdAt;
      }
      return left.index - right.index;
    })
    .map((entry) => entry.review)
);

export const buildMoreInfoQuestions = (review) => {
  const missing = getMissingInformation(review);
  if (missing.length > 0) {
    return missing.map((item) => ({
      question: item.label,
      reason: item.reason || item.importance || 'Clarify before doctor approval',
    }));
  }

  return [
    {
      question: 'Please share any new symptoms, worsening signs, current medications, allergies, and recent vitals if available.',
      reason: 'Complete the review before doctor approval',
    },
  ];
};
