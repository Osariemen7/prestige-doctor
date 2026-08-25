import { normalizeDoctorPhone } from '../utils/doctorAuth';

describe('normalizeDoctorPhone', () => {
  it('accepts local Nigerian mobile numbers', () => {
    expect(normalizeDoctorPhone('0801 234 5678')).toBe('+2348012345678');
  });

  it('preserves international Nigerian numbers', () => {
    expect(normalizeDoctorPhone('+234 801 234 5678')).toBe('+2348012345678');
  });

  it('supports the 00 international prefix', () => {
    expect(normalizeDoctorPhone('00234 801 234 5678')).toBe('+2348012345678');
  });
});
