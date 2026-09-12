const DECISION_ALIASES = {
  approve_as_is: 'approve_as_written',
  request_more_info: 'request_more_information',
};

const APPROVAL_DECISIONS = new Set(['approve_as_written', 'edit_and_approve']);

const clone = (value) => JSON.parse(JSON.stringify(value || {}));

export const normalizeCanonicalDecision = (decision) => DECISION_ALIASES[decision] || decision;

export const getCanonicalProposalContract = (proposal) => {
  if (!proposal) return null;
  const hashContract = proposal.hash_contract || {};
  const authorityCheckpoint = proposal.authority_checkpoint || {};
  return {
    publicId: proposal.public_id || proposal.id || null,
    status: proposal.status || authorityCheckpoint.state || null,
    proposalHash: proposal.proposal_hash || hashContract.proposal_hash || authorityCheckpoint.proposal_hash || '',
    aiDraftHash: proposal.ai_draft_hash || hashContract.ai_draft_hash || authorityCheckpoint.ai_draft_hash || '',
    decisionEndpoint: proposal.decision_endpoint || authorityCheckpoint.decision_endpoint || null,
  };
};

export const requireCanonicalProposalContract = (proposal) => {
  const contract = getCanonicalProposalContract(proposal);
  if (!contract?.publicId) {
    throw new Error('This review is not linked to a canonical Care Kernel proposal.');
  }
  if (!contract.proposalHash || !contract.aiDraftHash) {
    throw new Error('The current proposal hashes are unavailable. Refresh before deciding.');
  }
  return contract;
};

const mergeSection = (base, edit) => {
  if (!edit) return clone(base);
  if (typeof edit === 'object' && !Array.isArray(edit)) {
    return { ...clone(base), ...clone(edit) };
  }
  return { ...clone(base), clinician_narrative: String(edit) };
};

const mergeRows = (baseRows, editedRows) => {
  if (!Array.isArray(editedRows)) return clone(baseRows || []);
  const sourceRows = Array.isArray(baseRows) ? baseRows : [];
  return editedRows.map((row, index) => ({
    ...clone(sourceRows[index] || {}),
    ...clone(row || {}),
  }));
};

const mergeOtherActions = (edited, note) => {
  if (!Array.isArray(note.other_actions)) return;
  const canonicalKeys = new Set(['procedure', 'appointment', 'device', 'referral', 'admission']);
  const grouped = {};
  const counselling = [];
  note.other_actions.forEach((action) => {
    if (!action || typeof action !== 'object') return;
    let actionType = action.action_type === 'procedures' ? 'procedure' : action.action_type;
    if (actionType === 'monitoring_device') actionType = 'device';
    if (canonicalKeys.has(actionType)) {
      grouped[actionType] = [...(grouped[actionType] || []), clone(action)];
    } else if (actionType === 'counselling') {
      const label = String(action.name || '').trim();
      const notes = String(action.notes || '').trim();
      const text = [label, notes].filter(Boolean).join(': ');
      if (text) counselling.push(text);
    }
  });
  Object.entries(grouped).forEach(([key, rows]) => {
    edited[key] = mergeRows(edited[key], rows);
  });
  if (counselling.length) {
    const current = String(edited.plan?.patient_education || '').trim();
    edited.plan = {
      ...edited.plan,
      patient_education: [current, ...counselling].filter(Boolean).join('\n'),
    };
  }
};

export const buildCanonicalEditedProposal = (proposal, notePayload) => {
  const base = proposal?.clinical_documentation?.edit_contract;
  if (!base || base.schema_version !== 'care_plan_edit.v2') {
    throw new Error('This proposal does not expose the canonical clinician edit contract.');
  }
  const note = notePayload && typeof notePayload === 'object' ? notePayload : {};
  const edited = clone(base);
  ['subjective', 'objective', 'assessment', 'plan'].forEach((section) => {
    edited[section] = mergeSection(base[section], note[section]);
  });
  edited.prescription = mergeRows(base.prescription, note.prescription);
  edited.investigation = mergeRows(base.investigation, note.investigation);
  mergeOtherActions(edited, note);
  edited.clinical_attestations = clone(note.clinical_attestations || {});
  return edited;
};

export const buildCanonicalDoctorDecisionRequest = ({
  proposal,
  decision,
  notePayload,
  reason = '',
  questions = [],
  attestations = {},
  reviewStartedAt = null,
  decisionAt = null,
}) => {
  const contract = requireCanonicalProposalContract(proposal);
  const normalizedDecision = normalizeCanonicalDecision(decision);
  const payload = {
    decision: normalizedDecision,
    proposal_hash: contract.proposalHash,
    ai_draft_hash: contract.aiDraftHash,
    reason,
    questions: Array.isArray(questions) ? questions : [],
    decision_category: normalizedDecision,
  };
  if (reviewStartedAt) payload.review_started_at = reviewStartedAt;
  if (decisionAt) payload.decision_at = decisionAt;

  if (APPROVAL_DECISIONS.has(normalizedDecision)) {
    payload.clinical_attestations = {
      documentation_reviewed: attestations.documentation_reviewed === true,
      allergies_and_interactions_reviewed: attestations.allergies_and_interactions_reviewed === true,
    };
  }
  if (normalizedDecision === 'edit_and_approve') {
    payload.edited_proposal = buildCanonicalEditedProposal(proposal, notePayload);
    payload.edited_proposal.clinical_attestations = clone(payload.clinical_attestations);
  }
  return payload;
};

export const reconcileReviewWithCanonicalDecision = (review, result) => {
  if (!review || !result) return review;
  const proposal = result.proposal || result;
  const projection = result.medical_review_projection || {};
  const status = proposal.status || review.care_kernel_proposal?.status;
  const projectedReviewStatus = projection.review_status || {
    authorized: 'approved',
    rejected: 'rejected',
  }[status];
  const projectedWorkflowStatus = projection.workflow_status || {
    authorized: 'approved',
    needs_information: 'needs_patient_info',
    rejected: 'rejected',
    pending_doctor: 'pending_doctor_review',
  }[status];
  const contract = getCanonicalProposalContract(proposal);
  return {
    ...review,
    ...(projectedReviewStatus ? { review_status: projectedReviewStatus } : {}),
    ...(projectedWorkflowStatus ? { workflow_status: projectedWorkflowStatus } : {}),
    requires_doctor_action: status === 'pending_doctor',
    care_kernel_proposal: contract ? {
      ...(review.care_kernel_proposal || {}),
      public_id: contract.publicId,
      status,
      proposal_hash: contract.proposalHash,
      ai_draft_hash: contract.aiDraftHash,
      decision_endpoint: contract.decisionEndpoint,
      latest_decision: result.decision_id ? {
        public_id: result.decision_id,
        decision: result.decision,
        proposal_hash: contract.proposalHash,
        ai_draft_hash: result.ai_draft_hash || contract.aiDraftHash,
      } : review.care_kernel_proposal?.latest_decision,
    } : review.care_kernel_proposal,
  };
};

export const isStaleCanonicalDecisionError = (error) => (
  error?.status === 409 && (
    error?.payload?.state === 'stale_version' ||
    ['stale_proposal', 'stale_ai_draft'].includes(error?.payload?.code)
  )
);
