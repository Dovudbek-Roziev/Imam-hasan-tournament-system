const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const { startServer } = require('../server');
const { validateEnv } = require('../config/env');

let database;

// RU: Подготовить временную БД для проверки жизненного цикла сервера.
// EN: Prepare a temporary database for server lifecycle verification.
before(async () => { database = await MongoMemoryReplSet.create({ replSet: { count: 1 } }); }, { timeout: 180000 });

// RU: Освободить ресурсы временной БД даже при ошибке теста.
// EN: Release temporary database resources even when a test fails.
after(async () => {
    await mongoose.disconnect();
    if (database) await database.stop();
});

// RU: Проверить реальный запуск после MongoDB и корректную остановку соединений.
// EN: Verify real startup after MongoDB and graceful connection shutdown.
test('Сервер запускается с подключённой БД и корректно останавливается', async () => {
    assert.equal(mongoose.connection.readyState, 0);
    const config = validateEnv({ NODE_ENV: 'test', MONGO_URI: database.getUri('lifecycle'),
        JWT_SECRET: 'lifecycle-test-secret-'.repeat(3) });
    const signalListeners = process.listenerCount('SIGTERM');
    // RU: Порт 0 используется только тестом для выбора свободного порта ОС.
    // EN: Port 0 is used only by the test to obtain an available OS-assigned port.
    const instance = await startServer({ ...config, port: 0 });
    try {
        assert.equal(mongoose.connection.readyState, 1);
        const response = await fetch(`http://127.0.0.1:${instance.server.address().port}/ready`);
        assert.equal(response.status, 200);
    } finally {
        instance.server.closeIdleConnections();
        await instance.shutdown();
    }
    assert.equal(mongoose.connection.readyState, 0);
    assert.equal(instance.server.listening, false);
    assert.equal(process.listenerCount('SIGTERM'), signalListeners);
    await instance.shutdown();
});
