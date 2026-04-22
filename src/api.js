// Authentication utility functions for JWT with refresh tokens
// WhatsApp OTP tokens: access = 10 min, refresh = 7 days

const TOKEN_REFRESH_URL = 'https://api.prestigedelta.com/api/tokenrefresh/';
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const ACCESS_TOKEN_REFRESH_LEEWAY_MS = 30 * 1000;

let refreshRequest = null;

const getAccessValue = (data) => data?.access || data?.access_token || null;

const getRefreshValue = (data) => data?.refresh || data?.refresh_token || null;

const decodeTokenPayload = (token) => {
  if (!token || typeof token !== 'string' || typeof atob !== 'function') {
    return null;
  }

  const tokenParts = token.split('.');
  if (tokenParts.length < 2) {
    return null;
  }

  try {
    const normalizedPayload = tokenParts[1].replace(/-/g, '+').replace(/_/g, '/');
    const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
    return JSON.parse(atob(paddedPayload));
  } catch {
    return null;
  }
};

const isTokenValid = (token, leewayMs = 0) => {
  const payload = decodeTokenPayload(token);
  if (!payload?.exp) {
    return false;
  }

  return (payload.exp * 1000) > (Date.now() + leewayMs);
};

const updateStoredTokenFields = (data) => {
  const accessToken = getAccessValue(data);
  const refreshToken = getRefreshValue(data);

  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  }

  if (!accessToken && !refreshToken) {
    return;
  }

  try {
    const storedInfo = localStorage.getItem('user-info');
    const parsedInfo = storedInfo ? JSON.parse(storedInfo) : {};
    const nextInfo = parsedInfo && typeof parsedInfo === 'object' ? { ...parsedInfo } : {};

    if (accessToken) {
      nextInfo.access = accessToken;
    }

    if (refreshToken) {
      nextInfo.refresh = refreshToken;
    }

    localStorage.setItem('user-info', JSON.stringify(nextInfo));
  } catch {
    localStorage.setItem('user-info', JSON.stringify({
      ...(accessToken ? { access: accessToken } : {}),
      ...(refreshToken ? { refresh: refreshToken } : {}),
    }));
  }
};

// ── Storage helpers ────────────────────────────────────────────────────

/**
 * Persist auth data from the verify-otp response (or any auth response).
 * Stores refresh & access tokens as standalone keys so they survive
 * regardless of the shape of user-info, and also keeps the full blob
 * for backward-compat.
 */
export const storeAuthData = (data) => {
  const accessToken = getAccessValue(data);
  const refreshToken = getRefreshValue(data);

  if (accessToken) localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.setItem('user-info', JSON.stringify(data));
};

// ── Read helpers ───────────────────────────────────────────────────────

export const isAuthenticated = () => {
  return !!getRefreshToken() || !!getStoredAccessToken();
};

export const getStoredAccessToken = () => {
  const standalone = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (standalone) return standalone;

  const userInfo = localStorage.getItem('user-info');
  if (userInfo) {
    try {
      const parsed = JSON.parse(userInfo);
      return getAccessValue(parsed);
    } catch {
      return null;
    }
  }

  return null;
};

export const getRefreshToken = () => {
  // Prefer the standalone key; fall back to user-info blob
  const standalone = localStorage.getItem(REFRESH_TOKEN_KEY);
  if (standalone) return standalone;

  const userInfo = localStorage.getItem('user-info');
  if (userInfo) {
    try {
      return getRefreshValue(JSON.parse(userInfo));
    } catch {
      return null;
    }
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
  const currentAccessToken = getStoredAccessToken();
  if (currentAccessToken && isTokenValid(currentAccessToken, ACCESS_TOKEN_REFRESH_LEEWAY_MS)) {
    return currentAccessToken;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    if (currentAccessToken) {
      return currentAccessToken;
    }
    logout();
    return null;
  }

  if (refreshRequest) {
    return refreshRequest;
  }

  refreshRequest = (async () => {
    try {
      const response = await fetch(TOKEN_REFRESH_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh: refreshToken }),
      });

      if (!response.ok) {
        if (response.status >= 500 && currentAccessToken) {
          console.warn(`Token refresh returned ${response.status}; reusing the current access token.`);
          return currentAccessToken;
        }

        // Refresh token expired or rotated out – user must re-authenticate
        logout();
        return null;
      }

      const data = await response.json();
      updateStoredTokenFields(data);
      return getAccessValue(data);
    } catch (error) {
      if (currentAccessToken) {
        console.warn('Token refresh request failed; reusing the current access token.');
        return currentAccessToken;
      }
      console.error('Error refreshing token:', error);
      return null;
    } finally {
      refreshRequest = null;
    }
  })();

  return refreshRequest;
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
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('user-info');
};