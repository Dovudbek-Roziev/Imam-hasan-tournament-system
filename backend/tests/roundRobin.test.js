const { test } = require('node:test');
const assert = require('node:assert/strict');
const { roundRobin } = require('../domain/roundRobin');

test('round robin covers pairings without duplicate teams in a round', () => {
    for (const count of [3, 4, 8, 9]) {
        const teams = Array.from({ length: count }, (_, i) => String(i));
        const rounds = roundRobin(teams);
        const pairs = new Set();
        for (const round of rounds) {
            const playing = round.flatMap(match => [match.homeTeam, match.awayTeam]);
            assert.equal(new Set(playing).size, playing.length);
            for (const match of round) pairs.add([match.homeTeam, match.awayTeam].sort().join(':'));
        }
        assert.equal(pairs.size, count * (count - 1) / 2);
        const double = roundRobin(teams, 2);
        assert.equal(double.length, rounds.length * 2);
        assert.deepEqual(double[rounds.length][0], { homeTeam: rounds[0][0].awayTeam, awayTeam: rounds[0][0].homeTeam });
    }
});

test('invalid and duplicate participants are rejected', () => {
    assert.throws(() => roundRobin(['a', 'a']));
    assert.throws(() => roundRobin(['a']));
    assert.throws(() => roundRobin(['a', 'b'], 3));
});
