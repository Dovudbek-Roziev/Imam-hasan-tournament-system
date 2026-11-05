import assert from 'node:assert/strict';
import test from 'node:test';
import { readAllPages } from '../src/api/pagination.js';

test('loads more than 100 records without dropping filters or cancellation', async () => {
    const signal = new AbortController().signal;
    const calls = [];
    const client = { async get(resource, options) {
        calls.push({ resource, ...options });
        const page = options.params.page;
        return { data: { data: Array.from({ length: page === 1 ? 100 : 5 }, (_, i) => (page - 1) * 100 + i), pagination: { page, pages: 2, hasNext: page === 1 } } };
    } };
    const result = await readAllPages(client, '/players', { team: 'team-id', sort: 'number' }, signal);
    assert.equal(result.data.data.length, 105);
    assert.equal(new Set(result.data.data).size, 105);
    assert.equal(calls.length, 2);
    assert.equal(calls[1].params.team, 'team-id');
    assert.equal(calls[1].signal, signal);
});

test('rejects malformed pages and stops on cancellation', async () => {
    await assert.rejects(readAllPages({ get: async () => ({ data: { data: [], pagination: { page: 1, pages: 2, hasNext: true } } }) }, '/matches'), { name: 'ApiResponseError' });
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(readAllPages({ get() { throw new Error('must not request'); } }, '/matches', {}, controller.signal), { name: 'AbortError' });
});

test('accepts an AbortSignal without throwIfAborted, as on some mobile runtimes', async () => {
    const signal = { aborted: false };
    const client = { get: async () => ({ data: { data: ['fixture'], pagination: { page: 1, pages: 1, hasNext: false } } }) };
    assert.deepEqual((await readAllPages(client, '/matches', {}, signal)).data.data, ['fixture']);
    signal.aborted = true;
    await assert.rejects(readAllPages(client, '/matches', {}, signal), { name: 'AbortError' });
});
