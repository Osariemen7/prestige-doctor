import React from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DoctorClinicalServiceDetail from './DoctorClinicalServiceDetail';
import {
  getClinicalProposal,
  getDoctorClinicalServiceOrder,
  submitClinicalProposalDecision,
} from '../services/doctorCareLoopApi';

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
  clinician_work: {
    claim_endpoint: '/care/proposals/proposal-1/review-claim',
    claim_actions: ['claim'],
  },
  authority_checkpoint: {
    decision_endpoint: '/care/proposals/proposal-1/doctor-decision',
  },
  patient: { display_name: 'Authorized patient A' },
  evidence: [{ label: 'Patient history', value: 'Server evidence' }],
  clinical_documentation: {
    state: 'ai_prepared',
    edit_contract: { assessment: { summary: 'Server-prepared assessment' } },
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
    render(
      <MemoryRouter initialEntries={['/clinical-services/order-1']}>
        <Routes>
          <Route path="/clinical-services/:orderId" element={<DoctorClinicalServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('proposal-hash-action-1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Approve As Written/ }));

    expect(submitClinicalProposalDecision).toHaveBeenCalledWith('proposal-1', expect.objectContaining({
      proposalHash: 'proposal-hash-action-1',
      aiDraftHash: 'draft-hash-action-1',
      decision: 'approve_as_written',
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
    render(
      <MemoryRouter initialEntries={['/clinical-services/order-1']}>
        <Routes>
          <Route path="/clinical-services/:orderId" element={<DoctorClinicalServiceDetail />} />
        </Routes>
      </MemoryRouter>
    );

    expect((await screen.findAllByText('Not supplied by server')).length).toBeGreaterThan(0);
    await user.click(screen.getByRole('button', { name: /Approve As Written/ }));
    expect(submitClinicalProposalDecision).not.toHaveBeenCalled();
    expect(await screen.findByText(/exact server proposal hash is missing/)).toBeInTheDocument();
  });
});
