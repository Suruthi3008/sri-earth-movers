import { http } from './api';

export const dailyWorkApi = {
  list: (workType = '') =>
    http.get(workType ? `/daily-work?work_type=${encodeURIComponent(workType)}` : '/daily-work'),
  get: (id) => http.get(`/daily-work/${id}`),
  create: (payload) => http.post('/daily-work', payload),
  update: (id, payload) => http.put(`/daily-work/${id}`, payload),
  remove: (id) => http.del(`/daily-work/${id}`),
};
