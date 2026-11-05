const mongoose = require('mongoose');
const schema = new mongoose.Schema({
    name: { type: String, required: true, trim: true, maxlength: 120 },
    teams: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true }],
    leagueReady: { type: Boolean, default: false },
    expectedLeagueMatches: { type: Number, default: 0, min: 0 },
    format: { type: String, enum: ['league', 'league_playoff'], default: 'league_playoff' },
}, { timestamps: true, strict: 'throw' });
module.exports = mongoose.model('Tournament', schema);
