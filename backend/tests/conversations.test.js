const { test } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const createApp = require('../app');
const { createAdmin } = require('../services/adminService');
const { issueToken } = require('../services/tokenService');
const { validateEnv } = require('../config/env');

test('private conversations are visible only to their owner and an authenticated admin', async () => {
    const db = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    let server;
    try {
        await mongoose.connect(db.getUri('support_test'));
        const config = validateEnv({ NODE_ENV: 'test', MONGO_URI: db.getUri(), JWT_SECRET: 'private-test-key-'.repeat(4) });
        const admin = await createAdmin({ name: 'Admin', email: 'admin@example.test', password: 'StrongPassword123' });
        server = createApp(config).listen(0, '127.0.0.1');
        await new Promise(resolve => server.once('listening', resolve));
        const base = `http://127.0.0.1:${server.address().port}/api/conversations`;
        const a = { 'Content-Type': 'application/json', 'X-Conversation-Token': 'a'.repeat(64) };
        const b = { 'Content-Type': 'application/json', 'X-Conversation-Token': 'b'.repeat(64) };
        const adm = { 'Content-Type': 'application/json', Authorization: `Bearer ${issueToken(admin, config)}` };
        const created = await fetch(`${base}/mine`, { method: 'POST', headers: a, body: JSON.stringify({ role: 'parent', text: 'Question' }) });
        assert.equal(created.status, 201); const item = (await created.json()).data;
        assert.equal(item.ownerHash, undefined);
        assert.equal((await (await fetch(`${base}/mine`, { headers: b })).json()).data.length, 0);
        assert.equal((await fetch(`${base}/mine/${item._id}/messages`, { method: 'POST', headers: b, body: JSON.stringify({ text: 'intrusion' }) })).status, 404);
        assert.equal((await fetch(`${base}/mine/${item._id}/read`, { method: 'POST', headers: b })).status, 404);
        assert.equal((await fetch(`${base}/admin`)).status, 401);
        assert.equal((await fetch(`${base}/admin/${item._id}/messages`, { method: 'POST', headers: a, body: JSON.stringify({ text: 'bad' }) })).status, 401);
        assert.equal((await fetch(`${base}/admin/${item._id}/messages`, { method: 'POST', headers: adm, body: JSON.stringify({ text: 'Answer' }) })).status, 200);
        const unread = await fetch(`${base}/admin/${item._id}/read`, { method: 'POST', headers: adm });
        assert.equal(unread.status, 200);
        assert.equal((await unread.json()).data.unreadAdmin, false);
        const mine = (await (await fetch(`${base}/mine`, { headers: a })).json()).data;
        assert.deepEqual(mine[0].messages.map(x => x.text), ['Question', 'Answer']);
        assert.equal(mine[0].unreadVisitor, true);
        assert.equal((await fetch(`${base}/mine/${item._id}/read`, { method: 'POST', headers: a })).status, 200);
        assert.equal((await (await fetch(`${base}/mine`, { headers: a })).json()).data[0].unreadVisitor, false);
        assert.equal((await fetch(`${base}/mine`, { method: 'POST', headers: a, body: JSON.stringify({ role: 'parent', text: ' ' }) })).status, 400);
    } finally { if (server) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); } await mongoose.disconnect(); await db.stop(); }
});
