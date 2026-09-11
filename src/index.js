import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import './pwa/pwa.css';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from '@mui/material/styles';
import { muiTheme } from './theme/mui';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
      <ThemeProvider theme={muiTheme}>
        <React.StrictMode>
          <App />
        </React.StrictMode>
      </ThemeProvider>
  </BrowserRouter>
);


