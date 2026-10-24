'use strict';
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const http = require('node:http');
const zlib = require('node:zlib');
const { once } = require('node:events');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const functions = path.resolve(process.env.ALLOFLOW_TEST_FUNCTIONS || path.join(__dirname, '../../desktop/web-app/functions'));
const deps = createRequire(path.join(functions, 'package.json'));

test('query parsing preserves nested data and resists constructor and array-limit tricks', () => {
  const qs = deps('qs');
  const query = { lesson: { title: 'Water & air', tags: ['science', 'weather'] }, count: '2' };
  assert.deepEqual(qs.parse(qs.stringify(query)), query);
  const hostile = qs.parse('x[constructor][isBuffer]=not-a-function', { plainObjects: true });
  assert.doesNotThrow(() => qs.stringify(hostile));
  assert.throws(() => qs.parse('a[]=1,2,3,4', { comma: true, arrayLimit: 2, throwOnLimitExceeded: true }), RangeError);
  assert.equal({}.polluted, undefined);
  qs.parse('__proto__[polluted]=yes&constructor[prototype][polluted]=yes');
  assert.equal({}.polluted, undefined);
});

test('Express retains JSON, forms and gzip while rejecting malformed and oversized bodies', { timeout: 15000 }, async (t) => {
  const express = deps('express');
  const app = express();
  app.use(express.json({ limit: '1kb' }));
  app.use(express.urlencoded({ extended: true, limit: '1kb' }));
  app.post('/echo', (req, res) => res.json(req.body));
  app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.type }));
  const server = http.createServer(app); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const url = 'http://127.0.0.1:' + server.address().port + '/echo';
  const send = (body, headers = {}) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body });
  const payload = { query: 'water cycle', num: 5 };
  assert.deepEqual(await (await send(JSON.stringify(payload))).json(), payload);
  assert.deepEqual(await (await send(zlib.gzipSync(JSON.stringify(payload)), { 'Content-Encoding': 'gzip' })).json(), payload);
  const form = await send('lesson[title]=Water&lesson[tags][]=air&lesson[tags][]=rain', { 'Content-Type': 'application/x-www-form-urlencoded' });
  assert.deepEqual(await form.json(), { lesson: { title: 'Water', tags: ['air', 'rain'] } });
  assert.equal((await send('{broken')).status, 400);
  assert.equal((await send(JSON.stringify({ text: 'x'.repeat(2048) }))).status, 413);
  // A finished gzip frame followed by invalid trailing bytes must not leave an
  // unhandled decoder error that terminates the server process.
  const malformed = Buffer.concat([zlib.gzipSync(JSON.stringify(payload)), Buffer.from('invalid trailing bytes')]);
  assert.equal((await send(malformed, { 'Content-Encoding': 'gzip' })).status, 400);
  assert.deepEqual(await (await send(JSON.stringify(payload))).json(), payload);
});

test('Firebase SDK loads both existing HTTPS handlers without credentials or network access', () => {
  // Loading creates lazy service clients only. No token verification, database
  // operation, secret lookup or deployment is performed by this check.
  const handlers = deps('./index.js');
  assert.deepEqual(Object.keys(handlers).sort(), ['searchProxy', 'sourceFetchProxy']);
  for (const handler of Object.values(handlers)) {
    assert.equal(typeof handler, 'function');
    assert.equal(handler.__endpoint.platform, 'gcfv2');
    assert.equal(handler.__endpoint.maxInstances, 10);
  }
});

test('existing handlers retain origin, authentication, App Check, quota and successful response behavior', async () => {
  let exhausted = false, upstreamCalls = 0, authCalls = 0, appCheckCalls = 0;
  const records = [];
  const db = {
    collection: () => ({ doc: key => ({ key }) }),
    runTransaction: async callback => callback({
      get: async () => ({ exists: exhausted, data: () => ({ windowStart: Date.now(), count: 100 }) }),
      set: (ref, data) => records.push({ ref, data }),
    }),
  };
  const admin = { apps: [{}], firestore: Object.assign(() => db, { Timestamp: { fromMillis: value => value } }),
    auth: () => ({ verifyIdToken: async (token, revoked) => { authCalls++; assert.equal(token, 'fixture'); assert.equal(revoked, true); return { uid: 'fixture-user' }; } }),
    appCheck: () => ({ verifyToken: async token => { appCheckCalls++; assert.equal(token, 'fixture-app'); return { appId: 'fixture-app' }; } }),
  };
  const source = { url: 'https://example.test/article', title: 'Fixture article', text: 'Synthetic public text', contentType: 'text/html', bytes: 21, redirects: 0 };
  const mocks = {
    'firebase-admin': admin,
    'firebase-functions/v2/https': { onRequest: (_options, handler) => handler },
    'firebase-functions/params': { defineSecret: () => ({ value: () => 'synthetic' }), defineString: () => ({ value: () => 'https://app.example.test' }) },
    './web_source_fetch': { SourceFetchError: class extends Error {}, fetchPublicPage: async () => { upstreamCalls++; return source; } },
  };
  const context = { exports: {}, require: name => mocks[name] || deps(name), process: { env: {} },
    console, URL, AbortController, setTimeout, clearTimeout,
    fetch: async () => { upstreamCalls++; return { ok: true, json: async () => ({ organic: [{ link: 'https://example.test/article', title: 'Fixture article', snippet: 'Synthetic public text' }] }) }; },
  };
  vm.runInNewContext(fs.readFileSync(path.join(functions, 'index.js'), 'utf8'), context);
  async function call(name, headers = {}, method = 'POST') {
    const values = { Origin: 'https://app.example.test', Authorization: 'Bearer fixture', 'X-Firebase-AppCheck': 'fixture-app', ...headers };
    const res = { statusCode: 200, headers: {}, set(key, value) { this.headers[key] = value; return this; }, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; }, send(value) { this.body = value; } };
    await context.exports[name]({ method, get: key => values[key], is: type => type === 'application/json', body: { query: 'water cycle', num: 5, url: source.url } }, res);
    return res;
  }
  for (const name of ['searchProxy', 'sourceFetchProxy']) {
    const initial = upstreamCalls;
    assert.equal((await call(name, { Origin: 'https://untrusted.example.test' })).statusCode, 403);
    assert.equal((await call(name, { Authorization: '' })).statusCode, 401);
    assert.equal((await call(name, { 'X-Firebase-AppCheck': '' })).statusCode, 401);
    assert.equal((await call(name, {}, 'GET')).statusCode, 405);
    assert.equal((await call(name, {}, 'OPTIONS')).statusCode, 204);
    exhausted = true; assert.equal((await call(name)).statusCode, 429); exhausted = false;
    assert.equal(upstreamCalls, initial);
    const success = await call(name);
    assert.equal(success.statusCode, 200);
    assert.equal(success.headers['Cache-Control'], 'no-store');
    assert.equal(success.headers['Access-Control-Allow-Origin'], 'https://app.example.test');
    if (name === 'searchProxy') assert.equal(success.body.results[0].url, source.url);
    else assert.equal(success.body.text, source.text);
  }
  assert.equal(authCalls, 4); assert.equal(appCheckCalls, 4);
  assert.ok(records.some(record => record.ref.key.startsWith('search_')));
  assert.ok(records.some(record => record.ref.key.startsWith('source_fetch_')));
});
