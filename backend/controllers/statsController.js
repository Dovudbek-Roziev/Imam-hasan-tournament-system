const Team = require('../models/Team');
const Player = require('../models/Player');
const dashboard = require('../services/dashboardService');
const archive = require('../services/archiveService');

// RU: Скачать снимок турнира для сохранения истории перед будущим сезоном.
// EN: Download a tournament snapshot to preserve history before a future season.
exports.getArchive = async (req, res, next) => {
    try {
        const data = await archive.exportArchive(req.app.locals.config.timeZone);
        res.set('Cache-Control', 'no-store');
        res.attachment('imam-hasan-archive.json');
        res.json({ success: true, data });
    } catch (error) { next(error); }
};

// RU: Показать администратору реальные итоги и ближайшие матчи.
// EN: Show the administrator actual totals and upcoming fixtures.
exports.getDashboard = async (req, res, next) => {
    try {
        res.set('Cache-Control', 'no-store');
        res.json({ success: true, data: await dashboard.getDashboard(req.app.locals.config.timeZone) });
    } catch (error) { next(error); }
};

// RU: Получить турнирную таблицу (сортировка по очкам, разнице мячей и забитым мячам)
// EN: Get tournament table (sorted by points, goal difference and goals for)
exports.getTable = async (req, res, next) => {
    try {
        const table = await Team.find().sort({ points: -1, goalDifference: -1, goalsFor: -1, name: 1, _id: 1 });
        res.status(200).json({ success: true, data: table });
    } catch (error) {
        next(error);
    }
};

// RU: Получить топ-10 бомбардиров
// EN: Get top 10 scorers
exports.getTopScorers = async (req, res, next) => {
    try {
        const topScorers = await Player.find({ goals: { $gt: 0 } }).sort({ goals: -1, name: 1, _id: 1 }).limit(10).populate('team', 'name logo');
        res.status(200).json({ success: true, data: topScorers });
    } catch (error) {
        next(error);
    }
};

// RU: Получить топ-10 ассистентов
// EN: Get top 10 assists
exports.getTopAssists = async (req, res, next) => {
    try {
        const topAssists = await Player.find({ assists: { $gt: 0 } }).sort({ assists: -1, name: 1, _id: 1 }).limit(10).populate('team', 'name logo');
        res.status(200).json({ success: true, data: topAssists });
    } catch (error) {
        next(error);
    }
};
