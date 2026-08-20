import React from 'react';
import { render, screen } from '@testing-library/react';

jest.mock('./api', () => ({
  tryRestoreSession: jest.fn().mockResolvedValue(true),
  isAuthenticated: jest.fn(() => true),
}));

jest.mock('react-router-dom', () => ({
  Routes: ({ children }) => <>{children}</>,
  Route: ({ element }) => element,
  Navigate: () => null,
}));

jest.mock('@react-oauth/google', () => ({
  GoogleOAuthProvider: ({ children }) => <>{children}</>,
}));

jest.mock('./contexts/ProcessingStatusContext', () => ({
  ProcessingStatusProvider: ({ children }) => <>{children}</>,
}));

jest.mock('./components/DoctorAuth', () => () => <div>Doctor authentication</div>);
jest.mock('./components/CompleteProfile', () => () => <div>Complete profile</div>);
jest.mock('./components/ForgotPassword', () => () => <div>Forgot password</div>);
jest.mock('./components/dashboard', () => () => <div>Legacy dashboard</div>);
jest.mock('./components/ProviderDashboard', () => () => <div>Provider dashboard</div>);
jest.mock('./components/ProviderDashboardDocs', () => () => <div>Provider docs</div>);
jest.mock('./components/createEncounter', () => () => <div>Create encounter</div>);
jest.mock('./components/record', () => () => <div>Record encounter</div>);
jest.mock('./components/ReviewsList', () => () => <div>Reviews list</div>);
jest.mock('./components/ReviewDetail', () => () => <div>Review detail</div>);
jest.mock('./components/ReviewsHome', () => () => <div>Reviews home</div>);
jest.mock('./components/DoctorLayout', () => ({ children }) => <>{children}</>);
jest.mock('./components/AdminDashboard', () => () => <div>Admin dashboard</div>);
jest.mock('./components/DoctorMessaging', () => () => <div>Doctor messaging</div>);
jest.mock('./components/PatientDetailsPage', () => () => <div>Patient details</div>);
jest.mock('./components/InvestigationsMain', () => () => <div>Investigations</div>);
jest.mock('./components/InvestigationDetailPage', () => () => <div>Investigation detail</div>);
jest.mock('./components/PatientMediaGallery', () => () => <div>Patient media</div>);
jest.mock('./components/DoctorClinicalServices', () => () => <div>Clinical service queue</div>);
jest.mock('./components/DoctorClinicalServiceDetail', () => () => <div>Clinical service detail</div>);
jest.mock('./components/CareCoordinatorQueue', () => () => <div>Care coordinator queue</div>);
jest.mock('./voice', () => () => <div>Voice</div>);

import App from './App';

test('restores the session and mounts the doctor clinical and care-coordinator routes', async () => {
  render(<App />);

  expect(await screen.findByText('Clinical service queue')).toBeInTheDocument();
  expect(screen.getByText('Clinical service detail')).toBeInTheDocument();
  expect(screen.getAllByText('Care coordinator queue')).toHaveLength(3);
});
