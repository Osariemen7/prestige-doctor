import {
  DEVICE_AUTH_WINDOW_MS,
  isAuthenticated,
  getAccessToken,
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

test('forces a refresh even while the rejected access token has time remaining', async () => {
  localStorage.clear();
  const now = Date.now();
  const rejected = tokenWithExpiry((now + 600000) / 1000);
  const fresh = tokenWithExpiry((now + 1200000) / 1000);
  storeAuthData({ access: rejected, refresh: tokenWithExpiry((now + 86400000) / 1000) });
  global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ access: fresh }) });
  expect(await getAccessToken({ forceRefresh: true })).toBe(fresh);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
test('preserves credentials when forced refresh is temporarily unreachable', async () => {
  localStorage.clear();
  const access = tokenWithExpiry((Date.now() + 600000) / 1000);
  storeAuthData({ access, refresh: tokenWithExpiry((Date.now() + 86400000) / 1000) });
  global.fetch = jest.fn().mockRejectedValue(new Error('offline'));
  await expect(getAccessToken({ forceRefresh: true })).rejects.toThrow('offline');
  expect(localStorage.getItem('access_token')).toBe(access);
});
