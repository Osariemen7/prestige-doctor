import { afterEach, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClinicalDocumentationWorkspace, { validateDocumentationDraft } from './ClinicalDocumentationWorkspace';
import {
  buildCompleteDocumentationEdit,
  copy,
  documentationChanges,
  normalizeClinicalDocumentation,
} from './contract';
import {
  fetchProposal,
  mutateReviewClaim,
  resetSyntheticDemo,
  submitDoctorDecision,
} from './api';
import * as doctorApi from './api';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('lucide-react', async () => {
  const ReactModule = await import('react');
  const makeIcon = (name) => (props) => ReactModule.createElement('span', { ...props, 'data-icon': name });
  return ['AlertTriangle', 'Check', 'CheckCircle2', 'ChevronRight', 'CircleHelp', 'Clock3', 'FileCheck2', 'Info', 'LockKeyhole', 'Menu', 'RefreshCw', 'ShieldAlert', 'Timer', 'UserRound', 'X'].reduce((icons, name) => ({ ...icons, [name]: makeIcon(name) }), {});
});

const PROPOSAL_ID = 'proposal-hypertension-v2';

describe('detailed clinical documentation contract', () => {
  beforeEach(async () => { await resetSyntheticDemo(); });
  afterEach(() => vi.restoreAllMocks());

  test('normalizes the full SOAP/action packet without dropping immutable provenance', async () => {
    const proposal = await fetchProposal({ proposalId: PROPOSAL_ID, demo: true });
    const documentation = normalizeClinicalDocumentation(proposal.clinical_documentation);
    expect(documentation.sections.subjective.chief_complaint).toMatch(/blood pressure follow-up/i);
    expect(documentation.prescriptions).toHaveLength(2);
    expect(documentation.investigations).toHaveLength(2);
    expect(documentation.source_provenance).toHaveLength(4);
    expect(documentation.signed).toBe(false);
    expect(JSON.stringify(documentation)).not.toMatch(/price|settlement|funding|margin/i);
  });

  test('preserves complete write-shaped extensions and reports field-addressable diffs', async () => {
    const proposal = await fetchProposal({ proposalId: PROPOSAL_ID, demo: true });
    const source = proposal.clinical_documentation.edit_contract;
    const draft = copy(source);
    draft.assessment.primary_impression = 'Clinician-corrected stable hypertension assessment.';
    draft.prescription[0].patient_specific_regimen.allergies_reviewed = true;
    draft.prescription[0].patient_specific_regimen.interactions_reviewed = true;
    const payload = buildCompleteDocumentationEdit(source, draft);
    const changes = documentationChanges(source, payload);
    expect(payload.schema_version).toBe('care_plan_edit.v2');
    expect(payload.extension_fields).toEqual(source.extension_fields);
    expect(payload.source_provenance).toEqual(source.source_provenance);
    expect(payload.prescription).toHaveLength(2);
    expect(payload.investigation).toHaveLength(2);
    expect(changes.map((item) => item.path)).toContain('assessment.primary_impression');
    expect(changes.map((item) => item.path)).toContain('prescription.0.patient_specific_regimen.allergies_reviewed');
    expect(changes.map((item) => item.path)).toContain('prescription.0.patient_specific_regimen.interactions_reviewed');
  });

  test('requires complete medication attestations and result-review authority', async () => {
    const proposal = await fetchProposal({ proposalId: PROPOSAL_ID, demo: true });
    const draft = copy(proposal.clinical_documentation.edit_contract);
    expect(validateDocumentationDraft(draft)).toEqual(expect.arrayContaining([
      expect.stringMatching(/confirm allergy review/),
      expect.stringMatching(/confirm interaction review/),
    ]));
    draft.prescription.forEach((item) => {
      item.patient_specific_regimen.allergies_reviewed = true;
      item.patient_specific_regimen.interactions_reviewed = true;
    });
    expect(validateDocumentationDraft(draft)).toEqual([]);
    delete draft.investigation[0].result_review.medical_interpretation_required;
    expect(validateDocumentationDraft(draft)).toContain('investigation 1: result-review authority must be explicit');
  });

  test('demo exact-hash amendment creates signed authority and verified downstream checkpoint', async () => {
    await mutateReviewClaim({ proposalId: PROPOSAL_ID, action: 'claim', demo: true });
    const proposal = await fetchProposal({ proposalId: PROPOSAL_ID, demo: true });
    const edit = copy(proposal.clinical_documentation.edit_contract);
    edit.assessment.clinical_rationale += ' Clinician verified the returned history.';
    edit.prescription.forEach((item) => {
      item.patient_specific_regimen.allergies_reviewed = true;
      item.patient_specific_regimen.interactions_reviewed = true;
    });
    const result = await submitDoctorDecision({
      proposalId: PROPOSAL_ID,
      demo: true,
      payload: {
        decision: 'edit_and_approve',
        proposal_hash: proposal.proposal_hash,
        reason: 'Returned evidence supports monitored continuation.',
        clinical_attestations: { documentation_reviewed: true, allergies_and_interactions_reviewed: true },
        edited_proposal: buildCompleteDocumentationEdit(proposal.clinical_documentation.edit_contract, edit),
      },
    });
    expect(result.clinical_documentation).toMatchObject({ state: 'clinician_signed', signed: true, source: 'clinician_amended' });
    expect(result.clinical_documentation.amendment_diff.length).toBeGreaterThan(0);
    expect(result.execution_state.next_checkpoint.title).toMatch(/Day 28/i);
    expect(result.execution_state.downstream_owner.role).toBe('Care Kernel coordination');
  });

  test('hydrates a claimed draft and reuses an uncertain save key only for its exact retry', async () => {
    const claimedProposal = await mutateReviewClaim({ proposalId: PROPOSAL_ID, action: 'claim', demo: true });
    vi.spyOn(doctorApi, 'fetchProposal').mockResolvedValue(claimedProposal);
    const fetchDraft = vi.spyOn(doctorApi, 'fetchReviewDraft').mockResolvedValue({ draft: null });
    const saveDraft = vi.spyOn(doctorApi, 'saveReviewDraft')
      .mockRejectedValueOnce(new Error('connection lost after submission'))
      .mockResolvedValueOnce({ status: 'saved', draft: { version: 1 } })
      .mockResolvedValueOnce({ status: 'saved', draft: { version: 2 } });

    render(<ClinicalDocumentationWorkspace proposalId={PROPOSAL_ID} />);
    const complaint = await screen.findByLabelText('Chief complaint');
    await waitFor(() => expect(complaint).not.toBeDisabled());
    expect(fetchDraft).toHaveBeenCalledWith(expect.objectContaining({ proposalId: PROPOSAL_ID }));
    fireEvent.change(complaint, { target: { value: 'Updated complaint for a focused retry test.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    expect(await screen.findByText('Save outcome uncertain')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Retry same draft save' }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(2));
    expect(saveDraft.mock.calls[1][0].commandKey).toBe(saveDraft.mock.calls[0][0].commandKey);
    expect(saveDraft.mock.calls[1][0].payload).toEqual(saveDraft.mock.calls[0][0].payload);
    expect(saveDraft.mock.calls[0][0].payload.expected_version).toBe(0);

    fireEvent.change(complaint, { target: { value: 'A distinct later draft intent.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(3));
    expect(saveDraft.mock.calls[2][0].commandKey).not.toBe(saveDraft.mock.calls[1][0].commandKey);
    expect(saveDraft.mock.calls[2][0].payload.expected_version).toBe(1);
    expect(screen.queryByText('Documentation signed against the exact clinical version')).not.toBeInTheDocument();
  });

  test('keeps a successful claim visible and offers draft-load retry after a transient read failure', async () => {
    const fetchDraft = vi.spyOn(doctorApi, 'fetchReviewDraft')
      .mockRejectedValueOnce(new Error('temporary draft read failure'))
      .mockResolvedValue({ draft: null });

    render(<ClinicalDocumentationWorkspace demo proposalId={PROPOSAL_ID} />);
    fireEvent.click(await screen.findByRole('button', { name: /claim and review/i }));
    const retry = await screen.findByRole('button', { name: 'Retry draft loading' });
    expect(screen.queryByRole('button', { name: /claim and review/i })).not.toBeInTheDocument();
    expect(fetchDraft).toHaveBeenCalledTimes(1);

    fireEvent.click(retry);
    await waitFor(() => expect(fetchDraft).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.getByLabelText('Chief complaint')).not.toBeDisabled());
  });

  test('reloads and compares current server draft after 409, then uses a new key for the rebased save', async () => {
    const claimedProposal = await mutateReviewClaim({ proposalId: PROPOSAL_ID, action: 'claim', demo: true });
    const latestProposal = copy(claimedProposal);
    latestProposal.proposal_hash = 'latest-proposal-hash';
    vi.spyOn(doctorApi, 'fetchProposal')
      .mockResolvedValueOnce(claimedProposal)
      .mockResolvedValueOnce(latestProposal);
    vi.spyOn(doctorApi, 'fetchReviewDraft')
      .mockResolvedValueOnce({ draft: null })
      .mockResolvedValueOnce({ draft: null });
    const stale = Object.assign(new Error('proposal changed'), { status: 409, code: 'stale_proposal', staleProposal: true });
    const saveDraft = vi.spyOn(doctorApi, 'saveReviewDraft')
      .mockRejectedValueOnce(stale)
      .mockResolvedValueOnce({ status: 'saved', draft: { version: 1 } });

    render(<ClinicalDocumentationWorkspace proposalId={PROPOSAL_ID} />);
    const complaint = await screen.findByLabelText('Chief complaint');
    await waitFor(() => expect(complaint).not.toBeDisabled());
    fireEvent.change(complaint, { target: { value: 'Local edit retained across a stale proposal.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByRole('heading', { name: 'Reapply prior draft changes one field at a time' })).toBeInTheDocument();
    expect(screen.getByText('Local edit retained across a stale proposal.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reapply this field' }));
    expect(screen.getByDisplayValue('Local edit retained across a stale proposal.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(saveDraft).toHaveBeenCalledTimes(2));

    expect(saveDraft.mock.calls[1][0].commandKey).not.toBe(saveDraft.mock.calls[0][0].commandKey);
    expect(saveDraft.mock.calls[1][0].payload.base_proposal_hash).toBe('latest-proposal-hash');
    expect(saveDraft.mock.calls[1][0].payload.content.subjective.chief_complaint)
      .toBe('Local edit retained across a stale proposal.');
  });

  test('refreshes claim authority and disables editing after a draft save reports claim loss', async () => {
    const claimedProposal = await mutateReviewClaim({ proposalId: PROPOSAL_ID, action: 'claim', demo: true });
    const unclaimedProposal = await mutateReviewClaim({ proposalId: PROPOSAL_ID, action: 'release', demo: true });
    vi.spyOn(doctorApi, 'fetchProposal')
      .mockResolvedValueOnce(claimedProposal)
      .mockResolvedValueOnce(unclaimedProposal);
    vi.spyOn(doctorApi, 'fetchReviewDraft').mockResolvedValue({ draft: null });
    const claimLost = Object.assign(new Error('claim lost'), { status: 409, code: 'claim_lost' });
    const saveDraft = vi.spyOn(doctorApi, 'saveReviewDraft').mockRejectedValueOnce(claimLost);

    render(<ClinicalDocumentationWorkspace proposalId={PROPOSAL_ID} />);
    const complaint = await screen.findByLabelText('Chief complaint');
    await waitFor(() => expect(complaint).not.toBeDisabled());
    fireEvent.change(complaint, { target: { value: 'A draft edited before claim expiry.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));

    expect(await screen.findByRole('button', { name: /claim and review/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByLabelText('Chief complaint')).toBeDisabled());
    expect(saveDraft).toHaveBeenCalledTimes(1);
  });

  test('renders a claim-gated workspace and keeps evidence outside editable controls', async () => {
    render(<ClinicalDocumentationWorkspace demo proposalId={PROPOSAL_ID} />);
    const claim = await screen.findByRole('button', { name: /claim and review/i });
    expect(await screen.findByLabelText('Chief complaint')).toBeDisabled();
    fireEvent.click(claim);
    await waitFor(() => expect(screen.getByLabelText('Chief complaint')).not.toBeDisabled());
    expect(screen.getByLabelText('Chief complaint').value).toMatch(/blood pressure follow-up/i);
    expect(screen.getByText('Home blood pressure log')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Home blood pressure log')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /prescriptions/i }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Amlodipine' })).toBeInTheDocument());
    expect(screen.getByRole('heading', { name: 'Hydrochlorothiazide' })).toBeInTheDocument();
  });
});
