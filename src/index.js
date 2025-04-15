import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import 'react-multi-carousel/lib/styles.css';
import './carousel-fix.css'; // Add this import after the original styles



const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
      <React.StrictMode>
        <App />
    </React.StrictMode>
  </BrowserRouter>
  
);


