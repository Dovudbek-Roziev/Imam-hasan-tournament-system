const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// RU: Проверить собственные JavaScript-файлы, исключив зависимости и результаты тестов.
// EN: Check project JavaScript files while excluding dependencies and test artifacts.
function checkDirectory(directory) {
    let checked = 0;
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const filename = path.join(directory, entry.name);
        if (entry.isDirectory() && !['node_modules', 'coverage', '.cache'].includes(entry.name)) {
            checked += checkDirectory(filename);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            const result = spawnSync(process.execPath, ['--check', filename], { stdio: 'inherit' });
            if (result.status !== 0 || result.error) throw new Error(`Ошибка проверки: ${path.relative(process.cwd(), filename)}`);
            checked++;
        }
    }
    return checked;
}

console.log(`Проверено JavaScript-файлов: ${checkDirectory(path.join(__dirname, '..'))}.`);
