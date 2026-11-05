import axios from 'axios';
import { getLanguage } from '../i18n';

export const TOKEN_KEY = 'imam-hasan.admin.token';
let memoryToken = null;
export function savedToken() { try { return sessionStorage.getItem(TOKEN_KEY) || memoryToken; } catch { return memoryToken; } }
export function saveToken(token) { memoryToken = token; try { sessionStorage.setItem(TOKEN_KEY, token); } catch { /* Cookie-backed sessions work without tab storage. */ } }
export function clearToken() { memoryToken = null; try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* Storage may be unavailable. */ } }

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://imam-hasan-api.onrender.com/api'),
  timeout: 90000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});
instance.interceptors.request.use((request) => {
  if (!request.headers.Authorization && savedToken()) request.headers.Authorization = `Bearer ${savedToken()}`;
  request.headers['Accept-Language'] = getLanguage();
  return request;
});
let pendingRefresh;
export function refreshSession() {
  if (!pendingRefresh) {
    pendingRefresh = instance.post('/auth/refresh').then(({ data }) => {
      if (!data?.data?.token || data.data.user?.role !== 'Администратор') throw new Error('Invalid session');
      saveToken(data.data.token);
      return data.data;
    }).finally(() => { pendingRefresh = null; });
  }
  return pendingRefresh;
}
instance.interceptors.response.use((response) => response, async (error) => {
  const request = error.config;
  if (error.response?.status !== 401 || !request || request._sessionRetried ||
      ['/auth/login', '/auth/refresh'].includes(request.url)) throw error;
  request._sessionRetried = true;
  try {
    const current = savedToken();
    const sent = request.headers?.Authorization;
    const session = current && sent && sent !== `Bearer ${current}` ? { token: current } : await refreshSession();
    request.headers.Authorization = `Bearer ${session.token}`;
    return instance(request);
  } catch (failure) {
    if (failure.response?.status === 401 || failure.response?.status === 403) {
      clearToken();
      window.dispatchEvent(new CustomEvent('imam-hasan:unauthorized'));
    }
    throw failure;
  }
});
export default instance;
