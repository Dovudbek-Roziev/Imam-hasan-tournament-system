const User = require('../models/User');
const AppError = require('../utils/AppError');
const { verifyToken } = require('../services/tokenService');

// RU: Проверить токен и актуальное состояние пользователя перед защищённой операцией.
// EN: Check the token and current account state before a protected operation.
async function authenticate(req, res, next) {
    const authorization = req.get('Authorization');
    const match = typeof authorization === 'string' && /^Bearer ([^\s]+)$/i.exec(authorization);
    if (!match) return next(new AppError(401, 'Для выполнения действия необходимо войти.', 'AUTH_REQUIRED'));
    let payload;
    try {
        payload = verifyToken(match[1], req.app.locals.config);
        if (typeof payload !== 'object' || !/^[a-f\d]{24}$/i.test(payload.sub || '') ||
            !Number.isInteger(payload.version) || payload.version < 0 || !Number.isInteger(payload.exp)) {
            throw new Error('Invalid token claims');
        }
    } catch {
        return next(new AppError(401, 'Сеанс недействителен или истёк. Войдите снова.', 'INVALID_TOKEN'));
    }
    try {
        const user = await User.findById(payload.sub).select('+tokenVersion');
        if (!user || !user.active || user.tokenVersion !== payload.version) {
            return next(new AppError(401, 'Сеанс недействителен или истёк. Войдите снова.', 'INVALID_TOKEN'));
        }
        req.user = user;
        return next();
    } catch (error) {
        return next(error);
    }
}

// RU: Проверить серверную роль независимо от отображаемых кнопок клиента.
// EN: Enforce the server-side role independently of client-side buttons.
function requireAdmin(req, res, next) {
    if (req.user?.role !== 'Администратор') {
        return next(new AppError(403, 'Недостаточно прав для выполнения действия.', 'FORBIDDEN'));
    }
    return next();
}

module.exports = { authenticate, requireAdmin };
