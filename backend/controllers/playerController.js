const Player = require('../models/Player');
const AppError = require('../utils/AppError');
const roster = require('../services/rosterService');
const listRecords = require('../services/listService');

// RU: Получить всех игроков
// EN: Get all players
exports.getPlayers = async (req, res, next) => {
    try {
        res.json(await listRecords(Player, 'players', req.query, [{ path: 'team', select: 'name logo' }]));
    } catch (error) {
        next(error);
    }
};

// RU: Создать нового игрока
// EN: Create a new player
exports.createPlayer = async (req, res, next) => {
    try {
        const player = await roster.createPlayer(req.body);
        res.status(201).json({ success: true, data: player });
    } catch (error) {
        next(error);
    }
};

// RU: Получить игрока по ID
// EN: Get a single player by ID
exports.getPlayer = async (req, res, next) => {
    try {
        const player = await Player.findById(req.params.id).populate('team', 'name logo');
        if (!player) throw new AppError(404, 'Игрок не найден.', 'PLAYER_NOT_FOUND');
        res.status(200).json({ success: true, data: player });
    } catch (error) {
        next(error);
    }
};

// RU: Обновить игрока
// EN: Update a player
exports.updatePlayer = async (req, res, next) => {
    try {
        const player = await roster.updatePlayer(req.params.id, req.body);
        res.status(200).json({ success: true, data: player });
    } catch (error) {
        next(error);
    }
};

// RU: Удалить игрока
// EN: Delete a player
exports.deletePlayer = async (req, res, next) => {
    try {
        await roster.deletePlayer(req.params.id);
        res.status(200).json({ success: true, message: 'Игрок удален' });
    } catch (error) {
        next(error);
    }
};
