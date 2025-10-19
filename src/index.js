import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { ThemeProvider } from '@mui/material/styles';
import { ChakraProvider } from '@chakra-ui/react';
import { chakraTheme } from './theme/chakraTheme';
import { muiTheme } from './theme/mui';
import 'react-multi-carousel/lib/styles.css';
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


