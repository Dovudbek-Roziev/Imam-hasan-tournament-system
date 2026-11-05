const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Team = require('../models/Team');
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const { generateSchedule } = require('../services/scheduleService');
const { updateMatch } = require('../services/matchService');
const { tournamentStats } = require('../services/tournamentRead');

test('seasons are isolated and league results advance automatically to the final', async () => {
    const db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    try {
        await mongoose.connect(db.getUri('seasons'));
        const teams = await Team.create(['A', 'B', 'C', 'D'].map(name => ({ name })));
        const ids = teams.map(team => String(team._id));
        const [first, second] = await Tournament.create([{ name: 'One', teams: ids, format: 'league_playoff' }, { name: 'Two', teams: ids, format: 'league' }]);
        const input = { teams: ids, legs: 1, startDate: '2026-11-20', startTime: '12:00', duration: 60, breakMinutes: 10, intervalDays: 7, stadium: 'Osh' };
        assert.equal(await generateSchedule({ ...input, tournament: String(first._id) }, 'Asia/Bishkek'), 6);
        assert.equal(await generateSchedule({ ...input, startDate: '2027-11-20', tournament: String(second._id) }, 'Asia/Bishkek'), 6);
        await assert.rejects(generateSchedule({ ...input, tournament: String(first._id) }, 'Asia/Bishkek'), { code: 'SCHEDULE_EXISTS' });
        const league = await Match.find({ tournament: first._id, stage: 'Лига' });
        for (const match of league) await updateMatch(String(match._id), { version: match.__v, status: 'Завершён', homeScore: 1, awayScore: 0 });
        const firstStats = await tournamentStats(String(first._id));
        const secondStats = await tournamentStats(String(second._id));
        assert.equal(firstStats.teams.reduce((sum, team) => sum + team.played, 0), 12);
        assert.equal(secondStats.teams.reduce((sum, team) => sum + team.played, 0), 0);
        assert.equal((await Team.findById(ids[0])).played, 0);
        const semis = await Match.find({ tournament: first._id, stage: 'Полуфинал' });
        assert.equal(semis.length, 2);
        for (const semi of semis) await updateMatch(String(semi._id), { version: semi.__v, status: 'Завершён', homeScore: 1, awayScore: 0 });
        assert.equal(await Match.countDocuments({ tournament: first._id, stage: 'Финал' }), 1);
        assert.equal(await Match.countDocuments({ tournament: first._id, stage: 'Матч за 3-е место' }), 1);
        assert.equal(await Match.countDocuments({ tournament: second._id, stage: 'Полуфинал' }), 0);
    } finally { await mongoose.disconnect(); await db.stop(); }
});
