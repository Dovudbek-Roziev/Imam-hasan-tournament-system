const path = require('node:path');
const dotenv = require('dotenv');
const { DEFAULT_TIME_ZONE, validTimeZone } = require('../domain/matchTime');

// RU: Ошибка конфигурации, не содержащая значений секретов.
// EN: A configuration error that never includes secret values.
class ConfigError extends Error {
    // RU: Пометить сообщение как безопасное для журнала запуска.
    // EN: Mark the message as safe for startup logs.
    constructor(message) {
        super(message);
        this.name = 'ConfigError';
    }
}

// RU: Прочитать целое число из ограниченного диапазона.
// EN: Parse an integer constrained to an allowed range.
function readInteger(value, fallback, min, max, name) {
    const raw = value === undefined || value === '' ? String(fallback) : String(value);
    const number = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isSafeInteger(number) || number < min || number > max) {
        throw new ConfigError(`Параметр ${name} должен быть целым числом от ${min} до ${max}.`);
    }
    return number;
}

// RU: Проверить окружение до подключения к БД и запуска HTTP-сервера.
// EN: Validate the environment before connecting to the database or starting HTTP.
function validateEnv(env) {
    const nodeEnv = env.NODE_ENV || 'development';
    if (!['development', 'test', 'production'].includes(nodeEnv)) {
        throw new ConfigError('Параметр NODE_ENV должен быть development, test или production.');
    }
    const mongoUri = env.MONGO_URI?.trim();
    if (!mongoUri || !/^mongodb(?:\+srv)?:\/\/\S+$/.test(mongoUri)) {
        throw new ConfigError('Укажите корректный MONGO_URI в настройках сервера.');
    }
    const jwtSecret = env.JWT_SECRET;
    if (typeof jwtSecret !== 'string' || Buffer.byteLength(jwtSecret) < 32 ||
        /change.?me|replace.?me|your.?secret/i.test(jwtSecret)) {
        throw new ConfigError('JWT_SECRET должен содержать не менее 32 байт. Для локальной настройки выполните npm run env:init.');
    }
    if (nodeEnv === 'production' && !env.ALLOWED_ORIGINS?.trim()) {
        throw new ConfigError('Для production необходимо указать ALLOWED_ORIGINS.');
    }
    const origins = (env.ALLOWED_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173')
        .split(',').map(value => value.trim()).filter(Boolean);
    if (origins.length === 0) throw new ConfigError('Список ALLOWED_ORIGINS не должен быть пустым.');
    for (const origin of origins) {
        let parsed;
        try { parsed = new URL(origin); } catch { /* RU: Проверка ниже. EN: Validated below. */ }
        if (!parsed || !['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin ||
            (nodeEnv === 'production' && parsed.protocol !== 'https:')) {
            throw new ConfigError('ALLOWED_ORIGINS должен содержать точные адреса сайтов без пути; в production требуется HTTPS.');
        }
    }
    const timeZone = env.TOURNAMENT_TIME_ZONE || DEFAULT_TIME_ZONE;
    if (!validTimeZone(timeZone)) throw new ConfigError('Укажите корректный часовой пояс IANA в TOURNAMENT_TIME_ZONE.');
    return Object.freeze({
        timeZone,
        nodeEnv,
        mongoUri,
        jwtSecret,
        port: readInteger(env.PORT, 5000, 1, 65535, 'PORT'),
        jwtTtlSeconds: readInteger(env.JWT_TTL_SECONDS, 3600, 60, 86400, 'JWT_TTL_SECONDS'),
        trustProxy: readInteger(env.TRUST_PROXY, 0, 0, 5, 'TRUST_PROXY'),
        allowedOrigins: Object.freeze([...new Set(origins)]),
    });
}

// RU: Читать backend/.env независимо от текущей рабочей папки.
// EN: Load backend/.env independently of the current working directory.
function loadConfig() {
    dotenv.config({ path: path.join(__dirname, '..', '.env') });
    return validateEnv(process.env);
}

module.exports = { ConfigError, validateEnv, loadConfig };
