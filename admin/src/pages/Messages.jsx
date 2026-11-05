import { useCallback, useEffect, useState } from 'react';
import { MessageCircle, Send, RefreshCw } from 'lucide-react';
import api from '../api/axios';
import { useLanguage } from '../i18n';

const labels = { player: 'Игрок', parent: 'Родитель', supporter: 'Болельщик' };
export default function Messages() {
  const { t, locale } = useLanguage();
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState('');
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    try { const response = await api.get('/conversations/admin'); setItems(response.data.data); setError(''); }
    catch (failure) { setError(failure.response?.data?.message || t('Не удалось загрузить сообщения.')); }
  }, [t]);
  useEffect(() => { load(); const timer = window.setInterval(load, 30000); return () => window.clearInterval(timer); }, [load]);
  const active = items.find(item => item._id === selected);
  const text = drafts[selected] || '';
  async function reply(event) {
    event.preventDefault(); if (!text.trim()) return;
    const conversationId = selected;
    const submittedText = text;
    setBusy(true); setError('');
    try {
      await api.post(`/conversations/admin/${conversationId}/messages`, { text: submittedText });
      setDrafts(current => current[conversationId] === submittedText ? { ...current, [conversationId]: '' } : current);
      await load();
    }
    catch (failure) { setError(failure.response?.data?.message || t('Не удалось отправить сообщение.')); }
    finally { setBusy(false); }
  }
  // RU: Открыть обращение и снять отметку о новых сообщениях.
  // EN: Open a conversation and clear its new-message indicator.
  async function selectConversation(item) {
    setSelected(item._id);
    if (!item.unreadAdmin) return;
    setItems(current => current.map(entry => entry._id === item._id ? { ...entry, unreadAdmin: false } : entry));
    try { await api.post(`/conversations/admin/${item._id}/read`); }
    catch (failure) { setError(failure.response?.data?.message || t('Не удалось отметить обращение прочитанным.')); }
  }
  return <section className="page-stack"><div className="page-heading"><div><span className="eyebrow">{t('ОБРАЩЕНИЯ')}</span><h1>{t('Сообщения')}</h1><p>{t('Вопросы игроков, родителей и болельщиков.')}</p></div><button type="button" className="button button-secondary" onClick={load}><RefreshCw size={16} />{t('Обновить')}</button></div>
    {error && <div className="notice notice-error" role="alert">{error}</div>}
    <div className="inbox-layout"><div className="surface inbox-list"><h2>{t('Обращения')}</h2>{!items.length && <p>{t('Сообщений пока нет.')}</p>}{items.map(item => <button type="button" key={item._id} className={`inbox-item ${selected === item._id ? 'is-active' : ''}`} onClick={() => selectConversation(item)}><span><MessageCircle size={17} /> <b>{t(labels[item.role])}</b>{item.unreadAdmin && <span className="inbox-unread">{t('Новое')}</span>}</span><small>{item.messages.at(-1)?.text}</small></button>)}</div>
    <div className="surface inbox-thread">{active ? <><h2>{t(labels[active.role])}</h2><div className="inbox-messages">{active.messages.map((item, index) => <div key={index} className={`inbox-bubble ${item.sender === 'admin' ? 'is-admin' : ''}`}><span>{item.text}</span><small>{new Intl.DateTimeFormat(locale, { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Bishkek' }).format(new Date(item.createdAt))}</small></div>)}</div><form onSubmit={reply} className="inbox-compose"><textarea maxLength={2000} value={text} onChange={e => { const value = e.target.value; setDrafts(current => ({ ...current, [selected]: value })); }} placeholder={t('Напишите ответ…')} aria-label={t('Напишите ответ…')} /><button className="button button-primary" disabled={busy || !text.trim()}><Send size={16} />{t('Отправить')}</button></form></> : <div className="empty-state"><MessageCircle size={28} /><strong>{t('Выберите обращение')}</strong></div>}</div></div>
  </section>;
}
