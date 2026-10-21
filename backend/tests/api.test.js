const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const createApp = require('../app');
const { validateEnv } = require('../config/env');
const { createAdmin } = require('../services/adminService');
const { issueToken } = require('../services/tokenService');
const User = require('../models/User');
const Team = require('../models/Team');
const News = require('../models/News');
const Media = require('../models/Media');

const config = validateEnv({ NODE_ENV: 'test', MONGO_URI: 'mongodb://127.0.0.1:27017/unused',
    JWT_SECRET: 'isolated-http-test-secret-'.repeat(3) });
const credentials = { name: 'Тестовый администратор', email: 'admin@example.test', password: 'ТестовыйПароль123' };
let database, server, app, base, admin, token;

// RU: Открыть тестовый HTTP-сервер на свободном локальном порту.
// EN: Open a test HTTP server on an available loopback port.
async function listen(application) {
    const listener = application.listen(0, '127.0.0.1');
    if (!listener.listening) await new Promise(resolve => listener.once('listening', resolve));
    return listener;
}

// RU: Отправить реальный HTTP-запрос и разобрать стандартный JSON-ответ.
// EN: Send a real HTTP request and decode the standard JSON response.
async function request(path, { method = 'GET', body, bearer, headers = {}, url = base } = {}) {
    const response = await fetch(`${url}${path}`, {
        method,
        headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...headers },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    return { response, body: await response.json() };
}

// RU: Использовать отдельную временную MongoDB, никогда не читая рабочий .env.
// EN: Use a separate temporary MongoDB without ever reading the live .env file.
before(async () => {
    database = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(database.getUri('imam_hasan_test'));
    await User.init();
    await Team.init();
    admin = await createAdmin(credentials);
    token = issueToken(admin, config);
    app = createApp(config, { logger: { error() {} } });
    server = await listen(app);
    base = `http://127.0.0.1:${server.address().port}`;
}, { timeout: 180000 });

// RU: Закрыть соединения и удалить только временную тестовую БД.
// EN: Close connections and remove only the temporary test database.
after(async () => {
    if (server) {
        server.closeAllConnections();
        await new Promise(resolve => server.close(resolve));
    }
    await mongoose.disconnect();
    if (database) await database.stop();
});

// RU: Проверить хранение пароля и запрет создания дубликата учётной записи.
// EN: Verify password storage and duplicate account protection.
test('Администратор: пароль хранится хешем и не выбирается по умолчанию', async () => {
    const user = await User.findById(admin._id);
    assert.equal(user.passwordHash, undefined);
    assert.equal(user.tokenVersion, undefined);
    const stored = await User.findById(admin._id).select('+passwordHash');
    assert.notEqual(stored.passwordHash, credentials.password);
    assert.match(stored.passwordHash, /^\$2[aby]\$/);
    await assert.rejects(() => createAdmin({ ...credentials, email: 'ADMIN@EXAMPLE.TEST' }), { code: 'DUPLICATE_USER' });
});

// RU: Проверить вход, нормализацию email и отсутствие секретов в профиле.
// EN: Verify login, email normalization, and the absence of secrets in the profile.
test('Вход и профиль: корректные данные выдают рабочий JWT', async () => {
    const result = await request('/api/auth/login', { method: 'POST', body: {
        email: ' ADMIN@EXAMPLE.TEST ', password: credentials.password,
    } });
    assert.equal(result.response.status, 200);
    assert.equal(result.response.headers.get('cache-control'), 'no-store');
    assert.equal(result.body.data.expiresIn, 3600);
    assert.equal(result.body.data.user.passwordHash, undefined);
    const me = await request('/api/auth/me', { bearer: result.body.data.token });
    assert.equal(me.response.status, 200);
    assert.equal(me.body.data.email, credentials.email);
    assert.equal(me.body.data.tokenVersion, undefined);
});

// RU: Не раскрывать наличие email по сообщению об ошибке входа.
// EN: Do not reveal email existence through login error messages.
test('Неверный пароль и неизвестная почта возвращают одинаковый ответ', async () => {
    const wrong = await request('/api/auth/login', { method: 'POST', body: {
        email: credentials.email, password: 'wrong-password',
    } });
    const missing = await request('/api/auth/login', { method: 'POST', body: {
        email: 'missing@example.test', password: 'wrong-password',
    } });
    assert.equal(wrong.response.status, 401);
    assert.equal(missing.response.status, 401);
    assert.equal(wrong.body.message, missing.body.message);
});

// RU: Запретить все существующие операции записи без сеанса.
// EN: Deny every existing mutation route without an authenticated session.
test('Все CRUD-маршруты записи требуют авторизации', async () => {
    for (const resource of ['teams', 'players', 'matches', 'news']) {
        for (const method of ['POST', 'PUT', 'DELETE']) {
            const suffix = method === 'POST' ? '' : '/507f1f77bcf86cd799439011';
            const result = await request(`/api/${resource}${suffix}`, { method, body: {} });
            assert.equal(result.response.status, 401, `${method} ${resource}`);
            assert.equal(result.body.code, 'AUTH_REQUIRED');
        }
    }
});

// RU: Сохранить публичное чтение для мобильного приложения.
// EN: Preserve public read access for the mobile application.
test('Публичные списки и статистика доступны без токена', async () => {
    for (const path of ['/api/teams', '/api/players', '/api/matches', '/api/news',
        '/api/stats/table', '/api/stats/top-scorers', '/api/stats/top-assists']) {
        const result = await request(path);
        assert.equal(result.response.status, 200, path);
        assert.ok(Array.isArray(result.body.data));
    }
});

// RU: Проверить публикацию русской новости с кыргызским переводом и совместимость старого формата.
// EN: Verify Russian news with a Kyrgyz translation and compatibility with Russian-only posts.
test('Новости сохраняют оба языка, а кыргызская версия остаётся необязательной', async () => {
    const created = await request('/api/news', { method: 'POST', bearer: token, body: {
        title: 'Турнир начинается', content: 'Первый матч состоится в субботу.',
        titleKy: 'Турнир башталат', contentKy: 'Биринчи беттеш ишемби күнү өтөт.',
    } });
    assert.equal(created.response.status, 201);
    const stored = await News.findById(created.body.data._id);
    assert.equal(stored.titleKy, 'Турнир башталат');
    assert.equal(stored.contentKy, 'Биринчи беттеш ишемби күнү өтөт.');

    const updated = await request(`/api/news/${stored._id}`, { method: 'PUT', bearer: token, body: {
        titleKy: 'Турнир бүгүн башталат',
    } });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.data.title, 'Турнир начинается');
    assert.equal(updated.body.data.titleKy, 'Турнир бүгүн башталат');

    const russianOnly = await request('/api/news', { method: 'POST', bearer: token, body: {
        title: 'Новое объявление', content: 'Текст объявления.',
    } });
    assert.equal(russianOnly.response.status, 201);
    assert.equal(russianOnly.body.data.titleKy, '');
    const listed = await request('/api/news?limit=100');
    assert.equal(listed.body.data.find(item => item._id === stored.id).contentKy, 'Биринчи беттеш ишемби күнү өтөт.');
});

// RU: Проверить безопасную загрузку, выдачу и удаление логотипа через полный HTTP API.
// EN: Verify secure logo upload, retrieval, and deletion through the complete HTTP API.
test('Логотип: доступ администратора, проверка типа, выдача и защита используемого файла', async () => {
    const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0, 1, 2, 3]);
    const unauthorized = await fetch(`${base}/api/media`, {
        method: 'POST', headers: { 'Content-Type': 'image/png' }, body: image,
    });
    assert.equal(unauthorized.status, 401);

    const invalid = await fetch(`${base}/api/media`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/gif' }, body: image,
    });
    assert.equal(invalid.status, 415);
    assert.equal((await invalid.json()).code, 'INVALID_IMAGE_TYPE');

    const upload = await fetch(`${base}/api/media`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'image/png' }, body: image,
    });
    assert.equal(upload.status, 201);
    const uploaded = await upload.json();
    assert.match(uploaded.data.path, /^\/api\/media\/[a-f\d]{24}$/i);

    const downloaded = await fetch(`${base}${uploaded.data.path}`);
    assert.equal(downloaded.status, 200);
    assert.equal(downloaded.headers.get('content-type'), 'image/png');
    assert.equal(downloaded.headers.get('x-content-type-options'), 'nosniff');
    assert.deepEqual(Buffer.from(await downloaded.arrayBuffer()), image);

    const team = await request('/api/teams', { method: 'POST', bearer: token, body: {
        name: 'Команда с логотипом', logo: uploaded.data.path,
    } });
    assert.equal(team.response.status, 201);
    const protectedDelete = await request(uploaded.data.path, { method: 'DELETE', bearer: token,
        headers: { 'Accept-Language': 'ky;q=0.9,ru;q=0.8' },
    });
    assert.equal(protectedDelete.response.status, 409);
    assert.equal(protectedDelete.body.message, 'Команда колдонуп жаткан логотипти өчүрүүгө болбойт.');

    const detached = await request(`/api/teams/${team.body.data._id}`, { method: 'PUT', bearer: token,
        body: { name: team.body.data.name, logo: '' },
    });
    assert.equal(detached.response.status, 200);
    const deleted = await request(uploaded.data.path, { method: 'DELETE', bearer: token,
        headers: { 'Accept-Language': 'ky;q=0.9,ru;q=0.8' },
    });
    assert.equal(deleted.response.status, 200);
    assert.equal(deleted.body.message, 'Сүрөт өчүрүлдү.');
    await request(`/api/teams/${team.body.data._id}`, { method: 'DELETE', bearer: token });
    assert.equal(await Media.countDocuments({ _id: uploaded.data.path.split('/').at(-1) }), 0);
});

// RU: Проверить полный цикл изменения команды через защищённый HTTP API и MongoDB.
// EN: Verify a full team mutation cycle through protected HTTP routes and MongoDB.
test('Администратор может создать, изменить и удалить команду', async () => {
    const created = await request('/api/teams', { method: 'POST', bearer: token, body: { name: 'Тестовая команда' } });
    assert.equal(created.response.status, 201);
    const id = created.body.data._id;
    assert.equal((await Team.findById(id)).name, 'Тестовая команда');
    const changed = await request(`/api/teams/${id}`, { method: 'PUT', bearer: token, body: { name: 'Обновлённая команда' } });
    assert.equal(changed.response.status, 200);
    assert.equal((await Team.findById(id)).name, 'Обновлённая команда');
    const deleted = await request(`/api/teams/${id}`, { method: 'DELETE', bearer: token });
    assert.equal(deleted.response.status, 200);
    assert.equal(await Team.findById(id), null);
});

// RU: Не доверять истёкшим, поддельным или выпущенным для другой аудитории токенам.
// EN: Reject expired, forged, and wrong-audience tokens.
test('Проверка подписи, срока и аудитории JWT', async () => {
    const payload = { version: 0 };
    const options = { subject: String(admin._id), issuer: 'imam-hasan-api', audience: 'imam-hasan-admin' };
    const invalid = [
        'not-a-jwt',
        jwt.sign(payload, config.jwtSecret, { ...options, expiresIn: -1 }),
        jwt.sign(payload, 'another-secret-'.repeat(4), { ...options, expiresIn: 60 }),
        jwt.sign(payload, config.jwtSecret, { ...options, audience: 'another-app', expiresIn: 60 }),
        jwt.sign(payload, config.jwtSecret, { ...options, algorithm: 'HS384', expiresIn: 60 }),
    ];
    for (const bearer of invalid) {
        const result = await request('/api/auth/me', { bearer });
        assert.equal(result.response.status, 401);
        assert.equal(result.body.code, 'INVALID_TOKEN');
    }
});

// RU: Проверять действующую роль и блокировку учётной записи в БД.
// EN: Check the current role and account suspension in the database.
test('Наблюдатель не может менять данные, заблокированный пользователь не может войти', async () => {
    await User.updateOne({ _id: admin._id }, { role: 'Наблюдатель' });
    const forbidden = await request('/api/teams', { method: 'POST', bearer: token, body: { name: 'Запрещённая команда' } });
    assert.equal(forbidden.response.status, 403);
    await User.updateOne({ _id: admin._id }, { role: 'Администратор', active: false });
    const disabled = await request('/api/auth/me', { bearer: token });
    assert.equal(disabled.response.status, 401);
    const disabledLogin = await request('/api/auth/login', { method: 'POST', body: credentials });
    assert.equal(disabledLogin.response.status, 401);
    await User.updateOne({ _id: admin._id }, { active: true });
});

// RU: Скрыть внутренние сообщения и секреты даже при неожиданном исключении БД.
// EN: Hide internal messages and secrets even when an unexpected database exception occurs.
test('Неожиданная ошибка не раскрывает внутренние сведения', async (context) => {
    context.mock.method(Team, 'aggregate', () => { throw new Error('mongodb://secret-user:secret-password@private-host'); });
    const result = await request('/api/teams');
    assert.equal(result.response.status, 500);
    assert.equal(result.body.code, 'INTERNAL_ERROR');
    assert.doesNotMatch(JSON.stringify(result.body), /secret-user|secret-password|private-host|stack/);
});

// RU: Вернуть русские 400/409 для неверных полей и дубликатов без деталей MongoDB.
// EN: Return Russian 400/409 responses for invalid fields and duplicates without MongoDB details.
test('Ошибки валидации, ID и уникальности возвращаются безопасно', async () => {
    const invalid = await request('/api/teams', { method: 'POST', bearer: token, body: {} });
    assert.equal(invalid.response.status, 400);
    assert.equal(invalid.body.code, 'VALIDATION_ERROR');
    assert.match(invalid.body.errors[0].message, /Обязательно/);
    const invalidId = await request('/api/teams/not-an-id');
    assert.equal(invalidId.response.status, 400);
    assert.equal(invalidId.body.code, 'INVALID_VALUE');
    await Team.create({ name: 'Уникальная команда' });
    const duplicate = await request('/api/teams', { method: 'POST', bearer: token, body: { name: 'Уникальная команда' } });
    assert.equal(duplicate.response.status, 409);
    assert.doesNotMatch(JSON.stringify(duplicate.body), /E11000|MongoServerError/);
});

// RU: Обработать ошибочный JSON и неизвестный маршрут единообразно.
// EN: Handle malformed JSON and unknown routes consistently.
test('Некорректный JSON и неизвестный маршрут возвращают русские сообщения', async () => {
    const response = await fetch(`${base}/api/auth/login`, { method: 'POST',
        headers: { 'Content-Type': 'application/json' }, body: '{' });
    assert.equal(response.status, 400);
    assert.equal((await response.json()).message, 'Некорректный формат JSON в запросе.');
    const missing = await request('/api/does-not-exist');
    assert.equal(missing.response.status, 404);
    assert.equal(missing.body.code, 'ROUTE_NOT_FOUND');
    assert.equal(missing.body.requestId, missing.response.headers.get('x-request-id'));
});

// RU: Ограничить размер запросов и проверить заголовки безопасности.
// EN: Limit request size and verify security headers.
test('Большие запросы отклоняются; заголовки сервера защищены', async () => {
    const result = await request('/api/auth/login', { method: 'POST', body: { password: 'x'.repeat(110000) } });
    assert.equal(result.response.status, 413);
    assert.equal(result.body.code, 'PAYLOAD_TOO_LARGE');
    const health = await request('/health');
    assert.equal(health.response.headers.get('x-powered-by'), null);
    assert.equal(health.response.headers.get('x-content-type-options'), 'nosniff');
});

// RU: Различать доступность HTTP-процесса и готовность БД.
// EN: Distinguish HTTP process liveness from database readiness.
test('Health и readiness корректно различают состояние БД', async () => {
    assert.equal((await request('/health')).response.status, 200);
    assert.equal((await request('/ready')).response.status, 200);
    const original = app.locals.isDatabaseReady;
    try {
        app.locals.isDatabaseReady = () => false;
        assert.equal((await request('/ready')).response.status, 503);
        assert.equal((await request('/health')).response.status, 200);
    } finally { app.locals.isDatabaseReady = original; }
});

// RU: Проверить локализацию ответов API по полному стандартному заголовку Accept-Language.
// EN: Verify API localization for standard weighted Accept-Language headers.
test('Ответы API выбирают один язык с учётом приоритета Accept-Language', async () => {
    const kyrgyz = await request('/health', { headers: { 'Accept-Language': 'ky-KG,ru;q=0.8' } });
    assert.equal(kyrgyz.body.message, 'Сервер иштеп жатат.');
    assert.equal(kyrgyz.response.headers.get('content-language'), 'ky');
    assert.match(kyrgyz.response.headers.get('vary'), /Accept-Language/i);

    const kyrgyzQuality = await request('/health', { headers: { 'Accept-Language': 'ru;q=0.2, ky;q=0.9' } });
    assert.equal(kyrgyzQuality.body.message, 'Сервер иштеп жатат.');
    assert.equal(kyrgyzQuality.response.headers.get('content-language'), 'ky');

    const russianQuality = await request('/health', { headers: { 'Accept-Language': 'ky;q=0.4, ru;q=0.9' } });
    assert.equal(russianQuality.body.message, 'Сервер работает.');
    assert.equal(russianQuality.response.headers.get('content-language'), 'ru');

    const disabledKyrgyz = await request('/health', { headers: { 'Accept-Language': 'ky;q=0, ru;q=0.1' } });
    assert.equal(disabledKyrgyz.body.message, 'Сервер работает.');

    const localizedError = await request('/api/does-not-exist', { headers: { 'Accept-Language': 'ky;q=0.9,ru;q=0.8' } });
    assert.equal(localizedError.response.status, 404);
    assert.equal(localizedError.body.message, 'Суралган дарек табылган жок.');
});

// RU: Разрешать только заданные браузерные origin, сохраняя запросы native-клиента.
// EN: Allow only configured browser origins while preserving native client requests.
test('CORS разрешает настроенный сайт и отклоняет посторонний', async () => {
    const allowed = await request('/health', { headers: { Origin: 'http://localhost:5173' } });
    assert.equal(allowed.response.headers.get('access-control-allow-origin'), 'http://localhost:5173');
    const forbidden = await request('/health', { headers: { Origin: 'https://untrusted.example' } });
    assert.equal(forbidden.response.status, 403);
    assert.equal(forbidden.body.code, 'ORIGIN_NOT_ALLOWED');
    const preflight = await fetch(`${base}/api/teams`, { method: 'OPTIONS', headers: {
        Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'authorization,content-type',
    } });
    assert.equal(preflight.status, 204);
    assert.match(preflight.headers.get('access-control-allow-headers'), /Authorization/);
});

// RU: Ограничить перебор паролей отдельным счётчиком попыток.
// EN: Throttle password guessing with a dedicated attempt counter.
test('Шестая неудачная попытка входа получает 429', async () => {
    const limitedServer = await listen(createApp(config));
    const url = `http://127.0.0.1:${limitedServer.address().port}`;
    try {
        for (let attempt = 0; attempt < 5; attempt++) {
            const result = await request('/api/auth/login', { url, method: 'POST', body: {} });
            assert.equal(result.response.status, 400);
        }
        const limited = await request('/api/auth/login', { url, method: 'POST', body: {} });
        assert.equal(limited.response.status, 429);
        assert.equal(limited.body.code, 'LOGIN_RATE_LIMIT');
        assert.ok(limited.response.headers.get('retry-after'));
    } finally {
        limitedServer.closeAllConnections();
        await new Promise(resolve => limitedServer.close(resolve));
    }
});

// RU: Отозвать уже выданный токен при выходе, затем разрешить новый вход.
// EN: Revoke an issued token on logout and allow a subsequent fresh login.
test('Выход отзывает старые токены; новый вход создаёт действующий сеанс', async () => {
    const loggedOut = await request('/api/auth/logout', { method: 'POST', bearer: token });
    assert.equal(loggedOut.response.status, 200);
    assert.equal((await request('/api/auth/me', { bearer: token })).response.status, 401);
    const loggedIn = await request('/api/auth/login', { method: 'POST', body: credentials });
    assert.equal(loggedIn.response.status, 200);
    assert.equal((await request('/api/auth/me', { bearer: loggedIn.body.data.token })).response.status, 200);
});
