import axios, { AxiosError } from 'axios';

// Empty base URL → same-origin, so the Vite dev proxy handles /api.
const baseURL = import.meta.env.VITE_API_URL || '';

// Token (Bearer) auth instead of cookies: works cross-origin even on hosts that
// proxy away credentialed CORS (e.g. Hugging Face Spaces). The token is stored
// in localStorage, captured from auth responses, and sent on every request.
const TOKEN_KEY = 'cf_token';

export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setAuthToken(token: string) {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    /* ignore (private mode) */
  }
}
export function clearAuthToken() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export const api = axios.create({
  baseURL,
  // No cookies — auth rides in the Authorization header (see interceptors).
  withCredentials: false,
});

// Attach the bearer token to every request.
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Capture a fresh token whenever an auth endpoint returns one.
api.interceptors.response.use((res) => {
  const token = (res.data as { token?: string } | undefined)?.token;
  if (token) setAuthToken(token);
  return res;
});

export interface ApiErrorShape {
  message: string;
  errors?: Record<string, string[]>;
  details?: { needsVerification?: boolean; email?: string };
}

/** Normalise an axios error into a friendly message + optional field errors. */
export function parseError(err: unknown): ApiErrorShape {
  const ax = err as AxiosError<ApiErrorShape>;
  if (ax?.response?.data) {
    return ax.response.data;
  }
  if (ax?.request) {
    return { message: 'Cannot reach the server. Is the backend running?' };
  }
  return { message: (err as Error)?.message || 'Something went wrong' };
}

export function firstFieldErrors(
  err: ApiErrorShape
): Record<string, string> {
  const out: Record<string, string> = {};
  if (err.errors) {
    for (const [k, v] of Object.entries(err.errors)) {
      if (v?.length) out[k] = v[0];
    }
  }
  return out;
}
