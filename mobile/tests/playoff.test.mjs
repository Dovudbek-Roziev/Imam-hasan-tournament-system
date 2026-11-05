import test from 'node:test';
import assert from 'node:assert/strict';
import { playoffFixtures, playoffLoser, playoffScore, playoffWinner } from '../src/utils/playoff.js';

const teams = ['A', 'B', 'C', 'D'].map(name => ({ _id: name, name }));
const match = (home, away, extra = {}) => ({ _id: `${home}${away}`, stage: 'Полуфинал', homeTeam: teams.find(team => team._id === home), awayTeam: teams.find(team => team._id === away), status: 'Запланирован', homeScore: 0, awayScore: 0, ...extra });

test('third place is available before semifinals and pairs stay tied to their bracket', () => {
    const pending = playoffFixtures(teams, []);
    assert.ok(pending);
    assert.equal(pending.thirdPlace, undefined);
    assert.equal(playoffLoser(pending.semi1), null);
    assert.equal(playoffLoser(pending.semi2), null);
    const semi1 = match('A', 'D', { status: 'Завершён', homeScore: 1, awayScore: 2 });
    const semi2 = match('B', 'C', { status: 'Завершён', homeScore: 0, awayScore: 0, homePenaltyScore: 5, awayPenaltyScore: 4 });
    const bracket = playoffFixtures(teams, [semi2, semi1]);
    assert.equal(playoffLoser(bracket.semi1).name, 'A');
    assert.equal(playoffLoser(bracket.semi2).name, 'C');
    assert.equal(playoffWinner(bracket.semi1).name, 'D');
    assert.equal(playoffWinner(bracket.semi2).name, 'B');
    assert.equal(playoffScore(semi2, 'пен.'), '0 : 0 (5:4 пен.)');
});

test('cancelled and scheduled fixtures do not show a result or a winner', () => {
    for (const status of ['Запланирован', 'Отменён']) {
        const item = match('A', 'D', { status });
        assert.equal(playoffScore(item, 'пен.'), null);
        assert.equal(playoffWinner(item), null);
    }
    assert.equal(playoffScore(match('A', 'D', { status: 'Идёт', homeScore: 1 }), 'пен.'), '1 : 0');
});

test('an actual third place match remains visible even if standings are incomplete', () => {
    const third = { ...match('A', 'D'), stage: 'Матч за 3-е место' };
    assert.equal(playoffFixtures([], [third]).thirdPlace, third);
    assert.equal(playoffFixtures([], []), null);
});
