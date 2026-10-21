import { useCallback, useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowUpRight, CalendarDays, CheckCircle2, CircleDot, Clock3, Flag, Goal, LoaderCircle, ShieldCheck, Users } from 'lucide-react';
import api from '../api/axios';
import { imageUrl } from '../api/media';
import { useLanguage } from '../i18n';

// RU: Проверить структуру сводного ответа до чтения его полей в интерфейсе.
// EN: Validate the summary response before the interface reads its fields.
function readDashboard(response, t) {
  const data = response?.data?.data;
  const counts = ['total', 'scheduled', 'live', 'finished', 'cancelled', 'goals', 'incompleteProtocols'];
  if (!data || !Array.isArray(data.upcoming) ||
    !['teams', 'players', 'news'].every((field) => Number.isSafeInteger(data[field])) ||
    !data.matches || !counts.every((field) => Number.isSafeInteger(data.matches[field]))) {
    throw new Error(t('Сервер вернул обзор турнира в неожиданном формате.'));
  }
  return data;
}

// RU: Загрузить агрегаты турнира и ближайшие матчи из защищённого API.
// EN: Load tournament summaries and upcoming fixtures from the protected API.
// RU: Показать сводные показатели, ближайшие матчи и состояние турнира.
// EN: Display summary metrics, upcoming matches, and tournament status.
export default function Dashboard() {
  const { t, locale } = useLanguage();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [success, setSuccess] = useState('');

  // RU: Повторно запросить обзор турнира по действию администратора.
  // EN: Reload tournament metrics on an administrator action.
  const load = useCallback(async (signal) => {
    setLoading(true); setError('');
    try { const response = await api.get('/stats/dashboard', { signal }); setData(readDashboard(response, t)); }
    catch (failure) { if (!signal?.aborted) setError(failure.response?.data?.message || (failure.message === t('Сервер вернул обзор турнира в неожиданном формате.') ? failure.message : t('Не удалось загрузить обзор турнира.'))); }
    finally { if (!signal?.aborted) setLoading(false); }
  }, [t]);

  useEffect(() => {
    const controller = new AbortController();
    // RU: Загрузить статистику с отменой запроса при закрытии страницы.
    // EN: Load dashboard data and cancel the request when the page closes.
    async function fetchDashboard() {
      try { const response = await api.get('/stats/dashboard', { signal: controller.signal }); setData(readDashboard(response, t)); }
      catch (failure) { if (!controller.signal.aborted) setError(failure.response?.data?.message || (failure.message === t('Сервер вернул обзор турнира в неожиданном формате.') ? failure.message : t('Не удалось загрузить обзор турнира.'))); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    fetchDashboard();
    return () => controller.abort();
  }, [t]);

  // RU: Скачать экспорт истории турнира из административного API.
  // EN: Download the tournament history export from the admin API.
  // RU: Скачать согласованный JSON-архив истории турнира.
  // EN: Download the consistent JSON archive of tournament history.
  async function downloadArchive() {
    setDownloading(true); setError('');
    try {
      const response = await api.get('/stats/archive', { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url; link.download = 'imam-hasan-archive.json'; link.click();
      URL.revokeObjectURL(url); setSuccess(t('Архив турнира скачан.'));
    } catch (failure) { setError(failure.response?.data?.message || t('Не удалось скачать архив турнира.')); }
    finally { setDownloading(false); }
  }

  const cards = data ? [
    { label: t('Команды турнира'), value: data.teams, note: t('Участники соревнования'), icon: Users, tone: 'green' },
    { label: t('Игроки'), value: data.players, note: t('Зарегистрированный состав'), icon: ShieldCheck, tone: 'blue' },
    { label: t('Завершённые матчи'), value: data.matches.finished, note: `${data.matches.live} ${t('играют ·')} ${data.matches.scheduled} ${t('в расписании')}`, icon: Flag, tone: 'gold' },
    { label: t('Забитые голы'), value: data.matches.goals, note: t('По итогам завершённых матчей'), icon: Goal, tone: 'rose' },
  ] : [];

  return <section className="page-stack">
    <div className="page-heading dashboard-heading"><div><span className="eyebrow">{t('СЕЗОН • ОШ, КЫРГЫЗСТАН')}</span><h1>{t('Обзор турнира')}</h1><p>{t('Все главные события и показатели в одном месте.')}</p></div><div className="heading-actions"><button className="button button-secondary" onClick={downloadArchive} disabled={downloading}><ArrowDownToLine size={17} />{downloading ? t('Готовим архив…') : t('Скачать архив')}</button><span className="time-pill"><span className="live-dot" />{data?.timeZone || 'Asia/Bishkek'} · UTC+6</span></div></div>
    {error && <div className="notice notice-error" role="alert">{error}<button className="text-button" onClick={() => load(undefined, true)}>{t('Повторить')}</button></div>}
    {success && <div className="notice notice-success" role="status"><CheckCircle2 size={17} />{success}<button className="text-button" onClick={() => setSuccess('')}>×</button></div>}
    {loading && !data ? <div className="dashboard-loading"><LoaderCircle className="spin" size={22} />{t('Загружаем свежие данные…')}</div> : data && <>
      <div className="metrics-grid">{cards.map(({ label, value, note, icon: Icon, tone }) => <article className="metric-card surface" key={label}><div className="metric-top"><span>{label}</span><span className={`metric-icon ${tone}`}><Icon size={19} strokeWidth={1.8} /></span></div><strong>{value}</strong><span className="metric-note">{note}</span></article>)}</div>
      <div className="dashboard-grid">
        <section className="surface fixture-panel"><header className="section-header"><div><span className="eyebrow">{t('СЛЕДУЮЩИЕ ИГРЫ')}</span><h2>{t('Ближайшие матчи')}</h2></div><span className="counter-pill">{data.upcoming.length} {t('матча')}</span></header>
          {data.upcoming.length ? <div className="fixture-list">{data.upcoming.map((match) => <article className="fixture-row" key={match._id}><div className="fixture-date"><span>{new Intl.DateTimeFormat(locale, { timeZone: data.timeZone, day: '2-digit' }).format(new Date(match.startsAt))}</span><small>{new Intl.DateTimeFormat(locale, { timeZone: data.timeZone, month: 'short' }).format(new Date(match.startsAt)).replace('.', '')}</small></div><div className="fixture-teams"><span><b>{match.homeTeam?.name || t('Команда')}</b><span className="team-mini">{match.homeTeam?.logo ? <img src={imageUrl(match.homeTeam.logo)} alt="" /> : 'ФК'}</span></span><i>—</i><span><b>{match.awayTeam?.name || t('Команда')}</b><span className="team-mini">{match.awayTeam?.logo ? <img src={imageUrl(match.awayTeam.logo)} alt="" /> : 'ФК'}</span></span></div><time dateTime={match.startsAt}>{new Intl.DateTimeFormat(locale, { timeZone: data.timeZone, hour: '2-digit', minute: '2-digit' }).format(new Date(match.startsAt))}</time></article>)}</div> : <div className="fixture-empty"><CalendarDays size={24} /><b>{t('Ближайших матчей пока нет')}</b><span>{t('Запланированные игры появятся здесь.')}</span></div>}
          <div className="fixtures-footnote"><Clock3 size={15} />{t('Время указано по городу Ош · UTC+6')}</div>
        </section>
        <section className="surface status-panel"><header className="section-header"><div><span className="eyebrow">{t('СТАТУС ТУРНИРА')}</span><h2>{t('Общая картина')}</h2></div><span className="status-icon"><CircleDot size={20} /></span></header><div className="status-feature"><span><CircleDot size={18} /></span><div><b>{t('Турнир активен')}</b><small>{t('Публичные результаты доступны зрителям')}</small></div></div><div className="status-line"><span>{t('Запланировано')}</span><b>{data.matches.scheduled}</b></div><div className="status-line"><span>{t('Сейчас играют')}</span><b>{data.matches.live}</b></div><div className="status-line"><span>{t('Завершено')}</span><b>{data.matches.finished}</b></div><div className="status-line"><span>{t('Новости турнира')}</span><b>{data.news}</b></div>{data.matches.incompleteProtocols > 0 && <div className="incomplete-note"><Clock3 size={15} />{t('Неполных протоколов:')} {data.matches.incompleteProtocols}</div>}</section>
      </div>
      <p className="last-updated"><Clock3 size={14} />{t('Обновлено')} {new Intl.DateTimeFormat(locale, { timeZone: data.timeZone, day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(data.generatedAt))} <button className="text-link" onClick={() => load(undefined, true)}>{t('Обновить')} <ArrowUpRight size={13} /></button></p>
    </>}
  </section>;
}
