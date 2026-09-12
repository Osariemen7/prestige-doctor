import { describe, expect, it } from 'vitest';
import {
  buildCanonicalDoctorDecisionRequest,
  isStaleCanonicalDecisionError,
  reconcileReviewWithCanonicalDecision,
} from './canonicalDoctorDecision';

const proposal = {
  public_id: 'proposal-123',
  status: 'pending_doctor',
  proposal_hash: 'proposal-hash-abc',
  ai_draft_hash: 'draft-hash-def',
  authority_checkpoint: {
    decision_endpoint: '/care/proposals/proposal-123/doctor-decision',
  },
  clinical_documentation: {
    edit_contract: {
      schema_version: 'care_plan_edit.v2',
      source_plan_version_id: 'plan-version-1',
      subjective: { chief_complaint: 'Headache', allergies: 'None known' },
      objective: { verified_observations: 'BP 120/80' },
      assessment: { primary_impression: 'Tension headache' },
      plan: { management: 'Hydrate', follow_up: 'Tomorrow' },
      prescription: [{ medication_name: 'Paracetamol', patient_specific_regimen: { dose_amount: '500' } }],
      investigation: [],
    },
  },
};

describe('canonical doctor decision contract', () => {
  it('binds approvals to the exact proposal and AI draft hashes', () => {
    const payload = buildCanonicalDoctorDecisionRequest({
      proposal,
      decision: 'approve_as_is',
      attestations: {
        documentation_reviewed: true,
        allergies_and_interactions_reviewed: true,
      },
      reviewStartedAt: '2026-08-30T10:00:00.000Z',
      decisionAt: '2026-08-30T10:02:00.000Z',
    });

    expect(payload).toMatchObject({
      decision: 'approve_as_written',
      proposal_hash: 'proposal-hash-abc',
      ai_draft_hash: 'draft-hash-def',
      clinical_attestations: {
        documentation_reviewed: true,
        allergies_and_interactions_reviewed: true,
      },
    });
  });

  it('builds edits from the server edit contract without dropping hash-covered fields', () => {
    const payload = buildCanonicalDoctorDecisionRequest({
      proposal,
      decision: 'edit_and_approve',
      notePayload: {
        plan: { management: 'Hydrate and rest' },
        prescription: [{ medication_name: 'Paracetamol', instructions: 'After food' }],
        other_actions: [
          { action_type: 'procedure', name: 'Wound review', notes: 'Inspect healing.' },
          { action_type: 'counselling', name: 'Safety net', notes: 'Return if worse.' },
        ],
      },
      attestations: {
        documentation_reviewed: true,
        allergies_and_interactions_reviewed: true,
      },
    });

    expect(payload.edited_proposal.plan).toMatchObject({
      management: 'Hydrate and rest',
      follow_up: 'Tomorrow',
    });
    expect(payload.edited_proposal.prescription[0].patient_specific_regimen).toEqual({ dose_amount: '500' });
    expect(payload.edited_proposal.procedure[0].name).toBe('Wound review');
    expect(payload.edited_proposal.plan.patient_education).toContain('Safety net: Return if worse.');
    expect(payload.edited_proposal.clinical_attestations.documentation_reviewed).toBe(true);
  });

  it('reconciles the canonical response into the provider review read model', () => {
    const reconciled = reconcileReviewWithCanonicalDecision(
      { public_id: 'review-1', review_status: 'pending', care_kernel_proposal: {} },
      {
        decision_id: 'decision-1',
        decision: 'approve_as_written',
        proposal: { ...proposal, status: 'authorized' },
        medical_review_projection: { review_status: 'approved', workflow_status: 'approved' },
      },
    );

    expect(reconciled.review_status).toBe('approved');
    expect(reconciled.workflow_status).toBe('approved');
    expect(reconciled.requires_doctor_action).toBe(false);
    expect(reconciled.care_kernel_proposal.latest_decision.public_id).toBe('decision-1');
  });

  it('recognizes both proposal and AI draft stale conflicts', () => {
    expect(isStaleCanonicalDecisionError({
      status: 409,
      payload: { state: 'stale_version', code: 'stale_proposal' },
    })).toBe(true);
    expect(isStaleCanonicalDecisionError({ status: 422, payload: {} })).toBe(false);
  });
});
