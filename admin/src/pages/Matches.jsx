import { useCallback, useMemo, useState } from 'react';
import { CalendarClock, CircleAlert, CircleCheck, Plus, Trash2, Pencil, Flag, Users, MessageSquareText, PlusCircle, X, Target } from 'lucide-react';
import api from '../api/axios';
import CollectionPage from '../components/CollectionPage';
import EntityDialog from '../components/EntityDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import Feedback from '../components/Feedback';
import { useCollection } from '../hooks/useCollection';
import { imageUrl } from '../api/media';
import { useLanguage } from '../i18n';
import { normalizeMatchEvents } from '../utils/matchForm';

const matchStatuses = ['Запланирован', 'Идёт', 'Завершён', 'Отменён'];
const eventTypes = ['Гол', 'Автогол', 'Жёлтая карточка', 'Красная карточка'];
const matchStages = ['Лига', 'Полуфинал', 'Матч за 3-е место', 'Финал'];

// RU: Преобразовать развёрнутую ссылку API в строковый ID формы.
// EN: Convert an expanded API reference into its string form value.
function refId(value) { return typeof value === 'object' && value ? value._id : value || ''; }
// RU: Читать календарный день матча без сдвига локальной даты из-за UTC.
// EN: Read the match's calendar day without shifting it through the browser's UTC offset.
function inputDate(value) { return value ? String(value).slice(0, 10) : ''; }
// RU: Показать время матча по Ошу и безопасно обработать старую запись без времени начала.
// EN: Display match time for Osh and safely handle legacy records without a kickoff instant.
function formatMatchDate(match, locale = 'ru-RU') {
  const instant = match.startsAt ? new Date(match.startsAt) : null;
  if (instant && Number.isFinite(instant.getTime())) {
    const date = new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Bishkek', day: 'numeric', month: 'short', year: 'numeric' }).format(instant);
    const time = new Intl.DateTimeFormat(locale, { timeZone: 'Asia/Bishkek', hour: '2-digit', minute: '2-digit' }).format(instant);
    return `${date} · ${time}`;
  }
  const dateValue = inputDate(match.date);
  const legacyDate = dateValue ? new Date(`${dateValue}T00:00:00Z`) : null;
  if (!legacyDate || !Number.isFinite(legacyDate.getTime())) return locale === 'ky-KG' ? 'Убакыт көрсөтүлгөн эмес' : 'Время не задано';
  return `${new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(legacyDate)} · ${match.time || '—:—'} (Ош)`;
}

// RU: Управлять расписанием, счётом и полным протоколом событий матча.
// EN: Manage fixtures, scores, and the complete match event protocol.
export default function Matches() {
  const { t, locale } = useLanguage();
  const list = useCollection('matches');
  const teams = useCollection('teams', { limit: 100, sort: 'name' });
  const players = useCollection('players', { limit: 100, sort: 'name' });
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [notice, setNotice] = useState('');
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeRemove = useCallback(() => setRemoving(null), []);
  const roster = useMemo(() => new Map(players.data.map((player) => [player._id, player])), [players.data]);

  // RU: Подготовить матч и его события к редактированию в форме.
  // EN: Prepare a match and its events for editing in the form.
  function beginEdit(match = {}) {
    const events = normalizeMatchEvents(match.events).map((event) => ({ minute: event.minute, player: refId(event.player), type: event.type, assist: refId(event.assist) }));
    setEditing({ ...match, events, homeTeam: refId(match.homeTeam), awayTeam: refId(match.awayTeam), date: inputDate(match.date),
      homeScore: match.homeScore ?? 0, awayScore: match.awayScore ?? 0, homePenaltyScore: match.homePenaltyScore ?? '', awayPenaltyScore: match.awayPenaltyScore ?? '',
      stage: match.stage || 'Лига', time: match.time || '18:00', status: match.status || 'Запланирован', protocolComplete: Boolean(match.protocolComplete), version: match.__v ?? 0 });
  }

  // RU: Сохранить матч через API с номером версии для защиты от конфликтов.
  // EN: Save a match through the API using its version to prevent stale updates.
  async function save(values) {
    const body = { homeTeam: values.homeTeam, awayTeam: values.awayTeam, date: values.date, time: values.time, stage: values.stage,
      stadium: (values.stadium || '').trim() || 'Основной стадион', status: values.status,
      homeScore: Number(values.homeScore), awayScore: Number(values.awayScore),
      homePenaltyScore: values.homePenaltyScore === '' ? null : Number(values.homePenaltyScore),
      awayPenaltyScore: values.awayPenaltyScore === '' ? null : Number(values.awayPenaltyScore), protocolComplete: Boolean(values.protocolComplete),
      events: values.events };
    if (editing._id) await api.put(`/matches/${editing._id}`, { ...body, version: editing.version });
    else await api.post('/matches', body);
    setNotice(editing._id ? t('Матч и турнирная статистика обновлены.') : t('Матч добавлен в календарь.'));
    list.refresh();
  }

  // RU: Удалить матч и инициировать пересчёт зависимой статистики на сервере.
  // EN: Delete a match and trigger the server's dependent-statistics recalculation.
  async function remove() {
    await api.delete(`/matches/${removing._id}`, { params: { version: removing.__v } });
    setNotice(t('Матч и его вклад в статистику удалены.'));
    list.refresh();
  }

  // RU: Изменить отдельное поле текущей формы матча.
  // EN: Update one field in the current match form.
  function patch(key, value) { setEditing((current) => ({ ...current, [key]: value })); }
  // RU: Очищать протокол при переводе матча в расписание или отмене.
  // EN: Clear the result protocol when returning a match to the schedule or cancelling it.
  function changeStatus(value, updateForm) {
    patch('status', value);
    if (value !== 'Завершён') {
      for (const [key, nextValue] of [['homePenaltyScore', ''], ['awayPenaltyScore', '']]) {
        patch(key, nextValue);
        updateForm?.(key, nextValue);
      }
    }
    if (['Запланирован', 'Отменён'].includes(value)) {
      for (const [key, nextValue] of [['homeScore', 0], ['awayScore', 0], ['homePenaltyScore', ''], ['awayPenaltyScore', ''], ['events', []], ['protocolComplete', false]]) {
        patch(key, nextValue);
        updateForm?.(key, nextValue);
      }
    }
  }
  const scoreLocked = editing && ['Запланирован', 'Отменён'].includes(editing.status);
  const teamOptions = teams.data.map((team) => ({ value: team._id, label: team.name }));
  const matchFields = [
    { name: 'participantsHeading', type: 'custom', render: () => <MatchFormSection title={t('Участники матча')} description={t('Сначала выберите две разные команды турнира.')} /> },
    { name: 'homeTeam', label: 'Команда хозяев', type: 'select', required: true, placeholder: 'Выберите команду', options: teamOptions,
      optionsFor: (values) => teamOptions.filter((team) => team.value !== values.awayTeam) },
    { name: 'awayTeam', label: 'Команда гостей', type: 'select', required: true, placeholder: 'Выберите команду', options: teamOptions,
      optionsFor: (values) => teamOptions.filter((team) => team.value !== values.homeTeam) },
    { name: 'scheduleHeading', type: 'custom', render: () => <MatchFormSection title={t('Дата, время и место')} description={t('Время указывается по Ошу, Кыргызстан · UTC+6.')} /> },
    { name: 'date', label: 'Дата матча', type: 'date', required: true },
    { name: 'time', label: 'Время · Ош, UTC+6', type: 'time', required: true },
    { name: 'stadium', label: 'Стадион', required: true, maxLength: 150, placeholder: 'Например, Центральный стадион' },
    { name: 'resultHeading', type: 'custom', render: ({ values }) => <MatchFormSection title={t('Статус и результат')} description={t(values.status === 'Запланирован' ? 'Оставьте статус «Запланирован» для матча, который ещё не начался. Результат и события откроются после смены статуса.' : 'Введите итоговый счёт и добавьте события матча: авторов голов, автоголы и карточки.')} /> },
    { name: 'status', label: 'Статус матча', type: 'select', required: true, onChange: changeStatus, options: matchStatuses.map((value) => ({ value, label: value })) },
    { name: 'stage', label: 'Этап турнира', type: 'select', required: true, options: matchStages.map((value) => ({ value, label: value })) },
    { name: 'homeScore', label: 'Голы хозяев', type: 'number', min: 0, max: 999, required: true },
    { name: 'awayScore', label: 'Голы гостей', type: 'number', min: 0, max: 999, required: true },
    { name: 'homePenaltyScore', label: 'Пенальти хозяев (если ничья в плей-офф)', type: 'number', min: 0, max: 99, disabled: (values) => values.status !== 'Завершён' || !['Полуфинал', 'Матч за 3-е место', 'Финал'].includes(values.stage) || values.homeScore !== values.awayScore },
    { name: 'awayPenaltyScore', label: 'Пенальти гостей (если ничья в плей-офф)', type: 'number', min: 0, max: 99, disabled: (values) => values.status !== 'Завершён' || !['Полуфинал', 'Матч за 3-е место', 'Финал'].includes(values.stage) || values.homeScore !== values.awayScore },
    { name: 'events', type: 'custom', render: ({ values, update }) => <MatchProtocol editing={values} players={roster} locked={scoreLocked} patch={update} /> },
    { name: 'protocolComplete', label: 'Протокол содержит авторов всех голов по счёту матча', type: 'checkbox', disabled: scoreLocked },
  ];

  return <>
    <Feedback message={notice} onDismiss={() => setNotice('')} />
    {(!teams.data.length || !players.data.length) && <div className="notice notice-info">{t('Добавьте команды и игроков, чтобы назначать участников матчам.')}</div>}
    {(teams.error || players.error) && <div className="notice notice-error" role="alert">{teams.error || players.error}<button className="text-button" onClick={() => { teams.refresh(); players.refresh(); }}>{t('Повторить')}</button></div>}
    <CollectionPage title="Матчи" description="Расписание, результаты и персональные события протокола." {...list} filterOptions={[{ value: '', label: 'Все статусы' }, ...matchStatuses.map((value) => ({ value, label: value }))]} action={<button className="button button-primary" onClick={() => beginEdit()} disabled={teams.data.length < 2}><Plus size={18} />{t('Создать матч')}</button>}>
      <div className="matches-grid">{list.data.map((match) => <article className="match-card surface" key={match._id}><div className="match-card-top"><span className={`match-status status-${match.status === 'Завершён' ? 'finished' : match.status === 'Идёт' ? 'live' : match.status === 'Отменён' ? 'cancelled' : 'scheduled'}`}><span />{t(match.status)}</span><div className="row-actions"><button className="icon-button" aria-label={t('Изменить матч')} onClick={() => beginEdit(match)}><Pencil size={16} /></button><button className="icon-button danger-hover" aria-label={t('Удалить матч')} onClick={() => setRemoving(match)}><Trash2 size={16} /></button></div></div>
        <div className="match-card-meta"><CalendarClock size={15} />{formatMatchDate(match, locale)}</div>
        <span className="match-stage">{t(match.stage || 'Лига')}{match.homePenaltyScore != null ? ` · ${t('пен.')}: ${match.homePenaltyScore}:${match.awayPenaltyScore}` : ''}</span>
        <div className="score-line"><div className="score-team"><span className="score-logo">{match.homeTeam?.logo ? <img src={imageUrl(match.homeTeam.logo)} alt="" /> : <Users size={18} />}</span><b>{match.homeTeam?.name || t('Команда')}</b></div><strong className="score-box">{match.status === 'Завершён' || match.status === 'Идёт' ? `${match.homeScore} : ${match.awayScore}` : '— : —'}</strong><div className="score-team away"><b>{match.awayTeam?.name || t('Команда')}</b><span className="score-logo">{match.awayTeam?.logo ? <img src={imageUrl(match.awayTeam.logo)} alt="" /> : <Users size={18} />}</span></div></div>
        <div className="match-card-bottom"><span><Flag size={14} />{match.stadium || t('Основной стадион')}</span><span><MessageSquareText size={14} />{t(match.protocolComplete ? 'Протокол полный' : 'Протокол частичный')}</span></div>
        {match.events?.length > 0 && <div className="event-preview">{match.events.slice(0, 4).map((event) => { const scorerTeamId = event.team?._id || event.player?.team?._id; const creditedTeam = scorerTeamId === match.homeTeam?._id ? match.awayTeam?.name : scorerTeamId === match.awayTeam?._id ? match.homeTeam?.name : ''; return <span className="event-preview-item" key={event._id}><i className={`event-mark event-${event.type === 'Гол' ? 'goal' : event.type === 'Автогол' ? 'own' : 'card'}`} />{event.minute}′ · {event.player?.name || t('Игрок')} · {t(event.type)}{event.type === 'Автогол' && creditedTeam ? ` · ${t('в пользу')}: ${creditedTeam}` : ''}</span>; })}{match.events.length > 4 && <span className="event-more">+{match.events.length - 4} {t('события')}</span>}</div>}
      </article>)}</div>
    </CollectionPage>
    {editing && <EntityDialog title={editing._id ? 'Изменить матч' : 'Новый матч'} fields={matchFields} initial={editing} onClose={closeEdit} onSubmit={save} submitLabel={editing._id ? 'Сохранить результат' : 'Добавить матч'} />}
    {removing && <ConfirmDialog title="Удалить матч?" description="Это также пересчитает таблицу, голы, ассисты и карточки." onClose={closeRemove} onConfirm={remove} />}
  </>;
}

// RU: Редактировать участников, типы событий и ассисты полного протокола.
// EN: Edit participants, event types, and assists in the match protocol.
// RU: Редактировать участников, типы событий и ассисты полного протокола.
// EN: Edit participants, event types, and assists in the match protocol.
function MatchProtocol({ editing, players, locked, patch }) {
  const { t } = useLanguage();
  const events = normalizeMatchEvents(editing?.events);
  const goalTally = events.reduce((goals, event) => {
    if (!['Гол', 'Автогол'].includes(event.type)) return goals;
    const player = players.get(event.player);
    const playerTeam = player?.team?._id;
    const creditedTeam = event.type === 'Автогол'
      ? (playerTeam === editing.homeTeam ? editing.awayTeam : playerTeam === editing.awayTeam ? editing.homeTeam : '')
      : playerTeam;
    if (creditedTeam === editing.homeTeam) goals.home += 1;
    if (creditedTeam === editing.awayTeam) goals.away += 1;
    return goals;
  }, { home: 0, away: 0 });
  const scoreMatchesProtocol = goalTally.home === Number(editing.homeScore) && goalTally.away === Number(editing.awayScore);
  // RU: Изменить событие и сбросить ассист при смене автора.
  // EN: Update an event and clear its assist when its scorer changes.
  function updateEvent(index, key, value) {
    const updatedEvents = events.map((event, current) => current === index ? { ...event, [key]: value, ...(key === 'player' ? { assist: '' } : {}) } : event);
    patch('events', updatedEvents);
  }
  // RU: Добавить пустое событие в протокол текущего матча.
  // EN: Add an empty event to the current match protocol.
  function addEvent() { patch('events', [...events, { minute: 1, player: '', type: 'Гол', assist: '' }]); }
  const eventFields = events.map((event, index) => {
    const player = players.get(event.player);
    const eligible = event.type === 'Гол' && player ? [...players.values()].filter((person) => person.team?._id === player.team?._id && person._id !== player._id) : [];
    return <div className="protocol-event" key={index}><label className="field event-minute"><span>{t('Минута')}</span><input type="number" min="0" max="180" value={event.minute} disabled={locked} onChange={(input) => updateEvent(index, 'minute', Number(input.target.value))} /></label>
      <label className="field"><span>{t('Тип события')}</span><select value={event.type} disabled={locked} onChange={(input) => updateEvent(index, 'type', input.target.value)}>{eventTypes.map((type) => <option key={type} value={type}>{t(type)}</option>)}</select></label>
      <label className="field"><span>{t('Игрок')}</span><select required={!locked} value={event.player} disabled={locked} onChange={(input) => updateEvent(index, 'player', input.target.value)}><option value="" disabled>{t('Выберите игрока')}</option>{[...players.values()].filter((person) => [editing.homeTeam, editing.awayTeam].includes(person.team?._id)).map((person) => <option key={person._id} value={person._id}>{person.name} · {person.team?.name}</option>)}</select></label>
      {event.type === 'Гол' && <label className="field"><span>{t('Ассистент')}</span><select value={event.assist || ''} disabled={locked} onChange={(input) => updateEvent(index, 'assist', input.target.value)}><option value="">{t('Без ассиста')}</option>{eligible.map((person) => <option key={person._id} value={person._id}>{person.name}</option>)}</select></label>}
      {event.type === 'Автогол' && player && <p className="own-goal-note">{t('Гол будет записан команде соперника')}: {player.team?._id === editing.homeTeam ? t('Команда гостей') : t('Команда хозяев')}</p>}
      <button className="icon-button danger-hover event-remove" type="button" disabled={locked} aria-label={t('Удалить событие')} onClick={() => patch('events', events.filter((_, current) => current !== index))}><X size={17} /></button>
    </div>;
  });

  return <div className="protocol-panel"><div className="protocol-heading"><div><span className="eyebrow">{t('ПРОТОКОЛ МАТЧА')}</span><p>{t('Добавляйте каждое событие отдельно. Для гола укажите автора, для автогола — игрока и его команду.')}</p></div><button className="button button-secondary" type="button" disabled={locked || events.length >= 500} onClick={addEvent}><PlusCircle size={16} />{t('Добавить событие')}</button></div>
    {locked && <p className="protocol-lock"><CircleAlert size={15} />{t('Для завершённого результата выберите статус «Идёт» или «Завершён».')}</p>}
    {eventFields.length ? <div className="protocol-events">{eventFields}</div> : <div className="protocol-empty"><Target size={17} />{t('Событий пока нет')}</div>}
    {!locked && <div className={`protocol-tally ${scoreMatchesProtocol ? 'is-valid' : 'is-warning'}`}><CircleCheck size={16} /><span>{t('По событиям')}: {goalTally.home} : {goalTally.away} · {t('Счёт матча')}: {Number(editing.homeScore) || 0} : {Number(editing.awayScore) || 0}{!scoreMatchesProtocol ? ` · ${t('Проверьте, что все голы и автоголы внесены правильно.')}` : ''}</span></div>}
    <div className="protocol-explainer"><CircleCheck size={16} />{t(editing.protocolComplete ? 'Все голы должны быть привязаны к событию «Гол» или «Автогол».' : 'Можно сначала записать счёт, а события протокола добавить позже.')}</div>
  </div>;
}

// RU: Показать короткое название и пояснение этапа формы матча.
// EN: Render a concise heading and helper text for a match-form section.
function MatchFormSection({ title, description }) {
  return <div className="match-form-section"><strong>{title}</strong><span>{description}</span></div>;
}
