import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { vi } from 'vitest';
import DoctorAuth from './DoctorAuth';
import { storeAuthData } from '../api';

vi.mock('../api', () => ({ isAuthenticated: () => false, storeAuthData: vi.fn() }));
vi.mock('../pwa/InstallButton', () => ({ default: () => <button>Install app</button> }));
function Destination() { const location = useLocation(); return <p>{location.pathname}{location.search}{location.hash}</p>; }
const setup = () => render(<MemoryRouter initialEntries={['/login?next=%2Fapp%2Fcases%2Fcase-1%3Fsection%3Dplan%23review']}><Routes><Route path="/login" element={<DoctorAuth />} /><Route path="/app/*" element={<Destination />} /></Routes></MemoryRouter>);
const response = (data, ok = true) => Promise.resolve({ ok, json: () => Promise.resolve(data) });
afterEach(() => { vi.unstubAllGlobals(); vi.clearAllMocks(); });

test('verifies WhatsApp and returns an existing doctor to the exact linked clinical page', async () => {
  const fetchMock = vi.fn().mockImplementationOnce(() => response({ is_existing_user: true })).mockImplementationOnce(() => response({ access: 'test-access' }));
  vi.stubGlobal('fetch', fetchMock);
  setup();
  fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '0801 234 5678' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue securely/ }));
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ phone_number: '+2348012345678' });
  fireEvent.change(screen.getByLabelText('WhatsApp code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: /Verify & enter workspace/ }));
  expect(await screen.findByText('/app/cases/case-1?section=plan#review')).toBeInTheDocument();
  expect(storeAuthData).toHaveBeenCalledWith({ access: 'test-access' });
});

test('keeps the form usable when the OTP request fails', async () => {
  vi.stubGlobal('fetch', vi.fn(() => response({ error: 'Please try again shortly.' }, false)));
  setup();
  fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '0801 234 5678' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue securely/ }));
  expect(await screen.findByText('Please try again shortly.')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: /Continue securely/ })).toBeEnabled());
  expect(screen.getByLabelText('WhatsApp number')).toHaveValue('0801 234 5678');
  expect(screen.getByRole('link', { name: 'Terms of use' })).toHaveAttribute('href', '/terms');
});
