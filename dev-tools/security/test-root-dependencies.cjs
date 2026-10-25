'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { once } = require('node:events');
const { execFileSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { pathToFileURL } = require('node:url');
const { test } = require('node:test');
const root = path.resolve(process.env.ALLOFLOW_TEST_ROOT || path.join(__dirname, '../..'));
const deps = createRequire(path.join(root, 'package.json'));
// Fixtures must live outside node_modules: Vitest deliberately externalizes
// files there, which bypasses source transforms and mock hoisting.
const cache = path.join(root, '_dev_scratch/security-dependency-fixtures');
fs.mkdirSync(cache, { recursive: true });
const fixture = () => fs.mkdtempSync(path.join(cache, 'root-'));

test('Markdown retains headings, links, tables, code and safe default HTML rendering', () => {
  const md = deps('markdown-it')({ linkify: true, typographer: true });
  assert.equal(md.render('# Lesson\n\n**Read** [source](https://example.test).\n'),
    '<h1>Lesson</h1>\n<p><strong>Read</strong> <a href="https://example.test">source</a>.</p>\n');
  assert.match(md.render('| A | B |\n| - | - |\n| 1 | 2 |'), /<table>[\s\S]*<td>2<\/td>/);
  assert.match(md.render('```js\nconst x = 1;\n```'), /class="language-js">const x = 1;/);
  assert.match(md.render('<script>alert(1)</script>'), /&lt;script&gt;/);
  assert.ok(!md.render('[link](javascript:alert(1))').includes('href="javascript:'));
  assert.match(md.render('https://example.test'), /href="https:\/\/example.test"/);
});

test('Markdown handles adversarial quote, HTML and reference inputs in a bounded subprocess', () => {
  const script = `const md = require(${JSON.stringify(deps.resolve('markdown-it'))})({html:true,linkify:true,typographer:true});
    for (const source of ['x' + ' \\"'.repeat(12000), '<a '.repeat(15000), '[ref]: /url\\n  "' + 'line\\n'.repeat(12000) + '"']) md.render(source);`;
  execFileSync(process.execPath, ['--max-old-space-size=256', '-e', script], { timeout: 15000, windowsHide: true, stdio: 'pipe' });
});

test('brace expansion keeps normal glob semantics and bounds deeply nested groups', () => {
  const expand = deps('brace-expansion');
  assert.deepEqual(expand('lesson-{01..03}.{js,mjs}'), ['lesson-01.js', 'lesson-01.mjs', 'lesson-02.js', 'lesson-02.mjs', 'lesson-03.js', 'lesson-03.mjs']);
  assert.doesNotThrow(() => expand('{'.repeat(10000) + 'a,b' + '}'.repeat(10000)));
});

test('source maps preserve normal positions and reject unsafe indexed offsets', () => {
  const { SourceMapGenerator, SourceMapConsumer } = deps('source-map-js');
  const generator = new SourceMapGenerator({ file: 'lesson.js' });
  generator.addMapping({ generated: { line: 1, column: 0 }, original: { line: 3, column: 2 }, source: 'lesson.ts' });
  const map = generator.toJSON();
  assert.deepEqual(new SourceMapConsumer(map).originalPositionFor({ line: 1, column: 0 }), { source: 'lesson.ts', line: 3, column: 2, name: null });
  for (const line of [-1, 0.5, Infinity, 1e9]) {
    assert.throws(() => new SourceMapConsumer({ version: 3, sections: [{ offset: { line, column: 0 }, map }] }), /offset/i);
  }
});

test('HTTP fetching preserves gzip and integrity checks and survives excessive encodings', { timeout: 15000 }, async (t) => {
  const { fetch, Agent } = deps('undici');
  const dispatcher = new Agent();
  t.after(() => dispatcher.close());
  const body = 'synthetic lesson download';
  const server = http.createServer((req, res) => {
    if (req.url === '/bad') {
      res.writeHead(200, { 'content-encoding': Array(6).fill('gzip').join(', '), 'content-length': '100' });
      res.flushHeaders(); res.end();
    } else if (req.url === '/gzip') {
      res.writeHead(200, { 'content-encoding': 'gzip' }); res.end(zlib.gzipSync(body));
    } else res.end(body);
  });
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
  const url = 'http://127.0.0.1:' + server.address().port;
  const digest = crypto.createHash('sha256').update(body).digest('base64');
  assert.equal(await (await fetch(url + '/gzip', { dispatcher })).text(), body);
  for (const algorithm of ['sha256', 'SHA256', 'Sha256']) {
    assert.equal(await (await fetch(url, { dispatcher, integrity: algorithm + '-' + digest })).text(), body);
    await assert.rejects(fetch(url, { dispatcher, integrity: algorithm + '-' + Buffer.alloc(32).toString('base64') }));
  }
  await assert.rejects(fetch(url + '/bad', { dispatcher }));
  assert.equal(await (await fetch(url, { dispatcher })).text(), body);
});

test('Vite serves allowed modules while denying outside files and untrusted hosts', { timeout: 15000 }, async (t) => {
  const { createServer } = await import(pathToFileURL(deps.resolve('vite')).href);
  const directory = fixture();
  const app = path.join(directory, 'app'); fs.mkdirSync(app);
  fs.writeFileSync(path.join(app, 'lesson.js'), 'export const lesson = 42;');
  const privateFile = path.join(directory, 'private.txt'); fs.writeFileSync(privateFile, 'SYNTHETIC_PRIVATE_DATA');
  const server = await createServer({ root: app, configFile: false, logLevel: 'silent',
    server: { host: '127.0.0.1', port: 0, fs: { strict: true, allow: [app] } } });
  t.after(() => server.close()); await server.listen();
  const url = 'http://127.0.0.1:' + server.httpServer.address().port;
  assert.match(await (await fetch(url + '/lesson.js')).text(), /lesson = 42/);
  const outside = await fetch(url + '/@fs/' + privateFile.replaceAll('\\', '/'));
  assert.equal(outside.status, 403); assert.ok(!(await outside.text()).includes('SYNTHETIC_PRIVATE_DATA'));
  const status = await new Promise((resolve, reject) => {
    http.get(url + '/lesson.js', { headers: { Host: 'untrusted.example.test' } }, res => {
      res.resume(); res.on('end', () => resolve(res.statusCode));
    }).on('error', reject);
  });
  assert.equal(status, 403);
});

test('Vitest retains jsdom, module mocks, fake timers and V8 coverage', { timeout: 60000 }, () => {
  const directory = fixture();
  fs.writeFileSync(path.join(directory, 'value.mjs'), 'export const value = 2;');
  fs.writeFileSync(path.join(directory, 'lesson.mjs'), 'import { value } from "./value.mjs"; export function lesson() { return value * 2; }');
  fs.writeFileSync(path.join(directory, 'smoke.test.mjs'), `import { test, expect, vi } from 'vitest';
    vi.mock('./value.mjs', () => ({ value: 3 }));
    import { lesson } from './lesson.mjs';
    test('mock and DOM behavior', () => { document.body.innerHTML='<button>Lesson</button>'; expect(document.querySelector('button').textContent).toBe('Lesson'); expect(lesson()).toBe(6); });
    test('timer behavior', () => { vi.useFakeTimers(); const fn=vi.fn(); setTimeout(fn,10); vi.advanceTimersByTime(10); expect(fn).toHaveBeenCalledOnce(); vi.useRealTimers(); });`);
  fs.writeFileSync(path.join(directory, 'vitest.config.mjs'), `export default {root:${JSON.stringify(directory)},test:{environment:'jsdom',include:['smoke.test.mjs'],maxWorkers:1,coverage:{provider:'v8',reporter:['json-summary'],include:['lesson.mjs'],reportsDirectory:'coverage'}}};`);
  const result = execFileSync(process.execPath, [path.join(root, 'node_modules/vitest/vitest.mjs'), 'run', '--config', path.join(directory, 'vitest.config.mjs'), '--coverage'], {
    cwd: directory, windowsHide: true, timeout: 55000, encoding: 'utf8', env: { ...process.env, TEMP: cache, TMP: cache }, stdio: 'pipe' });
  assert.match(result, /2 passed/);
  const report = JSON.parse(fs.readFileSync(path.join(directory, 'coverage/coverage-summary.json'), 'utf8'));
  assert.equal(report.total.functions.pct, 100);
});
