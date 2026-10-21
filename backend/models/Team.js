const mongoose = require('mongoose');

// RU: Проверить веб-адрес логотипа без встроенных учётных данных.
// EN: Validate the logo web URL without embedded credentials.
function validLogo(value) {
    if (!value) return true;
    if (/^\/api\/media\/[a-f\d]{24}$/i.test(value)) return true;
    try {
        const url = new URL(value);
        return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password;
    } catch { return false; }
}

// RU: Команда; статистические поля изменяет только сервис расчёта.
// EN: A team; only the calculation service updates statistical fields.
const teamSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'Введите название команды.'], trim: true, maxlength: 100, unique: true },
    logo: { type: String, trim: true, maxlength: 2048, default: '', validate: validLogo },
    points: { type: Number, default: 0 },
    played: { type: Number, default: 0 },
    won: { type: Number, default: 0 },
    draw: { type: Number, default: 0 },
    lost: { type: Number, default: 0 },
    goalsFor: { type: Number, default: 0 },
    goalsAgainst: { type: Number, default: 0 },
    goalDifference: { type: Number, default: 0 },
}, { timestamps: true, strict: 'throw' });

module.exports = mongoose.model('Team', teamSchema);
