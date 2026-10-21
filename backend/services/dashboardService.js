const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const News = require('../models/News');
const { STATUS, normalizeStatus } = require('../domain/matchRules');
const readSnapshot = require('./readSnapshot');

// RU: Получить согласованные показатели и ближайшие игры из реальных данных турнира.
// EN: Read consistent totals and upcoming fixtures from actual tournament data.
async function getDashboard(timeZone, now = new Date()) {
    return readSnapshot(async session => {
        const teams = await Team.countDocuments().session(session);
        const players = await Player.countDocuments().session(session);
        const news = await News.countDocuments().session(session);
        const groups = await Match.aggregate([{ $group: { _id: '$status', count: { $sum: 1 },
            goals: { $sum: { $add: ['$homeScore', '$awayScore'] } },
            incomplete: { $sum: { $cond: [{ $eq: ['$protocolComplete', true] }, 0, 1] } },
        } }]).session(session);
        const matches = { total: 0, scheduled: 0, live: 0, finished: 0, cancelled: 0, goals: 0, incompleteProtocols: 0 };
        const keys = { [STATUS.SCHEDULED]: 'scheduled', [STATUS.LIVE]: 'live', [STATUS.FINISHED]: 'finished', [STATUS.CANCELLED]: 'cancelled' };
        for (const group of groups) {
            const status = normalizeStatus(group._id);
            matches.total += group.count;
            if (keys[status]) matches[keys[status]] += group.count;
            if (status === STATUS.FINISHED) { matches.goals += group.goals; matches.incompleteProtocols += group.incomplete; }
        }
        // RU: Преобразование в UTC учитывает сохранённый пояс и старые записи без него.
        // EN: UTC conversion uses the stored zone and supports legacy records without one.
        const upcoming = await Match.aggregate([
            { $match: { status: { $in: [STATUS.SCHEDULED, 'scheduled'] } } },
            { $addFields: { kickoff: { $dateFromString: {
                dateString: { $concat: [{ $dateToString: { date: '$date', format: '%Y-%m-%d', timezone: 'UTC' } }, 'T', '$time', ':00'] },
                timezone: { $ifNull: ['$timeZone', 'Asia/Bishkek'] }, onError: null, onNull: null,
            } } } },
            { $match: { kickoff: { $gte: now } } }, { $sort: { kickoff: 1, _id: 1 } }, { $limit: 5 }, { $unset: 'kickoff' },
        ]).session(session);
        const fixtures = upcoming.map(record => Match.hydrate(record));
        await Match.populate(fixtures, { path: 'homeTeam', select: 'name logo', options: { session } });
        await Match.populate(fixtures, { path: 'awayTeam', select: 'name logo', options: { session } });
        return { generatedAt: now.toISOString(), timeZone, teams, players, news, matches, upcoming: fixtures.map(match => match.toObject()) };
    });
}

module.exports = { getDashboard };
