import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

// The real auth route loads through React.lazy. Allow its cold Vitest transform
// to finish on the release host; this is not a production timing assertion.

test('renders the doctor workspace entry point for logged-out visitors', async () => {
  localStorage.clear();
  render(
    <MemoryRouter initialEntries={['/login']}>
      <App />
    </MemoryRouter>
  );

  expect(await screen.findByText(/start with your WhatsApp number/i, {}, { timeout: 30000 })).toBeInTheDocument();
  expect(screen.getByText(/one WhatsApp verification every 7 days/i)).toBeInTheDocument();
}, 45000);

test('offers a public introduction and a working entry to registration', async () => {
  localStorage.clear();
  render(<MemoryRouter initialEntries={['/']}><App /></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: /More space for better care/i }, { timeout: 30000 })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: 'Get started' })).toHaveAttribute('href', '/register');
  expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute('href', '/login');
});
