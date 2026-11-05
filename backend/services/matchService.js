const Team = require('../models/Team');
const Tournament = require('../models/Tournament');
const { tournamentStats } = require('./tournamentRead');
const Player = require('../models/Player');
const Match = require('../models/Match');
const AppError = require('../utils/AppError');
const { objectId, integer, matchInput } = require('../utils/input');
const { STATUS, EVENT, STAGE, normalizeStatus, normalizeEvent, normalizeStage } = require('../domain/matchRules');
const transaction = require('./tournamentTransaction');
const statistics = require('./statisticsService');
const { DEFAULT_TIME_ZONE, startsAt } = require('../domain/matchTime');

// RU: Определить победителя матча на выбывание с учётом серии пенальти.
// EN: Resolve a knockout winner, including a penalty shootout when needed.
function knockoutWinner(match) {
    if (match.homeScore !== match.awayScore) return String(match.homeScore > match.awayScore ? match.homeTeam : match.awayTeam);
    if (match.homePenaltyScore === null || match.awayPenaltyScore === null || match.homePenaltyScore === match.awayPenaltyScore) return null;
    return String(match.homePenaltyScore > match.awayPenaltyScore ? match.homeTeam : match.awayTeam);
}

// RU: Проверить посев полуфинала и участников финала по фактическим результатам.
// EN: Validate semifinal seeding and finalists against the completed results.
async function validatePlayoffStage(match, session) {
    const stage = normalizeStage(match.stage);
    if (stage === STAGE.LEAGUE) return;
    const currentId = match._id;
    const duplicateFilter = stage === STAGE.SEMIFINAL
        ? { stage, $or: [{ homeTeam: match.homeTeam, awayTeam: match.awayTeam }, { homeTeam: match.awayTeam, awayTeam: match.homeTeam }] }
        : { stage };
    const duplicate = await Match.findOne({ tournament: match.tournament || null, ...duplicateFilter, ...(currentId ? { _id: { $ne: currentId } } : {}) }).session(session).select('_id');
    if (duplicate) throw new AppError(409, 'Матч этого этапа уже создан.', 'PLAYOFF_STAGE_EXISTS');

    if (stage === STAGE.SEMIFINAL) {
        const unfinishedLeagueMatch = await Match.findOne({
            tournament: match.tournament || null,
            $and: [
                { $or: [{ stage: STAGE.LEAGUE }, { stage: { $exists: false } }] },
                { status: { $nin: [STATUS.FINISHED, STATUS.CANCELLED, 'finished', 'cancelled'] } },
                ...(currentId ? [{ _id: { $ne: currentId } }] : []),
            ],
        }).session(session).select('_id');
        if (unfinishedLeagueMatch) throw new AppError(409, 'Сначала завершите все матчи лиги.', 'LEAGUE_NOT_COMPLETE');

        const rankedTeams = match.tournament ? (await tournamentStats(String(match.tournament), session)).teams.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name)).slice(0, 4) : await Team.find().sort({ points: -1, goalDifference: -1, goalsFor: -1, name: 1, _id: 1 }).session(session).limit(4).lean();
        if (rankedTeams.length < 4) throw new AppError(409, 'Для полуфинала нужны как минимум четыре команды.', 'NOT_ENOUGH_PLAYOFF_TEAMS');
        const pairs = [[rankedTeams[0], rankedTeams[3]], [rankedTeams[1], rankedTeams[2]]];
        const validPair = pairs.some(([first, second]) =>
            (String(match.homeTeam) === String(first._id) && String(match.awayTeam) === String(second._id)) ||
            (String(match.homeTeam) === String(second._id) && String(match.awayTeam) === String(first._id)));
        if (!validPair) throw new AppError(409, 'Полуфиналы должны пройти между командами 1–4 и 2–3 по итогам лиги.', 'INVALID_SEMIFINAL_PAIRING');
        return;
    }

    const semifinals = await Match.find({ tournament: match.tournament || null, stage: STAGE.SEMIFINAL, status: { $in: [STATUS.FINISHED, 'finished'] } }).session(session).lean();
    if (semifinals.length !== 2) throw new AppError(409, 'Сначала завершите оба полуфинала.', 'SEMIFINALS_NOT_COMPLETE');
    const winners = semifinals.map(knockoutWinner);
    if (winners.some((winner) => !winner) || new Set(winners).size !== 2) {
        throw new AppError(409, 'Нельзя определить участников следующего этапа.', 'PLAYOFF_WINNERS_UNRESOLVED');
    }
    const expectedTeams = stage === STAGE.FINAL
        ? winners
        : semifinals.map((semi, index) => String(semi.homeTeam) === winners[index] ? String(semi.awayTeam) : String(semi.homeTeam));
    const actualTeams = [String(match.homeTeam), String(match.awayTeam)];
    if (new Set(actualTeams).size !== 2 || actualTeams.some((team) => !expectedTeams.includes(team))) {
        throw new AppError(409, stage === STAGE.FINAL ? 'В финале должны сыграть победители полуфиналов.' : 'За третье место должны сыграть проигравшие полуфиналов.', 'INVALID_PLAYOFF_FINALISTS');
    }
}

// RU: Проверить реальные связи и согласованность счёта с протоколом до сохранения.
// EN: Validate actual references and score/protocol consistency before saving.
async function validateMatch(match, session) {
    if (!match.homeTeam || !match.awayTeam || String(match.homeTeam) === String(match.awayTeam)) {
        throw new AppError(400, 'Выберите две разные команды.', 'INVALID_TEAMS');
    }
    const teams = await Team.find({ _id: { $in: [match.homeTeam, match.awayTeam] } }).session(session).select('_id');
    if (teams.length !== 2) throw new AppError(400, 'Одна из выбранных команд не существует.', 'INVALID_TEAMS');
    if (match.tournament) { const tournament = await Tournament.findById(match.tournament).session(session); if (!tournament || ![match.homeTeam, match.awayTeam].every(id => tournament.teams.some(team => String(team) === String(id)))) throw new AppError(400, 'Выберите команды турнира.', 'INVALID_TEAMS'); }
    if (match.tournament && normalizeStatus(match.status) !== STATUS.CANCELLED) {
        const start = new Date(startsAt(match.date, match.time, match.timeZone)).getTime();
        if (Number.isFinite(start)) {
            const others = await Match.find({ _id: { $ne: match._id }, status: { $nin: [STATUS.CANCELLED, 'cancelled'] }, $or: [
                { homeTeam: { $in: [match.homeTeam, match.awayTeam] } }, { awayTeam: { $in: [match.homeTeam, match.awayTeam] } }, { stadium: match.stadium },
            ] }).session(session).lean();
            const conflict = others.some(other => {
                const otherStart = new Date(startsAt(other.date, other.time, other.timeZone)).getTime();
                return start < otherStart + (other.duration || 90) * 60000 && otherStart < start + (match.duration || 90) * 60000;
            });
            if (conflict) throw new AppError(409, 'Время пересекается с другим матчем команды или стадиона.', 'SCHEDULE_CONFLICT');
        }
    }
    await validatePlayoffStage(match, session);
    const ids = new Set();
    for (const event of match.events) {
        if (event.player) ids.add(String(event.player));
        if (event.assist) ids.add(String(event.assist));
    }
    const players = await Player.find({ _id: { $in: [...ids] } }).session(session).lean();
    const playerMap = new Map(players.map(player => [String(player._id), player]));
    const home = String(match.homeTeam), away = String(match.awayTeam);
    const goals = { [home]: 0, [away]: 0 };
    match.status = normalizeStatus(match.status);
    for (const event of match.events) {
        const player = playerMap.get(String(event.player));
        if (!player || ![home, away].includes(String(player.team))) {
            throw new AppError(400, 'Участник события должен принадлежать одной из команд матча.', 'INVALID_EVENT_PLAYER');
        }
        event.team = player.team;
        event.type = normalizeEvent(event.type);
        if (event.type === EVENT.GOAL) goals[String(player.team)]++;
        if (event.type === EVENT.OWN_GOAL) goals[String(player.team) === home ? away : home]++;
        if (event.assist) {
            const assistant = playerMap.get(String(event.assist));
            if (event.type !== EVENT.GOAL || !assistant || String(assistant._id) === String(player._id) ||
                String(assistant.team) !== String(player.team)) {
                throw new AppError(400, 'Ассистент гола должен быть другим игроком той же команды.', 'INVALID_ASSIST');
            }
        }
    }
    await match.validate();
    if (goals[home] > match.homeScore || goals[away] > match.awayScore ||
        (match.protocolComplete && (goals[home] !== match.homeScore || goals[away] !== match.awayScore))) {
        throw new AppError(400, 'Голы в протоколе не соответствуют счёту матча.', 'SCORE_PROTOCOL_MISMATCH');
    }
}

// Advance only explicitly configured tournaments; existing schedules stay untouched.
async function advancePlayoffs(match, session) {
    if (!match.tournament || normalizeStatus(match.status) !== STATUS.FINISHED) return;
    const tournament = await Tournament.findById(match.tournament).session(session).lean();
    if (!tournament || tournament.format !== 'league_playoff' || tournament.teams.length < 4) return;
    const filter = { tournament: match.tournament };
    let pairs = [];
    if (normalizeStage(match.stage) === STAGE.LEAGUE) {
        if (await Match.exists({ ...filter, stage: STAGE.LEAGUE, status: { $nin: [STATUS.FINISHED, STATUS.CANCELLED, 'finished', 'cancelled'] } }).session(session)) return;
        if (await Match.exists({ ...filter, stage: { $in: [STAGE.SEMIFINAL, STAGE.FINAL, STAGE.THIRD_PLACE] } }).session(session)) return;
        const standings = (await tournamentStats(String(match.tournament), session)).teams.sort((a, b) => b.points - a.points || b.goalDifference - a.goalDifference || b.goalsFor - a.goalsFor || a.name.localeCompare(b.name));
        pairs = [[STAGE.SEMIFINAL, standings[0]._id, standings[3]._id], [STAGE.SEMIFINAL, standings[1]._id, standings[2]._id]];
    } else if (normalizeStage(match.stage) === STAGE.SEMIFINAL) {
        if (await Match.exists({ ...filter, stage: { $in: [STAGE.FINAL, STAGE.THIRD_PLACE] } }).session(session)) return;
        const semis = await Match.find({ ...filter, stage: STAGE.SEMIFINAL, status: { $in: [STATUS.FINISHED, 'finished'] } }).session(session).lean();
        if (semis.length !== 2) return;
        const winners = semis.map(knockoutWinner);
        if (winners.some(winner => !winner)) return;
        const losers = semis.map((semi, i) => String(semi.homeTeam) === winners[i] ? semi.awayTeam : semi.homeTeam);
        pairs = [[STAGE.THIRD_PLACE, losers[0], losers[1]], [STAGE.FINAL, winners[0], winners[1]]];
    }
    if (!pairs.length) return;
    const last = await Match.findOne(filter).sort({ date: -1, time: -1 }).session(session).lean();
    const baseDate = new Date(last.date.getTime() + 7 * 86400000);
    const scheduled = await Match.find({ status: { $nin: [STATUS.CANCELLED, 'cancelled'] } }).session(session).lean();
    for (const [index, [stage, homeTeam, awayTeam]] of pairs.entries()) {
        let date, time, available = false;
        for (let day = 0; day < 30 && !available; day++) {
            date = new Date(baseDate.getTime() + day * 86400000);
            time = index ? '18:00' : '16:00';
            const start = new Date(startsAt(date, time, match.timeZone)).getTime();
            available = !scheduled.some(other => {
                const otherStart = new Date(startsAt(other.date, other.time, other.timeZone)).getTime();
                const sameTeam = [String(homeTeam), String(awayTeam)].some(id => [String(other.homeTeam), String(other.awayTeam)].includes(id));
                const sameStadium = (other.stadium || '').toLocaleLowerCase() === (match.stadium || '').toLocaleLowerCase();
                return (sameTeam || sameStadium) && start < otherStart + (other.duration || 90) * 60000 && otherStart < start + 90 * 60000;
            });
        }
        if (!available) throw new AppError(409, 'Не удалось подобрать свободное время для плей-офф.', 'SCHEDULE_CONFLICT');
        const fixture = new Match({ tournament: match.tournament, stage, homeTeam, awayTeam, date, time, stadium: match.stadium, timeZone: match.timeZone });
        await validateMatch(fixture, session);
        await fixture.save({ session });
        scheduled.push(fixture.toObject());
    }
}

// RU: Проверить версию формы, чтобы не перезаписать более свежий результат.
// EN: Check the form revision to avoid overwriting a newer result.
function assertVersion(match, version) {
    integer(version);
    if ((match.__v || 0) !== version) throw new AppError(409, 'Матч уже изменён. Обновите данные перед сохранением.', 'VERSION_CONFLICT');
}

// RU: Создать матч и пересчитать показатели одной атомарной операцией.
// EN: Create a match and recalculate totals as one atomic operation.
async function createMatch(body, timeZone = DEFAULT_TIME_ZONE) {
    const data = matchInput(body);
    return transaction(async session => {
        if (normalizeStage(data.stage) === STAGE.LEAGUE && await Match.exists({ tournament: data.tournament || null, stage: { $in: [STAGE.SEMIFINAL, STAGE.THIRD_PLACE, STAGE.FINAL] } }).session(session)) {
            throw new AppError(409, 'После начала плей-офф нельзя добавлять матчи лиги.', 'LEAGUE_LOCKED_BY_PLAYOFF');
        }
        const match = new Match({ ...data, timeZone });
        await validateMatch(match, session);
        await match.save({ session });
        await statistics.rebuildStatistics(session);
        return match.toObject();
    });
}

// RU: Применить исправление с полным пересчётом, включая прежних участников и удалённые события.
// EN: Apply a correction with a full rebuild, including former participants and removed events.
async function updateMatch(id, body) {
    id = objectId(id);
    const { version, ...data } = matchInput(body, true);
    return transaction(async session => {
        const match = await Match.findById(id).session(session);
        if (!match) throw new AppError(404, 'Матч не найден.', 'MATCH_NOT_FOUND');
        assertVersion(match, version);
        if (normalizeStage(match.stage) === STAGE.LEAGUE &&
            ['stage', 'homeTeam', 'awayTeam', 'homeScore', 'awayScore', 'events', 'protocolComplete', 'status'].some(key => key in data) &&
            await Match.exists({ tournament: match.tournament || null, stage: { $in: [STAGE.SEMIFINAL, STAGE.THIRD_PLACE, STAGE.FINAL] } }).session(session)) {
            throw new AppError(409, 'Сначала удалите матчи плей-офф, затем меняйте результаты лиги.', 'LEAGUE_LOCKED_BY_PLAYOFF');
        }
        if (normalizeStage(match.stage) === STAGE.SEMIFINAL &&
            ['stage', 'homeTeam', 'awayTeam', 'homeScore', 'awayScore', 'homePenaltyScore', 'awayPenaltyScore', 'status'].some(key => key in data)) {
            const dependentMatch = await Match.findOne({ tournament: match.tournament || null, stage: { $in: [STAGE.THIRD_PLACE, STAGE.FINAL] } }).session(session).select('_id');
            if (dependentMatch) throw new AppError(409, 'Сначала удалите матч финала или за третье место.', 'PLAYOFF_DEPENDENCY_EXISTS');
        }
        match.set(data);
        await validateMatch(match, session);
        // RU: Ревизия меняется и при правке скалярных полей, не только массива событий.
        // EN: The revision changes for scalar edits as well as event array changes.
        match.increment();
        await match.save({ session });
        await statistics.rebuildStatistics(session);
        await advancePlayoffs(match, session);
        return match.toObject();
    });
}

// RU: Удалить матч и его вклад в показатели; при наличии версии проверить её.
// EN: Delete the match and its statistical contribution; check a revision when supplied.
async function deleteMatch(id, version) {
    id = objectId(id);
    if (version !== undefined) integer(version);
    return transaction(async session => {
        const match = await Match.findById(id).session(session);
        if (!match) throw new AppError(404, 'Матч не найден.', 'MATCH_NOT_FOUND');
        if (version !== undefined) assertVersion(match, version);
        if (normalizeStage(match.stage) === STAGE.LEAGUE &&
            await Match.exists({ tournament: match.tournament || null, stage: { $in: [STAGE.SEMIFINAL, STAGE.THIRD_PLACE, STAGE.FINAL] } }).session(session)) {
            throw new AppError(409, 'Сначала удалите матчи плей-офф, затем меняйте результаты лиги.', 'LEAGUE_LOCKED_BY_PLAYOFF');
        }
        if (normalizeStage(match.stage) === STAGE.SEMIFINAL) {
            const dependentMatch = await Match.findOne({ tournament: match.tournament || null, stage: { $in: [STAGE.THIRD_PLACE, STAGE.FINAL] } }).session(session).select('_id');
            if (dependentMatch) throw new AppError(409, 'Сначала удалите матч финала или за третье место.', 'PLAYOFF_DEPENDENCY_EXISTS');
        }
        await Match.deleteOne({ _id: id }, { session });
        await statistics.rebuildStatistics(session);
    });
}

module.exports = { createMatch, updateMatch, deleteMatch, validateMatch, knockoutWinner, validatePlayoffStage };

