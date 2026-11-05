const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const Match = require('../models/Match');
const AppError = require('../utils/AppError');
const transaction = require('./tournamentTransaction');
const { roundRobin } = require('../domain/roundRobin');
const { objectId, calendarDate, integer } = require('../utils/input');
const { STAGE } = require('../domain/matchRules');
const { startsAt } = require('../domain/matchTime');

function buildSchedule(input) {
    if (!input || !Array.isArray(input.teams)) throw new AppError(400, 'Выберите команды.', 'INVALID_SCHEDULE');
    const teams = input.teams.map(objectId);
    const rounds = roundRobin(teams, input.legs);
    const date = calendarDate(input.startDate);
    if (typeof input.startTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.startTime)) throw new AppError(400, 'Укажите корректное время начала.', 'INVALID_SCHEDULE');
    const duration = integer(input.duration, 1, 720);
    const intervalDays = integer(input.intervalDays, 1, 365);
    const breakMinutes = integer(input.breakMinutes, 0, 720);
    const stadium = typeof input.stadium === 'string' ? input.stadium.trim() : '';
    if (!stadium || stadium.length > 150) throw new AppError(400, 'Укажите стадион.', 'INVALID_SCHEDULE');
    const [hours, minutes] = input.startTime.split(':').map(Number);
    const start = hours * 60 + minutes;
    return rounds.flatMap((games, round) => games.map((game, index) => {
        const minute = start + index * (duration + breakMinutes);
        if (minute + duration > 1440) throw new AppError(400, 'Матчи тура не помещаются в один день. Измените время или длительность.', 'SCHEDULE_DAY_FULL');
        const day = new Date(date.getTime() + round * intervalDays * 86400000);
        return { ...game, date: day, time: `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`, stadium, duration, stage: STAGE.LEAGUE, round: round + 1 };
    }));
}

// RU: Проверить пересечение расписания с уже назначенными матчами до показа и сохранения.
// EN: Check generated fixtures against existing matches before previewing or saving.
async function validateScheduleConflicts(fixtures, timeZone, session) {
    let query = Match.find({ status: { $nin: ['Отменён', 'cancelled'] } });
    if (session) query = query.session(session);
    const existing = await query.lean();
    for (const fixture of fixtures) {
        const start = new Date(startsAt(fixture.date, fixture.time, timeZone)).getTime();
        const end = start + fixture.duration * 60000;
        for (const other of existing) {
            const otherStart = new Date(startsAt(other.date, other.time, other.timeZone)).getTime();
            const otherEnd = otherStart + (other.duration || 90) * 60000;
            const sameTeam = [fixture.homeTeam, fixture.awayTeam].some(id => [String(other.homeTeam), String(other.awayTeam)].includes(String(id)));
            const sameStadium = fixture.stadium.toLocaleLowerCase() === other.stadium?.toLocaleLowerCase();
            if (start < otherEnd && otherStart < end && (sameTeam || sameStadium)) {
                throw new AppError(409, 'Время пересекается с другим матчем команды или стадиона.', 'SCHEDULE_CONFLICT');
            }
        }
    }
}

// RU: Проверить команды, турнир и пустоту его календаря до предварительного просмотра или сохранения.
// EN: Validate teams, tournament membership, and an empty calendar before previewing or saving.
async function validateScheduleTarget(input, session) {
    let teamQuery = Team.countDocuments({ _id: { $in: input.teams.map(objectId) } });
    if (session) teamQuery = teamQuery.session(session);
    if (await teamQuery !== input.teams.length) throw new AppError(400, 'Одна из выбранных команд не существует.', 'INVALID_TEAMS');

    let tournament = null;
    if (input.tournament) {
        let tournamentQuery = Tournament.findById(objectId(input.tournament));
        if (session) tournamentQuery = tournamentQuery.session(session);
        tournament = await tournamentQuery;
        if (!tournament || input.teams.length !== tournament.teams.length || input.teams.some(id => !tournament.teams.some(team => String(team) === objectId(id)))) {
            throw new AppError(400, 'Выберите команды турнира.', 'INVALID_TEAMS');
        }
    }

    let matchesQuery = Match.exists({ tournament: tournament?._id || null });
    if (session) matchesQuery = matchesQuery.session(session);
    if (await matchesQuery) throw new AppError(409, 'Автоматическое создание доступно только для пустого календаря.', 'SCHEDULE_EXISTS');
    return tournament;
}

// RU: Показать только тот предварительный календарь, который можно сохранить сейчас.
// EN: Preview only a schedule that can be saved with the current calendar.
async function previewSchedule(input, timeZone) {
    const fixtures = buildSchedule(input);
    await validateScheduleTarget(input);
    await validateScheduleConflicts(fixtures, timeZone);
    return fixtures;
}

async function generateSchedule(input, timeZone) {
    const fixtures = buildSchedule(input);
    return transaction(async session => {
        const tournament = await validateScheduleTarget(input, session);
        await validateScheduleConflicts(fixtures, timeZone, session);
        const docs = fixtures.map(fixture => { const record = { ...fixture }; delete record.round; return new Match({ ...record, tournament: tournament?._id || null, timeZone }); });
        for (const doc of docs) await doc.validate();
        await Match.insertMany(docs, { session });
        if (tournament) { tournament.leagueReady = true; tournament.expectedLeagueMatches = docs.length; await tournament.save({ session }); }
        return docs.length;
    });
}
module.exports = { buildSchedule, previewSchedule, generateSchedule };
