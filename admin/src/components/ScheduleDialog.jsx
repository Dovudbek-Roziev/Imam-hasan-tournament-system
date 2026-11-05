import { useState } from 'react';
import { useLanguage } from '../i18n';
import Modal from './Modal';
import api from '../api/axios';

export default function ScheduleDialog({ teams, tournaments, tournament, onClose, onCreated }) {
  const { t } = useLanguage();
  const [selectedTournament, setSelectedTournament] = useState(tournament);
  const [values, setValues] = useState({ teams: [], legs: 1, startDate: '', startTime: '18:00', duration: 60, breakMinutes: 15, intervalDays: 7, stadium: '' });
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const chosen = tournaments.find(item => item._id === selectedTournament);
  const participants = selectedTournament === 'legacy' ? teams.filter(team => values.teams.includes(team._id)) : (chosen?.teams || []);
  function change(key, value) { setValues(current => ({ ...current, [key]: value })); setPreview(null); setError(''); }
  function changeTournament(id) { setSelectedTournament(id); setPreview(null); setError(''); }
  async function submit(generate) {
    setBusy(true); setError('');
    try {
      const response = await api.post(`/schedule/${generate ? 'generate' : 'preview'}`, { ...values, teams: participants.map(team => team._id), ...(selectedTournament !== 'legacy' ? { tournament: selectedTournament } : {}) });
      if (generate) { onCreated(selectedTournament); onClose(); } else setPreview(response.data.data);
    } catch (failure) { setError(failure.response?.data?.message || t('Не удалось сохранить данные.')); }
    finally { setBusy(false); }
  }
  const names = new Map(participants.map(team => [team._id, team.name]));
  return <Modal title={t('Автоматическое расписание')} onClose={busy ? () => {} : onClose} wide>
    <div className="form-stack">
      <fieldset className="schedule-form-fields" disabled={busy}>
      <label className="field">{t('Выберите турнир')}<select value={selectedTournament} onChange={event => changeTournament(event.target.value)}><option value="legacy">{t('Основной турнир')}</option>{tournaments.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
      {selectedTournament === 'legacy' ? <><p>{t('Выберите команды и параметры. Проверьте расписание перед сохранением.')}</p><div className="schedule-teams">{teams.map(team => <label key={team._id}><input type="checkbox" checked={values.teams.includes(team._id)} onChange={event => change('teams', event.target.checked ? [...values.teams, team._id] : values.teams.filter(id => id !== team._id))} /> {team.name}</label>)}</div></> : <><p>{t('Все команды выбранного турнира будут включены в расписание.')}</p><div className="schedule-teams">{participants.map(team => <span key={team._id}>✓ {team.name}</span>)}</div>{!chosen && <p role="alert">{t('Турнир недоступен. Выберите другой турнир.')}</p>}</>}

      <div className="schedule-fields">
        <label className="field">{t('Дата начала')}<input type="date" value={values.startDate} onChange={e => change('startDate', e.target.value)} /></label>
        <label className="field">{t('Время начала')}<input type="time" value={values.startTime} onChange={e => change('startTime', e.target.value)} /></label>
        <label className="field">{t('Круги')}<select value={values.legs} onChange={e => change('legs', Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option></select></label>
        <label className="field">{t('Длительность матча, минут')}<input type="number" min="1" max="720" value={values.duration} onChange={e => change('duration', Number(e.target.value))} /></label>
        <label className="field">{t('Перерыв, минут')}<input type="number" min="0" max="720" value={values.breakMinutes} onChange={e => change('breakMinutes', Number(e.target.value))} /></label>
        <label className="field">{t('Дней между турами')}<input type="number" min="1" max="365" value={values.intervalDays} onChange={e => change('intervalDays', Number(e.target.value))} /></label>
        <label className="field">{t('Стадион')}<input value={values.stadium} onChange={e => change('stadium', e.target.value)} /></label>
      </div>
      </fieldset>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {preview && <div className="schedule-preview">{preview.map((match, i) => <div key={i}>{t('Тур')} {match.round} · {String(match.date).slice(0, 10)} {match.time} · {names.get(match.homeTeam)} — {names.get(match.awayTeam)}</div>)}</div>}
      <div className="dialog-actions"><button className="button button-secondary" onClick={() => submit(false)} disabled={busy || participants.length < 2 || (selectedTournament !== 'legacy' && !chosen)}>{t('Предварительный просмотр')}</button><button className="button button-primary" onClick={() => submit(true)} disabled={busy || !preview}>{t('Сохранить расписание')}</button></div>
    </div>
  </Modal>;
}
