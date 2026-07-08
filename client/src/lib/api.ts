import axios, { AxiosError } from 'axios';

// Empty base URL → same-origin, so the Vite dev proxy handles /api.
const baseURL = import.meta.env.VITE_API_URL || '';

export const api = axios.create({
  baseURL,
  withCredentials: true,
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
