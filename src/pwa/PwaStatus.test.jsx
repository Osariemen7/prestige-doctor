import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import PwaStatus from './PwaStatus';
import { resetDoctorUpdateGuards, setDoctorFormDirty } from './updateGuard';
vi.mock('./register', () => ({ registerDoctorWorker: vi.fn() }));
beforeEach(() => { resetDoctorUpdateGuards(); vi.clearAllMocks(); });
test('does not activate a waiting worker when a clinical form becomes dirty before click', () => {
  const waiting = { postMessage: vi.fn() };
  render(<PwaStatus />);
  window.dispatchEvent(new CustomEvent('doctor-update-available', { detail: { waiting } }));
  const release = setDoctorFormDirty(true);
  expect(screen.queryByRole('button', { name: /update when ready/i })).not.toBeInTheDocument();
  expect(waiting.postMessage).not.toHaveBeenCalled();
  release();
});