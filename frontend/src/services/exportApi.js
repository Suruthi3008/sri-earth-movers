import { ApiError, BASE_URL, tokenStore, UNAUTHORIZED_EVENT } from './api';

/** Downloads a read-only copy of all business data as an Excel file. */
export async function downloadExcel() {
  const token = tokenStore.get();
  let response;
  try {
    response = await fetch(`${BASE_URL}/exports/excel`, {
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
    throw new ApiError('Unable to download the Excel file. Please try again.', response.status);
  }

  const disposition = response.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="([^"]+)"/);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = match ? match[1] : 'Ramesh-Earth-Movers-data.xlsx';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
