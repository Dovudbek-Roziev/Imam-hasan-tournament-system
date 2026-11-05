import { useCallback, useEffect, useState } from 'react';
import api, { clearToken, refreshSession, savedToken, saveToken } from '../api/axios';
import AuthContext from './AuthStore';

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState({ status: 'checking', user: null, notice: '' });
  const restore = useCallback(async (signal) => {
    setAuth(current => ({ ...current, status: 'checking' }));
    try {
      const data = savedToken() ? (await api.get('/auth/me', { signal })).data.data : (await refreshSession()).user;
      if (signal?.aborted) return;
      if (data.role !== 'Администратор') { clearToken(); setAuth({ status: 'guest', user: null, notice: 'Недостаточно прав для входа в панель администратора.' }); return; }
      setAuth({ status: 'authenticated', user: data, notice: '' });
    } catch (error) {
      if (signal?.aborted || error.code === 'ERR_CANCELED') return;
      if (error.response?.status === 401 || error.response?.status === 403) {
        clearToken(); setAuth({ status: 'guest', user: null, notice: '' });
      } else setAuth({ status: 'unavailable', user: null, notice: 'Не удалось подключиться к серверу. Проверьте API и повторите вход.' });
    }
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const expire = () => setAuth({ status: 'guest', user: null, notice: 'Сеанс завершён. Войдите снова.' });
    window.addEventListener('imam-hasan:unauthorized', expire);
    restore(controller.signal);
    return () => { controller.abort(); window.removeEventListener('imam-hasan:unauthorized', expire); };
  }, [restore]);
  async function login(credentials) {
    const response = await api.post('/auth/login', credentials);
    if (response.data.data.user.role !== 'Администратор') throw new Error('Недостаточно прав для входа в панель администратора.');
    saveToken(response.data.data.token);
    setAuth({ status: 'authenticated', user: response.data.data.user, notice: '' });
  }
  async function logout() {
    await api.post('/auth/logout');
    clearToken();
    setAuth({ status: 'guest', user: null, notice: '' });
  }
  return <AuthContext.Provider value={{ ...auth, login, logout, retrySession: () => restore() }}>{children}</AuthContext.Provider>;
}
