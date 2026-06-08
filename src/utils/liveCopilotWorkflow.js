const asArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value.filter(Boolean) : [value].filter(Boolean);
};

const textValue = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    return (
      value.label ||
      value.title ||
      value.question ||
      value.text ||
      value.name ||
      value.description ||
      value.reason ||
      value.rationale ||
      ''
    ).toString().trim();
  }
  return String(value).trim();
};

const cleanObject = (value) => Object.fromEntries(
  Object.entries(value || {}).filter(([, entry]) => entry !== undefined && entry !== null && entry !== '')
);

export const LIVE_COPILOT_DRAFT_SOURCE = 'openai_realtime_copilot';
export const LIVE_COPILOT_DRAFT_APPROVAL_STATUS = 'draft_pending_doctor_approval';
export const LIVE_COPILOT_DOCTOR_APPROVED_STATUS = 'doctor_approved';
export const LIVE_COPILOT_DOCTOR_REJECTED_STATUS = 'doctor_rejected';

export const getIntervalHoursFromCopilotValue = (value, fallback = 8) => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }

  const rawValue = textValue(value).toLowerCase();
  if (!rawValue) return fallback;

  const qHourMatch = rawValue.match(/q\s*(\d{1,2})\s*h/);
  if (qHourMatch) return Number(qHourMatch[1]);

  const hourMatch = rawValue.match(/(\d{1,2})\s*(hour|hr|h)\b/);
  if (hourMatch) return Number(hourMatch[1]);

  const firstNumberMatch = rawValue.match(/\d{1,2}/);
  if (firstNumberMatch) return Number(firstNumberMatch[0]);

  return fallback;
};

export const getCopilotDraftActionMetadata = ({
  kind = 'clinical_action',
  mode = 'live_encounter',
  reviewOrigin = 'live_encounter',
} = {}) => cleanObject({
  source: LIVE_COPILOT_DRAFT_SOURCE,
  source_mode: mode,
  review_origin: reviewOrigin,
  clinical_action_kind: kind,
  approval_status: LIVE_COPILOT_DRAFT_APPROVAL_STATUS,
  requires_doctor_approval: true,
  draft_only: true,
  copilot_generated: true,
});

export const markCopilotDraftAction = (item = {}, kind = 'clinical_action', options = {}) => ({
  ...(item || {}),
  ...getCopilotDraftActionMetadata({ ...options, kind }),
});

export const isCopilotDraftAction = (item = {}) => Boolean(
  item?.draft_only
  || item?.requires_doctor_approval
  || item?.approval_status === LIVE_COPILOT_DRAFT_APPROVAL_STATUS
  || item?.source === LIVE_COPILOT_DRAFT_SOURCE
);

export const isCopilotActionDoctorApproved = (item = {}) => Boolean(
  item?.doctor_approved === true
  || item?.approved_by_doctor === true
  || item?.approval_status === LIVE_COPILOT_DOCTOR_APPROVED_STATUS
);

export const isCopilotActionDoctorRejected = (item = {}) => Boolean(
  item?.doctor_rejected === true
  || item?.rejected_by_doctor === true
  || item?.approval_status === LIVE_COPILOT_DOCTOR_REJECTED_STATUS
);

export const isCopilotDraftPendingApproval = (item = {}) => {
  if (!isCopilotDraftAction(item)) return false;
  if (isCopilotActionDoctorApproved(item) || isCopilotActionDoctorRejected(item)) return false;
  return Boolean(
    item?.approval_status === LIVE_COPILOT_DRAFT_APPROVAL_STATUS
    || item?.requires_doctor_approval !== false
    || item?.draft_only !== false
    || item?.source === LIVE_COPILOT_DRAFT_SOURCE
  );
};

export const markCopilotActionDoctorApproved = (item = {}, metadata = {}) => cleanObject({
  ...(item || {}),
  approval_status: LIVE_COPILOT_DOCTOR_APPROVED_STATUS,
  requires_doctor_approval: false,
  draft_only: false,
  doctor_approved: true,
  approved_by_doctor: true,
  approved_at: metadata.approved_at || metadata.approvedAt || new Date().toISOString(),
  approved_by: metadata.approved_by || metadata.approvedBy || metadata.doctor_id || metadata.doctorId || undefined,
  approval_note: metadata.approval_note || metadata.approvalNote || undefined,
});

export const markCopilotActionDoctorRejected = (item = {}, metadata = {}) => cleanObject({
  ...(item || {}),
  approval_status: LIVE_COPILOT_DOCTOR_REJECTED_STATUS,
  requires_doctor_approval: false,
  draft_only: false,
  doctor_rejected: true,
  rejected_by_doctor: true,
  rejected_at: metadata.rejected_at || metadata.rejectedAt || new Date().toISOString(),
  rejected_by: metadata.rejected_by || metadata.rejectedBy || metadata.doctor_id || metadata.doctorId || undefined,
  rejection_reason: metadata.rejection_reason || metadata.rejectionReason || metadata.reason || undefined,
});

const copilotActionSections = [
  {
    section: 'prescription',
    kind: 'prescription',
    aliases: ['prescription', 'prescriptions'],
    labelFields: ['medication_name', 'name', 'title'],
  },
  {
    section: 'investigation',
    kind: 'investigation',
    aliases: ['investigation', 'investigations'],
    labelFields: ['test_type', 'name', 'title'],
  },
  {
    section: 'other_actions',
    kind: 'other_action',
    aliases: ['other_actions', 'actions', 'recommended_actions'],
    labelFields: ['name', 'label', 'title'],
  },
];

const getClinicalActionLabel = (item, fields = []) => (
  fields.map((field) => textValue(item?.[field])).find(Boolean)
  || textValue(item?.instructions || item?.notes || item?.reason)
  || 'Realtime draft action'
);

export const getPendingCopilotDraftActions = (note = {}) => {
  const pending = [];
  const seen = new Set();

  copilotActionSections.forEach(({ section, kind, aliases, labelFields }) => {
    aliases.forEach((field) => {
      asArray(note?.[field]).forEach((item, index) => {
        if (!isCopilotDraftPendingApproval(item)) return;
        const label = getClinicalActionLabel(item, labelFields);
        const key = `${section}-${field}-${index}-${label}`;
        if (seen.has(key)) return;
        seen.add(key);
        pending.push({
          section,
          field,
          kind,
          index,
          label,
          item,
        });
      });
    });
  });

  return pending;
};

const mapCopilotActionFields = (note = {}, mapper) => {
  const nextNote = { ...(note || {}) };
  copilotActionSections.forEach(({ aliases, kind }) => {
    aliases.forEach((field) => {
      if (!Object.prototype.hasOwnProperty.call(nextNote, field)) return;
      nextNote[field] = asArray(nextNote[field]).map((item, index) => mapper(item, kind, field, index));
    });
  });
  return nextNote;
};

export const approveAllCopilotDraftActions = (note = {}, metadata = {}) => mapCopilotActionFields(
  note,
  (item) => (isCopilotDraftPendingApproval(item) ? markCopilotActionDoctorApproved(item, metadata) : item)
);

export const rejectAllCopilotDraftActions = (note = {}, metadata = {}) => mapCopilotActionFields(
  note,
  (item) => (isCopilotDraftPendingApproval(item) ? markCopilotActionDoctorRejected(item, metadata) : item)
);

export const filterPatientFacingApprovedActions = (items = []) => asArray(items).filter(
  (item) => !isCopilotDraftPendingApproval(item) && !isCopilotActionDoctorRejected(item)
);

export const buildCopilotDraftSyncPayload = ({
  prescriptions = [],
  investigations = [],
  otherActions = [],
  soapNote = null,
  mode = 'live_encounter',
  reviewOrigin = 'live_encounter',
  selectedOnly = true,
} = {}) => {
  const shouldInclude = (item) => !selectedOnly || Boolean(item?.selected);
  const metadataContext = { mode, reviewOrigin };

  const draftPrescriptions = asArray(prescriptions)
    .filter(shouldInclude)
    .map((item) => {
      const medicationName = textValue(item?.medication_name || item?.name || item?.title);
      return markCopilotDraftAction(cleanObject({
        medication_name: medicationName,
        dosage: textValue(item?.dosage || item?.dose) || 'As directed',
        route: textValue(item?.route) || (medicationName.toLowerCase().includes('iv') ? 'intravenous' : 'oral'),
        interval: getIntervalHoursFromCopilotValue(item?.interval || item?.frequency, 8),
        start_date: item?.start_date || '',
        end_date: item?.end_date || '',
        instructions: textValue(item?.instructions) || 'Review and approve before sending to patient.',
        is_otc: Boolean(item?.is_otc),
      }), 'prescription', metadataContext);
    })
    .filter((item) => item.medication_name);

  const draftInvestigations = asArray(investigations)
    .filter(shouldInclude)
    .map((item) => markCopilotDraftAction(cleanObject({
      test_type: textValue(item?.test_type || item?.name || item?.title),
      reason: textValue(item?.reason || item?.rationale || item?.description) || 'Realtime clinical suggestion',
      instructions: textValue(item?.instructions),
      interval: Number.isFinite(Number(item?.interval)) ? Number(item.interval) : 0,
      scheduled_time: item?.scheduled_time || '',
    }), 'investigation', metadataContext))
    .filter((item) => item.test_type);

  const draftOtherActions = asArray(otherActions)
    .filter(shouldInclude)
    .map((item) => markCopilotDraftAction(cleanObject({
      action_type: item?.action_type || (item?.type === 'procedures' ? 'procedure' : item?.type) || 'counselling',
      name: textValue(item?.name || item?.title || item?.label),
      notes: textValue(item?.notes || item?.reason || item?.rationale || item?.description),
      scheduled_time: item?.scheduled_time || '',
    }), 'other_action', metadataContext))
    .filter((item) => item.name);

  return cleanObject({
    soapNote,
    prescriptions: draftPrescriptions,
    investigations: draftInvestigations,
    otherActions: draftOtherActions,
    source: LIVE_COPILOT_DRAFT_SOURCE,
    approval_status: LIVE_COPILOT_DRAFT_APPROVAL_STATUS,
    draft_only: true,
    requires_doctor_approval: true,
    sync_intent: 'doctor_note_draft_for_approval',
  });
};

const normalizeQuestion = (item) => {
  if (typeof item === 'string') {
    return cleanObject({ question: item.trim(), reason: '' });
  }

  return cleanObject({
    question: textValue(item?.question || item?.label || item?.text || item?.title),
    reason: textValue(item?.reason || item?.rationale || item?.description || item?.importance),
  });
};

const normalizeRiskFlag = (item) => {
  if (typeof item === 'string') {
    return { label: item.trim(), severity: 'watch', evidence: '' };
  }

  return cleanObject({
    label: textValue(item?.label || item?.title || item?.message || item?.name),
    severity: String(item?.severity || item?.level || item?.urgency || 'watch').toLowerCase(),
    evidence: textValue(item?.evidence || item?.description || item?.detail || item?.reason),
  });
};

const normalizeEvidenceAnchor = (entry, index) => cleanObject({
  id: entry?.id || entry?.public_id || `evidence-${index}`,
  section: entry?.section || entry?.soap_section || entry?.category || '',
  field: entry?.field || entry?.soap_field || entry?.note_field || '',
  source_type: entry?.source_type || entry?.source || entry?.reported_by || entry?.verification_status || '',
  verification_status: entry?.verification_status || entry?.status || '',
  quote: textValue(entry?.quote || entry?.text || entry?.value || entry?.description || entry?.finding),
});

const normalizeReadiness = (readiness = {}) => cleanObject({
  can_approve: readiness.canApprove,
  blockers: asArray(readiness.blockers).map((item) => cleanObject({
    id: item.id,
    label: item.label,
    severity: item.severity,
  })),
  warnings: asArray(readiness.warnings).map((item) => cleanObject({
    id: item.id,
    label: item.label,
    severity: item.severity,
  })),
});

export const getLiveCopilotModeConfig = (mode = 'live_encounter') => {
  switch (mode) {
    case 'triage_clarification':
      return {
        title: 'AI Triage Clarification',
        shortLabel: 'Clarification',
        startLabel: 'Start Clarification',
        continuityLabel: 'Triage Context Pre-Hydrated',
        briefTitle: 'Clarification Brief',
        guidance: 'Focus only on unresolved triage facts, source verification, safety flags, and the minimum questions needed for doctor approval.',
      };
    case 'doctor_dictation':
      return {
        title: 'Doctor Dictation',
        shortLabel: 'Dictation',
        startLabel: 'Start Dictation',
        continuityLabel: 'Dictation Context Pre-Hydrated',
        briefTitle: 'Dictation Brief',
        guidance: 'Capture doctor dictation into a structured draft without taking independent clinical actions.',
      };
    case 'patient_follow_up_call':
      return {
        title: 'Patient Follow-up Call',
        shortLabel: 'Follow-up',
        startLabel: 'Start Follow-up',
        continuityLabel: 'Follow-through Context Pre-Hydrated',
        briefTitle: 'Follow-up Brief',
        guidance: 'Check patient progress against doctor-approved tasks and surface risks or non-completion for clinician review.',
      };
    default:
      return {
        title: 'Live Encounter',
        shortLabel: 'Live Encounter',
        startLabel: 'Start Consult',
        continuityLabel: 'Clinical Continuity Context Pre-Hydrated',
        briefTitle: 'OpenAI Realtime Brief',
        guidance: 'Capture documentation, missing data, safety flags, draft actions, and patient education for doctor approval.',
      };
  }
};

export const normalizeTriageContextForRealtime = (context = {}, mode = 'live_encounter') => {
  const modeConfig = getLiveCopilotModeConfig(mode);
  const missingQuestions = asArray(context.missingInformation || context.missing_information || context.missingQuestions)
    .map(normalizeQuestion)
    .filter((item) => item.question)
    .slice(0, 10);
  const riskFlags = asArray(context.riskFlags || context.risk_flags || context.safetyFlags)
    .map(normalizeRiskFlag)
    .filter((item) => item.label)
    .slice(0, 10);
  const evidenceAnchors = asArray(context.evidenceEntries || context.evidence_anchors || context.evidence)
    .map(normalizeEvidenceAnchor)
    .filter((item) => item.quote || item.source_type || item.section)
    .slice(0, 12);
  const approvalReadiness = normalizeReadiness(context.approvalReadiness || context.approval_readiness);
  const focusItems = [
    ...riskFlags.map((item) => `Safety: ${item.label}`),
    ...missingQuestions.map((item) => `Ask: ${item.question}`),
    ...(approvalReadiness.blockers?.map?.((item) => `Approval blocker: ${item.label}`) || []),
  ].slice(0, 12);

  return cleanObject({
    mode,
    mode_guidance: modeConfig.guidance,
    urgency: context.urgency || context.urgency_config || null,
    generated_note: context.generatedNote || context.generated_note || null,
    patient_story: context.patientStory || context.patient_story || '',
    submitter: context.submitter || null,
    missing_information: missingQuestions,
    risk_flags: riskFlags,
    evidence_anchors: evidenceAnchors,
    approval_readiness: approvalReadiness,
    clarification_focus: mode === 'triage_clarification'
      ? {
          focus_items: focusItems,
          avoid_repeating_completed_intake: true,
          stop_when_approval_blockers_are_resolved: true,
        }
      : null,
    safety_boundaries: {
      draft_only: true,
      doctor_approval_required: true,
      no_autonomous_prescribing: true,
      no_autonomous_finalization: true,
      preserve_source_labels: true,
    },
  });
};

export const buildRealtimeSessionPayload = ({
  mode = 'live_encounter',
  reviewOrigin = 'live_encounter',
  patientId = null,
  patientName = '',
  chiefComplaint = '',
  continuityBrief = '',
  triageContext = null,
} = {}) => ({
  mode,
  review_origin: reviewOrigin,
  patient_id: patientId,
  patient_name: patientName,
  chief_complaint: chiefComplaint,
  continuity_brief: continuityBrief,
  triage_context: normalizeTriageContextForRealtime(triageContext || {}, mode),
  capability_expectations: {
    draft_only: true,
    doctor_approval_required: true,
    patient_follow_through_after_approval: true,
    preserve_source_labels: true,
  },
});
