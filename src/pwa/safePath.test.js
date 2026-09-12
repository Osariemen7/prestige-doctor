import { safeDoctorPath, loginForPath } from './safePath';
import { isDemoEnabled } from '../vnext/api';
test('keeps exact authenticated case and message destinations through OTP', () => {
  const target = '/app/cases/case-1/documentation?section=plan#review';
  expect(new URLSearchParams(loginForPath(target).split('?')[1]).get('next')).toBe(target);
  expect(safeDoctorPath('/app/messages/conversation-2')).toBe('/app/messages/conversation-2');
});
test.each(['https://evil.test', '//evil.test', '/application', '/app/../../login', '/app\\evil.test', '/app/%2e%2e/login', '/app/messages/%E0%A4%A', '/app/messages/%5csecret', '/app/messages/%00'])('rejects unsafe notification or login target %s', (value) => {
  expect(safeDoctorPath(value)).toBe('/app/queue');
});
test('notification links cannot activate a production demo', () => {
  expect(safeDoctorPath('/app/queue?demo=1')).toBe('/app/queue');
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';
  try { expect(isDemoEnabled(true)).toBe(false); } finally { process.env.NODE_ENV = previous; }
});
