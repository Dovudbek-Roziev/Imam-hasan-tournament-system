const { definitions } = require('../utils/listQuery');
const { STATUS, EVENT } = require('../domain/matchRules');

// RU: Построить ссылку на повторно используемую схему API.
// EN: Build a reference to a reusable API schema.
function ref(name) { return { $ref: `#/components/schemas/${name}` }; }
// RU: Описать объект и обязательные поля без дублирования структуры.
// EN: Describe an object and required fields without duplicating its structure.
function object(properties, required = [], additionalProperties = true) { return { type: 'object', properties, required, additionalProperties }; }
// RU: Описать успешный ответ с данными ресурса.
// EN: Describe a successful response containing resource data.
function envelope(data) { return object({ success: { const: true }, data }, ['success', 'data']); }
// RU: Описать JSON-ответ операции.
// EN: Describe an operation's JSON response.
function response(schema, description = 'Успешный ответ') { return { description, content: { 'application/json': { schema } } }; }
// RU: Описать обязательное JSON-тело запроса.
// EN: Describe a required JSON request body.
function body(schema) { return { required: true, content: { 'application/json': { schema } } }; }
// RU: Описать параметр строки запроса.
// EN: Describe a query string parameter.
function query(name, schema, description) { return { name, in: 'query', required: false, schema, description }; }

const id = { type: 'string', pattern: '^[a-fA-F0-9]{24}$' };
const dateTime = { type: 'string', format: 'date-time' };
const count = { type: 'integer', minimum: 0 };
const string = { type: 'string' };
const status = { type: 'string', enum: Object.values(STATUS) };
const eventType = { type: 'string', enum: Object.values(EVENT) };
const teamFields = { name: { type: 'string', minLength: 1, maxLength: 100 }, logo: { type: 'string', maxLength: 2048, description: 'Пустая строка, HTTP/HTTPS URL без учётных данных или внутренний путь /api/media/{id}.' } };
const imageReference = { type: 'string', maxLength: 2048, description: 'Пустая строка, HTTP/HTTPS URL без учётных данных или внутренний путь /api/media/{id}.' };
const playerFields = { name: teamFields.name, team: id, number: { type: ['integer', 'null'], minimum: 1, maximum: 99 }, photo: imageReference };
const eventFields = { minute: { type: 'integer', minimum: 0, maximum: 180 }, player: id, type: eventType, assist: { anyOf: [id, { type: 'null' }] } };
const matchFields = {
    homeTeam: id, awayTeam: id, homeScore: { type: 'integer', minimum: 0, maximum: 999 }, awayScore: { type: 'integer', minimum: 0, maximum: 999 },
    stage: { type: 'string', enum: ['Лига', 'Полуфинал', 'Матч за 3-е место', 'Финал'], default: 'Лига' },
    homePenaltyScore: { type: ['integer', 'null'], minimum: 0, maximum: 99 }, awayPenaltyScore: { type: ['integer', 'null'], minimum: 0, maximum: 99 },
    date: { type: 'string', format: 'date', description: 'Календарная дата в часовом поясе матча, YYYY-MM-DD.' },
    time: { type: 'string', pattern: '^([01][0-9]|2[0-3]):[0-5][0-9]$' }, stadium: { type: 'string', maxLength: 150 }, status,
    protocolComplete: { type: 'boolean', default: false }, events: { type: 'array', maxItems: 500, items: ref('EventInput') },
};
const newsFields = { title: { type: 'string', minLength: 1, maxLength: 200 }, content: { type: 'string', minLength: 1, maxLength: 20000 },
    titleKy: { type: 'string', maxLength: 200, description: 'Необязательный заголовок на кыргызском языке.' }, contentKy: { type: 'string', maxLength: 20000, description: 'Необязательный текст новости на кыргызском языке.' } };
const metadata = { _id: id, __v: count, createdAt: dateTime, updatedAt: dateTime };
const teamStats = Object.fromEntries(['points', 'played', 'won', 'draw', 'lost', 'goalsFor', 'goalsAgainst'].map(key => [key, count]));
teamStats.goalDifference = { type: 'integer' };
const playerStats = Object.fromEntries(['goals', 'assists', 'yellowCards', 'redCards'].map(key => [key, count]));
const teamReference = { anyOf: [id, ref('TeamSummary'), { type: 'null' }] };
const playerReference = { anyOf: [id, ref('PlayerSummary'), { type: 'null' }] };
const schemas = {
    Error: object({ success: { const: false }, code: string, message: string, requestId: string,
        errors: { type: 'array', items: object({ field: string, message: string }, ['field', 'message']) } }, ['success', 'code', 'message']),
    Message: object({ success: { const: true }, message: string }, ['success', 'message']),
    Pagination: object({ page: { type: 'integer', minimum: 1 }, limit: { type: 'integer', minimum: 1, maximum: 100 },
        total: count, pages: count, hasNext: { type: 'boolean' } }, ['page', 'limit', 'total', 'pages', 'hasNext']),
    TeamSummary: object({ _id: id, name: string, logo: string }, ['_id', 'name']),
    PlayerSummary: object({ _id: id, name: string, photo: string, team: teamReference }, ['_id', 'name']),
    Team: object({ ...metadata, ...teamFields, ...teamStats }, ['_id', 'name', ...Object.keys(teamStats)]),
    Player: object({ ...metadata, ...playerFields, team: teamReference, ...playerStats }, ['_id', 'name', 'team', ...Object.keys(playerStats)]),
    EventInput: object(eventFields, ['minute', 'player', 'type'], false),
    Event: object({ ...eventFields, _id: id, team: teamReference, player: playerReference, assist: playerReference }, ['minute', 'player', 'type']),
    Match: object({ ...metadata, ...matchFields, homeTeam: teamReference, awayTeam: teamReference, date: dateTime,
        timeZone: { type: 'string', examples: ['Asia/Bishkek'] }, startsAt: { type: ['string', 'null'], format: 'date-time' },
        events: { type: 'array', items: ref('Event') } }, ['_id', 'homeTeam', 'awayTeam', 'date', 'time', 'timeZone', 'startsAt', 'status']),
    News: object({ ...metadata, ...newsFields, date: dateTime }, ['_id', 'title', 'content', 'date']),
    TeamCreate: object(teamFields, ['name'], false), TeamUpdate: object(teamFields, [], false),
    PlayerCreate: object(playerFields, ['name', 'team'], false), PlayerUpdate: object(playerFields, [], false),
    MatchCreate: object(matchFields, ['homeTeam', 'awayTeam', 'date', 'time'], false),
    MatchUpdate: object({ ...matchFields, version: count }, ['version'], false),
    NewsCreate: object(newsFields, ['title', 'content'], false), NewsUpdate: object(newsFields, [], false),
    User: object({ _id: id, name: string, email: { type: 'string', format: 'email' }, role: { enum: ['Администратор', 'Наблюдатель'] } }, ['_id', 'name', 'email', 'role']),
    Dashboard: object({ generatedAt: dateTime, timeZone: string, teams: count, players: count, news: count,
        matches: object(Object.fromEntries(['total', 'scheduled', 'live', 'finished', 'cancelled', 'goals', 'incompleteProtocols'].map(key => [key, count]))),
        upcoming: { type: 'array', maxItems: 5, items: ref('Match') } }, ['generatedAt', 'timeZone', 'teams', 'players', 'news', 'matches', 'upcoming']),
    Archive: object({ schemaVersion: { const: 1 }, title: string, exportedAt: dateTime, timeZone: string,
        teams: { type: 'array', items: ref('Team') }, players: { type: 'array', items: ref('Player') },
        matches: { type: 'array', items: ref('Match') }, news: { type: 'array', items: ref('News') } },
    ['schemaVersion', 'title', 'exportedAt', 'timeZone', 'teams', 'players', 'matches', 'news']),
};
const errorResponse = response(ref('Error'), 'Ошибка: русское сообщение и машинный код.');
const errors = Object.fromEntries([400, 401, 403, 404, 409, 413, 415, 429, 500, 503].map(code => [code, { $ref: '#/components/responses/Error' }]));
const security = [{ bearerAuth: [] }];
const pathId = { name: 'id', in: 'path', required: true, schema: id, description: 'Идентификатор записи' };
const paths = {};

// RU: Создать документацию общих CRUD-маршрутов и разрешённых фильтров.
// EN: Generate documentation for shared CRUD routes and allowed filters.
function addResource(resource, schema, label) {
    const definition = definitions[resource];
    const parameters = [query('page', { type: 'integer', minimum: 1, maximum: 100001, default: 1 }, 'Страница; смещение не более 100000 записей.'),
        query('limit', { type: 'integer', minimum: 1, maximum: 100, default: 20 }, 'Размер страницы'),
        query('sort', { type: 'string', enum: definition.sorts, default: definition.defaultSort }, 'Порядок сортировки; ID разрешает равенство.')];
    for (const filter of definition.filters) parameters.push(query(filter,
        filter === 'team' ? id : filter === 'status' ? status : filter === 'from' || filter === 'to' ? { type: 'string', format: 'date' } : { type: 'string', minLength: 1, maxLength: 100 },
        { team: 'Команда игрока или любой участник матча', status: 'Статус матча', search: 'Буквальный поиск без учёта регистра по имени/заголовку', from: 'Первая календарная дата включительно', to: 'Последняя календарная дата включительно' }[filter]));
    paths[`/api/${resource}`] = {
        get: { operationId: `list${schema}`, summary: `Список: ${label}`, tags: [label], parameters,
            responses: { 200: response(object({ success: { const: true }, data: { type: 'array', items: ref(schema) }, pagination: ref('Pagination') }, ['success', 'data', 'pagination'])), ...errors } },
        post: { operationId: `create${schema}`, summary: `Создать: ${label}`, tags: [label], security, requestBody: body(ref(`${schema}Create`)), responses: { 201: response(envelope(ref(schema))), ...errors } },
    };
    paths[`/api/${resource}/{id}`] = {
        parameters: [pathId],
        get: { operationId: `get${schema}`, summary: `Получить: ${label}`, tags: [label], responses: { 200: response(envelope(ref(schema))), ...errors } },
        put: { operationId: `update${schema}`, summary: `Изменить: ${label}`, tags: [label], security, requestBody: body(ref(`${schema}Update`)),
            description: schema === 'Match' ? 'Частичное обновление. version обязательна и равна последнему __v; events заменяется целиком. Конфликт версии: 409.' : 'Частичное обновление разрешённых полей.',
            responses: { 200: response(envelope(ref(schema))), ...errors } },
        delete: { operationId: `delete${schema}`, summary: `Удалить: ${label}`, tags: [label], security,
            ...(schema === 'Match' ? { parameters: [query('version', count, 'Рекомендуемая проверка актуальной версии матча перед удалением')] } : {}),
            responses: { 200: response(ref('Message')), ...errors } },
    };
}
for (const [resource, schema, label] of [['teams', 'Team', 'Команды'], ['players', 'Player', 'Игроки'], ['matches', 'Match', 'Матчи'], ['news', 'News', 'Новости']]) addResource(resource, schema, label);
for (const [path, schema, label] of [['table', 'Team', 'Турнирная таблица'], ['top-scorers', 'Player', 'Десять лучших бомбардиров'], ['top-assists', 'Player', 'Десять лучших ассистентов']]) {
    paths[`/api/stats/${path}`] = { get: { operationId: path, summary: label, tags: ['Статистика'], responses: { 200: response(envelope({ type: 'array', items: ref(schema) })), ...errors } } };
}
for (const [path, schema, label] of [['dashboard', 'Dashboard', 'Обзор турнира'], ['archive', 'Archive', 'Скачать снимок турнира']]) {
    paths[`/api/stats/${path}`] = { get: { operationId: path, summary: label, tags: ['Статистика'], security,
        responses: { 200: response(envelope(ref(schema))), ...errors } } };
}
paths['/api/auth/login'] = { post: { operationId: 'login', summary: 'Вход', tags: ['Авторизация'],
    requestBody: body(object({ email: { type: 'string', format: 'email', maxLength: 254 }, password: { type: 'string', minLength: 1, description: 'Максимум 72 байта UTF-8.' } }, ['email', 'password'])),
    responses: { 200: response(envelope(object({ token: string, expiresIn: count, user: ref('User') }, ['token', 'expiresIn', 'user']))), ...errors } } };
paths['/api/auth/me'] = { get: { operationId: 'me', summary: 'Мой профиль', tags: ['Авторизация'], security, responses: { 200: response(envelope(ref('User'))), ...errors } } };
paths['/api/auth/logout'] = { post: { operationId: 'logout', summary: 'Завершить все сеансы пользователя', tags: ['Авторизация'], security, responses: { 200: response(ref('Message')), ...errors } } };
paths['/api/media'] = { post: { operationId: 'uploadProfileImage', summary: 'Загрузить изображение команды или игрока', tags: ['Медиа'], security,
    requestBody: { required: true, content: Object.fromEntries(['image/jpeg', 'image/png', 'image/webp'].map(type => [type, { schema: { type: 'string', format: 'binary' } }])) },
    responses: { 201: response(envelope(object({ path: string }, ['path']))), ...errors } } };
paths['/api/media/{id}'] = { parameters: [pathId], get: { operationId: 'getProfileImage', summary: 'Получить изображение команды или игрока', tags: ['Медиа'],
    responses: { 200: { description: 'Изображение команды', content: Object.fromEntries(['image/jpeg', 'image/png', 'image/webp'].map(type => [type, { schema: { type: 'string', format: 'binary' } }])) }, ...errors } },
    delete: { operationId: 'deleteTeamLogo', summary: 'Удалить неиспользуемое изображение', tags: ['Медиа'], security,
        responses: { 200: response(ref('Message')), ...errors } } };
paths['/health'] = { get: { operationId: 'health', summary: 'Проверка HTTP-процесса', responses: { 200: response(ref('Message')) } } };
paths['/ready'] = { get: { operationId: 'ready', summary: 'Готовность базы данных', responses: {
    200: response(ref('Message')), 503: response(object({ success: { const: false }, message: string }, ['success', 'message']), 'База данных недоступна'),
} } };
paths['/api/openapi.json'] = { get: { operationId: 'openapi', summary: 'Описание API OpenAPI 3.1', responses: { 200: response({ type: 'object' }), ...errors } } };

module.exports = {
    openapi: '3.1.0', info: { title: 'Турнир «Имам Хасан» — API', version: '1.1.0',
    description: 'Турнир в городе Ош, Кыргызстан. Чтение публичное; запись, загрузка медиа, dashboard и архив требуют роли Администратор. Ошибки возвращаются на русском по умолчанию или кыргызском при Accept-Language: ky. Статистика учитывает только завершённые матчи. Старые английские статусы и события принимаются для совместимости; ответы используют русские значения. Списки ограничены 20 записями по умолчанию. Неизвестные параметры списков отклоняются. Для новостей диапазон дат задаётся по UTC; для матчей — по календарным датам расписания.' },
    servers: [{ url: '/', description: 'Текущий сервер' }], paths,
    components: { responses: { Error: errorResponse }, securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', description: 'JWT после входа. Административные операции требуют роли Администратор.' } }, schemas },
};
