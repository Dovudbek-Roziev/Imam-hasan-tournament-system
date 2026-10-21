const mongoose = require('mongoose');
const { loadConfig, ConfigError } = require('../config/env');
const connectDB = require('../config/db');
const AppError = require('../utils/AppError');
const transaction = require('../services/tournamentTransaction');
const { rebuildStatistics } = require('../services/statisticsService');

// RU: Восстановить показатели из матчей одной транзакцией без изменения результатов.
// EN: Restore totals from matches in one transaction without changing match results.
async function main() {
    try {
        const config = loadConfig();
        await connectDB(config);
        const result = await transaction(rebuildStatistics);
        console.log(`Пересчёт завершён. Команд: ${result.teams}, игроков: ${result.players}, завершённых матчей: ${result.matches}.`);
    } catch (error) {
        console.error(error instanceof ConfigError || error instanceof AppError
            ? error.message : 'Не удалось пересчитать статистику. Изменения не сохранены.');
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) main();
