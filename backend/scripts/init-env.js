const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');

// RU: Создать локальное окружение и секрет, сохранив существующие реквизиты БД.
// EN: Initialize the local environment and secret while preserving existing database credentials.
function initializeEnvironment() {
    const envPath = path.join(__dirname, '..', '.env');
    const examplePath = path.join(__dirname, '..', '.env.example');
    let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : fs.readFileSync(examplePath, 'utf8');
    const values = dotenv.parse(content);
    if (values.JWT_SECRET?.trim()) {
        console.log('JWT_SECRET уже настроен. Существующий файл сохранён без изменений.');
        return;
    }
    const secret = crypto.randomBytes(48).toString('hex');
    if (/^\s*JWT_SECRET\s*=.*$/m.test(content)) {
        content = content.replace(/^\s*JWT_SECRET\s*=.*$/m, `JWT_SECRET=${secret}`);
    } else {
        content = `${content.trimEnd()}\nJWT_SECRET=${secret}\n`;
    }
    fs.writeFileSync(envPath, content, { mode: 0o600 });
    console.log('Локальное окружение настроено. Секрет сохранён в backend/.env и не выведен на экран.');
}

if (require.main === module) initializeEnvironment();

module.exports = { initializeEnvironment };
