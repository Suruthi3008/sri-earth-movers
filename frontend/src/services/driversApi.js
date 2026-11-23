import { http } from './api';

export const driversApi = {
  list: () => http.get('/drivers'),
  create: (payload) => http.post('/drivers', payload),
  update: (id, payload) => http.put(`/drivers/${id}`, payload),
};
