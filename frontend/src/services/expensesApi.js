import { http } from './api';

export const expensesApi = {
  list: (category = '') =>
    http.get(category ? `/expenses?category=${encodeURIComponent(category)}` : '/expenses'),
  get: (id) => http.get(`/expenses/${id}`),
  create: (payload) => http.post('/expenses', payload),
  update: (id, payload) => http.put(`/expenses/${id}`, payload),
  remove: (id) => http.del(`/expenses/${id}`),
};
