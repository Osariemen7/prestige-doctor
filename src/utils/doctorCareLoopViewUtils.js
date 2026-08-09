const firstValue = (source, keys = []) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }
  return null;
};

export const formatDoctorLabel = (value, empty = 'Not supplied by server') => {
  if (value === undefined || value === null || value === '') return empty;
  return String(value)
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase());
};

export const formatDoctorDateTime = (value, empty = 'Not supplied by server') => {
  if (!value) return empty;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
};

export const getAllowedActionKeys = (actions) => (Array.isArray(actions) ? actions : [])
  .map((action) => (typeof action === 'string'
    ? action
    : action?.key || action?.action_key || action?.action || action?.name))
  .filter(Boolean)
  .map((action) => String(action));

export const getServerAction = (source, ...keys) => {
  const actions = Array.isArray(source?.allowed_actions)
    ? source.allowed_actions
    : Array.isArray(source?.allowedActions)
      ? source.allowedActions
      : [];
  const normalizedKeys = keys.map((key) => String(key));
  return actions.find((action) => {
    const actionKey = typeof action === 'string'
      ? action
      : action?.key || action?.action_key || action?.action || action?.name;
    return actionKey && normalizedKeys.includes(String(actionKey));
  }) || null;
};

export const hasServerAction = (source, ...keys) => {
  return Boolean(getServerAction(source, ...keys));
};

export const findTransitionForReview = (results, reviewPublicId) => {
  if (!Array.isArray(results) || !reviewPublicId) return null;
  return results.find((transition) => [
    transition?.review_public_id,
    transition?.medical_review_public_id,
    transition?.clinical_review_public_id,
    transition?.review_id,
    transition?.linked_review_id,
    transition?.review?.public_id,
  ].some((value) => value && String(value) === String(reviewPublicId))) || null;
};

export const getTransitionContextFromReview = (review) => {
  const candidate = firstValue(review, [
    'doctor_care_transition',
    'care_transition',
    'transition_context',
  ]);
  return candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate : null;
};

const listFrom = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [value];
};

export const getTransitionProtocol = (transition) => firstValue(transition, [
  'consented_protocol',
  'protocol',
  'protocol_snapshot',
  'protocol_context',
]);

const isSatisfiedRequirement = (item) => {
  if (!item || typeof item !== 'object') return false;
  if (item.met === true || item.satisfied === true || item.complete === true || item.completed === true) return true;
  if (item.required === false) return true;
  const status = String(item.status || item.state || '').toLowerCase();
  return ['satisfied', 'met', 'complete', 'completed', 'verified', 'resolved', 'not_required'].includes(status);
};

const formatRequirement = (item) => {
  if (typeof item === 'string') return item;
  return item?.label || item?.reason || item?.key || item?.detail || item?.description || 'Evidence gap returned by server';
};

export const getTransitionEvidenceGaps = (transition) => {
  const explicitGaps = firstValue(transition, [
    'evidence_gaps',
    'missing_evidence',
    'evidence_gap',
  ]);
  if (explicitGaps !== null) return listFrom(explicitGaps).map(formatRequirement);

  return listFrom(transition?.requirements)
    .filter((item) => !isSatisfiedRequirement(item))
    .map(formatRequirement);
};

export const getTransitionSafetyEscalation = (transition) => firstValue(transition, [
  'safety_escalation',
  'escalation',
  'safety',
]);

export const getTransitionOutcome = (transition, type) => {
  if (type === 'referral') {
    return firstValue(transition, ['referral_attendance', 'attendance_outcome', 'attendance', 'referral_outcome']);
  }
  if (type === 'discharge') {
    return firstValue(transition, ['discharge_outcome', 'discharge_follow_up', 'follow_up_outcome']);
  }
  return firstValue(transition, ['outcome', 'completion_outcome']);
};

export const getTransitionCheckpoint = (transition) => firstValue(transition, [
  'clinical_checkpoint',
  'checkpoint',
  'next_action',
  'clinically_indicated_checkpoint',
]);

export const getTransitionStateVersion = (transition) => firstValue(transition, ['state_version', 'version']);

export const getOrderId = (order) => firstValue(order, ['public_id', 'order_id', 'id']);

export const getOrderAuthorityAction = (order) => getServerAction(order, 'open_existing_claim_and_decision');

export const getOrderProposalId = (order) => {
  const authorityAction = getOrderAuthorityAction(order);
  return authorityAction
    ? firstValue(authorityAction, ['proposal_id', 'clinical_proposal_id'])
    : firstValue(order, ['proposal_id', 'clinical_proposal_id']);
};

export const getOrderDraft = (order, proposal) => firstValue(order, [
  'ai_draft',
  'ai_draft_snapshot',
]) || firstValue(proposal, ['ai_draft', 'draft', 'proposal_draft']);

export const getOrderDraftHash = (order, proposal) => {
  const authorityAction = getOrderAuthorityAction(order);
  if (authorityAction) return firstValue(authorityAction, ['ai_draft_hash', 'source_draft_hash']);
  return firstValue(order, ['ai_draft_hash', 'source_draft_hash'])
    || firstValue(proposal?.clinical_documentation, ['source_draft_hash']);
};

export const getOrderProposalHash = (order, proposal) => {
  const authorityAction = getOrderAuthorityAction(order);
  if (authorityAction) return firstValue(authorityAction, ['proposal_hash']);
  return firstValue(proposal, ['proposal_hash'])
    || firstValue(proposal?.hash_contract, ['proposal_hash'])
    || firstValue(order, ['proposal_hash']);
};

export const getOrderPatientLabel = (order, proposal) => firstValue(order, [
  'patient_safe_label',
  'patient_label',
  'patient_display_name',
]) || firstValue(proposal?.patient, ['display_name', 'label']) || 'Authorized patient';

export const getOrderServerState = (order) => firstValue(order, ['status', 'state']) || 'unknown';

export const getOrderStateVersion = (order) => firstValue(order, ['state_version', 'version']);
