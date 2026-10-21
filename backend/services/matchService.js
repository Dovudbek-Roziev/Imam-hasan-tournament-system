const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const AppError = require('../utils/AppError');
const { objectId, integer, matchInput } = require('../utils/input');
const { STATUS, EVENT, STAGE, normalizeStatus, normalizeEvent, normalizeStage } = require('../domain/matchRules');
const transaction = require('./tournamentTransaction');
const statistics = require('./statisticsService');
const { DEFAULT_TIME_ZONE } = require('../domain/matchTime');

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
    const duplicate = await Match.findOne({ ...duplicateFilter, ...(currentId ? { _id: { $ne: currentId } } : {}) }).session(session).select('_id');
    if (duplicate) throw new AppError(409, 'Матч этого этапа уже создан.', 'PLAYOFF_STAGE_EXISTS');

    if (stage === STAGE.SEMIFINAL) {
        const unfinishedLeagueMatch = await Match.findOne({
            $and: [
                { $or: [{ stage: STAGE.LEAGUE }, { stage: { $exists: false } }] },
                { status: { $nin: [STATUS.FINISHED, STATUS.CANCELLED, 'finished', 'cancelled'] } },
                ...(currentId ? [{ _id: { $ne: currentId } }] : []),
            ],
        }).session(session).select('_id');
        if (unfinishedLeagueMatch) throw new AppError(409, 'Сначала завершите все матчи лиги.', 'LEAGUE_NOT_COMPLETE');

        const rankedTeams = await Team.find().sort({ points: -1, goalDifference: -1, goalsFor: -1, name: 1, _id: 1 }).session(session).limit(4).lean();
        if (rankedTeams.length < 4) throw new AppError(409, 'Для полуфинала нужны как минимум четыре команды.', 'NOT_ENOUGH_PLAYOFF_TEAMS');
        const pairs = [[rankedTeams[0], rankedTeams[3]], [rankedTeams[1], rankedTeams[2]]];
        const validPair = pairs.some(([first, second]) =>
            (String(match.homeTeam) === String(first._id) && String(match.awayTeam) === String(second._id)) ||
            (String(match.homeTeam) === String(second._id) && String(match.awayTeam) === String(first._id)));
        if (!validPair) throw new AppError(409, 'Полуфиналы должны пройти между командами 1–4 и 2–3 по итогам лиги.', 'INVALID_SEMIFINAL_PAIRING');
        return;
    }

    const semifinals = await Match.find({ stage: STAGE.SEMIFINAL, status: { $in: [STATUS.FINISHED, 'finished'] } }).session(session).lean();
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
        if (normalizeStage(data.stage) === STAGE.LEAGUE && await Match.exists({ stage: { $in: [STAGE.SEMIFINAL, STAGE.THIRD_PLACE, STAGE.FINAL] } }).session(session)) {
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
            await Match.exists({ stage: { $in: [STAGE.SEMIFINAL, STAGE.THIRD_PLACE, STAGE.FINAL] } }).session(session)) {
            throw new AppError(409, 'Сначала удалите матчи плей-офф, затем меняйте результаты лиги.', 'LEAGUE_LOCKED_BY_PLAYOFF');
        }
        if (normalizeStage(match.stage) === STAGE.SEMIFINAL &&
            ['stage', 'homeTeam', 'awayTeam', 'homeScore', 'awayScore', 'homePenaltyScore', 'awayPenaltyScore', 'status'].some(key => key in data)) {
            const dependentMatch = await Match.findOne({ stage: { $in: [STAGE.THIRD_PLACE, STAGE.FINAL] } }).session(session).select('_id');
            if (dependentMatch) throw new AppError(409, 'Сначала удалите матч финала или за третье место.', 'PLAYOFF_DEPENDENCY_EXISTS');
        }
        match.set(data);
        await validateMatch(match, session);
        // RU: Ревизия меняется и при правке скалярных полей, не только массива событий.
        // EN: The revision changes for scalar edits as well as event array changes.
        match.increment();
        await match.save({ session });
        await statistics.rebuildStatistics(session);
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
            await Match.exists({ stage: { $in: [STAGE.SEMIFINAL, STAGE.THIRD_PLACE, STAGE.FINAL] } }).session(session)) {
            throw new AppError(409, 'Сначала удалите матчи плей-офф, затем меняйте результаты лиги.', 'LEAGUE_LOCKED_BY_PLAYOFF');
        }
        if (normalizeStage(match.stage) === STAGE.SEMIFINAL) {
            const dependentMatch = await Match.findOne({ stage: { $in: [STAGE.THIRD_PLACE, STAGE.FINAL] } }).session(session).select('_id');
            if (dependentMatch) throw new AppError(409, 'Сначала удалите матч финала или за третье место.', 'PLAYOFF_DEPENDENCY_EXISTS');
        }
        await Match.deleteOne({ _id: id }, { session });
        await statistics.rebuildStatistics(session);
    });
}

module.exports = { createMatch, updateMatch, deleteMatch, validateMatch, knockoutWinner, validatePlayoffStage };
