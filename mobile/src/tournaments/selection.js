let selected = 'legacy';
let format = 'league_playoff';
export function getTournament() { return selected; }
export function getTournamentFormat() { return format; }
export function setTournament(value, tournamentFormat = 'league_playoff') { selected = value; format = tournamentFormat; }
