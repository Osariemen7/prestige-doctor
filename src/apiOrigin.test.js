import { DEFAULT_DOCTOR_API_ORIGIN, getDoctorApiOrigin, resolveDoctorApiUrl } from './apiOrigin';
test('QA must declare an API origin and Vite client origins are respected', () => {
  expect(() => getDoctorApiOrigin({ env: { REACT_APP_QA_MODE: 'true' } })).toThrow('explicit API origin');
  expect(getDoctorApiOrigin({ env: { VITE_API_ORIGIN: 'http://127.0.0.1:8099/' } })).toBe('http://127.0.0.1:8099');
  expect(resolveDoctorApiUrl('/care/capabilities', { env: { REACT_APP_BACKEND_BASE_URL: 'https://api.example.test' } })).toBe('https://api.example.test/care/capabilities');
});

test('preview and test deployments fail closed without an explicit API origin', () => {
  expect(() => getDoctorApiOrigin({ env: { VERCEL_ENV: 'preview' } })).toThrow('explicit API origin');
  expect(() => getDoctorApiOrigin({ env: { VERCEL_ENV: 'test' } })).toThrow('explicit API origin');
  expect(() => getDoctorApiOrigin({ env: { REACT_APP_ENV: 'test' } })).toThrow('explicit API origin');
  expect(getDoctorApiOrigin({ env: { VERCEL_ENV: 'preview', REACT_APP_API_BASE_URL: 'https://qa-api.example.test/path' } }))
    .toBe('https://qa-api.example.test/path');
});

test('production deployment retains the production fallback', () => {
  expect(getDoctorApiOrigin({ env: { VERCEL_ENV: 'production' } })).toBe(DEFAULT_DOCTOR_API_ORIGIN);
});
