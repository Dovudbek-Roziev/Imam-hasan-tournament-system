const mongoose = require('mongoose');
const createApp = require('./app');
const connectDB = require('./config/db');
const { ConfigError, loadConfig } = require('./config/env');

// RU: Дождаться MongoDB и лишь затем начать принимать HTTP-запросы.
// EN: Wait for MongoDB before accepting HTTP requests.
async function startServer(config = loadConfig()) {
    await connectDB(config);
    const app = createApp(config);
    const server = await new Promise((resolve, reject) => {
        const listener = app.listen(config.port, '0.0.0.0');
        listener.once('listening', () => resolve(listener));
        listener.once('error', reject);
    });
    console.log(`Сервер запущен на порту ${config.port}.`);
    let shuttingDown = false;

    // RU: Завершить запросы, закрыть БД и ограничить время остановки.
    // EN: Finish requests, close the database, and bound shutdown time.
    async function shutdown() {
        if (shuttingDown) return;
        shuttingDown = true;
        app.locals.isDatabaseReady = () => false;
        const timeout = setTimeout(() => {
            console.error('Превышено время ожидания остановки сервера.');
            process.exit(1);
        }, 10000);
        timeout.unref();
        try {
            await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
            await mongoose.disconnect();
            console.log('Сервер остановлен.');
        } catch {
            console.error('Ошибка при остановке сервера.');
            process.exitCode = 1;
        } finally {
            clearTimeout(timeout);
            process.off('SIGTERM', shutdown);
            process.off('SIGINT', shutdown);
        }
    }
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    return { app, server, shutdown };
}

// RU: Запустить процесс и скрыть реквизиты БД при ошибке подключения.
// EN: Start the process and avoid exposing database credentials on connection failure.
async function main() {
    try {
        await startServer();
    } catch (error) {
        console.error(error instanceof ConfigError ? error.message : 'Не удалось запустить сервер. Проверьте доступность базы данных и настройки порта.');
        await mongoose.disconnect();
        process.exitCode = 1;
    }
}

if (require.main === module) main();

module.exports = { startServer };
