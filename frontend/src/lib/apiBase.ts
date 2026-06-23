const DEFAULT_PRODUCTION_ORIGIN = 'https://fundo.dayan.casa';
const SERVER_URL_KEY = 'fundo_server_url';

/**
 * Get a user-configured server URL from localStorage.
 * This lets mobile/native users point the app at any FunDo server.
 */
function getUserServerUrl(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(SERVER_URL_KEY);
    if (stored && stored.trim()) {
      // Normalize: strip trailing slash
      return stored.trim().replace(/\/+$/, '');
    }
  } catch { /* localStorage unavailable */ }
  return null;
}

/**
 * Set the server URL in localStorage (user action).
 */
export function setUserServerUrl(url: string) {
  const normalized = url.trim().replace(/\/+$/, '');
  if (normalized) {
    localStorage.setItem(SERVER_URL_KEY, normalized);
  } else {
    localStorage.removeItem(SERVER_URL_KEY);
  }
}

/**
 * Get the configured server origin.
 * Priority: user-set localStorage > VITE_API_ORIGIN env > production default (Capacitor only)
 */
function getConfiguredOrigin() {
  // User-configured server URL takes top priority
  const userUrl = getUserServerUrl();
  if (userUrl) return userUrl;

  // Then env var (build-time)
  const envOrigin = (import.meta.env.VITE_API_ORIGIN || '').replace(/\/$/, '');
  if (envOrigin) return envOrigin;

  return '';
}

function getRuntimeOrigin() {
  if (typeof window === 'undefined') return '';

  const configuredOrigin = getConfiguredOrigin();
  if (configuredOrigin) return configuredOrigin;

  // Capacitor or localhost (native app shell) → use production default
  const isCapacitorLocalHost =
    window.location.protocol === 'capacitor:' ||
    (window.location.protocol === 'https:' && window.location.hostname === 'localhost');

  return isCapacitorLocalHost ? DEFAULT_PRODUCTION_ORIGIN : '';
}

export const API_BASE = `${getRuntimeOrigin()}/api/v1`;

export function apiUrl(path: string) {
  return `${API_BASE}${path}`;
}

export { SERVER_URL_KEY, DEFAULT_PRODUCTION_ORIGIN, getUserServerUrl };