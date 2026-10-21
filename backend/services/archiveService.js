const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const News = require('../models/News');
const AppError = require('../utils/AppError');
const readSnapshot = require('./readSnapshot');
const { calculateStatistics } = require('./statisticsService');
const { serializeMatch } = require('../domain/matchRules');

// RU: Экспортировать согласованный снимок турнира без пользователей, паролей и токенов.
// EN: Export a consistent tournament snapshot without users, passwords, or tokens.
async function exportArchive(timeZone) {
    return readSnapshot(async session => {
        const records = {};
        for (const [key, Model] of Object.entries({ teams: Team, players: Player, matches: Match, news: News })) {
            records[key] = await Model.find().sort({ _id: 1 }).limit(10001).session(session).lean();
            if (records[key].length > 10000) throw new AppError(409, 'Турнир слишком большой для JSON-экспорта. Используйте резервное копирование MongoDB.', 'ARCHIVE_TOO_LARGE');
        }
        const totals = calculateStatistics(records.teams, records.players, records.matches);
        records.teams = records.teams.map(team => ({ ...team, ...totals.teamTotals.get(String(team._id)) }));
        records.players = records.players.map(player => ({ ...player, ...totals.playerTotals.get(String(player._id)) }));
        records.matches = records.matches.map(match => serializeMatch(null, match));
        return { schemaVersion: 1, title: 'Архив турнира «Имам Хасан»', exportedAt: new Date().toISOString(), timeZone, ...records };
    });
}

module.exports = { exportArchive };
