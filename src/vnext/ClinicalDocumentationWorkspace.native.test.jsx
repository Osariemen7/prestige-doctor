import React from 'react';
import { afterEach, beforeEach, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import ClinicalDocumentationWorkspace from './ClinicalDocumentationWorkspace';
import * as api from './api';

vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }));
vi.mock('./analytics', () => ({ trackDoctorEvent: vi.fn() }));
vi.mock('./api', () => ({ fetchProposal: vi.fn(), fetchReviewDraft: vi.fn(), saveReviewDraft: vi.fn(), submitDoctorDecision: vi.fn(), mutateReviewClaim: vi.fn(), getCommandKey: vi.fn(), forgetCommandKey: vi.fn() }));
const copy = (value) => JSON.parse(JSON.stringify(value));
const document = {
  schema_version: 'care_plan_documentation.v2',
  subjective: { chief_complaint: 'Native headache story', history_of_present_illness: 'Two synthetic days', review_of_systems: 'Not assessed', medications_and_adherence: 'Not assessed', allergies_and_interactions: 'Not assessed', patient_goals: 'Safe next steps' },
  objective: { verified_observations: 'No examination', investigation_results: 'Not assessed', remote_exam_limitations: 'Remote encounter' },
  assessment: { primary_impression: 'Unapproved impression', confidence: 'Unclear', ranked_differential: ['Not assessed'], must_not_miss: ['Not assessed'], missing_evidence: ['Examination'], clinical_rationale: 'History only' },
  plan: { management: 'Await review', follow_up: 'Clinician review', patient_education: 'Draft only', treatment_goal: 'Reviewed next step', plan_reasoning: 'No authority yet' },
  safety_net: { instructions: 'Seek urgent care for worsening symptoms', escalation_triggers: ['Severe symptoms'] },
  source_provenance: [{ path: 'subjective.chief_complaint', source: 'synthetic_turn', evidence_status: 'patient_reported' }],
  action_disposition: { prescription: 'none_indicated', investigation: 'none_indicated' },
  prescription: [], investigation: [], next_review: { owner: 'doctor', checkpoint: 'Review' },
  goal_target: 'Safe review', goal_metrics: ['Review completed'], extension_fields: { retained: 'exact native extension' },
};
const proposal = () => ({ public_id: 'native-proposal', proposal_hash: 'proposal-hash', status: 'pending_doctor', correlation_id: 'correlation', review_claim: { claimed_by_current_doctor: true }, clinical_documentation: { schema_version: 'care_plan_documentation.v2', state: 'ai_prepared', signed: false, source_plan_version_id: 'plan-id', content_hash: 'old-plan-hash', edit_contract: { ...copy(document), subjective: { chief_complaint: 'Older proposal story' } }, editor_capabilities: { can_edit: true } } });
const native = (hash = 'ai-hash', edit = null) => ({ schema_version: 'clinical_review_draft_v2', proposal_id: 'native-proposal', ai_draft_hash: hash, ai_draft: { version: 'encounter_clinical_review_content_v1', state: 'ai_prepared_unapproved', documentation: copy(document), provenance: { proposal_hash: 'proposal-hash' }, source_sha256: 'source-hash', evidence_revision: 'revision-1', envelope: { proposal_id: 'native-proposal', content_sha256: hash, source_sha256: 'source-hash', evidence_revision: 'revision-1' } }, clinician_edit: edit });
const editDocument = (complaint = 'Recovered native edit') => ({ ...copy(document), schema_version: 'care_plan_edit.v2', source_plan_version_id: 'plan-id', subjective: { ...copy(document.subjective), chief_complaint: complaint } });
const savedEdit = (content = editDocument(), hash = 'edit-hash', base = 'ai-hash') => ({ version: 3, base_proposal_hash: 'proposal-hash', stale: false, payload: { version: 'encounter_clinical_review_edit_v1', base_ai_draft_hash: base, source_sha256: 'source-hash', evidence_revision: 'revision-1', edited_document: copy(content), envelope: { content_sha256: hash } } });
const open = async () => {
  render(<ClinicalDocumentationWorkspace proposalId="native-proposal" />);
  const field = await screen.findByLabelText('Chief complaint');
  await waitFor(() => expect(field).not.toBeDisabled());
  return field;
};
const confirm = async (amended = false) => {
  fireEvent.click(screen.getByRole('button', { name: amended ? 'Review amendments' : 'Review and sign' }));
  fireEvent.change(screen.getByLabelText('Clinical reason'), { target: { value: 'Synthetic clinician review' } });
  fireEvent.click(screen.getByRole('checkbox', { name: /I reviewed the SOAP/ }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: amended ? 'Sign amended version' : 'Approve exact version' })); });
};
beforeEach(() => {
  vi.resetAllMocks();
  let key = 0;
  api.getCommandKey.mockImplementation(() => 'command-' + ++key);
  api.fetchProposal.mockResolvedValue(proposal());
  api.fetchReviewDraft.mockResolvedValue(native());
  api.submitDoctorDecision.mockResolvedValue({ ...proposal(), status: 'approved' });
});
afterEach(cleanup);

test('hydrates native AI documentation instead of the older proposal and signs its exact hash', async () => {
  expect((await open()).value).toBe('Native headache story');
  expect(screen.getByLabelText('History of presenting complaint').value).toBe('Two synthetic days');
  expect(screen.getByTestId('native-review-content')).toHaveTextContent('exact native extension');
  await confirm();
  await waitFor(() => expect(api.submitDoctorDecision).toHaveBeenCalledTimes(1));
  expect(api.submitDoctorDecision.mock.calls[0][0].payload).toMatchObject({ decision: 'approve_as_written', ai_draft_hash: 'ai-hash', proposal_hash: 'proposal-hash' });
});
test('recovers native clinician content and signs the server-stored edit hash without resaving', async () => {
  api.fetchReviewDraft.mockResolvedValue(native('ai-hash', savedEdit()));
  expect((await open()).value).toBe('Recovered native edit');
  await confirm(true);
  await waitFor(() => expect(api.submitDoctorDecision).toHaveBeenCalledTimes(1));
  expect(api.submitDoctorDecision.mock.calls[0][0].payload).toMatchObject({ decision: 'edit_and_approve', ai_draft_hash: 'ai-hash', clinician_edit_hash: 'edit-hash' });
  expect(api.saveReviewDraft).not.toHaveBeenCalled();
});
test('saves the complete native document with both hashes before allowing approval', async () => {
  api.fetchReviewDraft.mockResolvedValue(native('ai-hash', savedEdit()));
  api.saveReviewDraft.mockImplementation(async ({ payload }) => ({ schema_version: 'clinical_review_draft_v2', ai_draft_hash: 'ai-hash', edit_hash: 'new-edit-hash', draft: savedEdit(payload.draft, 'new-edit-hash') }));
  const field = await open();
  fireEvent.change(field, { target: { value: 'New exact clinician text' } });
  expect(screen.getByRole('button', { name: 'Review amendments' })).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Review amendments' })).not.toBeDisabled());
  expect(api.saveReviewDraft.mock.calls[0][0].payload).toEqual({ ai_draft_hash: 'ai-hash', expected_edit_hash: 'edit-hash', draft: editDocument('New exact clinician text') });
  await confirm(true);
  await waitFor(() => expect(api.submitDoctorDecision).toHaveBeenCalledTimes(1));
  expect(api.submitDoctorDecision.mock.calls[0][0].payload.clinician_edit_hash).toBe('new-edit-hash');
});

test('native GET hydrates even when the legacy edit contract is absent', async () => {
  const current = proposal(); current.clinical_documentation.edit_contract = null;
  api.fetchProposal.mockResolvedValue(current);
  expect((await open()).value).toBe('Native headache story');
  expect(api.saveReviewDraft).not.toHaveBeenCalled();
});

test('stale native clinician content is compared, never restored or silently signed', async () => {
  api.fetchReviewDraft.mockResolvedValue(native('ai-hash', savedEdit(editDocument(), 'old-edit', 'old-ai')));
  expect((await open()).value).toBe('Native headache story');
  expect(screen.getByRole('heading', { name: 'Reapply prior draft changes one field at a time' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Review and sign' })).toBeDisabled();
  expect(api.submitDoctorDecision).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Discard prior draft changes' }));
  expect(screen.getByRole('button', { name: 'Review and sign' })).not.toBeDisabled();
});

test('save 409 reloads native hashes and content, then explicit reapply uses a fresh intent', async () => {
  api.fetchReviewDraft.mockResolvedValueOnce(native()).mockResolvedValue(native('next-ai'));
  api.saveReviewDraft.mockRejectedValueOnce(Object.assign(new Error('AI draft changed'), { status: 409 }))
    .mockImplementation(async ({ payload }) => ({ ai_draft_hash: 'next-ai', edit_hash: 'next-edit', draft: savedEdit(payload.draft, 'next-edit', 'next-ai') }));
  fireEvent.change(await open(), { target: { value: 'Local clinical correction' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save draft' })); });
  await screen.findByRole('heading', { name: 'Reapply prior draft changes one field at a time' });
  expect(screen.getByLabelText('Chief complaint').value).toBe('Native headache story');
  expect(api.fetchReviewDraft).toHaveBeenCalledTimes(2);
  fireEvent.click(screen.getByRole('button', { name: 'Reapply this field' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save draft' })); });
  expect(api.saveReviewDraft.mock.calls[1][0].payload).toMatchObject({ ai_draft_hash: 'next-ai', expected_edit_hash: '', draft: { subjective: { chief_complaint: 'Local clinical correction' } } });
  expect(api.saveReviewDraft.mock.calls[1][0].commandKey).not.toBe(api.saveReviewDraft.mock.calls[0][0].commandKey);
  await confirm(true);
  expect(api.submitDoctorDecision.mock.calls[0][0].payload).toMatchObject({ ai_draft_hash: 'next-ai', clinician_edit_hash: 'next-edit' });
});

test('approval 409 reloads the native review contract and requires new review', async () => {
  api.fetchReviewDraft.mockResolvedValueOnce(native('ai-hash', savedEdit())).mockResolvedValue(native('next-ai'));
  api.submitDoctorDecision.mockRejectedValueOnce(Object.assign(new Error('Evidence changed'), { status: 409 }));
  await open(); await confirm(true);
  await screen.findByRole('heading', { name: 'Reapply prior draft changes one field at a time' });
  expect(api.fetchReviewDraft).toHaveBeenCalledTimes(2);
  expect(screen.getByLabelText('Chief complaint').value).toBe('Native headache story');
  expect(screen.getByRole('button', { name: 'Review and sign' })).toBeDisabled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(api.submitDoctorDecision).toHaveBeenCalledTimes(1);
});

test('uncertain native save retries only its frozen document and command identity', async () => {
  api.saveReviewDraft.mockRejectedValueOnce(new Error('Lost response'))
    .mockImplementation(async ({ payload }) => ({ ai_draft_hash: 'ai-hash', edit_hash: 'retry-edit', draft: savedEdit(payload.draft, 'retry-edit') }));
  fireEvent.change(await open(), { target: { value: 'Frozen native correction' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save draft' })); });
  expect(screen.getByRole('button', { name: 'Review amendments' })).toBeDisabled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry same draft save' })); });
  expect(api.saveReviewDraft.mock.calls[1][0]).toEqual(api.saveReviewDraft.mock.calls[0][0]);
});

test('a save response for different content cannot authorize the visible edit', async () => {
  api.saveReviewDraft.mockResolvedValue({ ai_draft_hash: 'ai-hash', edit_hash: 'wrong-edit', draft: savedEdit(editDocument('Different server content'), 'wrong-edit') });
  fireEvent.change(await open(), { target: { value: 'Visible exact edit' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save draft' })); });
  expect(screen.getByText('Save outcome uncertain')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Review amendments' })).toBeDisabled();
  expect(api.submitDoctorDecision).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Reload native draft' })).toBeInTheDocument();
});

test('uncertain native signing freezes payload/hash and disables further editing', async () => {
  api.submitDoctorDecision.mockRejectedValueOnce(new Error('Lost decision response')).mockResolvedValue(proposal());
  await open(); await confirm();
  expect(screen.getByLabelText('Chief complaint')).toBeDisabled();
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Retry frozen decision' })); });
  expect(api.submitDoctorDecision.mock.calls[1][0]).toEqual(api.submitDoctorDecision.mock.calls[0][0]);
});

test('malformed or cross-proposal native identity fails closed before editing or signing', async () => {
  const wrong = native(); wrong.ai_draft.envelope.proposal_id = 'other-proposal';
  api.fetchReviewDraft.mockResolvedValue(wrong);
  render(<ClinicalDocumentationWorkspace proposalId="native-proposal" />);
  await screen.findByText(/native clinical draft identity changed/);
  expect(screen.queryByLabelText('Chief complaint')).not.toBeInTheDocument();
  expect(api.submitDoctorDecision).not.toHaveBeenCalled();
  expect(api.saveReviewDraft).not.toHaveBeenCalled();
});

test('structured native values retain arrays and invalid JSON blocks save and approval', async () => {
  await open();
  fireEvent.click(screen.getByRole('button', { name: /Assessment.*3 of/i }));
  const field = await screen.findByLabelText('Ranked differential');
  expect(JSON.parse(field.value)).toEqual(['Not assessed']);
  fireEvent.change(field, { target: { value: '[invalid' } });
  expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Review and sign' })).toBeDisabled();
  fireEvent.change(field, { target: { value: '["Clinician reviewed differential"]' } });
  api.saveReviewDraft.mockImplementation(async ({ payload }) => ({ ai_draft_hash: 'ai-hash', edit_hash: 'array-edit', draft: savedEdit(payload.draft, 'array-edit') }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save draft' })); });
  expect(api.saveReviewDraft.mock.calls[0][0].payload.draft.assessment.ranked_differential).toEqual(['Clinician reviewed differential']);
});

test('claim loss clears native protected content and prevents an approval', async () => {
  api.saveReviewDraft.mockRejectedValue(Object.assign(new Error('Claim revoked'), { status: 403 }));
  api.fetchProposal.mockResolvedValueOnce(proposal()).mockResolvedValue({ ...proposal(), review_claim: {} });
  fireEvent.change(await open(), { target: { value: 'Unsent correction' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save draft' })); });
  await screen.findByRole('button', { name: /Claim and review/ });
  expect(screen.queryByTestId('native-review-content')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Chief complaint')).toBeDisabled();
  expect(api.submitDoctorDecision).not.toHaveBeenCalled();
});

test('a definite save validation rejection permits a corrected fresh intent', async () => {
  api.saveReviewDraft.mockRejectedValueOnce(Object.assign(new Error('Invalid documentation'), { status: 422 }))
    .mockImplementation(async ({ payload }) => ({ ai_draft_hash: 'ai-hash', edit_hash: 'corrected-edit', draft: savedEdit(payload.draft, 'corrected-edit') }));
  const field = await open();
  fireEvent.change(field, { target: { value: 'Rejected draft' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save draft' })); });
  fireEvent.change(field, { target: { value: 'Corrected clinician draft' } });
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Save corrected draft' })); });
  expect(api.saveReviewDraft.mock.calls[1][0].commandKey).not.toBe(api.saveReviewDraft.mock.calls[0][0].commandKey);
  expect(api.saveReviewDraft.mock.calls[1][0].payload.draft.subjective.chief_complaint).toBe('Corrected clinician draft');
});

test('a definite decision validation rejection does not freeze the editable review', async () => {
  api.submitDoctorDecision.mockRejectedValueOnce(Object.assign(new Error('Clinical documentation invalid'), { status: 422 }));
  await open(); await confirm();
  expect(screen.getByLabelText('Chief complaint')).not.toBeDisabled();
  expect(screen.queryByRole('button', { name: 'Retry frozen decision' })).not.toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});

test('discarding malformed structured text restores the exact retained array', async () => {
  await open();
  fireEvent.click(screen.getByRole('button', { name: /Assessment.*3 of/i }));
  fireEvent.change(screen.getByLabelText('Ranked differential'), { target: { value: '[invalid' } });
  fireEvent.click(screen.getByRole('button', { name: 'Discard invalid text' }));
  expect(JSON.parse(screen.getByLabelText('Ranked differential').value)).toEqual(['Not assessed']);
  expect(screen.getByRole('button', { name: 'Review and sign' })).not.toBeDisabled();
  expect(api.saveReviewDraft).not.toHaveBeenCalled();
});
