import assert from 'node:assert/strict';
import test from 'node:test';
import { createCustomFieldUpdater, normalizeMatchEvents } from '../src/utils/matchForm.js';

test('named custom-field updates modify the requested match fields', () => {
  const values = { events: [], status: 'Завершён', homeScore: 0 };
  const updateField = (name, value) => { values[name] = value; };
  const update = createCustomFieldUpdater('events', updateField);
  const event = { minute: 14, type: 'Гол' };

  update('events', [event]);
  update('homeScore', 1);
  update('status', 'Идёт');

  assert.deepEqual(values.events, [event]);
  assert.equal(values.homeScore, 1);
  assert.equal(values.status, 'Идёт');
});

test('one-argument custom-field updates remain bound to that field', () => {
  const calls = [];
  const update = createCustomFieldUpdater('events', (...args) => calls.push(args));

  update([{ minute: 7 }]);

  assert.deepEqual(calls, [['events', [{ minute: 7 }]]]);
});

test('malformed match events normalize to an empty safe list', () => {
  assert.deepEqual(normalizeMatchEvents(null), []);
  assert.deepEqual(normalizeMatchEvents('not-an-array'), []);
  assert.deepEqual(normalizeMatchEvents({ minute: 9 }), []);
  assert.deepEqual(normalizeMatchEvents([null, 'bad', { minute: 9 }]), [{ minute: 9 }]);
});
