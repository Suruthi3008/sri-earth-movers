import { ApiError, BASE_URL, http, tokenStore, UNAUTHORIZED_EVENT } from './api';

function withQuery(path, params = {}) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString();
  return query ? `${path}?${query}` : path;
}

/**
 * Downloads the bill PDF. A plain <a href> cannot send the Bearer token,
 * so the file is fetched first and then saved from a temporary blob URL.
 */
async function downloadPdf(id, billNumber) {
  const token = tokenStore.get();
  let response;
  try {
    response = await fetch(`${BASE_URL}/bills/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  } catch {
    throw new ApiError("Can't reach the server. Check your internet connection and try again.", 0);
  }

  if (!response.ok) {
    if (response.status === 401) {
      tokenStore.clear();
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
      throw new ApiError('Your session has expired. Please log in again.', 401);
    }
    throw new ApiError('Unable to generate the bill PDF. Please try again.', response.status);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Bill-${billNumber}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export const billsApi = {
  list: (params) => http.get(withQuery('/bills', params)),
  get: (id) => http.get(`/bills/${id}`),
  create: (payload) => http.post('/bills', payload),
  update: (id, payload) => http.put(`/bills/${id}`, payload),
  remove: (id) => http.del(`/bills/${id}`),
  downloadPdf,
};
