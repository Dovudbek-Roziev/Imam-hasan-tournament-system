const mongoose = require('mongoose');
const connectDB = require('../config/db');
const { ConfigError } = require('../config/env');
const AppError = require('../utils/AppError');
const { seedDemo } = require('../services/demoService');
const { DEFAULT_TIME_ZONE, validTimeZone } = require('../domain/matchTime');

// RU: Требовать отдельный явный URI; рабочий .env и MONGO_URI не используются.
// EN: Require a separate explicit URI; the live .env and MONGO_URI are never used.
async function main() {
    try {
        const uri = process.env.DEMO_MONGO_URI;
        let name;
        try { name = new URL(uri).pathname.slice(1); } catch { /* RU: Проверяется ниже. EN: Checked below. */ }
        if (!name || !/^[a-zA-Z0-9_-]+_demo$/.test(name)) throw new ConfigError('Задайте DEMO_MONGO_URI с отдельной базой, имя которой оканчивается на _demo.');
        const timeZone = process.env.TOURNAMENT_TIME_ZONE || DEFAULT_TIME_ZONE;
        if (!validTimeZone(timeZone)) throw new ConfigError('Неверный часовой пояс TOURNAMENT_TIME_ZONE.');
        await connectDB({ mongoUri: uri, nodeEnv: 'development' });
        const parts = new Intl.DateTimeFormat('en-GB', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
        const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
        const result = await seedDemo({ date: `${values.year}-${values.month}-${values.day}`, timeZone });
        console.log(`Демонстрационные данные созданы: команд ${result.teams}, игроков ${result.players}, матчей ${result.matches}, новостей ${result.news}.`);
    } catch (error) {
        console.error(error instanceof ConfigError || error instanceof AppError ? error.message : 'Не удалось создать демонстрационные данные. Проверьте подключение к отдельной базе.');
        process.exitCode = 1;
    } finally { await mongoose.disconnect(); }
}

if (require.main === module) main();
