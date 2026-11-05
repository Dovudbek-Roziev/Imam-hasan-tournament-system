import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWholeNumber } from '../src/utils/numbers.js';

test('numeric fields distinguish empty values from a valid zero', () => {
  assert.equal(parseWholeNumber('', 0, 720), null);
  assert.equal(parseWholeNumber(' ', 0, 720), null);
  assert.equal(parseWholeNumber('0', 0, 720), 0);
  assert.equal(parseWholeNumber(0, 1, 720), null);
  assert.equal(parseWholeNumber('05', 0, 720), 5);
  assert.equal(parseWholeNumber('5.5', 0, 720), null);
  assert.equal(parseWholeNumber('721', 0, 720), null);
});
