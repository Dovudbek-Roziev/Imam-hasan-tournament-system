const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const { objectId } = require('../utils/input');
const Player = require('../models/Player');
const Match = require('../models/Match');
const News = require('../models/News');
const AppError = require('../utils/AppError');
const readSnapshot = require('./readSnapshot');
const { calculateStatistics } = require('./statisticsService');
const { serializeMatch } = require('../domain/matchRules');

// RU: Экспортировать согласованный снимок турнира без пользователей, паролей и токенов.
// EN: Export a consistent tournament snapshot without users, passwords, or tokens.
async function exportArchive(timeZone, tournamentId = null) {
    return readSnapshot(async session => {
        const tournament = tournamentId && tournamentId !== 'legacy' ? await Tournament.findById(objectId(tournamentId)).session(session).lean() : null;
        if (tournamentId && tournamentId !== 'legacy' && !tournament) throw new AppError(404, 'Турнир не найден.', 'TOURNAMENT_NOT_FOUND');
        const records = {};
        for (const [key, Model] of Object.entries({ teams: Team, players: Player, matches: Match, news: News })) {
            const filter = key === 'matches' ? { tournament: tournament?._id || null } : tournament && key === 'teams' ? { _id: { $in: tournament.teams } } : tournament && key === 'players' ? { team: { $in: tournament.teams } } : {};
            records[key] = await Model.find(filter).sort({ _id: 1 }).limit(10001).session(session).lean();
            if (records[key].length > 10000) throw new AppError(409, 'Турнир слишком большой для JSON-экспорта. Используйте резервное копирование MongoDB.', 'ARCHIVE_TOO_LARGE');
        }
        const totals = calculateStatistics(records.teams, records.players, records.matches);
        records.teams = records.teams.map(team => ({ ...team, ...totals.teamTotals.get(String(team._id)) }));
        records.players = records.players.map(player => ({ ...player, ...totals.playerTotals.get(String(player._id)) }));
        records.matches = records.matches.map(match => serializeMatch(null, match));
        return { schemaVersion: 1, title: tournament?.name || 'Архив турнира «Имам Хасан»', exportedAt: new Date().toISOString(), timeZone, ...records };
    });
}

module.exports = { exportArchive };

