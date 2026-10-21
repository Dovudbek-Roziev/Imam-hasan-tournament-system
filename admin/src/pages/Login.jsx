import { useState } from 'react';
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/useAuth';
import { useLanguage } from '../i18n';
import LanguageSwitch from '../components/LanguageSwitch';

// RU: Показать защищённую форму входа администратора.
// EN: Render the protected administrator sign-in form.
export default function Login() {
  const { login, notice } = useAuth();
  const { t } = useLanguage();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // RU: Проверить форму и открыть панель после успешного ответа API.
  // EN: Validate the form and open the panel after a successful API response.
  async function submit(event) {
    event.preventDefault(); setError(''); setLoading(true);
    try { await login(form); }
    catch (failure) { setError(failure.response?.data?.message || t('Не удалось войти. Проверьте адрес API.')); }
    finally { setLoading(false); }
  }

  return <main className="login-page">
    <section className="login-intro"><span className="brand-lockup"><span className="brand-mark"><img src="/club-logo.png" alt="" /></span> ИМАМ ХАСАН</span>
      <div className="login-story"><span className="eyebrow">{t('ФУТБОЛЬНЫЙ ТУРНИР • ОШ')}</span><h1>{t('Каждый матч.')}<br /><span>{t('Одна история.')}</span></h1><p>{t('Управляйте командами, матчами и турнирными новостями из одного кабинета.')}</p></div>
      <div className="login-foot"><span className="foot-star">✳</span><span>{t('Турнирная система')}<br /><b>{t('Ош · Кыргызстан')}</b></span></div>
    </section>
    <section className="login-panel"><LanguageSwitch /><form className="login-card" onSubmit={submit}>
      <div className="login-icon"><ShieldCheck size={23} /></div><span className="eyebrow">{t('ПАНЕЛЬ УПРАВЛЕНИЯ')}</span><h2>{t('Добро пожаловать')}</h2><p className="login-description">{t('Войдите, чтобы управлять турниром.')}</p>
      {(notice || error) && <div className="notice notice-error" role="alert">{error || notice}</div>}
      <label className="field"><span>{t('Электронная почта')}</span><input type="email" name="email" autoComplete="username" autoFocus required maxLength={254} placeholder="admin@example.com" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} /></label>
      <label className="field"><span>{t('Пароль')}</span><div className="password-input"><LockKeyhole size={17} /><input type="password" name="password" autoComplete="current-password" required maxLength={72} placeholder={t('Введите пароль')} value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} /></div></label>
      <button className="button button-primary login-submit" type="submit" disabled={loading}>{loading ? t('Входим…') : t('Войти в кабинет')}{!loading && <ArrowRight size={18} />}</button>
      <p className="login-safe"><LockKeyhole size={14} /> {t('Доступ только для администратора турнира')}</p>
    </form></section>
  </main>;
}
