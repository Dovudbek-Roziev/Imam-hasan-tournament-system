import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Users, UserRound, Trophy, Newspaper, X, ShieldCheck } from 'lucide-react';
import { useLanguage } from '../i18n';

const links = [
  { name: 'Обзор', path: '/', icon: LayoutDashboard },
  { name: 'Команды', path: '/teams', icon: Users },
  { name: 'Игроки', path: '/players', icon: UserRound },
  { name: 'Матчи', path: '/matches', icon: Trophy },
  { name: 'Новости', path: '/news', icon: Newspaper },
];

// RU: Показать переходы к разделам и закрыть мобильное меню после навигации.
// EN: Render section links and close the mobile menu after navigation.
// RU: Отобразить основную навигацию и мобильную выдвижную панель.
// EN: Render primary navigation and its mobile drawer.
export default function Sidebar({ open, onClose }) {
  const { t } = useLanguage();
  return <>
    <button className={`sidebar-backdrop ${open ? 'is-visible' : ''}`} aria-label={t('Закрыть меню')} tabIndex={open ? 0 : -1} onClick={onClose} />
    <aside id="main-navigation" className={`sidebar ${open ? 'is-open' : ''}`} aria-label={t('Главная навигация')}>
      <div className="sidebar-brand"><span className="brand-mark"><img src="/club-logo.png" alt="" /></span><span><b>ИМАМ ХАСАН</b><small>{t('ПАНЕЛЬ ТУРНИРА')}</small></span><button className="sidebar-close icon-button" aria-label={t('Закрыть меню')} onClick={onClose}><X size={19} /></button></div>
      <span className="nav-heading">{t('МЕНЮ')}</span><nav className="side-links">{links.map(({ name, path, icon: Icon }) => <NavLink key={path} to={path} end={path === '/'} onClick={onClose} className={({ isActive }) => `side-link ${isActive ? 'is-active' : ''}`}><Icon size={19} strokeWidth={1.85} /><span>{t(name)}</span>{path === '/' && <span className="nav-accent" />}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="season-card"><span className="season-dot" /><span>{t('Матчи проходят в городе Ош.')}<b> {t('Часовой пояс: UTC+6')}</b></span></div><div className="sidebar-footer"><span className="avatar-small"><ShieldCheck size={17} /></span><span>{t('Администратор')}<br /><small>{t('Управление турниром')}</small></span></div></div>
    </aside>
  </>;
}
