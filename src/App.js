import React, { useEffect, useState } from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { ErrorBoundary } from 'react-error-boundary';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ProcessingStatusProvider } from './contexts/ProcessingStatusContext';
import { tryRestoreSession, isAuthenticated } from './api';

// Import your components
import DoctorAuth from './components/DoctorAuth';
import CompleteProfile from './components/CompleteProfile';
import ForgotPassword from './components/ForgotPassword';
import Dashboard from './components/dashboard';
import ProviderDashboard from './components/ProviderDashboard';
import ProviderDashboardDocs from './components/ProviderDashboardDocs';
import CreateEncounter from './components/createEncounter';
import Record from './components/record';
import ReviewsList from './components/ReviewsList';
import ReviewDetail from './components/ReviewDetail';
import ReviewsHome from './components/ReviewsHome';
import DoctorLayout from './components/DoctorLayout';
import AdminDashboard from './components/AdminDashboard';
import DoctorMessaging from './components/DoctorMessaging';
import PatientDetailsPage from './components/PatientDetailsPage';
import InvestigationsMain from './components/InvestigationsMain';
import InvestigationDetailPage from './components/InvestigationDetailPage';
import PatientMediaGallery from './components/PatientMediaGallery';
import DoctorClinicalServices from './components/DoctorClinicalServices';
import DoctorClinicalServiceDetail from './components/DoctorClinicalServiceDetail';
import CareCoordinatorQueue from './components/CareCoordinatorQueue';
import ProtectedRoute from './components/ProtectedRoute';
import SplashScreen from './components/SplashScreen';
import ErrorFallback from './components/ErrorFallback';
import Voice from './voice';

const protectedLayout = (Component, props = {}) => (
  <ProtectedRoute>
    <DoctorLayout>
      <Component {...props} />
    </DoctorLayout>
  </ProtectedRoute>
);

const App = () => {
  const [sessionReady, setSessionReady] = useState(false);

  // On launch, try to restore a valid session from the persisted refresh token
  useEffect(() => {
    const restore = async () => {
      await tryRestoreSession();
      setSessionReady(true);
    };
    restore();
  }, []);

  if (!sessionReady) {
    // Branded splash while the refresh token is validated
    return <SplashScreen />;
  }

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <ProcessingStatusProvider>
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => window.location.reload()}
        >
          <div className="app-container">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<DoctorAuth />} />
              <Route path="/register" element={<DoctorAuth />} />
              <Route path="/register/:referral_code" element={<DoctorAuth />} />
              <Route path="/doctor-register" element={<DoctorAuth />} />
              <Route path="/doctor-login" element={<DoctorAuth />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/complete-profile" element={<CompleteProfile />} />

              {/* Protected Routes with Sidebar Layout */}
              <Route path="/reviews" element={protectedLayout(ReviewsHome)} />
              <Route path="/reviews/:publicId" element={protectedLayout(ReviewsHome)} />
              <Route path="/review/:publicId" element={protectedLayout(ReviewDetail)} />
              <Route path="/provider-dashboard" element={protectedLayout(ProviderDashboard)} />
              <Route path="/patient/:patientId" element={protectedLayout(PatientDetailsPage)} />
              <Route path="/patient/:patientId/media" element={protectedLayout(PatientMediaGallery)} />
              <Route path="/admin-dashboard" element={protectedLayout(AdminDashboard)} />
              <Route path="/messages" element={protectedLayout(DoctorMessaging)} />
              <Route path="/messages/:patientId" element={protectedLayout(DoctorMessaging)} />

              {/* Investigation Management Routes */}
              <Route path="/investigations" element={protectedLayout(InvestigationsMain)} />
              <Route path="/investigations/:type/:id" element={protectedLayout(InvestigationDetailPage)} />

              {/* Server-authoritative clinician-service routes */}
              <Route path="/clinical-services" element={protectedLayout(DoctorClinicalServices)} />
              <Route path="/clinical-services/:orderId" element={protectedLayout(DoctorClinicalServiceDetail)} />
              <Route path="/care-coordinator" element={protectedLayout(CareCoordinatorQueue)} />
              <Route path="/care-coordinator/:conversationId" element={protectedLayout(CareCoordinatorQueue)} />
              <Route path="/demo/doctor" element={protectedLayout(CareCoordinatorQueue, { demoMode: true })} />
              <Route path="/voice" element={<ProtectedRoute><Voice /></ProtectedRoute>} />

              {/* Legacy Routes */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/provider-dashboard-docs" element={<ProviderDashboardDocs />} />
              <Route path="/create-encounter" element={<CreateEncounter />} />
              <Route path="/record/:publicId" element={<Record />} />

              {/* Default Route - Redirect to Reviews (Homepage) */}
              <Route
                path="/"
                element={
                  isAuthenticated()
                    ? <Navigate to="/reviews" replace />
                    : <Navigate to="/login" replace />
                }
              />
            </Routes>
          </div>
        </ErrorBoundary>
      </ProcessingStatusProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
