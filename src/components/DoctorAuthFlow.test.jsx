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

test('current requires_profile_setup false verifies an existing doctor without names and preserves exact next', async () => {
  const fetchMock = vi.fn().mockImplementationOnce(() => response({ success: true, requires_profile_setup: false })).mockImplementationOnce(() => response({ access: 'test-access' }));
  vi.stubGlobal('fetch', fetchMock);
  setup();
  fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '0801 234 5678' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue securely/ }));
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  expect(screen.queryByLabelText('First name')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('Last name')).not.toBeInTheDocument();
  expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({ phone_number: '+2348012345678' });
  fireEvent.change(screen.getByLabelText('WhatsApp code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: /Verify & enter workspace/ }));
  expect(await screen.findByText('/app/cases/case-1?section=plan#review')).toBeInTheDocument();
  expect(storeAuthData).toHaveBeenCalledWith({ access: 'test-access' });
  expect(fetchMock.mock.calls[1][0]).toMatch(/\/api\/doctor-auth\/verify-otp\/$/);
  expect(fetchMock.mock.calls[1][1].method).toBe('POST');
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ phone_number: '+2348012345678', otp: '123456' });
});

test('keeps the form usable when the OTP request fails', async () => {
  const fetchMock = vi.fn().mockImplementationOnce(() => response({ error: 'Please try again shortly.' }, false))
    .mockImplementationOnce(() => response({ success: true, requires_profile_setup: false }));
  vi.stubGlobal('fetch', fetchMock);
  setup();
  fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '0801 234 5678' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue securely/ }));
  expect(await screen.findByText('Please try again shortly.')).toBeInTheDocument();
  await waitFor(() => expect(screen.getByRole('button', { name: /Continue securely/ })).toBeEnabled());
  expect(screen.getByLabelText('WhatsApp number')).toHaveValue('0801 234 5678');
  expect(screen.getByRole('link', { name: 'Terms of use' })).toHaveAttribute('href', '/terms');
  expect(storeAuthData).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Continue securely/ }));
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('current requires_profile_setup true validates invitation names before normal OTP verification', async () => {
  const fetchMock = vi.fn().mockImplementationOnce(() => response({ success: true, requires_profile_setup: true }))
    .mockImplementationOnce(() => response({ access: 'test-invited-access' }));
  vi.stubGlobal('fetch', fetchMock); setup();
  fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '0801 234 5678' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue securely/ }));
  expect(await screen.findByRole('heading', { name: 'Complete your invited profile' })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('WhatsApp code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: /Verify & enter workspace/ }));
  expect(await screen.findByText('Add your first and last name to set up your workspace.')).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText('First name'), { target: { value: ' Test ' } });
  fireEvent.click(screen.getByRole('button', { name: /Verify & enter workspace/ }));
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.change(screen.getByLabelText('Last name'), { target: { value: ' Clinician ' } });
  fireEvent.click(screen.getByRole('button', { name: /Verify & enter workspace/ }));
  expect(await screen.findByText('/app/cases/case-1?section=plan#review')).toBeInTheDocument();
  // No provider, invitation, release or listing authority fields are sent.
  expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({ phone_number: '+2348012345678', otp: '123456',
    first_name: 'Test', last_name: 'Clinician', specialty: 'general_practice' });
});

test.each([
  ['missing profile status', { success: true }],
  ['null response', null],
  ['array response', []],
  ['missing success', { requires_profile_setup: false }],
  ['unsuccessful status', { success: false, requires_profile_setup: false }],
  ['string profile status', { success: true, requires_profile_setup: 'false' }],
  ['null profile status', { success: true, requires_profile_setup: null }],
  ['numeric profile status', { success: true, requires_profile_setup: 0 }],
  ['legacy-only status', { success: true, is_existing_user: true }],
  ['contradictory existing status', { success: true, requires_profile_setup: false, is_existing_user: false }],
  ['contradictory invitation status', { success: true, requires_profile_setup: true, is_existing_user: true }],
  ['malformed legacy status', { success: true, requires_profile_setup: false, is_existing_user: 'true' }],
])('fails closed and allows retry for %s', async (_name, data) => {
  const fetchMock = vi.fn().mockImplementationOnce(() => response(data))
    .mockImplementationOnce(() => response({ success: true, requires_profile_setup: false }));
  vi.stubGlobal('fetch', fetchMock); setup();
  fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '0801 234 5678' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue securely/ }));
  expect(await screen.findByText('We could not confirm the next sign-in step. Request a new code and try again.')).toBeInTheDocument();
  expect(screen.queryByLabelText('WhatsApp code')).not.toBeInTheDocument();
  expect(screen.queryByLabelText('First name')).not.toBeInTheDocument();
  expect(storeAuthData).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole('button', { name: /Continue securely/ }));
  expect(await screen.findByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test('a consistent explicit legacy flag cannot override the current profile requirement', async () => {
  vi.stubGlobal('fetch', vi.fn(() => response({ success: true, requires_profile_setup: true, is_existing_user: false })));
  setup();
  fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '0801 234 5678' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue securely/ }));
  expect(await screen.findByRole('heading', { name: 'Complete your invited profile' })).toBeInTheDocument();
  expect(screen.getByLabelText('First name')).toBeInTheDocument();
  expect(storeAuthData).not.toHaveBeenCalled();
});

test('verification denial does not authenticate; resend and retry retain exact next', async () => {
  const fetchMock = vi.fn().mockImplementationOnce(() => response({ success: true, requires_profile_setup: false }))
    .mockImplementationOnce(() => response({ error: 'Invalid or expired OTP' }, false))
    .mockImplementationOnce(() => response({ success: true, requires_profile_setup: false }))
    .mockImplementationOnce(() => response({ access: 'test-retry-access' }));
  vi.stubGlobal('fetch', fetchMock); setup();
  fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '0801 234 5678' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue securely/ }));
  await screen.findByLabelText('WhatsApp code');
  fireEvent.change(screen.getByLabelText('WhatsApp code'), { target: { value: '123456' } });
  fireEvent.click(screen.getByRole('button', { name: /Verify & enter workspace/ }));
  expect(await screen.findByText('Invalid or expired OTP')).toBeInTheDocument();
  expect(storeAuthData).not.toHaveBeenCalled();
  await waitFor(() => expect(screen.getByRole('button', { name: /Resend code/ })).toBeEnabled());
  fireEvent.click(screen.getByRole('button', { name: /Resend code/ }));
  expect(await screen.findByLabelText('WhatsApp code')).toHaveValue('');
  fireEvent.change(screen.getByLabelText('WhatsApp code'), { target: { value: '654321' } });
  fireEvent.click(screen.getByRole('button', { name: /Verify & enter workspace/ }));
  expect(await screen.findByText('/app/cases/case-1?section=plan#review')).toBeInTheDocument();
  expect(storeAuthData).toHaveBeenCalledTimes(1);
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

test('malformed resend clears previously accepted profile status and permits a fresh request', async () => {
  const fetchMock = vi.fn().mockImplementationOnce(() => response({ success: true, requires_profile_setup: false }))
    .mockImplementationOnce(() => response({ success: true }))
    .mockImplementationOnce(() => response({ success: true, requires_profile_setup: true }));
  vi.stubGlobal('fetch', fetchMock); setup();
  fireEvent.change(screen.getByLabelText('WhatsApp number'), { target: { value: '0801 234 5678' } });
  fireEvent.click(screen.getByRole('button', { name: /Continue securely/ }));
  await screen.findByLabelText('WhatsApp code');
  fireEvent.click(screen.getByRole('button', { name: /Resend code/ }));
  expect(await screen.findByText('We could not confirm the next sign-in step. Request a new code and try again.')).toBeInTheDocument();
  expect(screen.queryByLabelText('WhatsApp code')).not.toBeInTheDocument();
  expect(storeAuthData).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: /Continue securely/ }));
  expect(await screen.findByRole('heading', { name: 'Complete your invited profile' })).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledTimes(3);
});
