import { useEffect, useState } from 'react';
import api, { TOKEN_KEY } from '../api/axios';
import AuthContext from './AuthStore';

// RU: Проверить действительность сеанса и роль администратора до открытия панели.
// EN: Verify the session and administrator role before showing the dashboard.
export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => {
    try { return sessionStorage.getItem(TOKEN_KEY) ? { status: 'checking', user: null, notice: '' } : { status: 'guest', user: null, notice: '' }; }
    catch { return { status: 'guest', user: null, notice: '' }; }
  });

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    // RU: Перевести интерфейс на экран входа после отказа API в авторизации.
    // EN: Return the interface to sign-in when the API rejects authorization.
    const expire = () => {
      if (!active) return;
      setAuth({ status: 'guest', user: null, notice: 'Сеанс завершён. Войдите снова.' });
    };
    window.addEventListener('imam-hasan:unauthorized', expire);
    const token = (() => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } })();

    if (token) api.get('/auth/me', { signal: controller.signal }).then(({ data }) => {
      if (!active) return;
      if (data.data.role !== 'Администратор') throw new Error('Недостаточно прав для входа в панель администратора.');
      setAuth({ status: 'authenticated', user: data.data, notice: '' });
    }).catch((error) => {
      if (!active || error.code === 'ERR_CANCELED') return;
      try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* RU: Продолжить без локального хранилища. EN: Continue without browser storage. */ }
      setAuth({ status: 'guest', user: null, notice: error.response?.status ? 'Сеанс завершён. Войдите снова.' : 'Не удалось подключиться к серверу. Проверьте API и повторите вход.' });
    });

    return () => {
      active = false;
      controller.abort();
      window.removeEventListener('imam-hasan:unauthorized', expire);
    };
  }, []);

  // RU: Проверить учётные данные и сохранить только действующий токен администратора.
  // EN: Verify credentials and store only a valid administrator token.
  // RU: Проверить учётные данные и сохранить только действующий токен администратора.
  // EN: Verify credentials and store only a valid administrator token.
  async function login(credentials) {
    const response = await api.post('/auth/login', credentials);
    if (response.data.data.user.role !== 'Администратор') throw new Error('Недостаточно прав для входа в панель администратора.');
    try { sessionStorage.setItem(TOKEN_KEY, response.data.data.token); }
    catch { throw new Error('Браузер заблокировал временное хранилище сеанса.'); }
    setAuth({ status: 'authenticated', user: response.data.data.user, notice: '' });
  }

  // RU: Отозвать сеанс на сервере и очистить локальное состояние.
  // EN: Revoke the API session and clear the local state.
  // RU: Отозвать сеанс на сервере и очистить локальное состояние.
  // EN: Revoke the API session and clear the local state.
  async function logout() {
    try { await api.post('/auth/logout'); }
    finally {
      try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* RU: Токен недоступен. EN: Token is unavailable. */ }
      setAuth({ status: 'guest', user: null, notice: '' });
    }
  }

  return <AuthContext.Provider value={{ ...auth, login, logout }}>{children}</AuthContext.Provider>;
}
