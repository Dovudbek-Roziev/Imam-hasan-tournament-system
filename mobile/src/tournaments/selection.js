let selected = 'legacy';
let format = 'league_playoff';
export function getTournament() { return selected; }
export function getTournamentFormat() { return format; }
export function setTournament(value, tournamentFormat = 'league_playoff') { selected = value; format = tournamentFormat; }

// Keep an existing choice if it still exists; otherwise pick the newest listed tournament.
export function resolveTournament(items, preferredId) {
    return items.find(item => item._id === preferredId) || items[0] || null;
}
