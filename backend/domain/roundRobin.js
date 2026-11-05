const AppError = require('../utils/AppError');

function roundRobin(teamIds, legs = 1) {
    if (!Array.isArray(teamIds) || teamIds.length < 2 || teamIds.length > 100 ||
        new Set(teamIds.map(String)).size !== teamIds.length || ![1, 2].includes(legs)) {
        throw new AppError(400, 'Выберите от 2 до 100 разных команд и один или два круга.', 'INVALID_SCHEDULE');
    }
    const rotation = [...teamIds];
    if (rotation.length % 2) rotation.push(null);
    const firstLeg = [];
    for (let round = 0; round < rotation.length - 1; round++) {
        const matches = [];
        for (let i = 0; i < rotation.length / 2; i++) {
            const a = rotation[i], b = rotation[rotation.length - 1 - i];
            if (a !== null && b !== null) matches.push(round % 2 ? { homeTeam: b, awayTeam: a } : { homeTeam: a, awayTeam: b });
        }
        firstLeg.push(matches);
        rotation.splice(1, 0, rotation.pop());
    }
    return legs === 1 ? firstLeg : [...firstLeg, ...firstLeg.map(round => round.map(match => ({ homeTeam: match.awayTeam, awayTeam: match.homeTeam })))];
}
module.exports = { roundRobin };
