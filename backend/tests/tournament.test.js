const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const TournamentState = require('../models/TournamentState');
const roster = require('../services/rosterService');
const matches = require('../services/matchService');
const statistics = require('../services/statisticsService');
const transaction = require('../services/tournamentTransaction');
const { STATUS, EVENT, STAGE } = require('../domain/matchRules');
const createApp = require('../app');
const { validateEnv } = require('../config/env');
const { createAdmin } = require('../services/adminService');
const { issueToken } = require('../services/tokenService');

let database, server, base, token, a, b, c, d, a1, a2, b1, c1;

// RU: Использовать отдельный replica set, не подключаясь к пользовательской базе.
// EN: Use a separate replica set without connecting to the user's database.
before(async () => {
    database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(database.getUri('tournament_test'));
    for (const model of [Team, Player, Match, TournamentState]) await model.init();
    const config = validateEnv({ NODE_ENV: 'test', MONGO_URI: database.getUri(), JWT_SECRET: 'tournament-test-only-secret-'.repeat(3) });
    const admin = await createAdmin({ name: 'Администратор теста', email: 'tournament@example.test', password: 'ТурнирныйПароль123' });
    token = issueToken(admin, config);
    server = createApp(config, { logger: { error() {} } }).listen(0, '127.0.0.1');
    if (!server.listening) await new Promise(resolve => server.once('listening', resolve));
    base = `http://127.0.0.1:${server.address().port}`;
}, { timeout: 180000 });

// RU: Создать чистые команды и составы перед каждым независимым сценарием.
// EN: Prepare clean teams and rosters before each independent scenario.
beforeEach(async () => {
    for (const model of [Match, Player, Team, TournamentState]) await model.deleteMany({});
    [a, b, c, d] = await Team.create([{ name: 'Сокол' }, { name: 'Орлы' }, { name: 'Восток' }, { name: 'Динамо' }]);
    [a1, a2, b1, c1] = await Player.create([
        { name: 'Алексей', team: a._id, number: 9 }, { name: 'Борис', team: a._id, number: 10 },
        { name: 'Виктор', team: b._id, number: 9 }, { name: 'Григорий', team: c._id, number: 9 }, { name: 'Дмитрий', team: d._id, number: 9 },
    ]);
});

// RU: Остановить локальный сервер и удалить только временные тестовые данные.
// EN: Stop the local server and remove only temporary test data.
after(async () => {
    if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    await mongoose.disconnect();
    if (database) await database.stop();
});

// RU: Сформировать событие гола с необязательным ассистентом.
// EN: Build a goal event with an optional assistant.
function goal(player = a1, assistant = null) {
    return { minute: 10, player: String(player._id), type: EVENT.GOAL, assist: assistant ? String(assistant._id) : null };
}

// RU: Построить корректный полный протокол победы хозяев со счётом 1:0.
// EN: Build a valid complete protocol for a 1:0 home win.
function payload(overrides = {}) {
    return { homeTeam: String(a._id), awayTeam: String(b._id), date: '2026-10-17', time: '18:00',
        status: STATUS.FINISHED, homeScore: 1, awayScore: 0, protocolComplete: true, events: [goal(a1, a2)], ...overrides };
}

// RU: Отправить авторизованный запрос через настоящий HTTP-слой.
// EN: Send an authenticated request through the real HTTP layer.
async function request(path, method = 'GET', body) {
    const response = await fetch(`${base}${path}`, { method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { status: response.status, body: await response.json() };
}

// RU: Проверить взаимосвязанные результаты в API и реально сохранённой MongoDB.
// EN: Verify related results in the API and the actual persisted MongoDB state.
test('Полный HTTP-сценарий: гол, ассист, таблица и бомбардиры согласованы', async () => {
    const created = await request('/api/matches', 'POST', payload());
    assert.equal(created.status, 201);
    assert.equal(created.body.data.status, STATUS.FINISHED);
    assert.equal((await Match.collection.findOne({ _id: new mongoose.Types.ObjectId(created.body.data._id) })).status, STATUS.FINISHED);
    const home = await Team.findById(a._id), away = await Team.findById(b._id);
    assert.equal(home.points, 3); assert.equal(home.played, 1); assert.equal(home.won, 1);
    assert.equal(home.goalsFor, 1); assert.equal(home.goalDifference, 1);
    assert.equal(away.points, 0); assert.equal(away.lost, 1); assert.equal(away.goalDifference, -1);
    assert.equal((await Player.findById(a1._id)).goals, 1);
    assert.equal((await Player.findById(a2._id)).assists, 1);
    assert.equal((await request('/api/stats/table')).body.data[0]._id, String(a._id));
    assert.equal((await request('/api/stats/top-scorers')).body.data[0]._id, String(a1._id));
    assert.equal((await request('/api/stats/top-assists')).body.data[0]._id, String(a2._id));
});

// RU: Учитывать ничью и победу гостей, а не только домашнюю победу.
// EN: Cover draws and away wins, not only home wins.
test('Ничья даёт по одному очку, победа гостей даёт три очка гостям', async () => {
    await matches.createMatch(payload({ homeScore: 0, events: [] }));
    assert.equal((await Team.findById(a._id)).points, 1);
    assert.equal((await Team.findById(b._id)).draw, 1);
    await matches.createMatch(payload({ homeScore: 0, awayScore: 1, events: [goal(b1)] }));
    assert.equal((await Team.findById(a._id)).lost, 1);
    assert.equal((await Team.findById(b._id)).points, 4);
    assert.equal((await Player.findById(b1._id)).goals, 1);
});

// RU: Исключать live-результат и все его события из официальных итогов.
// EN: Exclude live results and all their events from official totals.
test('Возврат завершённого матча в live убирает его очки и статистику игроков', async () => {
    const match = await matches.createMatch(payload());
    const updated = await matches.updateMatch(String(match._id), { version: match.__v, status: STATUS.LIVE });
    assert.equal(updated.__v, match.__v + 1);
    assert.equal((await Team.findById(a._id)).played, 0);
    assert.equal((await Player.findById(a1._id)).goals, 0);
    assert.equal((await Player.findById(a2._id)).assists, 0);
    await matches.updateMatch(String(match._id), { version: updated.__v, status: STATUS.FINISHED });
    assert.equal((await Team.findById(a._id)).points, 3);
});

// RU: Очищать результат при возвращении матча в расписание или отмене.
// EN: Clear results when returning a match to the schedule or cancelling it.
test('Запланированный и отменённый матч не сохраняют результат', async () => {
    const match = await matches.createMatch(payload());
    await assert.rejects(() => matches.updateMatch(String(match._id), { version: match.__v, status: STATUS.SCHEDULED }));
    const scheduled = await matches.updateMatch(String(match._id), {
        version: match.__v, status: STATUS.SCHEDULED, homeScore: 0, awayScore: 0, events: [],
    });
    assert.equal((await Team.findById(a._id)).points, 0);
    await matches.updateMatch(String(match._id), { version: scheduled.__v, status: STATUS.CANCELLED });
    assert.equal((await Player.findById(a1._id)).goals, 0);
});

// RU: Сбросить статистику прежней команды после исправления участников.
// EN: Reset the former team's totals after changing match participants.
test('Замена команды в завершённом матче пересчитывает и прежнюю команду', async () => {
    const match = await matches.createMatch(payload({ protocolComplete: false, events: [] }));
    await matches.updateMatch(String(match._id), { version: match.__v, homeTeam: String(c._id) });
    assert.equal((await Team.findById(a._id)).played, 0);
    assert.equal((await Team.findById(a._id)).points, 0);
    assert.equal((await Team.findById(c._id)).points, 3);
    assert.equal((await Team.findById(b._id)).lost, 1);
});

// RU: Обнулить автора удалённого события даже при наличии других событий.
// EN: Zero a removed event author's total even when other events remain.
test('Удаление части событий и затем всего протокола убирает старые голы', async () => {
    const match = await matches.createMatch(payload({ protocolComplete: false, homeScore: 2, events: [goal(a1), goal(a2)] }));
    const reduced = await matches.updateMatch(String(match._id), { version: match.__v, events: [goal(a2)] });
    assert.equal((await Player.findById(a1._id)).goals, 0);
    assert.equal((await Player.findById(a2._id)).goals, 1);
    await matches.updateMatch(String(match._id), { version: reduced.__v, events: [] });
    assert.equal((await Player.findById(a2._id)).goals, 0);
    assert.equal((await Team.findById(a._id)).goalsFor, 2);
});

// RU: Перенести авторство гола и убрать прежнюю передачу после исправления.
// EN: Reassign a goal and remove the previous assist after a correction.
test('Замена автора гола снимает гол и ассист с прежних участников', async () => {
    const match = await matches.createMatch(payload());
    await matches.updateMatch(String(match._id), { version: match.__v, events: [goal(a2)] });
    assert.equal((await Player.findById(a1._id)).goals, 0);
    assert.equal((await Player.findById(a2._id)).goals, 1);
    assert.equal((await Player.findById(a2._id)).assists, 0);
});

// RU: Удаление матча должно убрать одновременно очки, голы, передачи и карточки.
// EN: Match deletion must remove points, goals, assists, and cards together.
test('Удаление матча полностью удаляет его вклад в статистику', async () => {
    const match = await matches.createMatch(payload({ events: [goal(a1, a2),
        { minute: 30, player: String(b1._id), type: EVENT.YELLOW },
        { minute: 50, player: String(a2._id), type: EVENT.RED }] }));
    assert.equal((await Player.findById(b1._id)).yellowCards, 1);
    assert.equal((await Player.findById(a2._id)).redCards, 1);
    await matches.deleteMatch(String(match._id), match.__v);
    for (const team of await Team.find()) assert.equal(team.played, 0);
    for (const player of await Player.find()) {
        assert.equal(player.goals + player.assists + player.yellowCards + player.redCards, 0);
    }
});

// RU: Автогол увеличивает счёт соперника, но не число голов его автора.
// EN: An own goal increases the opponent's score but not the author's goal total.
test('Автогол учитывается в счёте без попадания автора в бомбардиры', async () => {
    const match = await matches.createMatch(payload({ events: [
        { minute: 45, player: String(b1._id), type: EVENT.YELLOW },
        { minute: 15, player: String(b1._id), type: EVENT.OWN_GOAL },
    ] }));
    assert.equal((await Team.findById(a._id)).points, 3);
    assert.equal((await Player.findById(b1._id)).goals, 0);
    const details = await request(`/api/matches/${match._id}`);
    assert.equal(details.body.data.events[0].team.name, 'Орлы');
    assert.equal(details.body.data.events[0].player.team.name, 'Орлы');
    assert.equal(details.body.data.events[0].minute, 15);
    const list = await request('/api/matches');
    assert.equal(list.body.data[0].events[0].team.name, 'Орлы');
});

// RU: Все неверные протоколы должны отклоняться до появления записи или статистики.
// EN: Reject invalid protocols before any record or statistical update becomes visible.
test('Неверные команды, счёт, дата, события и ассисты отклоняются', async () => {
    const missing = String(new mongoose.Types.ObjectId());
    for (const patch of [
        { awayTeam: String(a._id) }, { homeTeam: missing }, { homeTeam: { $ne: null } },
        { homeScore: -1 }, { awayScore: 0.5 }, { homeScore: '1' }, { homeScore: true },
        { date: '2026-02-30' }, { date: '2025-02-29' }, { time: '24:00' },
        { status: 'неизвестно' }, { protocolComplete: 'true' },
        { events: [{ minute: 10, type: EVENT.GOAL }] },
        { events: [goal(c1)] }, { events: [{ ...goal(), player: missing }] },
        { events: [goal(a1, a1)] }, { events: [goal(a1, b1)] },
        { events: [{ ...goal(a1, a2), type: EVENT.YELLOW }] },
        { events: [{ ...goal(), minute: -1 }] }, { events: [{ ...goal(), minute: 1.5 }] },
        { events: [{ ...goal(), type: 'неизвестно' }] },
        { homeScore: 0 }, { events: [] }, { protocolComplete: false, homeScore: 0 },
    ]) await assert.rejects(() => matches.createMatch(payload(patch)));
    assert.equal(await Match.countDocuments(), 0);
    assert.equal((await Team.findById(a._id)).points, 0);
});

// RU: Проверить HTTP-статус и неизменность данных при запрещённых входных полях.
// EN: Verify HTTP status and unchanged data when forbidden fields are supplied.
test('API запрещает изменение вычисляемых и служебных полей', async () => {
    for (const [path, method, body] of [
        ['/api/teams', 'POST', { name: 'Подмена', points: 999 }],
        [`/api/teams/${a._id}`, 'PUT', { $inc: { points: 999 } }],
        [`/api/players/${a1._id}`, 'PUT', { goals: 99 }],
        ['/api/news', 'POST', { title: 'Новость', content: 'Текст', createdAt: '2020-01-01' }],
        ['/api/matches', 'POST', { ...payload(), __v: 99 }],
        ['/api/matches', 'POST', payload({ events: [{ ...goal(), team: String(b._id) }] })],
    ]) assert.equal((await request(path, method, body)).status, 400);
    assert.equal((await Team.findById(a._id)).points, 0);
    assert.equal((await Player.findById(a1._id)).goals, 0);
});

// RU: Защитить ссылки как автора, так и ассистента от удаления и перевода.
// EN: Protect references to both authors and assistants from deletion and transfers.
test('Команды и игроки с историей защищены от удаления и перевода', async () => {
    await matches.createMatch(payload());
    await assert.rejects(() => roster.deleteTeam(String(a._id)), { code: 'TEAM_IN_USE' });
    await assert.rejects(() => roster.deletePlayer(String(a1._id)), { code: 'PLAYER_IN_MATCHES' });
    await assert.rejects(() => roster.deletePlayer(String(a2._id)), { code: 'PLAYER_IN_MATCHES' });
    await assert.rejects(() => roster.updatePlayer(String(a1._id), { team: String(c._id), number: 11 }), { code: 'PLAYER_IN_MATCHES' });
    await roster.deletePlayer(String(c1._id));
    await roster.deleteTeam(String(c._id));
    assert.equal(await Team.findById(c._id), null);
});

// RU: Защитить команду, участвующую в матче без протокола и без игроков.
// EN: Protect a team participating in a match even without events or players.
test('Команда без игроков, но с матчем, также защищена', async () => {
    const empty = await roster.createTeam({ name: 'Новая команда' });
    await matches.createMatch(payload({ homeTeam: String(empty._id), homeScore: 0, events: [] }));
    await assert.rejects(() => roster.deleteTeam(String(empty._id)), { code: 'TEAM_IN_USE' });
});

// RU: Проверить действующую команду и уникальность номера, разрешив отсутствие номера.
// EN: Validate existing teams and unique shirt numbers while allowing unassigned numbers.
test('Номера игроков уникальны внутри команды; пустой номер допустим', async () => {
    await assert.rejects(() => roster.createPlayer({ name: 'Дубль', team: String(a._id), number: 9 }), { code: 'SHIRT_NUMBER_TAKEN' });
    await assert.rejects(() => roster.createPlayer({ name: 'Без команды', team: String(new mongoose.Types.ObjectId()) }), { code: 'INVALID_TEAM' });
    await roster.createPlayer({ name: 'Без номера один', team: String(a._id), number: null });
    await roster.createPlayer({ name: 'Без номера два', team: String(a._id), number: null });
    await roster.updatePlayer(String(c1._id), { team: String(a._id), number: 11 });
    assert.equal(String((await Player.findById(c1._id)).team), String(a._id));
});

// RU: Устаревшая версия не должна перезаписать уже исправленный матч.
// EN: A stale revision must not overwrite an already corrected match.
test('Устаревшая или отсутствующая версия отклоняется', async () => {
    const match = await matches.createMatch(payload());
    await assert.rejects(() => matches.updateMatch(String(match._id), { time: '19:00' }), { code: 'INVALID_NUMBER' });
    const changed = await matches.updateMatch(String(match._id), { version: match.__v, time: '19:00' });
    await assert.rejects(() => matches.updateMatch(String(match._id), { version: match.__v, time: '20:00' }), { code: 'VERSION_CONFLICT' });
    await assert.rejects(() => matches.deleteMatch(String(match._id), match.__v), { code: 'VERSION_CONFLICT' });
    assert.equal((await Match.findById(match._id)).time, '19:00');
    await matches.deleteMatch(String(match._id), changed.__v);
});

// RU: Откатить и матч, и уже записанную командную статистику при поздней ошибке.
// EN: Roll back both the match and already-written team totals on a late failure.
test('Ошибка записи статистики игрока откатывает всю транзакцию', async context => {
    context.mock.method(Player, 'bulkWrite', async () => { throw new Error('Тестовый сбой записи'); });
    await assert.rejects(() => matches.createMatch(payload()), /Тестовый сбой/);
    assert.equal(await Match.countDocuments(), 0);
    assert.equal((await Team.findById(a._id)).points, 0);
    assert.equal((await Player.findById(a1._id)).goals, 0);
    assert.equal((await TournamentState.findById('Основной турнир')).revision, 0);
});

// RU: Параллельные результаты не должны терять очки из-за гонки пересчёта.
// EN: Concurrent results must not lose points through a recalculation race.
test('Параллельное создание двух матчей сохраняет оба результата', async () => {
    await Promise.all([matches.createMatch(payload()), matches.createMatch(payload({ time: '20:00' }))]);
    assert.equal(await Match.countDocuments(), 2);
    assert.equal((await Team.findById(a._id)).points, 6);
    assert.equal((await Team.findById(a._id)).played, 2);
    assert.equal((await Player.findById(a1._id)).goals, 2);
});

// RU: Из двух конкурентных правок одной версии принять только одну.
// EN: Accept only one of two concurrent edits based on the same revision.
test('Параллельные правки одного матча обнаруживают конфликт версии', async () => {
    const match = await matches.createMatch(payload());
    const results = await Promise.allSettled([
        matches.updateMatch(String(match._id), { version: match.__v, time: '19:00' }),
        matches.updateMatch(String(match._id), { version: match.__v, time: '20:00' }),
    ]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(results.find(result => result.status === 'rejected').reason.code, 'VERSION_CONFLICT');
    assert.equal((await Team.findById(a._id)).points, 3);
});

// RU: Исключить висячую ссылку при одновременном удалении команды и создании игрока.
// EN: Prevent dangling references when deleting a team and creating its player concurrently.
test('Гонка удаления команды и создания игрока сохраняет целостность', async () => {
    const team = await roster.createTeam({ name: 'Конкурентная команда' });
    const results = await Promise.allSettled([
        roster.deleteTeam(String(team._id)),
        roster.createPlayer({ name: 'Новый игрок', team: String(team._id), number: 1 }),
    ]);
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 1);
    const exists = await Team.exists({ _id: team._id });
    assert.equal(await Player.countDocuments({ team: team._id }), exists ? 1 : 0);
});

// RU: Поддержать старые английские значения без потери истории при пересчёте.
// EN: Support legacy English values without losing history during recalculation.
test('Старые статусы учитываются, а после редактирования сохраняются на русском', async () => {
    const id = new mongoose.Types.ObjectId();
    await Match.collection.insertOne({ _id: id, homeTeam: a._id, awayTeam: b._id,
        homeScore: 1, awayScore: 0, date: new Date('2026-10-17'), time: '18:00', status: 'finished', __v: 0,
        events: [{ minute: 10, player: a1._id, type: 'goal' }],
    });
    await transaction(statistics.rebuildStatistics);
    assert.equal((await Team.findById(a._id)).points, 3);
    assert.equal((await Player.findById(a1._id)).goals, 1);
    assert.equal((await request(`/api/matches/${id}`)).body.data.status, STATUS.FINISHED);
    await matches.updateMatch(String(id), { version: 0, time: '19:00' });
    const stored = await Match.collection.findOne({ _id: id });
    assert.equal(stored.status, STATUS.FINISHED);
    assert.equal(stored.events[0].type, EVENT.GOAL);
    assert.equal(String(stored.events[0].team), String(a._id));
});

// RU: Повторный пересчёт должен восстанавливать показатели, а не прибавлять их повторно.
// EN: Repeated recalculation must restore totals rather than add them again.
test('Повторный пересчёт идемпотентен и исправляет старые ручные значения', async () => {
    await matches.createMatch(payload());
    await Team.updateOne({ _id: a._id }, { points: 999 });
    await Player.updateOne({ _id: a1._id }, { goals: 999 });
    for (let run = 0; run < 2; run++) {
        await transaction(statistics.rebuildStatistics);
        assert.equal((await Team.findById(a._id)).points, 3);
        assert.equal((await Player.findById(a1._id)).goals, 1);
    }
});

// RU: Проверить полный путь от завершения лиги до финала и матча за третье место.
// EN: Verify the complete path from the completed league to the final and third-place match.
test('Плей-офф: посев 1–4 и 2–3, серия пенальти, финал и таблица только по лиге', async () => {
    const fixtures = [
        [a, b, 1, 0], [a, c, 1, 0], [a, d, 1, 0],
        [b, c, 1, 0], [b, d, 1, 0], [c, d, 1, 0],
    ];
    for (const [home, away, homeScore, awayScore] of fixtures) {
        await matches.createMatch({ ...payload({ protocolComplete: false, events: [] }), homeTeam: String(home._id), awayTeam: String(away._id), homeScore, awayScore });
    }
    const ranked = (await Team.find().sort({ points: -1, goalDifference: -1, goalsFor: -1, name: 1, _id: 1 })).map(team => String(team._id));
    assert.deepEqual(ranked, [String(a._id), String(b._id), String(c._id), String(d._id)]);
    const semiOnePayload = { ...payload({ status: STATUS.SCHEDULED, homeScore: 0, awayScore: 0, protocolComplete: false, events: [] }), homeTeam: String(a._id), awayTeam: String(d._id), stage: STAGE.SEMIFINAL };
    await assert.rejects(() => matches.createMatch({ ...semiOnePayload, awayTeam: String(c._id) }), { code: 'INVALID_SEMIFINAL_PAIRING' });
    const semiOne = await matches.createMatch(semiOnePayload);
    const semiTwo = await matches.createMatch({ ...semiOnePayload, homeTeam: String(b._id), awayTeam: String(c._id), time: '19:00' });
    await assert.rejects(() => matches.createMatch({ ...payload({ status: STATUS.SCHEDULED, homeScore: 0, awayScore: 0, protocolComplete: false, events: [] }), homeTeam: String(c._id), awayTeam: String(d._id), stage: STAGE.LEAGUE, time: '20:00' }), { code: 'LEAGUE_LOCKED_BY_PLAYOFF' });
    const semiOneDone = await matches.updateMatch(String(semiOne._id), { ...semiOnePayload, version: semiOne.__v, status: STATUS.FINISHED, homeScore: 1, awayScore: 1, homePenaltyScore: 4, awayPenaltyScore: 3 });
    const semiTwoDone = await matches.updateMatch(String(semiTwo._id), { ...semiOnePayload, version: semiTwo.__v, homeTeam: String(b._id), awayTeam: String(c._id), status: STATUS.FINISHED, homeScore: 1, awayScore: 0 });
    assert.equal((await Team.findById(a._id)).points, 9, 'playoff wins do not change league points');
    const finalTeams = [String(a._id), String(b._id)];
    const final = await matches.createMatch({ ...semiOnePayload, homeTeam: finalTeams[0], awayTeam: finalTeams[1], stage: STAGE.FINAL, time: '20:00' });
    await assert.rejects(() => matches.updateMatch(String(final._id), { ...semiOnePayload, version: final.__v, stage: STAGE.FINAL, homeTeam: String(c._id), awayTeam: String(d._id) }), { code: 'INVALID_PLAYOFF_FINALISTS' });
    const losers = [String(d._id), String(c._id)];
    const third = await matches.createMatch({ ...semiOnePayload, homeTeam: losers[0], awayTeam: losers[1], stage: STAGE.THIRD_PLACE, time: '21:00' });
    assert.ok(semiOneDone && semiTwoDone && third);
});
