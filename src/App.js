import React, { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { Box, CircularProgress, Typography } from '@mui/material';
import { ErrorBoundary } from 'react-error-boundary';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ProcessingStatusProvider } from './contexts/ProcessingStatusContext';
import { isAuthenticated, tryRestoreSession } from './api';
import DoctorAuth from './components/DoctorAuth';
import DoctorHome from './components/DoctorHome';
import DoctorPractice from './components/DoctorPractice';
import DoctorLayout from './components/DoctorLayout';
import ReviewsHome from './components/ReviewsHome';
import CareCoordinatorQueue from './components/CareCoordinatorQueue';
import PatientDetailsPage from './components/PatientDetailsPage';
import TermsPage from './components/TermsPage';
import PrivacyPage from './components/PrivacyPage';
import Voice from './voice';
import ErrorFallback from './components/ErrorFallback';

const withLayout = (element) => <DoctorLayout>{element}</DoctorLayout>;

const ProtectedRoute = ({ children }) => (
  isAuthenticated() ? children : <Navigate to="/login" replace />
);

const PublicOnlyRoute = ({ children }) => (
  isAuthenticated() ? <Navigate to="/" replace /> : children
);

const DoctorLoading = () => (
  <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', gap: 1, bgcolor: '#f6f8f7', color: '#5d7186' }}>
    <Box sx={{ display: 'grid', justifyItems: 'center', gap: 1.5 }}>
      <CircularProgress size={28} sx={{ color: '#17324d' }} />
      <Typography sx={{ fontSize: '0.85rem' }}>Preparing your workspace…</Typography>
    </Box>
  </Box>
);

export default function App() {
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    let active = true;
    void tryRestoreSession()
      .catch(() => false)
      .finally(() => {
        if (active) setSessionReady(true);
      });
    return () => { active = false; };
  }, []);

  if (!sessionReady) return <DoctorLoading />;

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <ProcessingStatusProvider>
        <ErrorBoundary
          FallbackComponent={ErrorFallback}
          onReset={() => window.location.reload()}
        >
          <Routes>
            <Route path="/login" element={<PublicOnlyRoute><DoctorAuth /></PublicOnlyRoute>} />
            <Route path="/register" element={<PublicOnlyRoute><DoctorAuth /></PublicOnlyRoute>} />
            <Route path="/register/:referralCode" element={<PublicOnlyRoute><DoctorAuth /></PublicOnlyRoute>} />
            <Route path="/doctor-register" element={<PublicOnlyRoute><DoctorAuth /></PublicOnlyRoute>} />
            <Route path="/doctor-login" element={<PublicOnlyRoute><DoctorAuth /></PublicOnlyRoute>} />
            <Route path="/forgot-password" element={<Navigate to="/login" replace />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />

            <Route path="/" element={<ProtectedRoute>{withLayout(<DoctorHome />)}</ProtectedRoute>} />
            <Route path="/work" element={<ProtectedRoute>{withLayout(<ReviewsHome />)}</ProtectedRoute>} />
            <Route path="/patients" element={<ProtectedRoute>{withLayout(<DoctorPractice />)}</ProtectedRoute>} />
            <Route path="/care" element={<ProtectedRoute>{withLayout(<CareCoordinatorQueue />)}</ProtectedRoute>} />
            <Route path="/care/:conversationId" element={<ProtectedRoute>{withLayout(<CareCoordinatorQueue />)}</ProtectedRoute>} />
            <Route path="/patient/:patientId" element={<ProtectedRoute>{withLayout(<PatientDetailsPage />)}</ProtectedRoute>} />
            <Route path="/patient/:patientId/media" element={<ProtectedRoute>{withLayout(<PatientDetailsPage />)}</ProtectedRoute>} />

            {/* Compatibility aliases keep existing links useful while the old surface is retired. */}
            <Route path="/reviews" element={<Navigate to="/work" replace />} />
            <Route path="/reviews/:publicId" element={<ProtectedRoute>{withLayout(<ReviewsHome />)}</ProtectedRoute>} />
            <Route path="/provider-dashboard" element={<Navigate to="/patients" replace />} />
            <Route path="/care-coordinator" element={<Navigate to="/care" replace />} />
            <Route path="/care-coordinator/:conversationId" element={<ProtectedRoute>{withLayout(<CareCoordinatorQueue />)}</ProtectedRoute>} />
            <Route path="/complete-profile" element={<Navigate to="/" replace />} />
            <Route path="/dashboard" element={<Navigate to="/" replace />} />
            <Route path="/provider-dashboard-docs" element={<Navigate to="/" replace />} />
            <Route path="/create-encounter" element={<Navigate to="/work" replace />} />
            <Route path="/record/:publicId" element={<Navigate to="/work" replace />} />
            <Route path="/messages/*" element={<Navigate to="/care" replace />} />
            <Route path="/investigations/*" element={<Navigate to="/work" replace />} />
            <Route path="/clinical-services/*" element={<Navigate to="/work" replace />} />
            <Route path="/admin-dashboard" element={<Navigate to="/" replace />} />

            {/* Secure voice visits (fail-closed until backend issues RTC tokens). */}
            <Route path="/voice" element={<ProtectedRoute><Voice /></ProtectedRoute>} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ErrorBoundary>
      </ProcessingStatusProvider>
    </GoogleOAuthProvider>
  );
}
