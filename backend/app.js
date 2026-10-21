const crypto = require('node:crypto');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mongoose = require('mongoose');
const { rateLimit } = require('express-rate-limit');
const AppError = require('./utils/AppError');
const errorHandler = require('./middlewares/errorHandler');
const createAuthRouter = require('./routes/authRoutes');
const teamRoutes = require('./routes/teamRoutes');
const playerRoutes = require('./routes/playerRoutes');
const matchRoutes = require('./routes/matchRoutes');
const newsRoutes = require('./routes/newsRoutes');
const statsRoutes = require('./routes/statsRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const openapi = require('./docs/openapi');
const { installLanguage } = require('./i18n');

// RU: Отдать документацию API без доступа к базе и секретам конфигурации.
// EN: Serve API documentation without accessing the database or configuration secrets.
function apiSpecification(req, res) { res.json(openapi); }

// RU: Назначить собственный идентификатор запроса для поиска ошибок в журнале.
// EN: Assign a server-generated request ID for tracing failures in logs.
function identifyRequest(req, res, next) {
    req.id = crypto.randomUUID();
    res.set('X-Request-Id', req.id);
    next();
}

// RU: Подтвердить работу HTTP-процесса независимо от доступности БД.
// EN: Confirm HTTP process liveness independently of database availability.
function health(req, res) {
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, message: req.t('Сервер работает.') });
}

// RU: Проверить готовность обслуживать запросы с доступом к данным.
// EN: Check readiness to serve requests that require data access.
function readiness(req, res) {
    const ready = req.app.locals.isDatabaseReady();
    res.set('Cache-Control', 'no-store');
    res.status(ready ? 200 : 503).json({ success: ready,
        message: req.t(ready ? 'Сервер готов к работе.' : 'База данных временно недоступна.'),
    });
}

// RU: Вернуть JSON вместо стандартной HTML-страницы неизвестного маршрута.
// EN: Return JSON instead of the default HTML page for unknown routes.
function notFound(req, res, next) {
    next(new AppError(404, req.t('Запрашиваемый маршрут не найден.'), 'ROUTE_NOT_FOUND'));
}

// RU: Создать приложение без открытия порта и без подключения к рабочей базе.
// EN: Create the application without opening a port or connecting to the live database.
function createApp(config, options = {}) {
    const app = express();
    app.locals.config = config;
    app.locals.logger = options.logger || console;
    app.locals.isDatabaseReady = options.isDatabaseReady || (() => mongoose.connection.readyState === 1);
    app.disable('x-powered-by');
    app.set('trust proxy', config.trustProxy);
    app.use(identifyRequest);
    app.use(installLanguage);
    app.use(helmet());
    app.use(cors({
        // RU: Разрешать настроенные сайты; native-клиенты не отправляют Origin.
        // EN: Allow configured web origins; native clients do not send Origin.
        origin(origin, callback) {
            if (!origin || config.allowedOrigins.includes(origin)) return callback(null, true);
            return callback(new AppError(403, 'Запросы с этого сайта не разрешены.', 'ORIGIN_NOT_ALLOWED'));
        },
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
        exposedHeaders: ['X-Request-Id'],
        maxAge: 600,
    }));
    app.use(express.json({ limit: '100kb' }));
    app.get('/health', health);
    app.get('/ready', readiness);
    app.use('/api', rateLimit({
        windowMs: 60 * 1000, limit: 120,
        standardHeaders: 'draft-8', legacyHeaders: false,
        // RU: Сохранить единый формат ответа при превышении общего лимита.
        // EN: Preserve the shared response format when the API limit is exceeded.
        handler(req, res, next) {
            next(new AppError(429, req.t('Слишком много запросов. Повторите через минуту.'), 'API_RATE_LIMIT'));
        },
    }));
    app.use('/api/auth', createAuthRouter());
    app.get('/api/openapi.json', apiSpecification);
    app.use('/api/teams', teamRoutes);
    app.use('/api/players', playerRoutes);
    app.use('/api/matches', matchRoutes);
    app.use('/api/news', newsRoutes);
    app.use('/api/media', mediaRoutes);
    app.use('/api/stats', statsRoutes);
    app.use(notFound);
    app.use(errorHandler);
    return app;
}

module.exports = createApp;
