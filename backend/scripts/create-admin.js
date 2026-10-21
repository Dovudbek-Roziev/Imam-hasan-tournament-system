const readline = require('node:readline/promises');
const { Writable } = require('node:stream');
const mongoose = require('mongoose');
const { loadConfig, ConfigError } = require('../config/env');
const connectDB = require('../config/db');
const AppError = require('../utils/AppError');
const { createAdmin, validateAdminInput } = require('../services/adminService');

// RU: Запросить данные в терминале, скрыв пароль от отображения и истории команд.
// EN: Prompt in the terminal while keeping the password out of display and shell history.
async function promptCredentials() {
    if (!process.stdin.isTTY) {
        throw new AppError(400, 'Откройте интерактивный терминал или задайте ADMIN_NAME, ADMIN_EMAIL и ADMIN_PASSWORD.', 'INPUT_REQUIRED');
    }
    let muted = false;
    const output = new Writable({
        // RU: Подавлять эхо терминала во время ввода пароля.
        // EN: Suppress terminal echo while entering the password.
        write(chunk, encoding, callback) {
            if (!muted) process.stdout.write(chunk, encoding);
            callback();
        },
    });
    const rl = readline.createInterface({ input: process.stdin, output, terminal: true });
    try {
        const name = await rl.question('Имя администратора: ');
        const email = await rl.question('Электронная почта: ');
        process.stdout.write('Пароль (минимум 12 символов; ввод скрыт): ');
        muted = true;
        const password = await rl.question('');
        process.stdout.write('\nПовторите пароль: ');
        const confirmation = await rl.question('');
        process.stdout.write('\n');
        if (password !== confirmation) throw new AppError(400, 'Пароли не совпадают.', 'PASSWORD_MISMATCH');
        return { name, email, password };
    } finally {
        rl.close();
    }
}

// RU: Добавить учётную запись в настроенную БД и гарантированно закрыть соединение.
// EN: Add the account to the configured database and always close the connection.
async function main() {
    try {
        const config = loadConfig();
        const provided = process.env.ADMIN_NAME && process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD;
        const input = provided ? {
            name: process.env.ADMIN_NAME, email: process.env.ADMIN_EMAIL, password: process.env.ADMIN_PASSWORD,
        } : await promptCredentials();
        const credentials = validateAdminInput(input);
        await connectDB(config);
        // RU: Создать уникальный индекс до записи, в том числе в production.
        // EN: Create the unique index before writing, including in production.
        await mongoose.model('User').createIndexes();
        await createAdmin(credentials);
        console.log('Администратор создан. Используйте указанную почту и пароль для входа.');
    } catch (error) {
        const safe = error instanceof ConfigError || error instanceof AppError;
        console.error(safe ? error.message : error.code === 11000
            ? 'Пользователь с такой электронной почтой уже существует.'
            : 'Не удалось создать администратора. Проверьте подключение к базе данных.');
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}

if (require.main === module) main();
