// RU: Определить команду, которой засчитывается автогол.
// EN: Resolve the team awarded an own goal.
export function getGoalCreditedTeamName(match, event) {
    const scorerTeam = event?.team?._id || event?.player?.team?._id;
    if (event?.type !== 'Автогол' || !scorerTeam) return '';
    const scorerTeamId = String(scorerTeam);
    const homeTeamId = String(match?.homeTeam?._id || '');
    const awayTeamId = String(match?.awayTeam?._id || '');
    if (scorerTeamId === homeTeamId) return match?.awayTeam?.name || '';
    if (scorerTeamId === awayTeamId) return match?.homeTeam?.name || '';
    return '';
}
