import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DoctorClinicalServiceDetail from './DoctorClinicalServiceDetail';
import {
  getClinicalProposal,
  getDoctorClinicalServiceOrder,
  submitClinicalProposalDecision,
} from '../services/doctorCareLoopApi';

jest.mock('@mui/material', () => {
  const React = require('react');
  const passthrough = (tag) => ({ children, ...props }) => React.createElement(tag, {}, children);
  const Button = ({ children, onClick, disabled, ...props }) => React.createElement('button', { type: 'button', onClick, disabled, ...props }, children);
  const TextField = ({ label, value, onChange, multiline, ...props }) => React.createElement(
    multiline ? 'textarea' : 'input',
    { 'aria-label': label, value, onChange, ...props },
  );
  const Checkbox = ({ checked, onChange, disabled }) => React.createElement('input', { type: 'checkbox', checked, onChange, disabled });
  const FormControlLabel = ({ control, label }) => React.createElement('label', {}, control, label);
  const Select = ({ value, onChange, children, ...props }) => React.createElement('select', { value, onChange, ...props }, children);
  const MenuItem = ({ value, children }) => React.createElement('option', { value }, children);
  return {
    Alert: passthrough('div'), Box: passthrough('div'), Card: passthrough('div'), CardContent: passthrough('div'),
    Chip: passthrough('span'), CircularProgress: passthrough('span'), Divider: passthrough('hr'), FormControl: passthrough('div'),
    Grid: passthrough('div'), InputLabel: passthrough('label'), MenuItem, Select, Stack: passthrough('div'), TextField, Typography: passthrough('div'),
    Button, Checkbox, FormControlLabel,
  };
});

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  useParams: () => ({ orderId: 'order-1' }),
}));

jest.mock('../services/doctorCareLoopApi', () => ({
  claimClinicalProposal: jest.fn(),
  completeClinicalServiceCall: jest.fn(),
  getClinicalProposal: jest.fn(),
  getClinicalServiceJoin: jest.fn(),
  getDoctorClinicalServiceOrder: jest.fn(),
  scheduleClinicalService: jest.fn(),
  submitClinicalProposalDecision: jest.fn(),
}));

const orderProjection = {
  public_id: 'order-1',
  sku: 'gp_written_review',
  modality: 'written',
  service_class: 'gp',
  status: 'pending_clinician',
  proposal_id: 'proposal-1',
  proposal_hash: 'proposal-hash-1',
  ai_draft_hash: 'draft-hash-1',
  ai_draft: { assessment: { summary: 'Server-prepared assessment' } },
  patient_safe_label: 'Authorized patient A',
  due_at: '2026-08-10T10:00:00Z',
  state_version: 'order-v3',
  allowed_actions: [{
    key: 'open_existing_claim_and_decision',
    proposal_id: 'proposal-1',
    proposal_hash: 'proposal-hash-action-1',
    ai_draft_hash: 'draft-hash-action-1',
    claim_endpoint: '/care/proposals/proposal-1/review-claim',
    decision_endpoint: '/care/proposals/proposal-1/doctor-decision',
  }],
};

const proposalProjection = {
  public_id: 'proposal-1',
  proposal_hash: 'proposal-hash-projection-1',
  allowed_actions: ['approve_as_written', 'edit_and_approve'],
  authority_checkpoint: {
    decision_endpoint: '/care/proposals/proposal-1/doctor-decision',
  },
  patient: { display_name: 'Authorized patient A' },
  evidence: [{ label: 'Patient history', value: 'Server evidence' }],
  exception_packet: {
    priority: 'routine',
    ranked_differential: ['Measurement variation'],
    confidence_band: 'moderate',
    must_not_miss: [],
    missing_evidence: [],
  },
  evidence_quality: { label: 'Source mapped', gaps: [] },
  current_care: { medicines: ['Amlodipine'], adherence: 'No missed dose reported.' },
  clinician_work: {
    claim_endpoint: '/care/proposals/proposal-1/review-claim',
    claim_actions: ['claim'],
    started_at: '2026-08-10T09:00:00Z',
  },
  clinical_documentation: {
    state: 'ai_prepared',
    schema_version: 'care_plan_documentation.v2',
    sections: {
      subjective: { chief_complaint: 'Blood pressure follow-up', allergies: 'No known allergy returned.' },
      objective: { verified_observations: 'Home blood pressure 138/86 mmHg.', remote_assessment_limitations: 'No in-person examination performed.' },
      assessment: { primary_impression: 'Stable treated hypertension', confidence: 'moderate', must_not_miss: 'None returned.' },
      plan: { management: 'Continue monitored care.', safety_net: 'Use urgent physical care for red flags.' },
    },
    source_provenance: [{ label: 'Home blood pressure', value: '138/86', verified: true, provenance: { source: 'patient_device_entry', capture_channel: 'portal' } }],
    prescriptions: [],
    investigations: [],
    other_actions: { referral: [] },
    editor_capabilities: { can_edit: true },
    edit_contract: {
      schema_version: 'care_plan_edit.v2',
      source_plan_version_id: 'version-1',
      subjective: { chief_complaint: 'Blood pressure follow-up', allergies: 'No known allergy returned.' },
      objective: { verified_observations: 'Home blood pressure 138/86 mmHg.', remote_assessment_limitations: 'No in-person examination performed.' },
      assessment: { primary_impression: 'Stable treated hypertension', confidence: 'moderate', must_not_miss: 'None returned.' },
      plan: { management: 'Continue monitored care.', safety_net: 'Use urgent physical care for red flags.' },
      differential: ['Measurement variation'],
      safety_net: { instructions: 'Use urgent physical care for red flags.' },
      action_disposition: { prescription: 'none_indicated', investigation: 'none_indicated' },
      prescription: [],
      investigation: [],
      next_review: { timing: '28 days', checkpoint: 'Blood pressure and safety review' },
    },
  },
};

describe('DoctorClinicalServiceDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getDoctorClinicalServiceOrder.mockResolvedValue(orderProjection);
    getClinicalProposal.mockResolvedValue(proposalProjection);
    submitClinicalProposalDecision.mockResolvedValue({
      decision_id: 'decision-1',
      decision: 'approve_as_written',
      proposal: proposalProjection,
    });
  });

  it('links approval to the existing decision route and sends exact server hashes', async () => {
    const user = userEvent.setup();
    render(<DoctorClinicalServiceDetail />);

    expect(await screen.findByText('proposal-hash-action-1')).toBeInTheDocument();
    const approveButton = screen.getByRole('button', { name: /Approve As Written/ });
    expect(approveButton).toBeDisabled();
    await user.click(screen.getByLabelText(/reviewed the complete SOAP packet/i));
    await user.click(screen.getByLabelText(/checked allergies, interactions/i));
    expect(approveButton).toBeEnabled();
    await user.click(approveButton);

    expect(submitClinicalProposalDecision).toHaveBeenCalledWith('proposal-1', expect.objectContaining({
      proposalHash: 'proposal-hash-action-1',
      aiDraftHash: 'draft-hash-action-1',
      decision: 'approve_as_written',
      clinicalAttestations: {
        documentation_reviewed: true,
        allergies_and_interactions_reviewed: true,
      },
      reviewStartedAt: '2026-08-10T09:00:00Z',
      decisionAt: expect.any(String),
      decisionCategory: 'routine_review',
    }));
    expect(await screen.findByText(/Server confirmed the approve as written decision/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/sponsorship|balance|margin|settlement|revenue/i);
  });

  it('keeps an unsent edit local to the page and never calls approval without a server hash', async () => {
    const user = userEvent.setup();
    getDoctorClinicalServiceOrder.mockResolvedValueOnce({
      ...orderProjection,
      proposal_hash: null,
      ai_draft_hash: null,
      allowed_actions: [{
        key: 'open_existing_claim_and_decision',
        proposal_id: 'proposal-1',
        proposal_hash: null,
        ai_draft_hash: null,
      }],
    });
    getClinicalProposal.mockResolvedValueOnce({ ...proposalProjection, proposal_hash: null });
    render(<DoctorClinicalServiceDetail />);

    expect((await screen.findAllByText('Not supplied by server')).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /Approve As Written/ })).toBeDisabled();
    expect(submitClinicalProposalDecision).not.toHaveBeenCalled();
  });

  it('shows focused field diffs and submits the server edit contract only after attestations', async () => {
    const user = userEvent.setup();
    render(<DoctorClinicalServiceDetail />);

    await screen.findByText('Stable treated hypertension');
    await user.click(screen.getByRole('button', { name: /Edit draft fields/ }));
    const impression = screen.getByLabelText('Primary Impression');
    await user.clear(impression);
    await user.type(impression, 'Stable monitored hypertension');
    expect(await screen.findByText(/Unsent changes \(1\)/)).toBeInTheDocument();
    await user.click(screen.getByLabelText(/reviewed the complete SOAP packet/i));
    await user.click(screen.getByLabelText(/checked allergies, interactions/i));
    const editApprove = screen.getByRole('button', { name: /Edit And Approve/ });
    expect(editApprove).toBeEnabled();
    await user.click(editApprove);

    expect(submitClinicalProposalDecision).toHaveBeenCalledWith('proposal-1', expect.objectContaining({
      decision: 'edit_and_approve',
      editedProposal: expect.objectContaining({
        assessment: expect.objectContaining({ primary_impression: 'Stable monitored hypertension' }),
      }),
      clinicalAttestations: {
        documentation_reviewed: true,
        allergies_and_interactions_reviewed: true,
      },
    }));
  });
});
