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
import './App.css'; // Import the global styles

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
        </Routes>
      </div>
    </ReviewProvider>
  );
};

export default App;
