import React from 'react';
import { Route, Routes } from 'react-router-dom';
import { ReviewProvider } from './components/context'; // Assuming the context file is the same
import { ParallaxProvider } from 'react-scroll-parallax';

// Import your components
import RegisterPage from './components/register';
import LoginPage from './components/login';
import ProviderPage from './components/provider';
import DashboardPage from './components/dash';
import Dashboard from './components/dashboard'; // Assuming you want to use the Dashboard component here
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
import LandingPageNew from './components/LandingPageNew'; // Import the new landing page
import PatientUpdate from './components/patientUpdate'; // New import
import MyConsults from './components/MyConsults'; // Import the new component
import ConsultDetailPage from './components/consultDetail/ConsultDetailPage'; // Import our new consultation detail page
import SharedNotePage from './components/publicPage/SharedNotePage'; // Import the new SharedNotePage


const App = () => {
  return (
    <ParallaxProvider>
      <ReviewProvider>
        <div className="app-container">
          <Routes>
            <Route path="/" element={<LandingPageNew />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/provider" element={<ProviderPage />} />
            <Route path="/dashboard" element={<Dashboard />} />
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
            <Route path='/ask/:public_id' element={<SearchBox />} />
            <Route path='/public-research/:public_id' element={<SearchBox />} />
            <Route path='/payment' element={<PaymentForm />} />
            <Route path="/patient-messages" element={<PatientMessages />} />
            <Route path="/forgot-password" element={<ForgotPassword />} /> {/* New route */}
            <Route path="/patient-update" element={<PatientUpdate />} />            <Route path="/my-consults" element={<MyConsults />} /> {/* Add route for My Consults */}
            <Route path="/consult-details/:publicId" element={<ConsultDetailPage />} /> {/* Use our new ConsultDetailPage component */}
            <Route path="/shared-note/:publicId" element={<SharedNotePage />} /> {/* Add route for Shared Note Page */}
          </Routes>
        </div>
      </ReviewProvider>
    </ParallaxProvider>
  );
};

export default App;
