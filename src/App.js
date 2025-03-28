import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ReviewProvider } from './components/context'; // Assuming the context file is the same

// Import your components
import RegisterPage from './components/register';
import LoginPage from './components/login';
import ProviderPage from './components/provider';
import DashboardPage from './components/dash';
import DetailPage from './components/detail';
import ConsultAIPage from './components/consult';
import Organization from './components/organization';
import Account from './components/account';
import Voice from './components/voice';
import Call from './components/voi';
import DocDash from './components/doctordash';
import Document from './components/show'
import Talk from './components/talk';
import HealthDashboard from './components/health';
import Va from './components/virtual';
import './App.css'; // Import the global styles
import AvailabilitySelector from './components/available';
import SettingPage from './components/setting';
import SearchBox from './components/ask';
import PaymentForm from './components/payment';
import PatientMessages from './components/PatientMessages';
import ForgotPassword from './components/ForgotPassword'; // New import

const App = () => {
  return (
    
    <ReviewProvider>
      <div className="app-container">
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/provider" element={<ProviderPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/detail" element={<DetailPage />} />
          <Route path="/consult-ai" element={<ConsultAIPage />} />
          <Route path="/organization" element={<Organization />} />
          <Route path='/account' element={<Account />} />
          <Route path='/appointment' element={<Voice />} />
          <Route path='/doctor' element={<DocDash />} />
          <Route path='/call' element={<Call />} />
          <Route path='/show' element={<Document />} />
          <Route path='/talk' element= {<Talk />} />
          <Route path='/health' element={<HealthDashboard />} />
          <Route path='/virtual' element={<Va />} />
          <Route path='/available' element={<AvailabilitySelector />} />
          <Route path='/setting' element={<SettingPage />} />
          <Route path='/ask' element={<SearchBox />} />
          <Route path='/payment' element={<PaymentForm />} />
          <Route path="/patient-messages" element={<PatientMessages />} />
          <Route path="/forgot-password" element={<ForgotPassword />} /> {/* New route */}
        </Routes>
      </div>
    </ReviewProvider>
  
  );
};

export default App;
