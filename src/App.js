import React from 'react';
import { Route, Routes } from 'react-router-dom';
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
import CreateEncounter from './components/createEncounter';
import Record from './components/record';
import Process from './components/process';
import ReviewsList from './components/ReviewsList';
import ReviewDetail from './components/ReviewDetail';

const App = () => {
  return (
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
      <ProcessingStatusProvider>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<ReviewsList />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/doctor-register" element={<DoctorRegister />} />
            <Route path="/doctor-login" element={<DoctorLogin />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/create-encounter" element={<CreateEncounter />} />
            <Route path="/record/:publicId" element={<Record />} />
            <Route path="/process/:publicId" element={<Process />} />
            <Route path="/reviews" element={<ReviewsList />} />
            <Route path="/review/:publicId" element={<ReviewDetail />} />
          </Routes>
        </div>
      </ProcessingStatusProvider>
    </GoogleOAuthProvider>
  );
};

export default App;
