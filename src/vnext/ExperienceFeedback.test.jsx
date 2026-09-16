import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import ExperienceFeedback, { doctorFeedbackRoute } from './ExperienceFeedback';
import { forgetCommandKey, getCommandKey, submitExperienceFeedback } from './api';
import { isDoctorUpdateGuarded, resetDoctorUpdateGuards } from '../pwa/updateGuard';

vi.mock('./api', () => ({
  apiDiagnostics: { clientVersion: 'doctor-build-123' },
  getCommandKey: vi.fn(() => 'stable-feedback-key'),
  forgetCommandKey: vi.fn(),
  submitExperienceFeedback: vi.fn(),
}));

const renderFeedback = (path = '/app/cases/proposal-secret-7/documentation?tab=notes') => render(
  <MemoryRouter initialEntries={[path]}>
    <ExperienceFeedback />
  </MemoryRouter>,
);

describe('doctor experience feedback', () => {
  beforeEach(() => { resetDoctorUpdateGuards(); vi.clearAllMocks(); });

  it('uses allowlisted categories and submits only a safe route template after success', async () => {
    let resolveSubmit;
    submitExperienceFeedback.mockImplementation(() => new Promise((resolve) => { resolveSubmit = resolve; }));
    renderFeedback();

    fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
    fireEvent.change(screen.getByLabelText('What happened?'), { target: { value: 'missing_action' } });
    fireEvent.change(screen.getByLabelText(/Describe the problem/), { target: { value: 'The next case action is missing.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));

    await waitFor(() => expect(submitExperienceFeedback).toHaveBeenCalledTimes(1));
    const submission = submitExperienceFeedback.mock.calls[0][0];
    expect(submission).toMatchObject({
      commandKey: 'stable-feedback-key',
      payload: {
        app: 'doctor',
        category: 'missing_action',
        description: 'The next case action is missing.',
        route: '/app/cases/:proposalId/documentation',
        app_version: 'doctor-build-123',
      },
    });
    expect(submission.payload).not.toHaveProperty('user_id');
    expect(submission.payload).not.toHaveProperty('role');
    expect(screen.queryByText('Your report was received.')).not.toBeInTheDocument();

    resolveSubmit({ receipt: 'feedback-receipt-opaque-1' });
    expect(await screen.findByText('Your report was received.')).toBeInTheDocument();
    expect(screen.getByText('feedback-receipt-opaque-1')).toBeInTheDocument();
    expect(forgetCommandKey).toHaveBeenCalledTimes(1);
  });

  it('keeps the same draft and idempotency key for an exact retry after an uncertain failure', async () => {
    submitExperienceFeedback
      .mockRejectedValueOnce(new Error('network timeout'))
      .mockResolvedValueOnce({ receipt: 'feedback-receipt-opaque-2' });
    renderFeedback('/app/results/result-secret-9');

    fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
    fireEvent.change(screen.getByLabelText('What happened?'), { target: { value: 'slow_or_failed' } });
    fireEvent.change(screen.getByLabelText(/Describe the problem/), { target: { value: 'The result review screen did not load.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Your text stays in this form');
    expect(screen.getByLabelText(/Describe the problem/)).toHaveValue('The result review screen did not load.');
    expect(screen.getByLabelText(/Describe the problem/)).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Close for now' }));
    fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Retry same report' }));

    expect(await screen.findByText('feedback-receipt-opaque-2')).toBeInTheDocument();
    expect(submitExperienceFeedback).toHaveBeenCalledTimes(2);
    expect(submitExperienceFeedback.mock.calls[1][0]).toEqual(submitExperienceFeedback.mock.calls[0][0]);
    expect(getCommandKey).toHaveBeenCalledTimes(1);
  });

  it('holds the update guard for an unsent report until receipt confirmation or reset', async () => {
    let resolveSubmit;
    submitExperienceFeedback.mockImplementation(() => new Promise((resolve) => { resolveSubmit = resolve; }));
    renderFeedback();

    expect(isDoctorUpdateGuarded()).toBe(false);
    fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
    fireEvent.change(screen.getByLabelText('What happened?'), { target: { value: 'blocked' } });
    expect(isDoctorUpdateGuarded()).toBe(true);
    fireEvent.change(screen.getByLabelText(/Describe the problem/), { target: { value: 'I could not open the patient case.' } });
    fireEvent.click(screen.getByRole('button', { name: 'Close for now' }));
    expect(isDoctorUpdateGuarded()).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Report a problem' }));
    fireEvent.click(screen.getByRole('button', { name: 'Send report' }));
    await waitFor(() => expect(submitExperienceFeedback).toHaveBeenCalledTimes(1));
    expect(isDoctorUpdateGuarded()).toBe(true);
    resolveSubmit({ receipt: 'feedback-receipt-guard-test' });
    expect(await screen.findByText('feedback-receipt-guard-test')).toBeInTheDocument();
    expect(isDoctorUpdateGuarded()).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: 'Report another problem' }));
    expect(isDoctorUpdateGuarded()).toBe(false);
  });

  it('does not expose record identifiers in route diagnostics', () => {
    expect(doctorFeedbackRoute('/app/patients/patient-raw-id-77?tab=summary')).toBe('/app/patients/:patientId');
    expect(doctorFeedbackRoute('/app/private/path/with-identifiers')).toBe('/app/other');
  });
});
