import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveTournament } from '../src/tournaments/selection.js';

test('restores an existing tournament and replaces legacy or deleted selections', () => {
    const tournaments = [{ _id: 'new', format: 'league' }, { _id: 'saved', format: 'league_playoff' }];
    assert.equal(resolveTournament(tournaments, 'saved'), tournaments[1]);
    assert.equal(resolveTournament(tournaments, 'legacy'), tournaments[0]);
    assert.equal(resolveTournament(tournaments, 'deleted'), tournaments[0]);
    assert.equal(resolveTournament(tournaments, null), tournaments[0]);
    assert.equal(resolveTournament([], 'legacy'), null);
});
