import { http } from './api';

export const paymentsApi = {
  list: () => http.get('/payments'),
  get: (id) => http.get(`/payments/${id}`),
  summary: () => http.get('/payments/summary'),
  create: (payload) => http.post('/payments', payload),
};
