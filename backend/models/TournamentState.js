const mongoose = require('mongoose');

// RU: Общая ревизия сериализует изменения турнира между процессами сервера.
// EN: A shared revision serializes tournament mutations across server processes.
const stateSchema = new mongoose.Schema({
    _id: { type: String },
    revision: { type: Number, default: 0 },
}, { versionKey: false });

module.exports = mongoose.model('TournamentState', stateSchema);
