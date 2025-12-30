import React from 'react';
import { Route, Routes, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { ProcessingStatusProvider } from './contexts/ProcessingStatusContext';

// Import your components
import RegisterPage from './components/DoctorRegister';
import LoginPage from './components/DoctorLogin';
import DoctorRegister from './components/DoctorRegister';
import DoctorLogin from './components/DoctorLogin';
import ForgotPassword from './components/ForgotPassword';
import GoogleAuthButton from './components/GoogleAuthButton';
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

const App = () => {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <ProcessingStatusProvider>
        <div className="app-container">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register/:referral_code?" element={<RegisterPage />} />
            <Route path="/doctor-register" element={<DoctorRegister />} />
            <Route path="/doctor-login" element={<DoctorLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            
            {/* Protected Routes with Sidebar Layout */}
            <Route path="/reviews" element={<DoctorLayout><ReviewsHome /></DoctorLayout>} />
            <Route path="/reviews/:publicId" element={<DoctorLayout><ReviewsHome /></DoctorLayout>} />
            <Route path="/review/:publicId" element={<DoctorLayout><ReviewDetail /></DoctorLayout>} />
            <Route path="/provider-dashboard" element={<DoctorLayout><ProviderDashboard /></DoctorLayout>} />
            <Route path="/patient/:patientId" element={<DoctorLayout><PatientDetailsPage /></DoctorLayout>} />
            <Route path="/patient/:patientId/media" element={<DoctorLayout><PatientMediaGallery /></DoctorLayout>} />
            <Route path="/admin-dashboard" element={<DoctorLayout><AdminDashboard /></DoctorLayout>} />
            <Route path="/messages" element={<DoctorLayout><DoctorMessaging /></DoctorLayout>} />
            <Route path="/messages/:patientId" element={<DoctorLayout><DoctorMessaging /></DoctorLayout>} />
            
            {/* Investigation Management Routes */}
            <Route path="/investigations" element={<DoctorLayout><InvestigationsMain /></DoctorLayout>} />
            <Route path="/investigations/:type/:id" element={<DoctorLayout><InvestigationDetailPage /></DoctorLayout>} />
            
            {/* Legacy Routes */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/provider-dashboard-docs" element={<ProviderDashboardDocs />} />
            <Route path="/create-encounter" element={<CreateEncounter />} />
            <Route path="/record/:publicId" element={<Record />} />
            
            {/* Default Route - Redirect to Reviews (Homepage) */}
            <Route path="/" element={<Navigate to="/reviews" replace />} />
          </Routes>
        </div>
      </ProcessingStatusProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
