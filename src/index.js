import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from '@mui/material/styles';
import { ChakraProvider } from '@chakra-ui/react';
import { chakraTheme } from './theme/chakraTheme';
import { muiTheme } from './theme/mui';
import './carousel-fix.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
    <ChakraProvider theme={chakraTheme}>
      <ThemeProvider theme={muiTheme}>
        <React.StrictMode>
          <App />
        </React.StrictMode>
      </ThemeProvider>
    </ChakraProvider>
  </BrowserRouter>
);

// Register the minimal service worker (production only). It caches built
// static assets exclusively - API/clinical traffic is never cached.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`)
      .catch((error) => {
        console.warn('Service worker registration skipped:', error);
      });
  });
}


