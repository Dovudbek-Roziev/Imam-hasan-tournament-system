import { useEffect, useState } from 'react';
import { Menu, LogOut, MapPin } from 'lucide-react';
import Sidebar from './Sidebar';
import LanguageSwitch from './LanguageSwitch';
import { useAuth } from '../auth/useAuth';
import { useLanguage } from '../i18n';

// RU: Объединить адаптивное меню, заголовок страницы и управление сеансом.
// EN: Combine responsive navigation, page header, and session controls.
// RU: Собрать навигацию, рабочую область и действия текущего администратора.
// EN: Compose navigation, the workspace, and current administrator actions.
export default function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [loggingOut, setLoggingOut] = useState(false);

  // RU: Блокировать прокрутку фона и закрывать мобильное меню по Escape.
  // EN: Lock background scrolling and close the mobile drawer with Escape.
  useEffect(() => {
    if (!menuOpen) return undefined;
    document.body.classList.add('navigation-open');
    const closeOnEscape = (event) => { if (event.key === 'Escape') setMenuOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.classList.remove('navigation-open');
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

  // RU: Завершить сеанс и показать ошибку, если сервер не подтвердил выход.
  // EN: End the session and report an error if the server rejects logout.
  async function signOut() {
    setLoggingOut(true);
    try { await logout(); } catch { /* RU: Локальный сеанс уже отозван. EN: The local session is already cleared. */ }
    finally { setLoggingOut(false); }
  }

  return <div className="app-shell"><Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
    <main className="main-panel">
      <header className="topbar"><div className="topbar-left"><button className="icon-button menu-toggle" aria-label={t('Открыть меню')} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={() => setMenuOpen(true)}><Menu size={21} /></button><div className="breadcrumbs"><span>{t('Турнир')}</span><span className="crumb-dot">/</span><b>{t('Имам Хасан')}</b></div></div>
        <div className="topbar-actions"><span className="location-pill"><MapPin size={14} /> {t('Ош, Кыргызстан')}</span><span className="top-divider" /><span className="profile-user"><span className="avatar">{user?.name?.trim()?.charAt(0)?.toLocaleUpperCase('ru') || 'А'}</span><span className="profile-name">{user?.name || t('Администратор')}<small>{user?.email || ''}</small></span></span><LanguageSwitch /><button className="button button-quiet logout-button" onClick={signOut} disabled={loggingOut} title={t('Завершить сеанс')}><LogOut size={17} /><span>{loggingOut ? t('Выход…') : t('Выйти')}</span></button></div>
      </header>
      <div className="page-content">{children}<footer className="app-footer"><span>© {new Date().getFullYear()} Имам Хасан · {t('Система управления турниром')}</span><span><i className="online-dot" /> {t('Все системы готовы')}</span></footer></div>
    </main>
  </div>;
}
