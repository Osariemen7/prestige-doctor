import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { render, screen } from '@testing-library/react';
import DoctorClinicalServices from './DoctorClinicalServices';
import { listDoctorClinicalServiceOrders } from '../services/doctorCareLoopApi';

jest.mock('../services/doctorCareLoopApi', () => ({
  listDoctorClinicalServiceOrders: jest.fn(),
}));

describe('DoctorClinicalServices', () => {
  beforeEach(() => {
    listDoctorClinicalServiceOrders.mockResolvedValue({
      schema_version: 'v1',
      results: [{
        public_id: 'order-1',
        sku: 'gp_written_review',
        modality: 'written',
        status: 'pending_clinician',
        due_at: '2026-08-10T10:00:00Z',
        patient_safe_label: 'Authorized patient A',
        proposal_id: 'proposal-1',
        state_version: 'order-v3',
        allowed_actions: [{ key: 'open_existing_claim_and_decision', proposal_id: 'proposal-1' }],
      }],
      next_cursor: null,
    });
  });

  it('renders server-ordered doctor work and does not expose commercial fields', async () => {
    render(
      <MemoryRouter>
        <DoctorClinicalServices />
      </MemoryRouter>
    );

    expect(await screen.findByText('gp_written_review')).toBeInTheDocument();
    expect(screen.getByText(/Authorized patient A/)).toBeInTheDocument();
    expect(screen.getByText(/Pending Clinician/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/sponsorship|balance|margin|settlement|revenue/i);
    expect(listDoctorClinicalServiceOrders).toHaveBeenCalledWith({ status: undefined, cursor: undefined });
  });

  it('fails closed when the doctor collection endpoint is unavailable', async () => {
    listDoctorClinicalServiceOrders.mockRejectedValueOnce(new Error('This doctor collection is not available yet.'));

    render(
      <MemoryRouter>
        <DoctorClinicalServices />
      </MemoryRouter>
    );

    expect(await screen.findByText('Clinical-service queue unavailable')).toBeInTheDocument();
    expect(screen.getByText(/No cached or client-created order is shown/)).toBeInTheDocument();
    expect(screen.queryByText('Open service')).not.toBeInTheDocument();
  });
});
