const mongoose = require('mongoose');
const { STATUS, EVENT, STAGE, normalizeStatus, normalizeEvent, normalizeStage, serializeMatch } = require('../domain/matchRules');
const { DEFAULT_TIME_ZONE, validTimeZone, startsAt } = require('../domain/matchTime');

// RU: Событие хранит команду автора и необязательного ассистента гола.
// EN: An event stores its author's team and an optional goal assistant.
const eventSchema = new mongoose.Schema({
    minute: { type: Number, required: true, min: 0, max: 180, validate: Number.isInteger },
    player: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', required: true },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
    type: { type: String, enum: Object.values(EVENT), set: normalizeEvent, required: true },
    assist: { type: mongoose.Schema.Types.ObjectId, ref: 'Player', default: null },
}, { strict: 'throw' });

// RU: Матч сохраняется вместе со статистикой через транзакционный сервис.
// EN: A match is persisted with its statistics through the transactional service.
const matchSchema = new mongoose.Schema({
    homeTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: [true, 'Выберите хозяев.'] },
    awayTeam: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: [true, 'Выберите гостей.'] },
    homeScore: { type: Number, default: 0, min: 0, max: 999, validate: Number.isInteger },
    awayScore: { type: Number, default: 0, min: 0, max: 999, validate: Number.isInteger },
    homePenaltyScore: { type: Number, default: null, min: 0, max: 99, validate: value => value === null || Number.isInteger(value) },
    awayPenaltyScore: { type: Number, default: null, min: 0, max: 99, validate: value => value === null || Number.isInteger(value) },
    stage: { type: String, enum: Object.values(STAGE), set: normalizeStage, default: STAGE.LEAGUE },
    date: { type: Date, required: [true, 'Введите дату матча.'] },
    time: { type: String, required: [true, 'Введите время матча.'], match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    timeZone: { type: String, default: DEFAULT_TIME_ZONE, validate: validTimeZone },
    stadium: { type: String, trim: true, maxlength: 150, default: 'Основной стадион' },
    status: { type: String, enum: Object.values(STATUS), set: normalizeStatus, default: STATUS.SCHEDULED },
    protocolComplete: { type: Boolean, default: false },
    events: { type: [eventSchema], default: [], validate: value => value.length <= 500 },
}, { timestamps: true, strict: 'throw', optimisticConcurrency: true,
    toJSON: { transform: serializeMatch }, toObject: { transform: serializeMatch } });

// RU: Отсеять невозможное состояние до записи в MongoDB.
// EN: Reject impossible match states before writing to MongoDB.
matchSchema.pre('validate', function validateMatchState() {
    if (!startsAt(this.date, this.time, this.timeZone)) {
        this.invalidate('time', 'Дата и время должны однозначно определять начало матча в часовом поясе турнира.');
    }
    if (this.homeTeam && this.awayTeam && this.homeTeam.equals(this.awayTeam)) {
        this.invalidate('awayTeam', 'Команда не может играть сама с собой.');
    }
    if ([STATUS.SCHEDULED, STATUS.CANCELLED].includes(normalizeStatus(this.status)) &&
        (this.homeScore !== 0 || this.awayScore !== 0 || this.events.length !== 0 || this.homePenaltyScore !== null || this.awayPenaltyScore !== null)) {
        this.invalidate('status', 'У запланированного или отменённого матча не должно быть результата и событий.');
    }
    const knockout = [STAGE.SEMIFINAL, STAGE.THIRD_PLACE, STAGE.FINAL].includes(normalizeStage(this.stage));
    const hasHomePenalties = this.homePenaltyScore !== null;
    const hasAwayPenalties = this.awayPenaltyScore !== null;
    if (hasHomePenalties !== hasAwayPenalties ||
        ((hasHomePenalties || hasAwayPenalties) && (!knockout || normalizeStatus(this.status) !== STATUS.FINISHED ||
            this.homeScore !== this.awayScore || this.homePenaltyScore === this.awayPenaltyScore)) ||
        (!knockout && (hasHomePenalties || hasAwayPenalties)) ||
        (knockout && normalizeStatus(this.status) === STATUS.FINISHED && this.homeScore === this.awayScore && !hasHomePenalties)) {
        this.invalidate('homePenaltyScore', 'Для ничьей в матче плей-офф укажите разные результаты серии пенальти.');
    }
});

matchSchema.index({ status: 1, date: 1, time: 1, _id: 1 });
matchSchema.index({ date: 1, time: 1, _id: 1 });
matchSchema.index({ homeTeam: 1 });
matchSchema.index({ awayTeam: 1 });
matchSchema.index({ 'events.player': 1 });
matchSchema.index({ 'events.assist': 1 });

module.exports = mongoose.model('Match', matchSchema);
