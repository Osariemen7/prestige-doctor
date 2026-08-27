// Central runtime configuration for the provider dashboard.
// Every network call should source its base URL from here instead of
// hardcoding hosts. Values can be overridden via environment variables.

const DEFAULT_API_BASE_URL = 'https://api.prestigedelta.com';

export const API_BASE_URL = (
  import.meta.env.VITE_BACKEND_BASE_URL || DEFAULT_API_BASE_URL
).replace(/\/+$/, '');

// WebSocket counterpart of the API base (used for realtime services).
export const API_WS_URL = import.meta.env.VITE_BACKEND_WS_URL || '';

// Organization scope header value; override via env when running against
// an alternative tenant domain.
export const ORGANIZATION_DOMAIN =
  import.meta.env.VITE_ORGANIZATION_DOMAIN || 'provider.prestigehealth.app';

export const ORGANIZATION_DOMAIN_HEADER = { 'X-Organization-Domain': ORGANIZATION_DOMAIN };

// â”€â”€ Agora RTC (voice/video visits) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// The client MUST obtain short-lived credentials from the backend for every
// join. Joining with a null token or shipping a static app id in source is
// not permitted. Until the backend endpoint is provisioned the voice page
// fails closed with "Voice visits temporarily unavailable".
//
// Expected contract (to be implemented server-side):
//   GET {API_BASE_URL}/agora/rtc-token/?channel=<channel>
//   Authorization: Bearer <access token>
//   -> 200 { appId: string, token: string, channel: string }
export const AGORA_TOKEN_ENDPOINT = `${API_BASE_URL}/agora/rtc-token/`;

// Display/fallback info only - never used to join a channel.
export const AGORA_APP_ID_DISPLAY = import.meta.env.VITE_AGORA_APP_ID || '';

/**
 * Fetch one-time Agora credentials from the backend.
 * Returns { appId, token } or throws when the backend has not yet been
 * provisioned (fail-closed).
 */
export const fetchAgoraCredentials = async (channel, getAccessTokenFn) => {
  const accessToken = await getAccessTokenFn();
  if (!accessToken) {
    throw new Error('Not authenticated');
  }

  const url = channel
    ? `${AGORA_TOKEN_ENDPOINT}?channel=${encodeURIComponent(channel)}`
    : AGORA_TOKEN_ENDPOINT;

  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Agora token endpoint unavailable (${response.status})`);
  }

  const data = await response.json();
  if (!data?.appId || !data?.token) {
    throw new Error('Agora token endpoint returned incomplete credentials');
  }

  return { appId: data.appId, token: data.token };
};
