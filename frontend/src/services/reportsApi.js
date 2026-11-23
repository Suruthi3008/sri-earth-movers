import { http } from './api';

export const reportsApi = {
  get: ({ preset, start, end }) => {
    const params = new URLSearchParams({ preset });
    if (start) params.set('start', start);
    if (end) params.set('end', end);
    return http.get(`/reports?${params.toString()}`);
  },
};
