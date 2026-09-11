import { getDoctorApiOrigin, resolveDoctorApiUrl } from './apiOrigin';
test('QA must declare an API origin and Vite client origins are respected', () => {
  expect(() => getDoctorApiOrigin({ env: { REACT_APP_QA_MODE: 'true' } })).toThrow('explicit API origin');
  expect(getDoctorApiOrigin({ env: { VITE_API_ORIGIN: 'http://127.0.0.1:8099/' } })).toBe('http://127.0.0.1:8099');
  expect(resolveDoctorApiUrl('/care/capabilities', { env: { REACT_APP_BACKEND_BASE_URL: 'https://api.example.test' } })).toBe('https://api.example.test/care/capabilities');
});
