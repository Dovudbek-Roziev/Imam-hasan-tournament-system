import { useState } from 'react';
import { useLanguage } from '../i18n';
import { useTournament } from '../tournaments/TournamentContext';
import { useCollection } from '../hooks/useCollection';
import api from '../api/axios';

export default function Tournaments() {
  const { t } = useLanguage();
  const { tournaments, selected, select, refresh, error } = useTournament();
  const teams = useCollection('teams', { limit: 100, sort: 'name' }, { allPages: true });
  const [name, setName] = useState('');
  const [format, setFormat] = useState('league_playoff');
  const [participants, setParticipants] = useState([]);
  const [replacement, setReplacement] = useState({ from: '', to: '' });
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const active = tournaments.find(item => item._id === selected);
  async function create(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try { const { data } = await api.post('/tournaments', { name, teams: participants, format }); await refresh(); select(data.data._id); setName(''); setParticipants([]); }
    catch (failure) { setMessage(failure.response?.data?.message || t('Не удалось сохранить данные.')); } finally { setBusy(false); }
  }
  async function replace(event) {
    event.preventDefault(); setBusy(true); setMessage('');
    try { await api.put(`/tournaments/${selected}/team`, replacement); await refresh(); setReplacement({ from: '', to: '' }); setMessage(t('Команда заменена.')); }
    catch (failure) { setMessage(failure.response?.data?.message || t('Не удалось сохранить данные.')); } finally { setBusy(false); }
  }
  return <section className="page-stack"><div className="page-heading"><div><h1>{t('Турниры')}</h1><p>{t('Создавайте турниры и управляйте участниками.')}</p></div></div>
    {(message || error || teams.error) && <div className="notice notice-info" role="status">{message || error || teams.error}</div>}
    <div className="surface schedule-panel"><label className="field">{t('Выбранный турнир')}<select value={selected} onChange={e => select(e.target.value)}><option value="legacy">{t('Основной турнир')}</option>{tournaments.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
      {active && <form onSubmit={replace} className="form-stack"><h2>{t('Заменить команду')}</h2><div className="schedule-fields"><label className="field">{t('Текущая команда')}<select required value={replacement.from} onChange={e => setReplacement(v => ({ ...v, from: e.target.value }))}><option value="">—</option>{active.teams.map(team => <option key={team._id} value={team._id}>{team.name}</option>)}</select></label><label className="field">{t('Новая команда')}<select required value={replacement.to} onChange={e => setReplacement(v => ({ ...v, to: e.target.value }))}><option value="">—</option>{teams.data.filter(team => !active.teams.some(item => item._id === team._id)).map(team => <option key={team._id} value={team._id}>{team.name}</option>)}</select></label></div><button className="button button-secondary" disabled={busy}>{t('Заменить команду')}</button></form>}
    </div>
    <form onSubmit={create} className="surface schedule-panel form-stack"><h2>{t('Создать турнир')}</h2><label className="field">{t('Название турнира')}<input required maxLength={120} value={name} onChange={e => setName(e.target.value)} /></label><label className="field">{t('Формат')}<select value={format} onChange={e => setFormat(e.target.value)}><option value="league">{t('Лига')}</option><option value="league_playoff">{t('Лига + плей-офф')}</option></select></label><b>{t('Команды турнира')}</b><div className="schedule-teams">{teams.data.map(team => <label key={team._id}><input type="checkbox" checked={participants.includes(team._id)} onChange={e => setParticipants(e.target.checked ? [...participants, team._id] : participants.filter(id => id !== team._id))} /> {team.name}</label>)}</div><button className="button button-primary" disabled={busy || participants.length < 2}>{t('Создать турнир')}</button></form>
  </section>;
}
