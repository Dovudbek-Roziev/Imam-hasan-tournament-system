const mongoose = require('mongoose');

// RU: Игрок и вычисляемые показатели; номер уникален в пределах команды.
// EN: A player and derived totals; shirt numbers are unique within a team.
const playerSchema = new mongoose.Schema({
    name: { type: String, required: [true, 'Введите имя игрока.'], trim: true, maxlength: 100 },
    team: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: [true, 'Выберите команду.'], index: true },
    number: { type: Number, default: null, min: 1, max: 99,
        validate: { validator: value => value === null || Number.isInteger(value), message: 'Номер должен быть целым числом.' } },
    goals: { type: Number, default: 0 },
    assists: { type: Number, default: 0 },
    yellowCards: { type: Number, default: 0 },
    redCards: { type: Number, default: 0 },
}, { timestamps: true, strict: 'throw' });

playerSchema.index({ team: 1, number: 1 }, { unique: true, partialFilterExpression: { number: { $type: 'number' } } });
playerSchema.index({ team: 1, name: 1, _id: 1 });

module.exports = mongoose.model('Player', playerSchema);
