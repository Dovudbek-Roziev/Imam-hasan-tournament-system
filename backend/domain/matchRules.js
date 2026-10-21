const { DEFAULT_TIME_ZONE, startsAt } = require('./matchTime');
const STATUS = Object.freeze({ SCHEDULED: 'Запланирован', LIVE: 'Идёт', FINISHED: 'Завершён', CANCELLED: 'Отменён' });
const EVENT = Object.freeze({ GOAL: 'Гол', OWN_GOAL: 'Автогол', YELLOW: 'Жёлтая карточка', RED: 'Красная карточка' });
const STAGE = Object.freeze({ LEAGUE: 'Лига', SEMIFINAL: 'Полуфинал', THIRD_PLACE: 'Матч за 3-е место', FINAL: 'Финал' });
const oldStatuses = new Map([['scheduled', STATUS.SCHEDULED], ['live', STATUS.LIVE], ['finished', STATUS.FINISHED], ['cancelled', STATUS.CANCELLED]]);
const oldEvents = new Map([['goal', EVENT.GOAL], ['own_goal', EVENT.OWN_GOAL], ['yellow_card', EVENT.YELLOW], ['red_card', EVENT.RED]]);
const oldStages = new Map([['league', STAGE.LEAGUE], ['semifinal', STAGE.SEMIFINAL], ['third_place', STAGE.THIRD_PLACE], ['final', STAGE.FINAL]]);

// RU: Поддержать чтение старых записей, сохраняя новые статусы на русском.
// EN: Support legacy records while persisting new statuses in Russian.
function normalizeStatus(value) { return oldStatuses.get(value) || value; }

// RU: Привести старое обозначение события к русскому значению.
// EN: Convert a legacy event label to its Russian value.
function normalizeEvent(value) { return oldEvents.get(value) || value; }

// RU: Нормализовать этап матча, оставляя старые записи в основном этапе.
// EN: Normalize the match stage while treating legacy records as league matches.
function normalizeStage(value) { return oldStages.get(value) || value || STAGE.LEAGUE; }

// RU: Вернуть русские значения даже для ещё не мигрированной записи.
// EN: Return Russian values even for records that have not been migrated yet.
function serializeMatch(_document, record) {
    record.status = normalizeStatus(record.status);
    record.stage = normalizeStage(record.stage);
    record.timeZone = record.timeZone || DEFAULT_TIME_ZONE;
    record.startsAt = startsAt(record.date, record.time, record.timeZone);
    record.events = (record.events || []).map(event => ({ ...event, type: normalizeEvent(event.type) }));
    // RU: Показывать события матча в хронологическом порядке.
    // EN: Return match events in chronological order.
    record.events.sort((first, second) => first.minute - second.minute);
    return record;
}

module.exports = { STATUS, EVENT, STAGE, normalizeStatus, normalizeEvent, normalizeStage, serializeMatch };
