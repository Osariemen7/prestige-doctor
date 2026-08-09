import React from 'react';
import { render, screen } from '@testing-library/react';
import DoctorTransitionContext from './DoctorTransitionContext';
import { listDoctorCareTransitions } from '../services/doctorCareLoopApi';

jest.mock('../services/doctorCareLoopApi', () => ({
  listDoctorCareTransitions: jest.fn(),
}));

describe('DoctorTransitionContext', () => {
  beforeEach(() => {
    listDoctorCareTransitions.mockResolvedValue({
      results: [{
        public_id: 'transition-1',
        review_public_id: 'review-1',
        transition_kind: 'clinic_referral',
        status: 'active',
        consented_protocol: { name: 'Referral attendance protocol', version: '2' },
        consent: { status: 'verified' },
        evidence_gaps: ['Appointment readiness evidence'],
        requirements: [{ key: 'already-verified', status: 'verified' }],
        next_action: { title: 'Confirm post-attendance clinical checkpoint', due_at: '2026-08-10T10:00:00Z' },
        state_version: 'transition-v4',
        safety_escalation: { status: 'active', detail: 'Escalate worsening symptoms to the clinical team.' },
        referral_attendance: { status: 'attended', recorded_at: '2026-08-09T10:00:00Z' },
        clinical_checkpoint: { title: 'Confirm post-attendance clinical checkpoint', due_at: '2026-08-10T10:00:00Z' },
      }],
    });
  });

  it('renders only actor-scoped server transition context', async () => {
    render(<DoctorTransitionContext reviewPublicId="review-1" review={{ public_id: 'review-1' }} />);

    expect(await screen.findByText('Referral attendance protocol')).toBeInTheDocument();
    expect(screen.getByText('Appointment readiness evidence')).toBeInTheDocument();
    expect(screen.getByText(/Escalate worsening symptoms/)).toBeInTheDocument();
    expect(screen.getByText(/attended/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirm post-attendance clinical checkpoint/)).toBeInTheDocument();
    expect(listDoctorCareTransitions).toHaveBeenCalledWith(
      { review_public_id: 'review-1' },
      expect.objectContaining({ signal: expect.anything() })
    );
    expect(document.body.textContent).not.toMatch(/sponsorship|balance|margin|settlement|revenue/i);
  });
});
