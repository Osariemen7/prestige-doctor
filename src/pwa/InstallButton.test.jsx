import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import InstallButton, { DoctorInstallProvider } from './InstallButton';

let displayMode;
let modeListeners;
const page = children => <DoctorInstallProvider>{children ?? <InstallButton />}</DoctorInstallProvider>;
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
function nativePrompt(choice) {
  const event = new Event('beforeinstallprompt', { cancelable: true });
  event.prompt = vi.fn().mockResolvedValue();
  event.userChoice = choice;
  return event;
}
function device(userAgent, platform = 'Win32', maxTouchPoints = 0) {
  vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(userAgent);
  vi.spyOn(navigator, 'platform', 'get').mockReturnValue(platform);
  Object.defineProperty(navigator, 'maxTouchPoints', { configurable: true, value: maxTouchPoints });
}
beforeEach(() => {
  modeListeners = new Set();
  displayMode = { matches: false, addEventListener: vi.fn((type, listener) => modeListeners.add(listener)), removeEventListener: vi.fn((type, listener) => modeListeners.delete(listener)) };
  vi.stubGlobal('matchMedia', vi.fn(() => displayMode));
  Object.defineProperty(navigator, 'standalone', { configurable: true, value: false });
  device('Mozilla/5.0 Chrome/130.0 Safari/537.36');
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); delete navigator.standalone; delete navigator.maxTouchPoints; });

test('retains a native prompt captured before the lazy button mounts and prompts once on click', async () => {
  const choice = deferred();
  const event = nativePrompt(choice.promise);
  const view = render(page(<p>Loading sign-in</p>));
  act(() => window.dispatchEvent(event));
  expect(event.defaultPrevented).toBe(true);
  expect(event.prompt).not.toHaveBeenCalled();
  view.rerender(page());
  const button = screen.getByRole('button', { name: 'Install app' });
  fireEvent.click(button);
  fireEvent.click(button);
  expect(event.prompt).toHaveBeenCalledTimes(1);
  expect(button).toBeDisabled();
  await act(async () => choice.resolve({ outcome: 'accepted' }));
  expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Installation requested. Open Prestige Doctor from your home screen or apps when ready.');
  act(() => window.dispatchEvent(new Event('appinstalled')));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});

test('dismissal keeps the visible control and never reuses the consumed prompt', async () => {
  const event = nativePrompt(Promise.resolve({ outcome: 'dismissed' }));
  render(page());
  act(() => window.dispatchEvent(event));
  fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
  await screen.findByText(/Installation was dismissed/);
  expect(screen.getByRole('button', { name: 'Install app' })).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: 'Close installation help' }));
  fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
  await screen.findByRole('region', { name: 'Install the doctor app' });
  expect(event.prompt).toHaveBeenCalledTimes(1);
  const later = nativePrompt(Promise.resolve({ outcome: 'accepted' }));
  act(() => window.dispatchEvent(later));
  fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Installation requested.'));
  expect(later.prompt).toHaveBeenCalledTimes(1);
});

test('a native prompt failure gives usable guidance and releases the button', async () => {
  const event = nativePrompt(Promise.resolve({ outcome: 'dismissed' }));
  event.prompt.mockRejectedValue(new Error('Browser blocked the prompt'));
  render(page());
  act(() => window.dispatchEvent(event));
  fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
  await screen.findByText(/browser could not open its install prompt/);
  expect(screen.getByRole('button', { name: 'Install app' })).toBeEnabled();
});

test.each(['display mode', 'iOS standalone'])('hides the install control in %s', mode => {
  if (mode === 'display mode') displayMode.matches = true;
  else Object.defineProperty(navigator, 'standalone', { configurable: true, value: true });
  render(page());
  expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
});

test('appinstalled removes both the button and open help; lifecycle listeners clean up', async () => {
  const view = render(page());
  fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
  await screen.findByRole('region', { name: 'Install the doctor app' });
  act(() => window.dispatchEvent(new Event('appinstalled')));
  expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
  view.unmount();
  expect(modeListeners.size).toBe(0);
});

test('changing into standalone mode hides the visible button', () => {
  render(page());
  act(() => { displayMode.matches = true; modeListeners.forEach(listener => listener({ matches: true })); });
  expect(screen.queryByRole('button', { name: 'Install app' })).not.toBeInTheDocument();
});

test.each([
  ['iPhone', 'iPhone Safari', 'iPhone', 1, /Tap Share, then Add to Home Screen/],
  ['touch iPad', 'Macintosh Safari', 'MacIntel', 5, /Tap Share, then Add to Home Screen/],
  ['Android', 'Android Chrome', 'Linux armv8l', 1, /Open the browser menu and choose Install app or Add to Home screen/],
  ['Mac Safari', 'Macintosh Version/26.0 Safari/605.1', 'MacIntel', 0, /Choose Add to Dock/],
  ['desktop without a prompt', 'Windows Firefox', 'Win32', 0, /Open this page in Chrome or Edge/],
])('offers truthful %s guidance without requiring a browser prompt', async (_name, userAgent, platform, touchPoints, expectedStep) => {
  device(userAgent, platform, touchPoints);
  render(page());
  fireEvent.click(screen.getByRole('button', { name: 'Install app' }));
  await screen.findByText(expectedStep);
  expect(screen.getByText(/Installation needs your confirmation in the browser/)).toBeVisible();
  fireEvent.keyDown(screen.getByRole('button', { name: 'Install app' }), { key: 'Escape' });
  expect(screen.queryByRole('region')).not.toBeInTheDocument();
});
