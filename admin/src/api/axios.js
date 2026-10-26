import axios from 'axios';
import { getLanguage } from '../i18n';

// RU: Хранить токен только в текущей вкладке и передавать его серверу.
// EN: Keep the token only in this browser tab and send it to the API.
export const TOKEN_KEY = 'imam-hasan.admin.token';
// RU: Безопасно получить токен из хранилища текущей вкладки.
// EN: Safely read the token from the current tab's storage.
const savedToken = () => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } };

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? '/api' : 'https://imam-hasan-api.onrender.com/api'),
  // Render's free instance may need time to wake before it can answer requests.
  timeout: 90000,
  headers: { Accept: 'application/json' },
});

// RU: Добавить Bearer-токен к запросу, сохранив явный заголовок вызова.
// EN: Attach the Bearer token while respecting an explicitly supplied header.
instance.interceptors.request.use((request) => {
  if (!request.headers.Authorization && savedToken()) request.headers.Authorization = `Bearer ${savedToken()}`;
  request.headers['Accept-Language'] = getLanguage();
  return request;
});

// RU: Единообразно завершить сессию после ответа сервера 401.
// EN: End the session consistently after the API responds with 401.
instance.interceptors.response.use((response) => response, (error) => {
  const hasSession = savedToken();
  if (error.response?.status === 401 && hasSession) {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* RU: Хранилище может быть выключено. EN: Storage may be unavailable. */ }
    window.dispatchEvent(new CustomEvent('imam-hasan:unauthorized'));
  }
  return Promise.reject(error);
});

export default instance;
