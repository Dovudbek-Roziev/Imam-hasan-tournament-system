const express = require('express');
const { rateLimit } = require('express-rate-limit');
const { login, getMe, logout } = require('../controllers/authController');
const { authenticate } = require('../middlewares/auth');
const AppError = require('../utils/AppError');

// RU: Создать маршруты входа с отдельным лимитом попыток для каждого экземпляра приложения.
// EN: Create auth routes with a dedicated login attempt limiter per application instance.
function createAuthRouter() {
    const router = express.Router();
    const loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 5,
        skipSuccessfulRequests: true,
        standardHeaders: 'draft-8',
        legacyHeaders: false,
        // RU: Использовать общий формат ошибок с идентификатором запроса.
        // EN: Use the shared error format including the request identifier.
        handler(req, res, next) {
            next(new AppError(429, 'Слишком много попыток входа. Повторите через 15 минут.', 'LOGIN_RATE_LIMIT'));
        },
    });
    router.post('/login', loginLimiter, login);
    router.get('/me', authenticate, getMe);
    router.post('/logout', authenticate, logout);
    return router;
}

module.exports = createAuthRouter;
