import { useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { AuthProvider } from './auth/AuthContext';
import { useAuth } from './auth/useAuth';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import Players from './pages/Players';
import Matches from './pages/Matches';
import News from './pages/News';
import Login from './pages/Login';
import { LanguageProvider, useLanguage } from './i18n';

// RU: Защитить административные маршруты действующей ролью администратора.
// EN: Protect management routes with an active administrator session.
function ProtectedPanel() {
  const auth = useAuth();
  const { t } = useLanguage();
  if (auth.status === 'checking') return <main className="boot-screen"><span className="brand-mark"><Trophy size={21} /></span><span className="spinner" />{t('Проверка безопасного соединения…')}</main>;
  if (auth.status !== 'authenticated') return <Navigate to="/login" replace />;
  return <Layout><Routes><Route path="/" element={<Dashboard />} /><Route path="/teams" element={<Teams />} /><Route path="/players" element={<Players />} /><Route path="/matches" element={<Matches />} /><Route path="/news" element={<News />} /><Route path="*" element={<Navigate to="/" replace />} /></Routes></Layout>;
}

// RU: Выбирать экран входа или защищённую панель после проверки токена.
// EN: Choose the login screen or protected panel after verifying the token.
function ApplicationRoutes() {
  const { status } = useAuth();
  return <Routes><Route path="/login" element={status === 'authenticated' ? <Navigate to="/" replace /> : <Login />} /><Route path="*" element={<ProtectedPanel />} /></Routes>;
}

// RU: Собрать маршруты и единое состояние авторизации.
// EN: Compose application routes with shared authentication state.
export default function App() {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    // RU: Показать краткое уведомление, когда сервер отзывает или отклоняет токен.
    // EN: Show a brief notice when the server revokes or rejects the token.
    const showMessage = () => { setExpired(true); window.setTimeout(() => setExpired(false), 6000); };
    window.addEventListener('imam-hasan:unauthorized', showMessage);
    return () => window.removeEventListener('imam-hasan:unauthorized', showMessage);
  }, []);
  return <BrowserRouter><LanguageProvider><AuthProvider><SessionBanner visible={expired} /><ApplicationRoutes /></AuthProvider></LanguageProvider></BrowserRouter>;
}

// RU: Показать локализованное предупреждение о завершившемся сеансе.
// EN: Show a localized notice when the administrator session expires.
function SessionBanner({ visible }) {
  const { t } = useLanguage();
  return visible ? <div className="session-banner" role="status">{t('Сеанс завершён. Войдите снова, чтобы продолжить.')}</div> : null;
}
