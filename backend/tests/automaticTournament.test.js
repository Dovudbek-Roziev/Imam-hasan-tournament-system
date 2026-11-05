const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const Team = require('../models/Team');
const Match = require('../models/Match');
const Tournament = require('../models/Tournament');
const { generateSchedule, previewSchedule } = require('../services/scheduleService');
const { createMatch, updateMatch } = require('../services/matchService');
const { tournamentStats } = require('../services/tournamentRead');
const { createAdmin } = require('../services/adminService');
const { issueToken } = require('../services/tokenService');
const { validateEnv } = require('../config/env');
const createApp = require('../app');

test('seasons are isolated and league results advance automatically to the final', async () => {
    const db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    try {
        await mongoose.connect(db.getUri('seasons'));
        const teams = await Team.create(['A', 'B', 'C', 'D'].map(name => ({ name })));
        const ids = teams.map(team => String(team._id));
        const [first, second] = await Tournament.create([{ name: 'One', teams: ids, format: 'league_playoff' }, { name: 'Two', teams: ids, format: 'league' }]);
        const input = { teams: ids, legs: 1, startDate: '2026-11-20', startTime: '12:00', duration: 60, breakMinutes: 10, intervalDays: 7, stadium: 'Osh' };
        const manual = await Tournament.create({ name: 'Manual', teams: ids, format: 'league_playoff' });
        const match = await createMatch({ tournament: String(manual._id), homeTeam: ids[0], awayTeam: ids[1], date: '2025-01-01', time: '12:00', stadium: 'Osh' }, 'Asia/Bishkek');
        await updateMatch(String(match._id), { version: match.__v, status: 'Завершён', homeScore: 1, awayScore: 0 });
        assert.equal(await Match.countDocuments({ tournament: manual._id, stage: 'Полуфинал' }), 0);
        const next = await createMatch({ tournament: String(manual._id), homeTeam: ids[2], awayTeam: ids[3], date: '2025-01-02', time: '12:00', stadium: 'Osh' }, 'Asia/Bishkek');
        await updateMatch(String(next._id), { version: next.__v, status: 'Завершён', homeScore: 1, awayScore: 0 });
        assert.equal(await Match.countDocuments({ tournament: manual._id, stage: 'Полуфинал' }), 0);
        const admin = await createAdmin({ name: 'Admin', email: 'admin@example.test', password: 'StrongPassword123' });
        const config = validateEnv({ NODE_ENV: 'test', MONGO_URI: db.getUri(), JWT_SECRET: 'secret-tests-'.repeat(4) });
        const server = createApp(config).listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        try {
            const base = `http://127.0.0.1:${server.address().port}`;
            const headers = { Authorization: `Bearer ${issueToken(admin, config)}` };
            assert.equal((await fetch(`${base}/api/tournaments/${manual._id}/complete-league`, { method: 'POST' })).status, 401);
            assert.equal((await fetch(`${base}/api/tournaments/${manual._id}/complete-league`, { method: 'POST', headers })).status, 200);
            assert.equal(await Match.countDocuments({ tournament: manual._id, stage: 'Полуфинал' }), 2);
            assert.equal((await fetch(`${base}/api/tournaments/${manual._id}`, { method: 'DELETE', headers })).status, 409);
        } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
        await assert.rejects(generateSchedule({ ...input, teams: ids.slice(0, 2), tournament: String(first._id) }, 'Asia/Bishkek'), { code: 'INVALID_TEAMS' });
        assert.equal(await generateSchedule({ ...input, tournament: String(first._id) }, 'Asia/Bishkek'), 6);
        await assert.rejects(previewSchedule({ ...input, tournament: String(first._id), startTime: '12:30', stadium: 'Другая площадка' }, 'Asia/Bishkek'), { code: 'SCHEDULE_EXISTS' });
        await assert.rejects(previewSchedule({ ...input, tournament: String(second._id), startTime: '12:30', stadium: 'Другая площадка' }, 'Asia/Bishkek'), { code: 'SCHEDULE_CONFLICT' });
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
        const incomplete = await Tournament.create({ name: 'Incomplete', teams: ids, format: 'league_playoff' });
        await generateSchedule({ ...input, startDate: '2029-11-20', tournament: String(incomplete._id) }, 'Asia/Bishkek');
        const scheduled = await Match.find({ tournament: incomplete._id });
        await Match.deleteOne({ _id: scheduled.pop()._id });
        for (const fixture of scheduled) await updateMatch(String(fixture._id), { version: fixture.__v, status: 'Завершён', homeScore: 1, awayScore: 0 });
        assert.equal(await Match.countDocuments({ tournament: incomplete._id, stage: 'Полуфинал' }), 0);
    } finally { await mongoose.disconnect(); await db.stop(); }
});
