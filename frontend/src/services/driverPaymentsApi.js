import { http } from './api';

export const driverPaymentsApi = {
  list: () => http.get('/driver-payments'),
  summary: () => http.get('/driver-payments/summary'),
  create: (payload) => http.post('/driver-payments', payload),
  updateStatus: (id, status) => http.patch(`/driver-payments/${id}`, { status }),
};
