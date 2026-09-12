/**
 * Care Kernel vNext projection helpers.
 *
 * These helpers deliberately normalize only server projections. They do not
 * infer clinical, authority, payment, fulfilment, or success state.
 */

export const SERVER_STATES = Object.freeze([
  'not_loaded',
  'in_progress',
  'needs_attention',
  'blocked',
  'pending',
  'authorized',
  'provider_included',
  'completed',
  'unavailable',
  'safety',
  'emergency',
  'waiting_on_patient',
  'waiting_on_clinician',
  'waiting_on_provider',
  'renegotiated',
]);

const first = (...values) => values.find((value) => value !== undefined && value !== null && value !== '');

export const asText = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return fallback;
};

export const asArray = (value) => (Array.isArray(value) ? value : []);

export const copy = (value) => {
  if (value === undefined) return undefined;
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

export const formatDateTime = (value, options = {}) => {
  if (!value) return 'Not supplied';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not supplied';
  try {
    return new Intl.DateTimeFormat('en-NG', {
      dateStyle: options.dateOnly ? 'medium' : 'medium',
      timeStyle: options.dateOnly ? undefined : 'short',
      timeZone: 'Africa/Lagos',
    }).format(date);
  } catch {
    return date.toISOString();
  }
};

export const formatRelativeDue = (value, now = Date.now()) => {
  if (!value) return { label: 'No deadline returned', overdue: false, urgency: 'routine' };
  const due = new Date(value).getTime();
  if (Number.isNaN(due)) return { label: 'Deadline unavailable', overdue: false, urgency: 'routine' };
  const hours = (due - now) / 3600000;
  if (hours < 0) return { label: 'Overdue', overdue: true, urgency: 'urgent' };
  if (hours <= 4) return { label: 'Due within 4 hours', overdue: false, urgency: 'urgent' };
  if (hours <= 24) return { label: 'Due today', overdue: false, urgency: 'soon' };
  return { label: formatDateTime(value), overdue: false, urgency: 'routine' };
};

export const statusTone = (status) => {
  const normalized = asText(status).toLowerCase();
  if (['emergency', 'safety', 'blocked', 'overdue', 'rejected'].includes(normalized)) return 'danger';
  if (['needs_attention', 'waiting_on_patient', 'waiting_on_clinician', 'waiting_on_provider', 'pending', 'renegotiated'].includes(normalized)) return 'warning';
  if (['authorized', 'provider_included', 'completed'].includes(normalized)) return 'success';
  return 'info';
};

export const statusLabel = (status) => {
  const labels = {
    needs_attention: 'Needs attention',
    in_progress: 'In progress',
    waiting_on_patient: 'Waiting on patient',
    waiting_on_clinician: 'Waiting on clinician',
    waiting_on_provider: 'Waiting on provider',
    provider_included: 'Provider-included care',
    authorized: 'Authorized',
    completed: 'Completed',
    unavailable: 'Unavailable',
    not_loaded: 'Not loaded',
    pending: 'Pending',
    blocked: 'Blocked',
    safety: 'Safety route',
    emergency: 'Emergency route',
    renegotiated: 'Updated proposal',
  };
  return labels[status] || asText(status, 'Status unavailable').replaceAll('_', ' ');
};

export const decisionLabel = (decision) => ({
  approve_as_written: 'Approve as written',
  edit_and_approve: 'Edit and approve',
  request_more_information: 'Request information',
  convert_to_live_encounter: 'Convert to live encounter',
  escalate: 'Escalate for physical care',
  reject: 'Reject proposal',
}[decision] || statusLabel(decision));

export const normalizeQueueItem = (raw = {}) => {
  const publicId = asText(first(raw.public_id, raw.id, raw.proposal_id));
  const preview = Boolean(raw.pool_preview);
  const dueAt = first(raw.doctor_review_due_at, raw.due_at, raw.deadline);
  const base = {
    public_id: publicId,
    status: asText(raw.status, 'pending'),
    urgency: asText(raw.urgency, 'routine'),
    due_at: dueAt || null,
    route_mode: asText(first(raw.route_mode, raw.review_route_mode, raw.review_claim?.route_mode, raw.route, raw.queue), 'assigned'),
    route_reason: asText(raw.route_reason),
    route_rank: Number.isFinite(Number(raw.route_rank)) ? Number(raw.route_rank) : 99,
    pool_preview: preview,
    claimable: Boolean(first(raw.claimable, raw.review_claim?.claimable, preview)),
    claimed_by_current_doctor: Boolean(first(raw.claimed_by_current_doctor, raw.review_claim?.claimed_by_current_doctor)),
    claim_expires_at: first(raw.claim_expires_at, raw.review_claim?.claim_expires_at) || null,
    information_resubmission: Boolean(first(raw.information_resubmission, raw.missing_information?.resubmission)),
    requested_authority: asText(first(raw.requested_authority, raw.authority_route, raw.authority), 'Clinical review'),
    protected_population: Boolean(first(raw.protected_population, raw.population?.protected)),
  };

  if (preview) {
    // Pool previews are intentionally a separate shape. Do not leak identity,
    // hashes, presenting problem, or clinical detail before a successful claim.
    return base;
  }

  return {
    ...base,
    patient: raw.patient ? {
      public_id: asText(first(raw.patient.public_id, raw.patient.id)),
      display_name: asText(first(raw.patient.display_name, raw.patient.name)),
      age: first(raw.patient.age, raw.patient.age_years),
      sex: asText(raw.patient.sex),
      population_label: asText(first(raw.patient.population_label, raw.patient.population)),
    } : null,
    presenting_problem: asText(first(raw.presenting_problem, raw.patient_goal)),
    last_progress: asText(first(raw.last_progress, raw.progress_summary)),
    evidence_completeness: first(raw.evidence_completeness, raw.evidence_quality) || null,
    created_at: first(raw.created_at, raw.proposed_at) || null,
    proposal_hash_suffix: raw.proposal_hash ? asText(raw.proposal_hash).slice(-10) : null,
  };
};

const normalizeEvidence = (raw = {}) => ({
  id: asText(first(raw.public_id, raw.id, raw.evidence_id)),
  type: asText(first(raw.evidence_type, raw.type), 'Evidence'),
  label: asText(first(raw.label, raw.title, raw.evidence_type), 'Evidence'),
  value: raw.value ?? raw.summary ?? raw.result ?? null,
  observed_at: first(raw.observed_at, raw.recorded_at, raw.created_at) || null,
  provenance: {
    source: asText(first(raw.provenance?.source, raw.source), 'Server record'),
    captured_by: asText(first(raw.provenance?.captured_by, raw.captured_by, raw.entered_by), 'Not supplied'),
    channel: asText(first(raw.provenance?.capture_channel, raw.channel), 'Not supplied'),
    limitation: asText(first(raw.provenance?.limitation, raw.limitation, raw.limitations)),
  },
  verified: Boolean(first(raw.verified, raw.is_verified)),
});

const normalizeRegimen = (raw = {}) => ({
  medication_code: asText(raw.medication_code),
  medication_name: asText(first(raw.medication_name, raw.medicine, raw.item_name)),
  dose_amount: asText(first(raw.dose_amount, raw.dose)),
  dose_unit: asText(raw.dose_unit),
  route: asText(raw.route),
  interval_hours: asText(raw.interval_hours),
  frequency_text: asText(first(raw.frequency_text, raw.frequency)),
  duration_days: asText(raw.duration_days),
  maximum_daily_dose: asText(raw.maximum_daily_dose),
  maximum_daily_dose_unit: asText(raw.maximum_daily_dose_unit),
  indication: asText(raw.indication),
  calculation_basis: raw.calculation_basis || {},
  safety_checks: raw.safety_checks || {},
  patient_instructions: asText(raw.patient_instructions),
  authority_class: asText(first(raw.authority_class, raw.requested_authority)),
  status: asText(raw.status, 'proposed'),
  input_hash: asText(raw.input_hash),
  regimen_hash: asText(raw.regimen_hash),
  order_authorization: raw.order_authorization ? {
    authorized_quantity: raw.order_authorization.authorized_quantity,
    dispense_quantity: raw.order_authorization.dispense_quantity,
    permitted_repeat_count: raw.order_authorization.permitted_repeat_count,
    repeat_interval_days: raw.order_authorization.repeat_interval_days,
    authorization_expires_at: raw.order_authorization.authorization_expires_at,
    item_name: asText(raw.order_authorization.item_name),
    strength: asText(raw.order_authorization.strength),
    form: asText(raw.order_authorization.form),
    service_family: asText(raw.order_authorization.service_family),
  } : null,
});

export const normalizePlan = (raw = {}) => ({
  assessment: raw.assessment || {},
  differential: asArray(raw.differential),
  plan_summary: asText(first(raw.plan_summary, raw.summary)),
  safety_net: raw.safety_net || {},
  expected_outcomes: raw.expected_outcomes || {},
  goals: asArray(raw.goals),
  actions: asArray(raw.actions),
  regimens: asArray(first(raw.regimens, raw.medication_regimens, raw.regimen)).map(normalizeRegimen),
});

export const normalizeClinicalDocumentation = (raw = {}) => {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  const sections = source.sections && typeof source.sections === 'object' ? source.sections : {};
  return {
    schema_version: asText(source.schema_version, 'legacy'),
    state: asText(source.state, 'unavailable'),
    source: asText(source.source),
    signed: source.signed === true,
    signed_at: source.signed_at || null,
    signed_by: source.signed_by || null,
    source_plan_version_id: asText(source.source_plan_version_id),
    version_id: asText(source.version_id),
    content_hash: asText(source.content_hash),
    proposal_hash: asText(source.proposal_hash),
    source_draft_hash: asText(first(source.source_draft_hash, source.ai_draft_hash)),
    sections: {
      subjective: copy(sections.subjective || {}),
      objective: copy(sections.objective || {}),
      assessment: copy(sections.assessment || {}),
      plan: copy(sections.plan || {}),
    },
    prescriptions: copy(asArray(source.prescriptions)),
    investigations: copy(asArray(source.investigations)),
    other_actions: copy(source.other_actions || {}),
    source_provenance: copy(asArray(source.source_provenance)),
    provenance_coverage: copy(source.provenance_coverage || {}),
    missing_sections: asArray(source.missing_sections),
    action_disposition: copy(source.action_disposition || {}),
    amendment_diff: copy(asArray(source.amendment_diff)),
    edit_contract: source.edit_contract && typeof source.edit_contract === 'object' ? copy(source.edit_contract) : null,
    editor_capabilities: copy(source.editor_capabilities || {}),
    reason: asText(source.reason),
    financial_details_hidden: source.financial_details_hidden !== false,
  };
};

const stableJson = (value) => JSON.stringify(value ?? null);

export const documentationChanges = (original, current) => {
  const changes = [];
  const walk = (before, after, path = '') => {
    if (stableJson(before) === stableJson(after)) return;
    if (Array.isArray(before) && Array.isArray(after)) {
      const length = Math.max(before.length, after.length);
      for (let index = 0; index < length; index += 1) {
        walk(before[index], after[index], path ? `${path}.${index}` : String(index));
      }
      return;
    }
    if (before && after && typeof before === 'object' && typeof after === 'object' && !Array.isArray(before) && !Array.isArray(after)) {
      [...new Set([...Object.keys(before), ...Object.keys(after)])].sort().forEach((key) => walk(before[key], after[key], path ? `${path}.${key}` : key));
      return;
    }
    changes.push({
      path: path || 'document',
      change: before === undefined ? 'added' : after === undefined ? 'removed' : 'changed',
      before: copy(before),
      after: copy(after),
    });
  };
  walk(original || {}, current || {});
  return changes;
};

export const buildCompleteDocumentationEdit = (editContract, draft) => {
  const source = copy(editContract || {});
  const next = copy(draft || {});
  return {
    ...source,
    ...next,
    schema_version: 'care_plan_edit.v2',
    source_plan_version_id: asText(first(next.source_plan_version_id, source.source_plan_version_id)),
    subjective: copy(next.subjective || source.subjective || {}),
    objective: copy(next.objective || source.objective || {}),
    assessment: copy(next.assessment || source.assessment || {}),
    plan: copy(next.plan || source.plan || {}),
    safety_net: copy(next.safety_net || source.safety_net || {}),
    expected_outcomes: copy(next.expected_outcomes || source.expected_outcomes || []),
    source_provenance: copy(next.source_provenance || source.source_provenance || []),
    action_disposition: copy(next.action_disposition || source.action_disposition || {}),
    prescription: copy(asArray(next.prescription ?? source.prescription)),
    investigation: copy(asArray(next.investigation ?? source.investigation)),
  };
};

export const normalizeProposal = (raw = {}) => {
  const proposal = raw.proposal || raw;
  return {
    public_id: asText(first(proposal.public_id, proposal.id, proposal.proposal_id)),
    episode_id: asText(proposal.episode_id),
    proposal_hash: asText(proposal.proposal_hash),
    status: asText(proposal.status, 'needs_attention'),
    authority_route: asText(first(proposal.authority_route, proposal.requested_authority), 'Clinical review'),
    required_approver_id: first(proposal.required_approver_id, proposal.required_approver?.id) ?? null,
    doctor_review_due_at: first(proposal.doctor_review_due_at, proposal.due_at, proposal.deadline) || null,
    patient: proposal.patient ? {
      public_id: asText(first(proposal.patient.public_id, proposal.patient.id)),
      display_name: asText(first(proposal.patient.display_name, proposal.patient.name)),
      age: first(proposal.patient.age, proposal.patient.age_years),
      sex: asText(proposal.patient.sex),
      population_label: asText(first(proposal.patient.population_label, proposal.patient.population)),
      protected: Boolean(first(proposal.patient.protected, proposal.patient.protected_population)),
    } : null,
    patient_goal: asText(first(proposal.patient_goal, proposal.goal?.patient_wording, proposal.goal?.wording)),
    desired_life_outcome: asText(first(proposal.desired_life_outcome, proposal.goal?.desired_life_outcome)),
    presenting_problem: asText(first(proposal.presenting_problem, proposal.exception_packet?.presenting_problem)),
    current_care: proposal.current_care || {},
    evidence: asArray(proposal.evidence).map(normalizeEvidence),
    evidence_quality: proposal.evidence_quality || proposal.evidence_completeness || null,
    impression: proposal.impression || proposal.assessment || {},
    differential: asArray(first(proposal.differential, proposal.impression?.differential)),
    must_not_miss: asArray(first(proposal.must_not_miss, proposal.impression?.must_not_miss)),
    missing_information: {
      questions: asArray(proposal.missing_information?.questions || proposal.missing_questions),
      requested_at: first(proposal.missing_information?.requested_at, proposal.requested_at) || null,
      returned_at: proposal.missing_information?.returned_at || null,
    },
    protocol: proposal.protocol || {},
    proposed_plan_version: normalizePlan(proposal.proposed_plan_version || proposal.plan || {}),
    approved_action_preview: asArray(proposal.approved_action_preview || proposal.approved_actions),
    execution_state: proposal.execution_state || {},
    hash_contract: {
      proposal_hash: asText(first(proposal.hash_contract?.proposal_hash, proposal.proposal_hash)),
      plan_content_hash: asText(proposal.hash_contract?.plan_content_hash),
      patient_snapshot_hash: asText(proposal.hash_contract?.patient_snapshot_hash),
      parent_content_hash: proposal.hash_contract?.parent_content_hash || null,
      exact_hash_required: proposal.hash_contract?.exact_hash_required === true,
    },
    review_claim: proposal.review_claim || {},
    authority_checkpoint: proposal.authority_checkpoint || {},
    clinician_work: proposal.clinician_work || {},
    mobilization: proposal.mobilization || {},
    included_purchase_checkpoint: proposal.included_purchase_checkpoint || null,
    clinical_documentation: normalizeClinicalDocumentation(proposal.clinical_documentation),
    decision_options: asArray(first(proposal.allowed_actions, proposal.decision_options)),
    correlation_id: asText(proposal.correlation_id),
  };
};

export const normalizeClinicalService = (raw = {}) => {
  const order = raw.order || raw;
  return {
    public_id: asText(first(order.public_id, order.id, order.order_id)),
    sku: asText(order.sku),
    clinician_class: asText(first(order.clinician_class, order.specialty, order.service_class)),
    modality: asText(order.modality),
    status: asText(order.status, 'pending'),
    linked_proposal_id: asText(first(order.linked_proposal_id, order.proposal_id)),
    proposal_hash: asText(order.proposal_hash),
    ai_draft_hash: asText(order.ai_draft_hash),
    ai_prepared_draft: order.ai_prepared_draft || null,
    due_at: first(order.due_at, order.doctor_review_due_at) || null,
    authority_label: asText(first(order.authority_label, order.requested_authority)),
    consent_state: asText(order.consent_state),
    appointment: order.appointment || null,
    allowed_actions: asArray(order.allowed_actions),
  };
};

export const normalizeTransition = (raw = {}) => {
  const transition = raw.transition || raw;
  return {
    public_id: asText(first(transition.public_id, transition.id, transition.transition_id)),
    protocol: transition.protocol || {},
    status: asText(transition.status, 'pending'),
    provider: transition.provider || {},
    consent_state: asText(transition.consent_state),
    evidence_gaps: asArray(transition.evidence_gaps),
    safety_escalation: transition.safety_escalation || null,
    attendance: transition.attendance || null,
    discharge: transition.discharge || null,
    timeline: asArray(transition.timeline),
    next_checkpoint: transition.next_checkpoint || {},
    allowed_actions: asArray(transition.allowed_actions),
  };
};

export const normalizePatientProgress = (raw = {}) => ({
  patient_id: asText(first(raw.patient_id, raw.patient?.public_id, raw.patient?.id)),
  patient: raw.patient || null,
  goal: raw.goal || raw.goal_contract || null,
  episode: raw.episode || null,
  tasks: asArray(raw.tasks),
  observations: asArray(raw.observations),
  timeline: asArray(raw.timeline),
  team: asArray(raw.team),
  execution: raw.execution || null,
});

const normalizeActivityOwner = (raw) => {
  if (typeof raw === 'string' || typeof raw === 'number') return asText(raw);
  if (!raw || typeof raw !== 'object') return '';
  return asText(first(raw.display_name, raw.name, raw.label, raw.role, raw.owner));
};

const normalizeActivityPatient = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  return {
    public_id: asText(first(raw.public_id, raw.id, raw.patient_id)),
    display_name: asText(first(raw.display_name, raw.name)),
  };
};

const normalizeActivityCheckpoint = (raw) => {
  if (typeof raw === 'string') return { title: raw, due_at: null, owner: '' };
  if (!raw || typeof raw !== 'object') return { title: '', due_at: null, owner: '' };
  return {
    public_id: asText(first(raw.public_id, raw.id, raw.task_id)),
    title: asText(first(raw.title, raw.label, raw.name, raw.next_action)),
    due_at: first(raw.due_at, raw.deadline, raw.due) || null,
    owner: normalizeActivityOwner(raw.owner || raw.assignee),
  };
};

export const normalizeCareActivity = (raw = {}) => {
  const source = Array.isArray(raw) ? { items: raw } : (raw && typeof raw === 'object' ? raw : {});
  const rows = first(source.items, source.results, source.activity, source.ongoing_work, source.tasks);
  const items = asArray(rows).map((item = {}) => {
    const checkpoint = normalizeActivityCheckpoint(first(item.next_checkpoint, item.checkpoint, item.next_step));
    const progressValue = first(item.progress_percent, item.verified_progress, item.progress);
    const numericProgress = progressValue === undefined || progressValue === null || progressValue === '' ? null : Number(progressValue);
    return {
      public_id: asText(first(item.public_id, item.id, item.task_id, item.goal_id, item.episode_id)),
      kind: asText(first(item.kind, item.type, item.work_type), 'care_work'),
      title: asText(first(item.title, item.label, item.goal?.patient_wording, item.patient_goal), 'Ongoing care work'),
      status: asText(first(item.status, item.state), 'pending'),
      patient: normalizeActivityPatient(item.patient || item.subject),
      case_id: asText(first(item.case_public_id, item.proposal_id, item.case_id, item.context?.case_id, item.context?.proposal_id)),
      progress: Number.isFinite(numericProgress) && numericProgress >= 0 && numericProgress <= 100 ? numericProgress : null,
      progress_label: asText(first(item.progress_label, item.progress_summary, item.last_progress)),
      owner: normalizeActivityOwner(item.owner || item.current_owner || item.assignee),
      blocker: asText(first(item.blocker, item.blocked_reason, item.blocking_reason)),
      next_checkpoint: checkpoint,
      action_label: asText(first(item.action?.label, item.next_action_label, item.action_label)),
      updated_at: first(item.updated_at, item.last_activity_at, item.created_at) || null,
      due_at: first(item.due_at, item.deadline, checkpoint.due_at) || null,
    };
  });
  return {
    items,
    next_cursor: asText(first(source.next_cursor, source.next, source.cursor)),
    summary: source.summary && typeof source.summary === 'object' ? source.summary : {},
  };
};

export const isTerminalDecision = (decision) => ['approve_as_written', 'edit_and_approve', 'escalate', 'reject'].includes(decision);

export const isMaterialPlan = (plan) => Boolean(plan && (plan.plan_summary || plan.actions?.length || plan.regimens?.length));

export const publicHashSuffix = (hash) => {
  const value = asText(hash);
  return value ? value.slice(-12) : 'not returned';
};
