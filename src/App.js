import React, { useEffect, useState } from 'react';
import { Route, Routes, Navigate, useParams } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ProcessingStatusProvider } from './contexts/ProcessingStatusContext';
import { tryRestoreSession, isAuthenticated } from './api';

// Import your components
import DoctorAuth from './components/DoctorAuth';
import CompleteProfile from './components/CompleteProfile';
import ForgotPassword from './components/ForgotPassword';
import DoctorVNextApp from './vnext/DoctorVNextApp';

const LegacyCaseRedirect = () => {
  const { publicId } = useParams();
  return <Navigate to={`/app/cases/${encodeURIComponent(publicId || '')}`} replace />;
};

const LegacyPatientRedirect = () => {
  const { patientId } = useParams();
  return <Navigate to={`/app/patients/${encodeURIComponent(patientId || '')}`} replace />;
};

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
    // Optionally render a splash / spinner while checking the refresh token
    return null;
  }

  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <ProcessingStatusProvider>
        <div className="app-container">
          <Routes>
            {/* Care Kernel vNext doctor workspace. This is the new post-login surface. */}
            <Route path="/app/*" element={<DoctorVNextApp />} />
            <Route path="/demo/doctor" element={<DoctorVNextApp demo />} />

            {/* Public Routes */}
            <Route path="/login" element={<DoctorAuth />} />
            <Route path="/register" element={<DoctorAuth />} />
            <Route path="/register/:referral_code" element={<DoctorAuth />} />
            <Route path="/doctor-register" element={<DoctorAuth />} />
            <Route path="/doctor-login" element={<DoctorAuth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/complete-profile" element={<CompleteProfile />} />
            
            {/* Protected Routes with Sidebar Layout */}
            {/* Legacy review URLs remain stable redirects; they cannot write the old workflow. */}
            <Route path="/reviews" element={<Navigate to="/app/queue" replace />} />
            <Route path="/reviews/:publicId" element={<LegacyCaseRedirect />} />
            <Route path="/review/:publicId" element={<LegacyCaseRedirect />} />
            <Route path="/provider-dashboard" element={<Navigate to="/app/queue" replace />} />
            <Route path="/patient/:patientId" element={<LegacyPatientRedirect />} />
            <Route path="/patient/:patientId/media" element={<LegacyPatientRedirect />} />
            <Route path="/admin-dashboard" element={<Navigate to="/app/contribution" replace />} />
            <Route path="/messages" element={<Navigate to="/app/messages" replace />} />
            <Route path="/messages/:patientId" element={<Navigate to="/app/messages" replace />} />
            
            {/* Investigation Management Routes */}
            <Route path="/investigations" element={<Navigate to="/app/queue" replace />} />
            <Route path="/investigations/:type/:id" element={<Navigate to="/app/queue" replace />} />
            
            {/* Legacy Routes */}
            <Route path="/dashboard" element={<Navigate to="/app/queue" replace />} />
            <Route path="/provider-dashboard-docs" element={<Navigate to="/app/queue" replace />} />
            <Route path="/create-encounter" element={<Navigate to="/app/queue" replace />} />
            <Route path="/record/:publicId" element={<LegacyCaseRedirect />} />
            
            {/* Default Route - Redirect to Reviews (Homepage) */}
            <Route path="/" element={<Navigate to="/app/queue" replace />} />
          </Routes>
        </div>
      </ProcessingStatusProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
