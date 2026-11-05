const crypto = require('node:crypto');
const express = require('express');
const { rateLimit } = require('express-rate-limit');
const Conversation = require('../models/Conversation');
const { authenticate, requireAdmin } = require('../middlewares/auth');
const AppError = require('../utils/AppError');
const { objectId } = require('../utils/input');
const router = express.Router();
const limiter = rateLimit({ windowMs: 60 * 1000, limit: 15, standardHeaders: 'draft-8', legacyHeaders: false, handler(req, res, next) { next(new AppError(429, 'Слишком много запросов. Повторите через минуту.', 'API_RATE_LIMIT')); } });
function owner(req) {
    const token = req.get('X-Conversation-Token');
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new AppError(401, 'Не удалось подтвердить доступ к переписке.', 'CONVERSATION_AUTH');
    return crypto.createHash('sha256').update(token).digest('hex');
}
function message(body) {
    const text = body?.text;
    if (typeof text !== 'string' || !text.trim() || text.trim().length > 2000) throw new AppError(400, 'Введите сообщение до 2000 символов.', 'INVALID_MESSAGE');
    return text.trim();
}
router.get('/mine', limiter, async (req, res, next) => {
    try { const hash = owner(req); res.set('Cache-Control', 'no-store'); res.json({ success: true, data: await Conversation.find({ ownerHash: hash }).sort({ updatedAt: -1 }).limit(100).lean() }); } catch (e) { next(e); }
});
router.post('/mine', limiter, async (req, res, next) => {
    try {
        const hash = owner(req), text = message(req.body), role = req.body?.role;
        if (!['player', 'parent', 'supporter'].includes(role)) throw new AppError(400, 'Выберите категорию.', 'INVALID_CATEGORY');
        const count = await Conversation.countDocuments({ ownerHash: hash });
        if (count >= 100) throw new AppError(429, 'Достигнут предел обращений.', 'CONVERSATION_LIMIT');
        const item = await Conversation.create({ ownerHash: hash, role, messages: [{ sender: 'visitor', text }] });
        const data = item.toObject(); delete data.ownerHash; res.status(201).json({ success: true, data });
    } catch (e) { next(e); }
});
router.post('/mine/:id/read', limiter, async (req, res, next) => {
    try {
        const hash = owner(req), id = objectId(req.params.id);
        const item = await Conversation.findOneAndUpdate({ _id: id, ownerHash: hash }, { $set: { unreadVisitor: false } }, { new: true });
        if (!item) throw new AppError(404, 'Обращение не найдено или достигнут предел сообщений.', 'CONVERSATION_NOT_FOUND');
        res.json({ success: true, data: item });
    } catch (e) { next(e); }
});
router.post('/mine/:id/messages', limiter, async (req, res, next) => {
    try {
        const hash = owner(req), id = objectId(req.params.id), text = message(req.body);
        const item = await Conversation.findOneAndUpdate({ _id: id, ownerHash: hash, 'messages.199': { $exists: false } }, { $push: { messages: { sender: 'visitor', text } }, $set: { unreadAdmin: true, unreadVisitor: false } }, { new: true, runValidators: true });
        if (!item) throw new AppError(404, 'Обращение не найдено или достигнут предел сообщений.', 'CONVERSATION_NOT_FOUND');
        res.json({ success: true, data: item });
    } catch (e) { next(e); }
});
router.get('/admin', authenticate, requireAdmin, async (req, res, next) => {
    try { res.set('Cache-Control', 'no-store'); res.json({ success: true, data: await Conversation.find().sort({ updatedAt: -1 }).limit(100).lean() }); } catch (e) { next(e); }
});
router.post('/admin/:id/messages', authenticate, requireAdmin, async (req, res, next) => {
    try {
        const id = objectId(req.params.id), text = message(req.body);
        const item = await Conversation.findOneAndUpdate({ _id: id, 'messages.199': { $exists: false } }, { $push: { messages: { sender: 'admin', text } }, $set: { unreadAdmin: false, unreadVisitor: true } }, { new: true, runValidators: true });
        if (!item) throw new AppError(404, 'Обращение не найдено или достигнут предел сообщений.', 'CONVERSATION_NOT_FOUND');
        res.json({ success: true, data: item });
    } catch (e) { next(e); }
});
module.exports = router;
