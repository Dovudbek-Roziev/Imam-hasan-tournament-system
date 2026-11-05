const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const AppError = require('../utils/AppError');
const { objectId } = require('../utils/input');
const { calculateStatistics } = require('./statisticsService');

async function tournamentStats(id, session) {
    id = objectId(id);
    const tournament = await Tournament.findById(id).session(session).lean();
    if (!tournament) throw new AppError(404, 'Турнир не найден.', 'TOURNAMENT_NOT_FOUND');
    const teams = await Team.find({ _id: { $in: tournament.teams } }).session(session).lean();
    const players = await Player.find({ team: { $in: tournament.teams } }).session(session).lean();
    const matches = await Match.find({ tournament: id }).session(session).lean();
    const totals = calculateStatistics(teams, players, matches);
    return { tournament, teams: teams.map(team => ({ ...team, ...totals.teamTotals.get(String(team._id)) })), players: players.map(player => ({ ...player, ...totals.playerTotals.get(String(player._id)) })) };
}
module.exports = { tournamentStats };
