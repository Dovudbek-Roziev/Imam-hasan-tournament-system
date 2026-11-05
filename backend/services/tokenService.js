const jwt = require('jsonwebtoken');

const ISSUER = 'imam-hasan-api';
const AUDIENCE = 'imam-hasan-admin';
const REFRESH_AUDIENCE = 'imam-hasan-admin-refresh';
const REFRESH_TTL_SECONDS = 30 * 24 * 60 * 60;

// RU: Выпустить ограниченный по времени токен без пароля и персональных данных.
// EN: Issue an expiring token without a password or personal profile data.
function issueToken(user, config) {
    return jwt.sign({ version: user.tokenVersion }, config.jwtSecret, {
        algorithm: 'HS256',
        subject: String(user._id),
        issuer: ISSUER,
        audience: AUDIENCE,
        expiresIn: config.jwtTtlSeconds,
    });
}

// RU: Проверить подпись, алгоритм, срок, издателя и получателя токена.
// EN: Verify token signature, algorithm, expiration, issuer, and audience.
function verifyToken(token, config) {
    return jwt.verify(token, config.jwtSecret, {
        algorithms: ['HS256'], issuer: ISSUER, audience: AUDIENCE,
    });
}

function issueRefreshToken(user, config) {
    return jwt.sign({ version: user.tokenVersion }, config.jwtSecret, {
        algorithm: 'HS256', subject: String(user._id), issuer: ISSUER,
        audience: REFRESH_AUDIENCE, expiresIn: REFRESH_TTL_SECONDS,
    });
}
function verifyRefreshToken(token, config) {
    return jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'], issuer: ISSUER, audience: REFRESH_AUDIENCE });
}
module.exports = { issueToken, verifyToken, issueRefreshToken, verifyRefreshToken, REFRESH_TTL_SECONDS };

