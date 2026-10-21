const crypto = require('node:crypto');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const { hashPassword, verifyPassword } = require('../services/passwordService');
const { issueToken } = require('../services/tokenService');

let dummyHashPromise;

// RU: Выдать только публичные поля профиля, исключив хеш и версию сеанса.
// EN: Return only public profile fields, excluding the hash and session version.
function publicUser(user) {
    return { _id: String(user._id), name: user.name, email: user.email, role: user.role };
}

// RU: Проверить учётные данные без раскрытия существования конкретного email.
// EN: Check credentials without revealing whether a particular email exists.
async function login(req, res, next) {
    const { email, password } = req.body || {};
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
        typeof password !== 'string' || password.length === 0 || Buffer.byteLength(password) > 72) {
        return next(new AppError(400, 'Укажите корректный адрес электронной почты и пароль.', 'INVALID_CREDENTIALS_FORMAT'));
    }
    try {
        const user = await User.findOne({ email: email.trim().toLowerCase() }).select('+passwordHash +tokenVersion');
        // RU: Сравнение с фиктивным хешем сокращает разницу во времени для неизвестного email.
        // EN: A dummy hash comparison reduces timing differences for unknown emails.
        dummyHashPromise ||= hashPassword(crypto.randomBytes(24).toString('hex'));
        const fallbackHash = await dummyHashPromise;
        const valid = await verifyPassword(password, user?.passwordHash || fallbackHash);
        if (!user || !user.active || !valid) {
            throw new AppError(401, 'Неверная электронная почта или пароль.', 'INVALID_CREDENTIALS');
        }
        res.set('Cache-Control', 'no-store');
        return res.json({ success: true, data: {
            token: issueToken(user, req.app.locals.config),
            expiresIn: req.app.locals.config.jwtTtlSeconds,
            user: publicUser(user),
        } });
    } catch (error) {
        return next(error);
    }
}

// RU: Вернуть профиль текущего авторизованного пользователя.
// EN: Return the current authenticated user's profile.
function getMe(req, res) {
    res.set('Cache-Control', 'no-store');
    res.json({ success: true, data: publicUser(req.user) });
}

// RU: Отозвать все ранее выданные токены этой учётной записи.
// EN: Revoke all tokens previously issued for this account.
async function logout(req, res, next) {
    try {
        await User.updateOne({ _id: req.user._id }, { $inc: { tokenVersion: 1 } });
        res.set('Cache-Control', 'no-store');
        res.json({ success: true, message: 'Вы вышли из системы на всех устройствах.' });
    } catch (error) {
        next(error);
    }
}

module.exports = { login, getMe, logout };
