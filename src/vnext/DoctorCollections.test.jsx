import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { DoctorPatientsScreen, DoctorResultsScreen, DoctorResultDetailScreen } from './DoctorCollections';
import { fetchDoctorPatients, fetchDoctorResults, fetchDoctorResultDetail } from './api';

vi.mock('./api', () => ({
  fetchDoctorPatients: vi.fn(),
  fetchDoctorResults: vi.fn(),
  fetchDoctorResultDetail: vi.fn(),
}));

function ResultRoute() {
  const { resultId } = useParams();
  return <><DoctorResultDetailScreen resultId={resultId} /><RouteLocation /></>;
}

function RouteLocation() {
  const location = useLocation();
  return <output data-testid="route-location">{location.pathname}{location.search}</output>;
}

describe('doctor collections', () => {
  beforeEach(() => vi.clearAllMocks());
  it('does not restart a request just because loading state rerenders the collection', async () => {
    fetchDoctorPatients.mockResolvedValue({ items: [{ public_id: 'patient-1', name: 'Amina Yusuf' }], next_cursor: null });
    render(<MemoryRouter><DoctorPatientsScreen /></MemoryRouter>);
    expect(await screen.findByText('Amina Yusuf')).toBeInTheDocument();
    expect(fetchDoctorPatients).toHaveBeenCalledTimes(1);
  });

  it('restores patient search from the deep link and preserves unrelated query state', async () => {
    fetchDoctorPatients.mockResolvedValue({ items: [], next_cursor: null });
    render(<MemoryRouter initialEntries={['/app/patients?search=amina&source=qr#family']}>
      <Routes><Route path="/app/patients" element={<><DoctorPatientsScreen /><RouteLocation /></>} /></Routes>
    </MemoryRouter>);

    const search = await screen.findByRole('textbox', { name: 'Search patients' });
    expect(search).toHaveValue('amina');
    expect(fetchDoctorPatients).toHaveBeenCalledWith(expect.objectContaining({ search: 'amina' }));
    fireEvent.change(search, { target: { value: 'tunde' } });
    expect(await screen.findByTestId('route-location')).toHaveTextContent('/app/patients?search=tunde&source=qr');
  });

  it('appends cursor pages without duplicating existing records', async () => {
    fetchDoctorPatients
      .mockResolvedValueOnce({ items: [{ public_id: 'patient-1', name: 'Amina Yusuf' }], next_cursor: 'cursor-2' })
      .mockResolvedValueOnce({ items: [{ public_id: 'patient-1', name: 'Amina Yusuf' }, { public_id: 'patient-2', name: 'Tunde Ade' }], next_cursor: null });
    render(<MemoryRouter><DoctorPatientsScreen /></MemoryRouter>);
    expect(await screen.findByText('Amina Yusuf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load more patients' }));
    expect(await screen.findByText('Tunde Ade')).toBeInTheDocument();
    expect(fetchDoctorPatients).toHaveBeenNthCalledWith(2, expect.objectContaining({ cursor: 'cursor-2' }));
    expect(screen.getAllByText('Amina Yusuf')).toHaveLength(1);
  });

  it('opens only the server-authorized result destination and returns to the same filtered collection', async () => {
    fetchDoctorResults.mockResolvedValue({
      items: [{
        investigation_id: '41',
        test_type: 'Full blood count',
        status: 'result_received',
        review_required: true,
        patient_name: 'Amina Yusuf',
        destination: { href: '/app/results/41', label: 'Review result' },
      }],
      next_cursor: null,
    });
    fetchDoctorResultDetail.mockResolvedValue({
      can_view_result: true,
      test_type: 'Full blood count',
      patient_name: 'Amina Yusuf',
      fulfillment_status: 'result_received',
      result_verification_status: 'verified',
      next_action: 'doctor_review',
      value: '5.2',
      unit: 'mmol/L',
      results: 'Server-returned result text',
    });

    render(<MemoryRouter initialEntries={['/app/diagnostics?status=result_received']}>
      <Routes>
        <Route path="/app/diagnostics" element={<><DoctorResultsScreen /><RouteLocation /></>} />
        <Route path="/app/results/:resultId" element={<ResultRoute />} />
      </Routes>
    </MemoryRouter>);

    expect(screen.getByRole('combobox')).toHaveValue('result_received');
    expect(fetchDoctorResults).toHaveBeenCalledWith(expect.objectContaining({ status: 'result_received' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Review result: Full blood count' }));
    expect(await screen.findByRole('heading', { name: 'Result review' })).toBeInTheDocument();
    expect(await screen.findByText(/clinical interpretation is still required/i)).toBeInTheDocument();
    expect(screen.getByText('Server-returned result text')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /mark.*review|complete.*review/i })).not.toBeInTheDocument();
    expect(fetchDoctorResultDetail).toHaveBeenCalledWith(expect.objectContaining({ resultId: '41' }));

    fireEvent.click(screen.getByRole('button', { name: 'Back to results' }));
    expect(await screen.findByTestId('route-location')).toHaveTextContent('/app/diagnostics?status=result_received');
  });

  it('does not navigate to an untrusted result URL supplied in a row', async () => {
    fetchDoctorResults.mockResolvedValue({
      items: [{
        investigation_id: '42',
        test_type: 'Unlinked result',
        destination: { href: 'https://example.invalid/result/42' },
      }],
      next_cursor: null,
    });
    render(<MemoryRouter><DoctorResultsScreen /></MemoryRouter>);
    const row = await screen.findByRole('button', { name: 'Result destination unavailable: Unlinked result' });
    expect(row).toBeDisabled();
  });

  it('keeps previously loaded result rows visible after a refresh failure and offers retry', async () => {
    fetchDoctorResults
      .mockResolvedValueOnce({ items: [{ public_id: 'result-1', investigation_id: '41', test_name: 'Full blood count', status: 'result_received', review_required: true, patient_name: 'Amina Yusuf', destination: { href: '/app/results/41', label: 'Review result' } }], next_cursor: null })
      .mockRejectedValueOnce(new Error('Temporary network issue'))
      .mockResolvedValueOnce({ items: [{ public_id: 'result-1', investigation_id: '41', test_name: 'Full blood count', status: 'result_received', review_required: true, patient_name: 'Amina Yusuf', destination: { href: '/app/results/41', label: 'Review result' } }], next_cursor: null });
    render(<MemoryRouter><DoctorResultsScreen /></MemoryRouter>);
    expect(await screen.findByText('Full blood count')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/previously loaded results are still shown/i);
    expect(screen.getByText('Full blood count')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(fetchDoctorResults).toHaveBeenCalledTimes(3));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByText('Full blood count')).toBeInTheDocument();
  });
});
