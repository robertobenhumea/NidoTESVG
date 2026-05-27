import { STORAGE_KEYS, getApiBaseUrl, getStoredAuthToken } from '@/lib/utils';
import type { ApiError } from '@/types';

const DEFAULT_TIMEOUT = 15_000;

export class FetchError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'FetchError';
  }

  get isUnauthorized() { return this.status === 401; }
  get isForbidden()    { return this.status === 403; }
  get isNotFound()     { return this.status === 404; }
  get isServerError()  { return this.status >= 500; }
  get isNetworkError() { return this.status === 0; }
}

function getAuthHeader(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const token = getStoredAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Fired when the server returns 401.
 * AuthProvider listens for this to clear session without a circular import.
 */
function dispatchAuthExpired() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEYS.TOKEN);
  localStorage.removeItem(STORAGE_KEYS.USER);
  window.dispatchEvent(new CustomEvent('auth:expired'));
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options: RequestInit & { timeout?: number; suppressAuthExpiry?: boolean } = {},
): Promise<T> {
  const { timeout = DEFAULT_TIMEOUT, suppressAuthExpiry = false, ...rest } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(rest.headers as Record<string, string> | undefined),
  };

  try {
    const res = await fetch(`${getApiBaseUrl()}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      ...rest,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      let errorData: ApiError | undefined;
      try { errorData = await res.json(); } catch { /* non-JSON body */ }

      if (res.status === 401 && !suppressAuthExpiry) dispatchAuthExpired();

      throw new FetchError(
        res.status,
        errorData?.message ?? `HTTP ${res.status}`,
        errorData,
      );
    }

    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof FetchError) throw err;

    const isTimeout = err instanceof DOMException && err.name === 'AbortError';
    const message = isTimeout
      ? 'La solicitud tardó demasiado. Verifica tu conexión.'
      : 'Error de conexión. Verifica tu internet.';

    throw new FetchError(0, message);
  }
}

export const api = {
  get: <T>(path: string, opts?: RequestInit & { timeout?: number; suppressAuthExpiry?: boolean }) =>
    request<T>('GET', path, undefined, opts),

  post: <T>(path: string, body?: unknown, opts?: RequestInit & { timeout?: number; suppressAuthExpiry?: boolean }) =>
    request<T>('POST', path, body, opts),

  put: <T>(path: string, body?: unknown, opts?: RequestInit & { timeout?: number; suppressAuthExpiry?: boolean }) =>
    request<T>('PUT', path, body, opts),

  patch: <T>(path: string, body?: unknown, opts?: RequestInit & { timeout?: number; suppressAuthExpiry?: boolean }) =>
    request<T>('PATCH', path, body, opts),

  delete: <T>(path: string, opts?: RequestInit & { timeout?: number; suppressAuthExpiry?: boolean }) =>
    request<T>('DELETE', path, undefined, opts),
};
