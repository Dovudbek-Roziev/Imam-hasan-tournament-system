const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const News = require('../models/News');
const User = require('../models/User');
const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const transaction = require('./tournamentTransaction');
const { validateMatch } = require('./matchService');
const { rebuildStatistics } = require('./statisticsService');
const { STATUS, EVENT } = require('../domain/matchRules');
const { DEFAULT_TIME_ZONE } = require('../domain/matchTime');
const { calendarDate } = require('../utils/input');

// RU: Заполнить только пустую демонстрационную базу; повторный запуск ничего не стирает.
// EN: Populate only an empty demo database; repeated runs never erase existing data.
async function seedDemo({ date, timeZone = DEFAULT_TIME_ZONE }) {
    if (!mongoose.connection.name.endsWith('_demo')) throw new AppError(400, 'Имя демонстрационной базы должно оканчиваться на _demo.', 'DEMO_DATABASE_REQUIRED');
    const day = calendarDate(date);
    return transaction(async session => {
        for (const Model of [Team, Player, Match, News, User]) {
            if (await Model.exists({}).session(session)) throw new AppError(409, 'Демонстрационная база должна быть пустой. Существующие данные сохранены.', 'DEMO_NOT_EMPTY');
        }
        const teams = await Team.create(['Ош', 'Сулайман-Тоо', 'Ак-Буура', 'Достук'].map(name => ({ name })), { session, ordered: true });
        const names = [['Азамат Алиев', 'Бекзат Осмонов'], ['Тимур Исаев', 'Руслан Каримов'], ['Данияр Абдиев', 'Эрмек Садыков'], ['Фаррух Рахимов', 'Нурлан Токтосунов']];
        const players = await Player.create(teams.flatMap((team, i) => names[i].map((name, j) => ({ name, team: team._id, number: j + 9 }))), { session, ordered: true });
        const fixtures = [
            { homeTeam: teams[0]._id, awayTeam: teams[1]._id, date: day, time: '16:00', status: STATUS.FINISHED,
                homeScore: 1, awayScore: 0, protocolComplete: true,
                events: [{ minute: 23, player: players[0]._id, assist: players[1]._id, type: EVENT.GOAL }] },
            { homeTeam: teams[2]._id, awayTeam: teams[3]._id, date: day, time: '18:00', status: STATUS.LIVE },
            { homeTeam: teams[0]._id, awayTeam: teams[2]._id, date: new Date(day.getTime() + 86400000), time: '18:30', status: STATUS.SCHEDULED },
        ];
        for (const fixture of fixtures) {
            const match = new Match({ ...fixture, timeZone, stadium: 'Стадион города Ош' });
            await validateMatch(match, session);
            await match.save({ session });
        }
        await News.create([
            { title: 'Турнир «Имам Хасан» стартовал в Оше', content: 'Демонстрационная новость. Четыре команды начинают борьбу за кубок турнира.' },
            { title: 'Расписание следующего тура', content: 'Демонстрационная новость. Следите за расписанием и поддерживайте команды на стадионе.' },
        ], { session, ordered: true });
        await rebuildStatistics(session);
        return { teams: teams.length, players: players.length, matches: fixtures.length, news: 2 };
    });
}

module.exports = { seedDemo };
