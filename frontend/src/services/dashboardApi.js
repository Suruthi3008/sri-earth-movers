import { http } from './api';

export const dashboardApi = {
  get: () => http.get('/dashboard'),
};
