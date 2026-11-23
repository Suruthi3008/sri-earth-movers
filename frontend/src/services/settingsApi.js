import { http } from './api';

export const settingsApi = {
  get: () => http.get('/settings'),
  save: (payload) => http.put('/settings', payload),
};
