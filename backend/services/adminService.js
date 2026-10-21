const User = require('../models/User');
const AppError = require('../utils/AppError');
const { hashPassword, validatePassword } = require('./passwordService');

// RU: Проверить и нормализовать данные нового администратора до обращения к БД.
// EN: Validate and normalize new administrator details before accessing the database.
function validateAdminInput({ name, email, password }) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 100) {
        throw new AppError(400, 'Укажите имя администратора длиной до 100 символов.', 'INVALID_NAME');
    }
    if (typeof email !== 'string' || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        throw new AppError(400, 'Укажите корректный адрес электронной почты.', 'INVALID_EMAIL');
    }
    validatePassword(password);
    return { name: name.trim(), email: email.trim().toLowerCase(), password };
}

// RU: Создать администратора отдельной служебной командой, без публичной регистрации.
// EN: Create an administrator through a maintenance command, without public registration.
async function createAdmin(input) {
    const { name, email, password } = validateAdminInput(input);
    if (await User.exists({ email })) {
        throw new AppError(409, 'Пользователь с такой электронной почтой уже существует.', 'DUPLICATE_USER');
    }
    const passwordHash = await hashPassword(password);
    return User.create({ name, email, passwordHash, role: 'Администратор' });
}

module.exports = { createAdmin, validateAdminInput };
