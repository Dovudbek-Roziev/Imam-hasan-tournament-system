const mongoose = require('mongoose');
const AppError = require('./AppError');
const { objectId, calendarDate } = require('./input');
const { STATUS, normalizeStatus } = require('../domain/matchRules');

const definitions = Object.freeze({
    teams: { filters: ['search'], sorts: ['name', '-name', '-points'], defaultSort: 'name' },
    players: { filters: ['search', 'team'], sorts: ['name', '-name', 'number', '-goals', '-assists'], defaultSort: 'name' },
    matches: { filters: ['team', 'status', 'from', 'to'], sorts: ['date', '-date'], defaultSort: 'date' },
    news: { filters: ['search', 'from', 'to'], sorts: ['date', '-date', 'title'], defaultSort: '-date' },
});

// RU: Отклонить неподдерживаемый параметр вместо молчаливого игнорирования.
// EN: Reject unsupported query parameters instead of silently ignoring them.
function invalidQuery() { throw new AppError(400, 'Проверьте параметры фильтрации, сортировки и страницы.', 'INVALID_QUERY'); }

// RU: Прочитать ограниченное положительное число без неявного преобразования массивов.
// EN: Read a bounded positive integer without implicitly coercing arrays.
function positive(value, fallback, max) {
    if (value === undefined) return fallback;
    if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) invalidQuery();
    return Number(value);
}

// RU: Составить фильтр только из разрешённых скалярных параметров; поиск является буквальным.
// EN: Build filters from allowed scalar parameters only; search treats input literally.
function parseListQuery(resource, query) {
    const definition = definitions[resource];
    const allowed = ['page', 'limit', 'sort', ...definition.filters];
    for (const [key, value] of Object.entries(query)) {
        if (!allowed.includes(key) || typeof value !== 'string' || value.length > 100) invalidQuery();
    }
    const page = positive(query.page, 1, 100001), limit = positive(query.limit, 20, 100);
    const skip = (page - 1) * limit;
    if (skip > 100000) invalidQuery();
    const selectedSort = query.sort || definition.defaultSort;
    if (!definition.sorts.includes(selectedSort)) invalidQuery();
    const direction = selectedSort.startsWith('-') ? -1 : 1;
    const field = selectedSort.replace(/^-/, '');
    const sort = { [field]: direction };
    if (resource === 'matches') sort.time = direction;
    sort._id = direction;
    const filter = {};
    if (query.search !== undefined) {
        const search = query.search.trim();
        if (!search) invalidQuery();
        filter[resource === 'news' ? 'title' : 'name'] = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    }
    if (query.team !== undefined) {
        const team = new mongoose.Types.ObjectId(objectId(query.team));
        if (resource === 'matches') filter.$or = [{ homeTeam: team }, { awayTeam: team }];
        else filter.team = team;
    }
    if (query.status !== undefined) {
        const status = normalizeStatus(query.status);
        if (!Object.values(STATUS).includes(status)) invalidQuery();
        const legacy = { [STATUS.SCHEDULED]: 'scheduled', [STATUS.LIVE]: 'live', [STATUS.FINISHED]: 'finished', [STATUS.CANCELLED]: 'cancelled' };
        filter.status = { $in: [status, legacy[status]] };
    }
    if (query.from !== undefined || query.to !== undefined) {
        filter.date = {};
        if (query.from !== undefined) filter.date.$gte = calendarDate(query.from);
        if (query.to !== undefined) filter.date.$lt = new Date(calendarDate(query.to).getTime() + 86400000);
        if (filter.date.$gte && filter.date.$lt && filter.date.$gte >= filter.date.$lt) invalidQuery();
    }
    return { filter, sort, page, limit, skip };
}

module.exports = { definitions, parseListQuery };
