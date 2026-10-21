const bcrypt = require('bcryptjs');
const AppError = require('../utils/AppError');

const PASSWORD_COST = 12;

// RU: Проверить новый пароль, учитывая ограничение bcrypt в байтах, а не символах.
// EN: Validate a new password using bcrypt's byte limit rather than character count.
function validatePassword(password) {
    if (typeof password !== 'string' || password.length < 12 || password.trim().length < 12 ||
        Buffer.byteLength(password, 'utf8') > 72) {
        throw new AppError(400, 'Пароль должен содержать не менее 12 символов и не более 72 байт.', 'INVALID_PASSWORD');
    }
}

// RU: Создать солёный хеш; исходный пароль не сохраняется.
// EN: Create a salted hash without storing the original password.
async function hashPassword(password) {
    validatePassword(password);
    return bcrypt.hash(password, PASSWORD_COST);
}

// RU: Сравнить пароль с сохранённым хешем.
// EN: Compare a password with its stored hash.
async function verifyPassword(password, hash) {
    return bcrypt.compare(password, hash);
}

module.exports = { hashPassword, verifyPassword, validatePassword };
