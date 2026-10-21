const Team = require('../models/Team');
const Player = require('../models/Player');
const Match = require('../models/Match');
const AppError = require('../utils/AppError');
const { STATUS, EVENT, STAGE, normalizeStatus, normalizeEvent, normalizeStage } = require('../domain/matchRules');

// RU: Создать нулевые показатели, чтобы удалённые события не оставляли старые значения.
// EN: Create zeroed totals so removed events cannot leave stale values behind.
function emptyTeamStats() {
    return { played: 0, won: 0, draw: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, goalDifference: 0, points: 0 };
}

// RU: Создать нулевые показатели игрока, включая голевые передачи.
// EN: Create zeroed player totals, including assists.
function emptyPlayerStats() { return { goals: 0, assists: 0, yellowCards: 0, redCards: 0 }; }

// RU: Сообщить о повреждённой старой записи вместо молчаливого искажения таблицы.
// EN: Report a corrupt historical record instead of silently distorting the standings.
function invalidHistory() {
    throw new AppError(409, 'В истории матчей есть некорректный счёт или ссылки. Исправьте протокол проблемного матча.', 'INVALID_MATCH_HISTORY');
}

// RU: Вычислить официальные показатели заново только по завершённым матчам.
// EN: Derive official totals from scratch using finished matches only.
function calculateStatistics(teams, players, matches) {
    const teamTotals = new Map(teams.map(team => [String(team._id), emptyTeamStats()]));
    const playerTotals = new Map(players.map(player => [String(player._id), emptyPlayerStats()]));
    const playerMap = new Map(players.map(player => [String(player._id), player]));
    for (const match of matches) {
        if (normalizeStatus(match.status) !== STATUS.FINISHED) continue;
        const home = String(match.homeTeam), away = String(match.awayTeam);
        if (home === away || !teamTotals.has(home) || !teamTotals.has(away) ||
            ![match.homeScore, match.awayScore].every(score => Number.isSafeInteger(score) && score >= 0 && score <= 999)) invalidHistory();
        if (normalizeStage(match.stage) === STAGE.LEAGUE) {
            for (const [teamId, scored, conceded] of [[home, match.homeScore, match.awayScore], [away, match.awayScore, match.homeScore]]) {
                const totals = teamTotals.get(teamId);
                totals.played++;
                totals.goalsFor += scored;
                totals.goalsAgainst += conceded;
                if (scored > conceded) totals.won++;
                else if (scored === conceded) totals.draw++;
                else totals.lost++;
                totals.goalDifference = totals.goalsFor - totals.goalsAgainst;
                totals.points = totals.won * 3 + totals.draw;
            }
        }
        const recorded = { [home]: 0, [away]: 0 };
        for (const event of match.events || []) {
            const player = playerMap.get(String(event.player));
            const type = normalizeEvent(event.type);
            const teamId = String(event.team || player?.team);
            if (!player || String(player.team) !== teamId || ![home, away].includes(teamId) || !Object.values(EVENT).includes(type) ||
                !Number.isInteger(event.minute) || event.minute < 0 || event.minute > 180) invalidHistory();
            const totals = playerTotals.get(String(player._id));
            if (type === EVENT.GOAL) { totals.goals++; recorded[teamId]++; }
            if (type === EVENT.OWN_GOAL) recorded[teamId === home ? away : home]++;
            if (type === EVENT.YELLOW) totals.yellowCards++;
            if (type === EVENT.RED) totals.redCards++;
            if (event.assist) {
                const assistant = playerMap.get(String(event.assist));
                if (type !== EVENT.GOAL || !assistant || String(assistant._id) === String(player._id) ||
                    String(assistant.team) !== teamId) invalidHistory();
                playerTotals.get(String(assistant._id)).assists++;
            }
        }
        if (recorded[home] > match.homeScore || recorded[away] > match.awayScore ||
            (match.protocolComplete && (recorded[home] !== match.homeScore || recorded[away] !== match.awayScore))) invalidHistory();
    }
    return { teamTotals, playerTotals };
}

// RU: Сохранить все производные показатели в той же транзакции, что и результат матча.
// EN: Persist every derived total in the same transaction as the match result.
async function rebuildStatistics(session) {
    if (!session?.inTransaction()) throw new Error('Пересчёт должен выполняться внутри транзакции.');
    // RU: Операции одной MongoDB-сессии выполняются последовательно.
    // EN: Operations within a single MongoDB session run sequentially.
    const teams = await Team.find().session(session).lean();
    const players = await Player.find().session(session).lean();
    // RU: Native query сохраняет старое английское значение без преобразования setter-ом схемы.
    // EN: A native query preserves the legacy English value without schema setter conversion.
    const matches = await Match.collection.find({ status: { $in: [STATUS.FINISHED, 'finished'] } }, { session }).toArray();
    const { teamTotals, playerTotals } = calculateStatistics(teams, players, matches);
    if (teamTotals.size) await Team.bulkWrite([...teamTotals].map(([id, totals]) => ({
        updateOne: { filter: { _id: id }, update: { $set: totals } },
    })), { session });
    if (playerTotals.size) await Player.bulkWrite([...playerTotals].map(([id, totals]) => ({
        updateOne: { filter: { _id: id }, update: { $set: totals } },
    })), { session });
    return { teams: teamTotals.size, players: playerTotals.size, matches: matches.length };
}

module.exports = { calculateStatistics, rebuildStatistics };
