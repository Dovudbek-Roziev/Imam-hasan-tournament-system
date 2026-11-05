const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true }],
    format: { type: String, enum: ['league', 'league_playoff'], default: 'league_playoff' },
}, { timestamps: true, strict: 'throw' });
module.exports = mongoose.model('Tournament', schema);
