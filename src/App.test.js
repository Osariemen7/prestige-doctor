import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('./api', () => ({
  tryRestoreSession: vi.fn().mockResolvedValue(true),
  isAuthenticated: vi.fn(() => false),
}));

vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }) => <>{children}</>,
}));

vi.mock('./contexts/ProcessingStatusContext', () => ({
  ProcessingStatusProvider: ({ children }) => <>{children}</>,
}));

vi.mock('./components/DoctorHome', () => ({ default: () => <div>Doctor home</div> }));
vi.mock('./components/DoctorPractice', () => ({ default: () => <div>Doctor practice</div> }));
vi.mock('./components/ReviewsHome', () => ({ default: () => <div>Reviews home</div> }));
vi.mock('./components/CareCoordinatorQueue', () => ({ default: () => <div>Care coordinator queue</div> }));
vi.mock('./components/PatientDetailsPage', () => ({ default: () => <div>Patient details</div> }));
vi.mock('./components/TermsPage', () => ({ default: () => <div>Terms</div> }));
vi.mock('./components/PrivacyPage', () => ({ default: () => <div>Privacy</div> }));
vi.mock('./voice', () => ({ default: () => <div>Voice</div> }));
vi.mock('./components/ErrorFallback', () => ({
  default: ({ error }) => <div>Something went wrong: {String(error?.message ?? '')}</div>,
}));
vi.mock('./components/DoctorLayout', () => ({ default: ({ children }) => <>{children}</> }));

// Module factories re-declare implementations in each test because vitest may
// reset mock state between tests.
import { tryRestoreSession, isAuthenticated } from './api';
import App from './App';

const renderApp = (initialPath) =>
  render(
    <MemoryRouter initialEntries={[initialPath]}>
      <App />
    </MemoryRouter>
  );

test('renders the doctor workspace entry point for logged-out visitors', async () => {
  localStorage.clear();
  tryRestoreSession.mockResolvedValue(false);
  isAuthenticated.mockReturnValue(false);

  renderApp('/login');

  expect(await screen.findByText(/start with your WhatsApp number/i)).toBeInTheDocument();
  expect(screen.getByText(/one WhatsApp verification every 7 days/i)).toBeInTheDocument();
});

test('restores the session and mounts the redesigned workspace routes for authenticated doctors', async () => {
  tryRestoreSession.mockResolvedValue(true);
  isAuthenticated.mockReturnValue(true);

  renderApp('/work');

  expect(await screen.findByText('Reviews home')).toBeInTheDocument();

  // Authenticated doctors hitting /login are bounced into the workspace.
  renderApp('/login');
  expect(await screen.findByText('Doctor home')).toBeInTheDocument();
  expect(screen.queryByText(/start with your WhatsApp number/i)).not.toBeInTheDocument();
});

test('redirects logged-out visitors from guarded workspace routes into auth', async () => {
  tryRestoreSession.mockResolvedValue(false);
  isAuthenticated.mockReturnValue(false);

  renderApp('/work');

  expect(await screen.findByText(/start with your WhatsApp number/i)).toBeInTheDocument();
  expect(screen.queryByText('Reviews home')).not.toBeInTheDocument();
});
