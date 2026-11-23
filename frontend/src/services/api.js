/**
 * Central API client. All backend calls go through here.
 * Components never call fetch() directly (except the PDF download in billsApi.js).
 */

export const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
const TOKEN_KEY = 'rem_access_token';

/** Window event fired when the server rejects the session (token expired or invalid). */
export const UNAUTHORIZED_EVENT = 'rem:unauthorized';

const NETWORK_MESSAGE = "Can't reach the server. Check your internet connection and try again.";
const GENERIC_MESSAGE = 'Something went wrong. Please try again.';
const VALIDATION_MESSAGE = 'Please check the form and try again.';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

/** Turn a server response into a message a business owner can understand. */
function messageFrom(status, data) {
  if (status === 401) {
    return typeof data?.detail === 'string' ? data.detail : 'Your session has expired. Please log in again.';
  }
  if (status === 422) return VALIDATION_MESSAGE;
  if (status === 503 && typeof data?.detail === 'string') return data.detail;
  if (status >= 500) return GENERIC_MESSAGE;
  if (typeof data?.detail === 'string') return data.detail;
  return GENERIC_MESSAGE;
}

async function request(method, path, { body, auth = true } = {}) {
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(NETWORK_MESSAGE, 0);
  }

  const data = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    if (response.status === 401 && auth) {
      tokenStore.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    throw new ApiError(messageFrom(response.status, data), response.status);
  }
  return data;
}

export const http = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
};

export const authApi = {
  login: (username, password) =>
    request('POST', '/auth/login', { auth: false, body: { username, password } }),
  me: () => request('GET', '/auth/me'),
};
