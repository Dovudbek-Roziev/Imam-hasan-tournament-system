const Team = require('../models/Team');
const AppError = require('../utils/AppError');
const roster = require('../services/rosterService');
const listRecords = require('../services/listService');

// RU: Получить все команды
// EN: Get all teams
exports.getTeams = async (req, res, next) => {
    try {
        res.json(await listRecords(Team, 'teams', req.query));
    } catch (error) {
        next(error);
    }
};

// RU: Создать новую команду
// EN: Create a new team
exports.createTeam = async (req, res, next) => {
    try {
        const team = await roster.createTeam(req.body);
        res.status(201).json({ success: true, data: team });
    } catch (error) {
        next(error);
    }
};

// RU: Получить одну команду по ID
// EN: Get a single team by ID
exports.getTeam = async (req, res, next) => {
    try {
        const team = await Team.findById(req.params.id);
        if (!team) throw new AppError(404, 'Команда не найдена.', 'TEAM_NOT_FOUND');
        res.status(200).json({ success: true, data: team });
    } catch (error) {
        next(error);
    }
};

// RU: Обновить команду
// EN: Update a team
exports.updateTeam = async (req, res, next) => {
    try {
        const team = await roster.updateTeam(req.params.id, req.body);
        res.status(200).json({ success: true, data: team });
    } catch (error) {
        next(error);
    }
};

// RU: Удалить команду
// EN: Delete a team
exports.deleteTeam = async (req, res, next) => {
    try {
        await roster.deleteTeam(req.params.id);
        res.status(200).json({ success: true, message: 'Команда удалена' });
    } catch (error) {
        next(error);
    }
};
