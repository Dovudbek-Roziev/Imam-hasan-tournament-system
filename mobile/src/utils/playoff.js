// A knockout winner only exists after a finished match, including penalties.
export function playoffWinner(match) {
    if (!match || match.status !== 'Завершён' || !match.homeTeam || !match.awayTeam) return null;
    if (match.homeScore !== match.awayScore) return match.homeScore > match.awayScore ? match.homeTeam : match.awayTeam;
    if (match.homePenaltyScore == null || match.awayPenaltyScore == null || match.homePenaltyScore === match.awayPenaltyScore) return null;
    return match.homePenaltyScore > match.awayPenaltyScore ? match.homeTeam : match.awayTeam;
}
export function playoffLoser(match) {
    const winner = playoffWinner(match);
    if (!winner) return null;
    return String(winner._id) === String(match.homeTeam?._id) ? match.awayTeam : match.homeTeam;
}
export function playoffScore(match, penaltyLabel) {
    if (!match || !['Идёт', 'Завершён'].includes(match.status)) return null;
    const penalties = match.homePenaltyScore != null && match.awayPenaltyScore != null ? ` (${match.homePenaltyScore}:${match.awayPenaltyScore} ${penaltyLabel})` : '';
    return `${match.homeScore} : ${match.awayScore}${penalties}`;
}
export function playoffFixtures(teams, matches) {
    const leaders = teams.slice(0, 4);
    const semifinals = matches.filter(match => match.stage === 'Полуфинал');
    const final = matches.find(match => match.stage === 'Финал');
    const thirdPlace = matches.find(match => match.stage === 'Матч за 3-е место');
    if (leaders.length < 4 && !semifinals.length && !final && !thirdPlace) return null;
    const findSemi = (first, second) => semifinals.find(match =>
        [match.homeTeam?._id, match.awayTeam?._id].includes(first?._id) &&
        [match.homeTeam?._id, match.awayTeam?._id].includes(second?._id));
    let semi1 = findSemi(leaders[0], leaders[3]);
    let semi2 = findSemi(leaders[1], leaders[2]);
    if (!semi1) semi1 = semifinals.find(match => match !== semi2);
    if (!semi2) semi2 = semifinals.find(match => match !== semi1);
    return { leaders, semi1, semi2, final, thirdPlace };
}
