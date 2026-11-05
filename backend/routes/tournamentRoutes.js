const express = require('express');
const Tournament = require('../models/Tournament');
const Team = require('../models/Team');
const Match = require('../models/Match');
const AppError = require('../utils/AppError');
const { objectId } = require('../utils/input');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const transaction = require('../services/tournamentTransaction');
const { startsAt } = require('../domain/matchTime');
const { advancePlayoffs } = require('../services/matchService');
const { tournamentStats } = require('../services/tournamentRead');
const router = express.Router();
router.get('/', async (req, res, next) => {
    try { res.json({ success: true, data: await Tournament.find().sort({ createdAt: -1 }).populate('teams', 'name logo').lean() }); } catch (error) { next(error); }
});
router.get('/:id/table', async (req, res, next) => {
    try { const result = await tournamentStats(req.params.id); res.json({ success: true, data: result.teams.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name)) }); } catch (error) { next(error); }
});
router.get('/:id/players', async (req, res, next) => {
    try { const result = await tournamentStats(req.params.id); const teams = new Map(result.teams.map(team => [String(team._id), team])); res.json({ success: true, data: result.players.map(player => ({ ...player, team: teams.get(String(player.team)) })) }); } catch (error) { next(error); }
});
router.post('/', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const { name, teams, format } = req.body || {};
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 || !Array.isArray(teams) || teams.length < 2 || teams.length > 100 || !['league', 'league_playoff'].includes(format)) throw new AppError(400, 'Проверьте название, команды и формат турнира.', 'INVALID_TOURNAMENT');
        const ids = teams.map(objectId);
        if (new Set(ids).size !== ids.length) throw new AppError(400, 'Выберите разные команды.', 'INVALID_TEAMS');
        const tournament = await transaction(async session => {
            if (await Team.countDocuments({ _id: { $in: ids } }).session(session) !== ids.length) throw new AppError(400, 'Одна из выбранных команд не существует.', 'INVALID_TEAMS');
            const item = new Tournament({ name: name.trim(), teams: ids, format }); await item.save({ session }); return item;
        });
        res.status(201).json({ success: true, data: tournament });
    } catch (error) { next(error); }
});
router.put('/:id', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const id = objectId(req.params.id), name = req.body?.name;
        if (typeof name !== 'string' || !name.trim() || name.trim().length > 120 || Object.keys(req.body).some(key => key !== 'name')) throw new AppError(400, 'Проверьте название турнира.', 'INVALID_TOURNAMENT');
        await transaction(async session => { const tournament = await Tournament.findById(id).session(session); if (!tournament) throw new AppError(404, 'Турнир не найден.', 'TOURNAMENT_NOT_FOUND'); tournament.name = name.trim(); await tournament.save({ session }); });
        res.json({ success: true });
    } catch (error) { next(error); }
});
router.delete('/:id', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const id = objectId(req.params.id);
        await transaction(async session => { if (!await Tournament.exists({ _id: id }).session(session)) throw new AppError(404, 'Турнир не найден.', 'TOURNAMENT_NOT_FOUND'); if (await Match.exists({ tournament: id }).session(session)) throw new AppError(409, 'Нельзя удалить турнир с матчами.', 'TOURNAMENT_IN_USE'); await Tournament.deleteOne({ _id: id }, { session }); });
        res.json({ success: true });
    } catch (error) { next(error); }
});
router.post('/:id/complete-league', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const id = objectId(req.params.id);
        await transaction(async session => {
            const tournament = await Tournament.findById(id).session(session);
            if (!tournament) throw new AppError(404, 'Турнир не найден.', 'TOURNAMENT_NOT_FOUND');
            if (tournament.format !== 'league_playoff' || tournament.teams.length < 4) throw new AppError(400, 'Для плей-офф нужны минимум четыре команды.', 'NOT_ENOUGH_PLAYOFF_TEAMS');
            const unfinished = await Match.exists({ tournament: id, stage: 'Лига', status: { $nin: ['Завершён', 'Отменён', 'finished', 'cancelled'] } }).session(session);
            const match = await Match.findOne({ tournament: id, stage: 'Лига', status: { $in: ['Завершён', 'finished'] } }).sort({ date: -1, time: -1 }).session(session);
            if (unfinished || !match) throw new AppError(409, 'Сначала завершите все матчи лиги.', 'LEAGUE_NOT_COMPLETE');
            tournament.leagueReady = true; tournament.expectedLeagueMatches = 0; await tournament.save({ session });
            await advancePlayoffs(match, session);
        });
        res.json({ success: true });
    } catch (error) { next(error); }
});
router.put('/:id/team', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const id = objectId(req.params.id), from = objectId(req.body?.from), to = objectId(req.body?.to);
        await transaction(async session => {
            const tournament = await Tournament.findById(id).session(session);
            if (!tournament) throw new AppError(404, 'Турнир не найден.', 'TOURNAMENT_NOT_FOUND');
            if (!tournament.teams.some(team => String(team) === from) || tournament.teams.some(team => String(team) === to) || !await Team.exists({ _id: to }).session(session)) throw new AppError(400, 'Выберите команды турнира.', 'INVALID_TEAMS');
            if (await Match.exists({ tournament: id, $or: [{ homeTeam: from }, { awayTeam: from }], status: { $nin: ['Запланирован', 'scheduled'] } }).session(session)) throw new AppError(409, 'Нельзя заменить команду после начала её матчей.', 'TEAM_ALREADY_PLAYED');
            if (await Match.exists({ tournament: id, stage: { $in: ['Полуфинал', 'Финал', 'Матч за 3-е место'] } }).session(session)) throw new AppError(409, 'Нельзя заменить команду после начала плей-офф.', 'PLAYOFF_STARTED');
            const affected = await Match.find({ tournament: id, $or: [{ homeTeam: from }, { awayTeam: from }] }).session(session).lean();
            const otherGames = await Match.find({ $or: [{ homeTeam: to }, { awayTeam: to }], status: { $nin: ['Отменён', 'cancelled'] } }).session(session).lean();
            for (const game of affected) {
                const start = new Date(startsAt(game.date, game.time, game.timeZone)).getTime();
                if (otherGames.some(other => { const otherStart = new Date(startsAt(other.date, other.time, other.timeZone)).getTime(); return start < otherStart + (other.duration || 90) * 60000 && otherStart < start + (game.duration || 90) * 60000; })) throw new AppError(409, 'Время пересекается с другим матчем команды или стадиона.', 'SCHEDULE_CONFLICT');
            }
            await Match.updateMany({ tournament: id, homeTeam: from }, { $set: { homeTeam: to }, $inc: { __v: 1 } }, { session });
            await Match.updateMany({ tournament: id, awayTeam: from }, { $set: { awayTeam: to }, $inc: { __v: 1 } }, { session });
            tournament.teams = tournament.teams.map(team => String(team) === from ? to : team); await tournament.save({ session });
        });
        res.json({ success: true });
    } catch (error) { next(error); }
});
module.exports = router;
