// Authentication utility functions for JWT with refresh tokens
// WhatsApp OTP tokens: access = 10 min, refresh = 7 days

const TOKEN_REFRESH_URL = 'https://api.prestigehealth.app/api/tokenrefresh/';

// ── Storage helpers ────────────────────────────────────────────────────

/**
 * Persist auth data from the verify-otp response (or any auth response).
 * Stores refresh & access tokens as standalone keys so they survive
 * regardless of the shape of user-info, and also keeps the full blob
 * for backward-compat.
 */
export const storeAuthData = (data) => {
  if (data.access) localStorage.setItem('access_token', data.access);
  if (data.refresh) localStorage.setItem('refresh_token', data.refresh);
  localStorage.setItem('user-info', JSON.stringify(data));
};

// ── Read helpers ───────────────────────────────────────────────────────

export const isAuthenticated = () => {
  return !!localStorage.getItem('refresh_token');
};

export const getRefreshToken = () => {
  // Prefer the standalone key; fall back to user-info blob
  const standalone = localStorage.getItem('refresh_token');
  if (standalone) return standalone;

  const userInfo = localStorage.getItem('user-info');
  if (userInfo) {
    try { return JSON.parse(userInfo).refresh || null; } catch { return null; }
  }
  return null;
};

export const getUser = () => {
  const userInfo = localStorage.getItem('user-info');
  if (userInfo) {
    try { return JSON.parse(userInfo).user || JSON.parse(userInfo); } catch { return null; }
  }
  return null;
};

// ── Token refresh ──────────────────────────────────────────────────────

/**
 * Returns a valid access token, refreshing via the stored refresh token
 * when necessary.  Returns null (and clears storage) if the refresh
 * token itself has expired (>7 days since last OTP auth).
 */
export const getAccessToken = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(TOKEN_REFRESH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: refreshToken }),
    });

    if (response.ok) {
      const data = await response.json();
      // Persist the fresh access token
      localStorage.setItem('access_token', data.access);
      // Keep user-info blob in sync
      try {
        const info = JSON.parse(localStorage.getItem('user-info') || '{}');
        info.access = data.access;
        localStorage.setItem('user-info', JSON.stringify(info));
      } catch { /* non-critical */ }
      return data.access;
    } else {
      // Refresh token expired – user must re-authenticate
      logout();
      return null;
    }
  } catch (error) {
    console.error('Error refreshing token:', error);
    return null;
  }
};

// ── Session restore (call on app launch) ───────────────────────────────

/**
 * Attempt to restore a session using the persisted refresh token.
 * Returns true if the user is still authenticated (refresh < 7 days old),
 * false otherwise.
 */
export const tryRestoreSession = async () => {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  const token = await getAccessToken();
  return !!token;
};

// ── Logout ─────────────────────────────────────────────────────────────

export const logout = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user-info');
};