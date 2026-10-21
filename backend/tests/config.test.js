const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateEnv, ConfigError } = require('../config/env');
const { validatePassword } = require('../services/passwordService');

const baseEnv = { MONGO_URI: 'mongodb://127.0.0.1:27017/test', JWT_SECRET: 'isolated-test-key-'.repeat(4) };

// RU: Проверить безопасные значения по умолчанию и неизменяемую конфигурацию.
// EN: Verify safe defaults and immutable configuration.
test('Конфигурация: локальные значения по умолчанию', () => {
    const config = validateEnv(baseEnv);
    assert.equal(config.port, 5000);
    assert.equal(config.jwtTtlSeconds, 3600);
    assert.equal(config.trustProxy, 0);
    assert.ok(Object.isFrozen(config));
    assert.ok(Object.isFrozen(config.allowedOrigins));
});

// RU: Отклонять опасную конфигурацию до запуска сервера без вывода секретов.
// EN: Reject unsafe configuration before startup without exposing secrets.
test('Конфигурация: неверные параметры отклоняются', () => {
    for (const override of [
        { MONGO_URI: '' }, { MONGO_URI: 'https://private:password@example.com' },
        { JWT_SECRET: 'short' }, { JWT_SECRET: 'replace-me-'.repeat(8) },
        { PORT: '0' }, { PORT: '5000x' }, { PORT: '65536' },
        { JWT_TTL_SECONDS: '0' }, { TRUST_PROXY: 'true' }, { NODE_ENV: 'invalid' },
        { ALLOWED_ORIGINS: '*' }, { ALLOWED_ORIGINS: 'https://example.com/path' },
        { NODE_ENV: 'production' }, { NODE_ENV: 'production', ALLOWED_ORIGINS: 'http://example.com' },
    ]) {
        assert.throws(() => validateEnv({ ...baseEnv, ...override }), ConfigError);
    }
});

// RU: Разрешить production только с явными HTTPS origin и заданной схемой прокси.
// EN: Accept production only with explicit HTTPS origins and a defined proxy topology.
test('Конфигурация: production origin и доверенный прокси', () => {
    const config = validateEnv({ ...baseEnv, NODE_ENV: 'production',
        ALLOWED_ORIGINS: 'https://admin.example.com,https://admin.example.com', TRUST_PROXY: '1' });
    assert.deepEqual(config.allowedOrigins, ['https://admin.example.com']);
    assert.equal(config.trustProxy, 1);
});

// RU: Учесть UTF-8 при проверке ограничения bcrypt.
// EN: Account for UTF-8 when enforcing bcrypt's password length limit.
test('Пароль: короткие, пробельные и слишком длинные значения запрещены', () => {
    assert.throws(() => validatePassword('short'));
    assert.throws(() => validatePassword(' '.repeat(20)));
    assert.throws(() => validatePassword('я'.repeat(37)));
    assert.doesNotThrow(() => validatePassword('НадёжныйПароль123'));
    assert.doesNotThrow(() => validatePassword('a'.repeat(72)));
});
