'use strict';
const assert = require('node:assert/strict');
const http = require('node:http');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const zlib = require('node:zlib');
const { once } = require('node:events');
const { createRequire, Module } = require('node:module');
const { pathToFileURL } = require('node:url');
const { Readable, Writable } = require('node:stream');
const { pipeline } = require('node:stream/promises');
const { test } = require('node:test');
const web = createRequire(path.resolve(process.env.SECURITY_WEB_APP || path.join(__dirname, '../../desktop/web-app'), 'package.json'));
const trailer = createRequire(path.resolve(process.env.SECURITY_TRAILER || path.join(__dirname, '../../trailer'), 'package.json'));

test('serializer escapes a closing script tag at the end of a function source', () => {
  const serialize = web('serialize-javascript');
  function forged() {}
  forged.toString = () => 'function fixture(){ return 1 }//</script';
  for (const space of [undefined, 2]) {
    assert.doesNotMatch(serialize({ nested: { forged }, text: '> synthetic markup' }, { space }), /<\/script/i);
  }
  const normal = { pattern: /^private_/gi, callback: function (n) { return n + 1; }, text: '</script>' };
  const decoded = vm.runInNewContext('(' + serialize(normal) + ')');
  assert.equal(decoded.callback(2), 3);
  assert.equal(decoded.pattern.test('PRIVATE_field'), true);
  assert.equal(decoded.text, normal.text);
});

test('web HTTP client preserves gzip/JSON and handles invalid encoding chains without crashing', { timeout: 15000 }, async (t) => {
  const { fetch, Agent, Headers, Request, Response } = web('undici');
  const agent = new Agent(); t.after(() => agent.close());
  const server = http.createServer((req, res) => {
    if (req.url === '/bad') {
      res.writeHead(200, { 'content-encoding': Array(6).fill('gzip').join(', '), 'content-length': '100' });
      res.flushHeaders(); res.end();
    } else {
      res.writeHead(200, { 'content-encoding': 'gzip', 'content-type': 'application/json' });
      res.end(zlib.gzipSync('{"lesson":"water cycle"}'));
    }
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const url = 'http://127.0.0.1:' + server.address().port;
  const headers = new Headers({ 'X-Fixture': 'test' });
  const request = new Request(url, { headers });
  assert.equal(request.headers.get('x-fixture'), 'test');
  assert.deepEqual(await (await fetch(request, { dispatcher: agent })).json(), { lesson: 'water cycle' });
  assert.deepEqual(await Response.json({ ok: true }).json(), { ok: true });
  await assert.rejects(fetch(url + '/bad', { dispatcher: agent }));
  assert.deepEqual(await (await fetch(url, { dispatcher: agent })).json(), { lesson: 'water cycle' });
});

test('trailer schemas preserve valid props, transforms and detailed ordinary validation errors', () => {
  const z = trailer('zod');
  const schema = z.object({ title: z.string().trim(), frame: z.number().int().nonnegative(), colors: z.array(z.string()).max(3) });
  assert.deepEqual(schema.parse({ title: ' Lesson ', frame: 15, colors: ['blue', 'white'] }), { title: 'Lesson', frame: 15, colors: ['blue', 'white'] });
  const invalid = schema.safeParse({ title: 'Lesson', frame: -1, colors: [false] });
  assert.equal(invalid.success, false);
  assert.ok(invalid.error.issues.some(issue => issue.path.join('.') === 'frame'));
  assert.ok(invalid.error.issues.some(issue => issue.path.join('.') === 'colors.0'));
});

test('web event streams preserve messages and bound retained parser items', async () => {
  const { EventSourceStream } = web('undici/lib/web/eventsource/eventsource-stream');
  const parse = async (chunks, state = {}) => {
    const messages = [];
    await pipeline(Readable.from(chunks), new EventSourceStream({ maxEventSize: 128 * 1024, eventSourceSettings: state }),
      new Writable({ objectMode: true, write(message, encoding, done) { messages.push(message); done(); } }));
    return messages;
  };
  const state = { origin: 'https://example.test', lastEventId: '' };
  const messages = await parse([Buffer.from('\uFEFFid: lesson-1\r\nevent: lesson\r'),
    Buffer.from('\ndata: water\ndata: cycle\nretry: 1500\n\ndata: next\n\n')], state);
  assert.deepEqual(messages, [
    { type: 'lesson', options: { data: 'water\ncycle', lastEventId: 'lesson-1', origin: state.origin } },
    { type: 'message', options: { data: 'next', lastEventId: 'lesson-1', origin: state.origin } }
  ]);
  assert.equal(state.reconnectionTime, 1500);
  for (const [name, chunks] of [
    ['empty data fields', [Buffer.from('data:\n'.repeat(2048))]],
    ['fragmented data line', [Buffer.from('data: '), ...Array.from({ length: 2048 }, () => Buffer.from('x'))]],
    ['oversized unfinished line', [Buffer.concat([Buffer.from('data: '), Buffer.alloc(128 * 1024 + 16, 'x')])]]
  ]) await assert.rejects(parse(chunks), /EventSource message size exceeded/, name);
});

test('Remotion Studio protocol schemas still accept selections and reject malformed messages', async () => {
  const esm = path.join(path.dirname(trailer.resolve('@remotion/studio-protocol/package.json')), 'dist/esm/index.mjs');
  for (const { StudioProtocolInternals, createElementPayload } of [trailer('@remotion/studio-protocol'), await import(pathToFileURL(esm).href)]) {
    const parse = StudioProtocolInternals.parseStudioProtocolCaptionStyleSelection;
    const message = { operation: 'caption-style-selection', protocol: 'remotion-studio-protocol', protocolVersion: 1,
      selection: { slug: 'lesson-captions', origin: 'https://example.test' } };
    assert.deepEqual(parse(message), message);
    assert.deepEqual(parse({ ...message, selection: null }), { ...message, selection: null });
    assert.equal(parse({ ...message, protocolVersion: 2 }), null);
    assert.equal(parse({ ...message, selection: { slug: '../outside', origin: 'https://example.test' } }), null);
    assert.equal(parse({ ...message, selection: { ...message.selection, origin: 'http://untrusted.example.test' } }), null);
    const element = createElementPayload({ slug: 'lesson-card', displayName: 'Lesson card',
      sourceCode: 'export const LessonCard = () => <div>Lesson</div>;', dependencies: [], durationInFrames: 30,
      dimensions: { width: 1920, height: 1080 } });
    assert.deepEqual(StudioProtocolInternals.parseStudioElementPayload(element), element);
  }
});

test('both embedded Studio validators reject oversized arrays before reading their children', () => {
  const directory = path.dirname(trailer.resolve('@remotion/studio-protocol/package.json'));
  for (const relative of ['dist/index.cjs', 'dist/esm/index.mjs']) {
    let source = fs.readFileSync(path.join(directory, relative), 'utf8');
    // Expose only the embedded schema constructors in this in-memory fixture.
    // ESM exports are at the end; evaluating the shared body tests its own copy.
    if (relative.endsWith('.mjs')) source = source.slice(0, source.lastIndexOf('\nexport {'));
    const fixture = new Module(path.join(directory, relative));
    fixture._compile(source + '\nmodule.exports.fixture = { array, number: number2, maxLength: _maxLength, refine };', relative);
    const z = fixture.exports.fixture;
    let children = 0;
    const schema = z.array(z.number().check(z.refine(() => { children++; return true; }))).check(z.maxLength(2));
    const invalid = schema.safeParse(Array(10000).fill(1));
    assert.equal(invalid.success, false);
    assert.equal(children, 0, relative);
    assert.equal(invalid.error.issues.length, 1);
    assert.equal(invalid.error.issues[0].code, 'too_big');
    assert.deepEqual(schema.parse([1, 2]), [1, 2]);
    assert.equal(children, 2);
    assert.equal(schema.safeParse([false]).error.issues[0].path[0], 0);
  }
});

test('Studio backport is repeatable and rejects unknown or altered bundles', () => {
  const { patchSource, prepare } = require('../../trailer/scripts/patch-studio-protocol.cjs');
  const directory = path.dirname(trailer.resolve('@remotion/studio-protocol/package.json'));
  for (const file of ['dist/index.cjs', 'dist/esm/index.mjs']) {
    const source = fs.readFileSync(path.join(directory, file), 'utf8');
    assert.equal(patchSource(source, file), source);
    assert.throws(() => patchSource(source + '\n// changed', file), /Unrecognized/);
    assert.throws(() => patchSource(source, 'unknown.js'), /Unrecognized/);
  }
  assert.equal(prepare(path.dirname(trailer.resolve('./package.json'))), 0);
});

test('oversized constrained trailer collections stop before validating each child', () => {
  const z = trailer('zod');
  const mini = trailer('zod/mini');
  let children = 0;
  const item = z.number().transform(value => { children++; return value * 2; });
  const values = Array(10000).fill(1);
  for (const schema of [z.array(item).max(2), mini.array(item).check(mini.maxLength(2))]) {
    const result = schema.safeParse(values);
    assert.equal(result.success, false);
    assert.equal(result.error.issues.length, 1);
    assert.equal(result.error.issues[0].code, 'too_big');
    assert.equal(children, 0);
    assert.deepEqual(schema.parse([1, 2]), [2, 4]);
    children = 0;
  }
  assert.equal(z.set(z.string()).max(2).safeParse(new Set(['a', 'b', 'c'])).success, false);
});
