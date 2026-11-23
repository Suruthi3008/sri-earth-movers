import { http } from './api';

export const jcbApi = {
  summary: () => http.get('/jcb-work'),
};
