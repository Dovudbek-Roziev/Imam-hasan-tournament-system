import { useState } from 'react';
import { useLanguage } from '../i18n';
import Modal from './Modal';
import api from '../api/axios';

export default function ScheduleDialog({ teams, tournament, onClose, onCreated }) {
  const { t } = useLanguage();
  const [values, setValues] = useState({ teams: [], legs: 1, startDate: '', startTime: '18:00', duration: 60, breakMinutes: 15, intervalDays: 7, stadium: '' });
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  function change(key, value) { setValues(current => ({ ...current, [key]: value })); setPreview(null); }
  async function submit(generate) {
    setBusy(true); setError('');
    try {
      const response = await api.post(`/schedule/${generate ? 'generate' : 'preview'}`, { ...values, ...(tournament !== 'legacy' ? { tournament } : {}) });
      if (generate) { onCreated(); onClose(); } else setPreview(response.data.data);
    } catch (failure) { setError(failure.response?.data?.message || t('Не удалось сохранить данные.')); }
    finally { setBusy(false); }
  }
  const names = new Map(teams.map(team => [team._id, team.name]));
  return <Modal title={t('Автоматическое расписание')} onClose={busy ? () => {} : onClose} wide>
    <div className="form-stack">
      <p>{t('Выберите команды и параметры. Проверьте расписание перед сохранением.')}</p>
      <div className="schedule-teams">{teams.map(team => <label key={team._id}><input type="checkbox" checked={values.teams.includes(team._id)} onChange={event => change('teams', event.target.checked ? [...values.teams, team._id] : values.teams.filter(id => id !== team._id))} /> {team.name}</label>)}</div>
      <div className="schedule-fields">
        <label className="field">{t('Дата начала')}<input type="date" value={values.startDate} onChange={e => change('startDate', e.target.value)} /></label>
        <label className="field">{t('Время начала')}<input type="time" value={values.startTime} onChange={e => change('startTime', e.target.value)} /></label>
        <label className="field">{t('Круги')}<select value={values.legs} onChange={e => change('legs', Number(e.target.value))}><option value={1}>1</option><option value={2}>2</option></select></label>
        <label className="field">{t('Длительность матча, минут')}<input type="number" min="1" max="720" value={values.duration} onChange={e => change('duration', Number(e.target.value))} /></label>
        <label className="field">{t('Перерыв, минут')}<input type="number" min="0" max="720" value={values.breakMinutes} onChange={e => change('breakMinutes', Number(e.target.value))} /></label>
        <label className="field">{t('Дней между турами')}<input type="number" min="1" max="365" value={values.intervalDays} onChange={e => change('intervalDays', Number(e.target.value))} /></label>
        <label className="field">{t('Стадион')}<input value={values.stadium} onChange={e => change('stadium', e.target.value)} /></label>
      </div>
      {error && <p className="notice notice-error" role="alert">{error}</p>}
      {preview && <div className="schedule-preview">{preview.map((match, i) => <div key={i}>{t('Тур')} {match.round} · {String(match.date).slice(0, 10)} {match.time} · {names.get(match.homeTeam)} — {names.get(match.awayTeam)}</div>)}</div>}
      <div className="dialog-actions"><button className="button button-secondary" onClick={() => submit(false)} disabled={busy}>{t('Предварительный просмотр')}</button><button className="button button-primary" onClick={() => submit(true)} disabled={busy || !preview}>{t('Сохранить расписание')}</button></div>
    </div>
  </Modal>;
}
