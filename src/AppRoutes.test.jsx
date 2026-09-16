import React from 'react';
import { vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';
import { isAuthenticated } from './api';
vi.mock('./api', () => ({ isAuthenticated: vi.fn(), tryRestoreSession: vi.fn().mockResolvedValue(true) }));
vi.mock('./pwa/PwaStatus', () => ({ default: () => null }));
vi.mock('./vnext/DoctorVNextApp', async () => {
  const { useLocation } = await import('react-router-dom');
  return { default: () => {
    const location = useLocation();
    return <p>Care workspace: {location.pathname}{location.search}{location.hash}</p>;
  } };
});
vi.mock('./components/DoctorAuth', async () => {
  const { useLocation } = await import('react-router-dom');
  return { default: () => <p>{new URLSearchParams(useLocation().search).get('next')}</p> };
});
vi.mock('./pwa/LegacyWorkspace', async () => {
  const { useParams } = await import('react-router-dom');
  return { default: () => <p>Medical review {useParams().publicId}</p> };
});
test('legacy review IDs resolve to the canonical Care Kernel case workspace', async () => {
  isAuthenticated.mockReturnValue(true);
  render(<MemoryRouter initialEntries={['/reviews/medical-review-1']}><App /></MemoryRouter>);
  expect(await screen.findByText(/Care workspace:/)).toBeInTheDocument();
});
test.each([
  ['/app/patients?search=amina#active', 'Care workspace: /app/patients?search=amina#active'],
  ['/app/diagnostics?status=result_received#review', 'Care workspace: /app/diagnostics?status=result_received#review'],
])('opens the scoped collection and preserves %s', async (path, expectedDestination) => {
  isAuthenticated.mockReturnValue(true);
  render(<MemoryRouter initialEntries={[path]}><App /></MemoryRouter>);
  expect(await screen.findByText(expectedDestination)).toBeInTheDocument();
});

test('opaque notification links survive authentication without exposing the destination', async () => {
  isAuthenticated.mockReturnValue(false);
  render(<MemoryRouter initialEntries={['/app/notifications/opaque-id']}><App /></MemoryRouter>);
  expect(await screen.findByText('/app/notifications/opaque-id')).toBeInTheDocument();
});
