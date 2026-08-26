import React from 'react';
import { render, screen } from '@testing-library/react';

vi.mock('./api', () => ({
  tryRestoreSession: vi.fn().mockResolvedValue(true),
  isAuthenticated: vi.fn(() => true),
}));

vi.mock('react-router-dom', () => ({
  Routes: ({ children }) => <>{children}</>,
  Route: ({ element }) => element,
  Navigate: () => null,
  useLocation: () => ({ pathname: '/reviews', search: '' }),
}));

vi.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }) => <>{children}</>,
}));

vi.mock('./contexts/ProcessingStatusContext', () => ({
  ProcessingStatusProvider: ({ children }) => <>{children}</>,
}));

vi.mock('./components/DoctorAuth', () => ({ default: () => <div>Doctor authentication</div> }));
vi.mock('./components/CompleteProfile', () => ({ default: () => <div>Complete profile</div> }));
vi.mock('./components/ForgotPassword', () => ({ default: () => <div>Forgot password</div> }));
vi.mock('./components/TermsPage', () => ({ default: () => <div>Terms</div> }));
vi.mock('./components/PrivacyPage', () => ({ default: () => <div>Privacy</div> }));
vi.mock('./components/dashboard', () => ({ default: () => <div>Legacy dashboard</div> }));
vi.mock('./components/ProviderDashboard', () => ({ default: () => <div>Provider dashboard</div> }));
vi.mock('./components/ProviderDashboardDocs', () => ({ default: () => <div>Provider docs</div> }));
vi.mock('./components/createEncounter', () => ({ default: () => <div>Create encounter</div> }));
vi.mock('./components/record', () => ({ default: () => <div>Record encounter</div> }));
vi.mock('./components/ReviewsList', () => ({ default: () => <div>Reviews list</div> }));
vi.mock('./components/ReviewDetail', () => ({ default: () => <div>Review detail</div> }));
vi.mock('./components/ReviewsHome', () => ({ default: () => <div>Reviews home</div> }));
vi.mock('./components/DoctorLayout', () => ({ default: ({ children }) => <>{children}</> }));
vi.mock('./components/AdminDashboard', () => ({ default: () => <div>Admin dashboard</div> }));
vi.mock('./components/DoctorMessaging', () => ({ default: () => <div>Doctor messaging</div> }));
vi.mock('./components/PatientDetailsPage', () => ({ default: () => <div>Patient details</div> }));
vi.mock('./components/InvestigationsMain', () => ({ default: () => <div>Investigations</div> }));
vi.mock('./components/InvestigationDetailPage', () => ({ default: () => <div>Investigation detail</div> }));
vi.mock('./components/PatientMediaGallery', () => ({ default: () => <div>Patient media</div> }));
vi.mock('./components/DoctorClinicalServices', () => ({ default: () => <div>Clinical service queue</div> }));
vi.mock('./components/DoctorClinicalServiceDetail', () => ({ default: () => <div>Clinical service detail</div> }));
vi.mock('./components/CareCoordinatorQueue', () => ({ default: () => <div>Care coordinator queue</div> }));
vi.mock('./voice', () => ({ default: () => <div>Voice</div> }));

// Note: module factories re-declare mock implementations inside the test
// body below because test runners may reset mocks between tests.
import { tryRestoreSession, isAuthenticated } from './api';

import App from './App';
import { vi } from 'vitest';

test('restores the session and mounts the doctor clinical and care-coordinator routes', async () => {
  tryRestoreSession.mockResolvedValue(true);
  isAuthenticated.mockReturnValue(true);

  render(<App />);

  expect(await screen.findByText('Clinical service queue')).toBeInTheDocument();
  expect(screen.getByText('Clinical service detail')).toBeInTheDocument();
  expect(screen.getAllByText('Care coordinator queue')).toHaveLength(3);
});