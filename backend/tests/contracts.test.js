const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const News = require('../models/News');
const User = require('../models/User');
const TournamentState = require('../models/TournamentState');
const { seedDemo } = require('../services/demoService');
const { getDashboard } = require('../services/dashboardService');
const { createAdmin } = require('../services/adminService');
const { issueToken } = require('../services/tokenService');
const { validateEnv } = require('../config/env');
const { startsAt } = require('../domain/matchTime');
const { parseListQuery } = require('../utils/listQuery');
const createApp = require('../app');
const specification = require('../docs/openapi');

let database, server, base, token, observerToken, config;

// RU: Поднять изолированный replica set для проверки контракта через настоящий HTTP.
// EN: Start an isolated replica set to verify the contract through real HTTP.
before(async () => {
    database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(database.getUri('contracts_demo'));
    for (const Model of [Team, Player, Match, News, User, TournamentState]) await Model.init();
    config = validateEnv({ NODE_ENV: 'test', MONGO_URI: database.getUri(), JWT_SECRET: 'contract-tests-only-secret-'.repeat(3) });
    server = createApp(config, { logger: { error() {} } }).listen(0, '127.0.0.1');
    if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
}, { timeout: 180000 });

// RU: Готовить одинаковую демонстрационную историю и роли перед каждым сценарием.
// EN: Prepare the same demo history and roles before each scenario.
beforeEach(async () => {
    for (const Model of [Match, Player, Team, News, User, TournamentState]) await Model.deleteMany({});
    await seedDemo({ date: '2026-10-17' });
    const admin = await createAdmin({ name: 'Проверка', email: 'api@example.test', password: 'КонтрактПароль123' });
    token = issueToken(admin, config);
    const observer = await User.create({ name: 'Наблюдатель', email: 'observer@example.test', passwordHash: admin.passwordHash, role: 'Наблюдатель' });
    observerToken = issueToken(observer, config);
});

// RU: Закрыть только тестовые соединения и временную базу.
// EN: Close only test connections and the temporary database.
after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await mongoose.disconnect();
    if (database) await database.stop();
});

// RU: Выполнить GET-запрос с необязательным Bearer-токеном.
// EN: Make a GET request with an optional Bearer token.
async function get(route, bearer) {
    const response = await fetch(`${base}${route}`, { headers: bearer ? { Authorization: `Bearer ${bearer}` } : {} });
    return { status: response.status, headers: response.headers, body: await response.json() };
}

// RU: Проверить стабильные непересекающиеся страницы и честные метаданные пустой страницы.
// EN: Verify stable non-overlapping pages and accurate metadata for an empty page.
test('Списки: страницы, общий итог, сортировка и пустой результат', async () => {
    const first = await get('/api/teams?limit=2&page=1');
    const second = await get('/api/teams?limit=2&page=2');
    assert.equal(first.status, 200);
    assert.deepEqual(first.body.pagination, { page: 1, limit: 2, total: 4, pages: 2, hasNext: true });
    assert.equal(second.body.pagination.hasNext, false);
    assert.equal(new Set([...first.body.data, ...second.body.data].map(team => team._id)).size, 4);
    const reverse = await get('/api/teams?sort=-name&limit=4');
    assert.deepEqual(reverse.body.data.map(team => team.name), [...first.body.data, ...second.body.data].map(team => team.name).reverse());
    const empty = await get('/api/teams?page=9&limit=2');
    assert.deepEqual(empty.body.data, []);
    assert.equal(empty.body.pagination.total, 4);
    assert.equal((await get('/api/teams?search=' + encodeURIComponent('Неизвестная'))).body.pagination.pages, 0);
});

// RU: Искать русские имена без учёта регистра и не исполнять пользовательское регулярное выражение.
// EN: Search Russian names case-insensitively without executing user-supplied regex.
test('Поиск буквальный; игроки фильтруются по команде', async () => {
    const team = await Team.findOne({ name: 'Ош' });
    const found = await get(`/api/players?team=${team._id}&search=${encodeURIComponent('АЗАМАТ')}`);
    assert.equal(found.body.data.length, 1);
    assert.equal(found.body.data[0].team.name, 'Ош');
    assert.equal((await get('/api/teams?search=.*')).body.data.length, 0);
    assert.equal((await get('/api/news?search=' + encodeURIComponent('расписание'))).body.pagination.total, 1);
});

// RU: Отклонять операторы, массивы, неизвестные фильтры и чрезмерные страницы.
// EN: Reject operators, arrays, unknown filters, and excessive pagination.
test('Некорректные query-параметры возвращают 400', async () => {
    for (const route of ['/api/teams?limit=101', '/api/teams?page=0', '/api/teams?page=1&page=2',
        '/api/teams?search[$ne]=x', '/api/teams?sort=__proto__', '/api/teams?extra=1',
        '/api/teams?page=100001&limit=100', '/api/players?team=broken',
        '/api/matches?status=unknown', '/api/matches?from=2026-02-30', '/api/news?from=2026-10-18&to=2026-10-17']) {
        const result = await get(route);
        assert.equal(result.status, 400, route);
        assert.match(result.body.message, /[А-Яа-я]/);
    }
    assert.throws(() => parseListQuery('teams', { limit: '1e2' }));
});

// RU: Объединять статус, участника и календарный диапазон, включая старые английские статусы.
// EN: Combine status, participant, and calendar bounds, including legacy English statuses.
test('Фильтры матчей учитывают обе команды и старые записи', async () => {
    const finished = await Match.findOne({ status: 'Завершён' });
    await Match.collection.updateOne({ _id: finished._id }, { $set: { status: 'finished' } });
    const found = await get(`/api/matches?team=${finished.awayTeam}&status=finished&from=2026-10-17&to=2026-10-17`);
    assert.equal(found.body.pagination.total, 1);
    assert.equal(found.body.data[0].status, 'Завершён');
    assert.equal(found.body.data[0].events[0].assist.name, 'Бекзат Осмонов');
    assert.equal((await get('/api/matches?from=2026-10-18&to=2026-10-18')).body.pagination.total, 1);
});

// RU: Включать весь последний день для новостей и исключать полночь следующего дня.
// EN: Include the entire final day for news while excluding the next day's midnight.
test('Диапазон дат новостей включает обе календарные границы', async () => {
    await News.deleteMany({});
    await News.create([
        { title: 'Начало', content: 'Текст', date: new Date('2026-10-17T00:00:00Z') },
        { title: 'Конец', content: 'Текст', date: new Date('2026-10-17T23:59:59Z') },
        { title: 'Следующий день', content: 'Текст', date: new Date('2026-10-18T00:00:00Z') },
    ]);
    assert.equal((await get('/api/news?from=2026-10-17&to=2026-10-17')).body.pagination.total, 2);
});

// RU: Время Оша должно преобразовываться в UTC независимо от времени компьютера.
// EN: Osh local time must convert to UTC independently of the computer's time zone.
test('Время: Ош, смена даты UTC и переходы летнего времени', async () => {
    assert.equal(config.timeZone, 'Asia/Bishkek');
    assert.equal(startsAt('2026-10-17', '18:30'), '2026-10-17T12:30:00.000Z');
    assert.equal(startsAt('2026-10-17', '00:15'), '2026-10-16T18:15:00.000Z');
    assert.equal(startsAt('2026-03-08', '02:30', 'America/New_York'), null);
    assert.equal(startsAt('2026-11-01', '01:30', 'America/New_York'), null);
    const result = await get('/api/matches?status=' + encodeURIComponent('Запланирован'));
    assert.equal(result.body.data[0].startsAt, '2026-10-18T12:30:00.000Z');
    assert.equal(result.body.data[0].timeZone, 'Asia/Bishkek');
    assert.throws(() => validateEnv({ MONGO_URI: database.getUri(), JWT_SECRET: 'x'.repeat(40), TOURNAMENT_TIME_ZONE: 'Invalid/Zone' }));
});

// RU: Dashboard считает только официальные голы и выбирает ближайший будущий матч по UTC.
// EN: The dashboard counts official goals only and picks upcoming fixtures by UTC.
test('Dashboard: реальные итоги, неполный протокол и будущие матчи', async () => {
    let data = await getDashboard(config.timeZone, new Date('2026-10-18T12:29:59Z'));
    assert.equal(data.teams, 4); assert.equal(data.players, 8); assert.equal(data.news, 2);
    assert.deepEqual(data.matches, { total: 3, scheduled: 1, live: 1, finished: 1, cancelled: 0, goals: 1, incompleteProtocols: 0 });
    assert.equal(data.upcoming.length, 1);
    assert.equal(data.upcoming[0].homeTeam.name, 'Ош');
    data = await getDashboard(config.timeZone, new Date('2026-10-18T12:30:01Z'));
    assert.deepEqual(data.upcoming, []);
    await Match.collection.updateOne({ status: 'Завершён' }, { $set: { status: 'finished', protocolComplete: false } });
    data = await getDashboard(config.timeZone);
    assert.equal(data.matches.finished, 1);
    assert.equal(data.matches.incompleteProtocols, 1);
    const result = await get('/api/stats/dashboard', token);
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('cache-control'), 'no-store');
});

// RU: Пустой турнир возвращает нулевые показатели без ошибки агрегации.
// EN: An empty tournament returns zero totals without aggregation errors.
test('Dashboard: пустая база возвращает нули', async () => {
    for (const Model of [Match, Player, Team, News]) await Model.deleteMany({});
    const result = await get('/api/stats/dashboard', token);
    assert.equal(result.status, 200);
    assert.equal(result.body.data.teams, 0);
    assert.equal(result.body.data.matches.total, 0);
    assert.deepEqual(result.body.data.upcoming, []);
});

// RU: Административные чтения не доступны анонимному клиенту и наблюдателю.
// EN: Administrative reads are unavailable to anonymous clients and observers.
test('Dashboard и архив требуют действующего администратора', async () => {
    for (const route of ['/api/stats/dashboard', '/api/stats/archive']) {
        assert.equal((await get(route)).status, 401);
        assert.equal((await get(route, observerToken)).status, 403);
    }
});

// RU: Снимок содержит историю и восстановленные итоги, но не секреты; рабочая база неизменна.
// EN: A snapshot contains history and rebuilt totals but no secrets; the database stays unchanged.
test('Архив сохраняет связи и пересчитанные показатели без изменения базы', async () => {
    await Team.updateOne({ name: 'Ош' }, { points: 999 });
    const result = await get('/api/stats/archive', token);
    assert.equal(result.status, 200);
    assert.match(result.headers.get('content-disposition'), /attachment/);
    assert.equal(result.body.data.schemaVersion, 1);
    assert.equal(result.body.data.teams.find(team => team.name === 'Ош').points, 3);
    assert.equal((await Team.findOne({ name: 'Ош' })).points, 999);
    assert.equal(result.body.data.players.length, 8);
    assert.equal(result.body.data.matches.length, 3);
    assert.equal(result.body.data.users, undefined);
    assert.doesNotMatch(JSON.stringify(result.body), /passwordHash|tokenVersion|JWT_SECRET|MONGO_URI/);
});

// RU: Повторный seed не удаляет данные и не добавляет дубликаты.
// EN: Repeated seeding neither deletes data nor adds duplicates.
test('Демоданные: повторный запуск сохраняет существующие записи', async () => {
    await assert.rejects(() => seedDemo({ date: '2026-10-17' }), { code: 'DEMO_NOT_EMPTY' });
    assert.equal(await Team.countDocuments(), 4);
    assert.equal(await Match.countDocuments(), 3);
    assert.equal((await Team.findOne({ name: 'Ош' })).points, 3);
});

// RU: При позднем сбое seed не должен оставлять команды, игроков или результаты.
// EN: A late seed failure must not leave teams, players, or results behind.
test('Демоданные: поздняя ошибка откатывает все созданные сущности', async context => {
    for (const Model of [Match, Player, Team, News, User, TournamentState]) await Model.deleteMany({});
    context.mock.method(News, 'create', async () => { throw new Error('Тестовый сбой демоданных'); });
    await assert.rejects(() => seedDemo({ date: '2026-10-17' }), /Тестовый сбой/);
    for (const Model of [Match, Player, Team, News]) assert.equal(await Model.countDocuments(), 0);
});

// RU: Без отдельного demo URI команда должна завершаться до подключения к рабочей базе.
// EN: Without a dedicated demo URI, the command must exit before connecting to the live database.
test('Демоданные: CLI не использует MONGO_URI и не принимает рабочее имя базы', () => {
    for (const uri of ['', 'mongodb://127.0.0.1:1/production']) {
        const result = spawnSync(process.execPath, [path.join(__dirname, '../scripts/seed-demo.js')], {
            env: { ...process.env, DEMO_MONGO_URI: uri, MONGO_URI: database.getUri('contracts_demo') }, encoding: 'utf8', timeout: 10000,
        });
        assert.equal(result.status, 1);
        assert.match(result.stderr, /DEMO_MONGO_URI/);
        assert.doesNotMatch(result.stderr, /mongodb:\/\//);
    }
});

// RU: Проверить переносимый контракт, уникальность операций и разрешимость всех ссылок.
// EN: Verify the portable contract, operation uniqueness, and resolution of every reference.
test('OpenAPI доступен без входа и соответствует сохранённому JSON', async () => {
    const result = await get('/api/openapi.json');
    assert.equal(result.status, 200);
    assert.equal(result.body.openapi, '3.1.0');
    assert.deepEqual(result.body, JSON.parse(fs.readFileSync(path.join(__dirname, '../docs/openapi.json'), 'utf8')));
    const operationIds = [];
    for (const item of Object.values(specification.paths)) for (const method of ['get', 'post', 'put', 'delete']) {
        if (item[method]) operationIds.push(item[method].operationId);
    }
    assert.equal(new Set(operationIds).size, operationIds.length);
    // RU: Рекурсивно проверять внутренние ссылки документа.
    // EN: Recursively check internal document references.
    function checkReferences(value) {
        if (!value || typeof value !== 'object') return;
        if (value.$ref) {
            const target = value.$ref.slice(2).split('/').reduce((node, key) => node?.[key], specification);
            assert.ok(target, value.$ref);
        }
        for (const child of Object.values(value)) checkReferences(child);
    }
    checkReferences(specification);
    assert.deepEqual(specification.components.schemas.MatchUpdate.required, ['version']);
});
