const News = require('../models/News');
const AppError = require('../utils/AppError');
const { newsInput } = require('../utils/input');
const listRecords = require('../services/listService');

// RU: Получить все новости
// EN: Get all news
exports.getNews = async (req, res, next) => {
    try {
        res.json(await listRecords(News, 'news', req.query));
    } catch (error) {
        next(error);
    }
};

// RU: Создать новость
// EN: Create a news item
exports.createNews = async (req, res, next) => {
    try {
        const news = await News.create(newsInput(req.body));
        res.status(201).json({ success: true, data: news });
    } catch (error) {
        next(error);
    }
};

// RU: Получить новость по ID
// EN: Get single news by ID
exports.getNewsById = async (req, res, next) => {
    try {
        const news = await News.findById(req.params.id);
        if (!news) throw new AppError(404, 'Новость не найдена.', 'NEWS_NOT_FOUND');
        res.status(200).json({ success: true, data: news });
    } catch (error) {
        next(error);
    }
};

// RU: Обновить новость
// EN: Update news
exports.updateNews = async (req, res, next) => {
    try {
        const news = await News.findByIdAndUpdate(req.params.id, newsInput(req.body), { new: true, runValidators: true });
        if (!news) throw new AppError(404, 'Новость не найдена.', 'NEWS_NOT_FOUND');
        res.status(200).json({ success: true, data: news });
    } catch (error) {
        next(error);
    }
};

// RU: Удалить новость
// EN: Delete news
exports.deleteNews = async (req, res, next) => {
    try {
        const news = await News.findByIdAndDelete(req.params.id);
        if (!news) throw new AppError(404, 'Новость не найдена.', 'NEWS_NOT_FOUND');
        res.status(200).json({ success: true, message: 'Новость удалена' });
    } catch (error) {
        next(error);
    }
};
