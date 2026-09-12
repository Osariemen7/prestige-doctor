import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// The first App render loads the full MUI-auth route graph through React.lazy;
// allow the cold Jest transform to complete on the constrained release host.
jest.setTimeout(30000);

test('renders the doctor workspace entry point for logged-out visitors', async () => {
  localStorage.clear();
  render(
    <MemoryRouter initialEntries={['/login']}>
      <App />
    </MemoryRouter>
  );

  expect(await screen.findByText(/start with your WhatsApp number/i)).toBeInTheDocument();
  expect(screen.getByText(/one WhatsApp verification every 7 days/i)).toBeInTheDocument();
});
