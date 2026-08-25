import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

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
