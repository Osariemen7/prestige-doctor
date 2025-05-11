import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { Experimental_CssVarsProvider as CssVarsProvider } from '@mui/material/styles';
import { muiTheme } from './theme/mui';
import 'react-multi-carousel/lib/styles.css';
import './carousel-fix.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <BrowserRouter>
      <CssVarsProvider theme={muiTheme}>
        <React.StrictMode>
          <App />
        </React.StrictMode>
      </CssVarsProvider>
  </BrowserRouter>
);


