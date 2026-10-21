const Match = require('../models/Match');
const AppError = require('../utils/AppError');
const service = require('../services/matchService');
const listRecords = require('../services/listService');

// RU: Получить все матчи
// EN: Get all matches
exports.getMatches = async (req, res, next) => {
    try {
        res.json(await listRecords(Match, 'matches', req.query, [
            { path: 'homeTeam', select: 'name logo' }, { path: 'awayTeam', select: 'name logo' },
            { path: 'events.player', select: 'name team', populate: { path: 'team', select: 'name' } },
            { path: 'events.team', select: 'name' }, { path: 'events.assist', select: 'name' },
        ]));
    } catch (error) {
        next(error);
    }
};

// RU: Создать новый матч
// EN: Create a new match
exports.createMatch = async (req, res, next) => {
    try {
        const match = await service.createMatch(req.body, req.app.locals.config.timeZone);
        res.status(201).json({ success: true, data: match });
    } catch (error) {
        next(error);
    }
};

// RU: Получить матч по ID
// EN: Get a single match by ID
exports.getMatch = async (req, res, next) => {
    try {
        const match = await Match.findById(req.params.id)
            .populate('homeTeam', 'name logo')
            .populate('awayTeam', 'name logo')
            .populate({ path: 'events.player', select: 'name team', populate: { path: 'team', select: 'name' } })
            .populate('events.team', 'name')
            .populate('events.assist', 'name');
        if (!match) throw new AppError(404, 'Матч не найден.', 'MATCH_NOT_FOUND');
        res.status(200).json({ success: true, data: match });
    } catch (error) {
        next(error);
    }
};

// RU: Обновить матч
// EN: Update a match
exports.updateMatch = async (req, res, next) => {
    try {
        const match = await service.updateMatch(req.params.id, req.body);
        res.status(200).json({ success: true, data: match });
    } catch (error) {
        next(error);
    }
};

// RU: Удалить матч
// EN: Delete a match
exports.deleteMatch = async (req, res, next) => {
    try {
        const rawVersion = req.query.version;
        if (rawVersion !== undefined && (typeof rawVersion !== 'string' || !/^\d+$/.test(rawVersion))) {
            throw new AppError(400, 'Версия матча должна быть целым неотрицательным числом.', 'INVALID_VERSION');
        }
        await service.deleteMatch(req.params.id, rawVersion === undefined ? undefined : Number(rawVersion));
        res.status(200).json({ success: true, message: 'Матч удален' });
    } catch (error) {
        next(error);
    }
};
