import {
  DEVICE_AUTH_WINDOW_MS,
  isAuthenticated,
  storeAuthData,
} from './api';

const tokenWithExpiry = (exp) => {
  const payload = btoa(JSON.stringify({ exp }));
  return `header.${payload}.signature`;
};

describe('weekly device authentication', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
  });

  it('keeps a verified device signed in for seven days', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    storeAuthData({
      access: tokenWithExpiry((now + 10 * 60 * 1000) / 1000),
      refresh: tokenWithExpiry((now + 14 * 24 * 60 * 60 * 1000) / 1000),
      user: { full_name: 'Dr. Test' },
    });

    expect(isAuthenticated()).toBe(true);
    Date.now.mockReturnValue(now + DEVICE_AUTH_WINDOW_MS - 1);
    expect(isAuthenticated()).toBe(true);
  });

  it('requires a fresh OTP after the device window expires', () => {
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now);
    storeAuthData({
      access: tokenWithExpiry((now + 10 * 60 * 1000) / 1000),
      refresh: tokenWithExpiry((now + 14 * 24 * 60 * 60 * 1000) / 1000),
    });

    Date.now.mockReturnValue(now + DEVICE_AUTH_WINDOW_MS);
    expect(isAuthenticated()).toBe(false);
  });
});
