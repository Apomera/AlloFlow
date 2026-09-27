// Network fixtures only: no live service, app execution, builder or Git writes.
import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { ReadableStream } from 'node:stream/web';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const crypto = require('node:crypto');
const { HOSTS, PATHS } = require('../dev-tools/check_reader_release.cjs');
const { OUTPUTS } = require('../dev-tools/lib/reader_compiler.cjs');
const { validateManifest, verifyDeployedReader, readResponse, parseArgs } = require('../dev-tools/check_deployed_reader.cjs');
const toolSource = readFileSync('dev-tools/check_deployed_reader.cjs', 'utf8');
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const entry = value => ({ sha256: digest(value), bytes: Buffer.byteLength(value) });
const HOST_URL = 'https://release.test/AlloFlowANTI.txt';
const codes = report => report.errors.map(e => e.code);

function response(url, value, extra = {}) {
  const bytes = Buffer.from(value);
  return { status: 200, url, headers: { get: name => ({ 'etag': '"fixture"', 'cf-cache-status': 'HIT', 'age': '60' })[name] ?? null },
    body: new ReadableStream({ start(controller) { controller.enqueue(bytes.subarray(0, 5)); controller.enqueue(bytes.subarray(5)); controller.close(); } }), ...extra };
}
function fixture() {
  const module = 'throw Error("Reader must never execute");\n';
  const moduleUrl = 'https://alloflow-cdn.pages.dev/view_simplified_module.js?v=' + digest(module).slice(0, 8);
  const host = `throw Error('Host must never execute');\n// loadModule('ViewSimplifiedModule', 'ignored');\nloadModule('ViewSimplifiedModule', '${moduleUrl}');\nconst App = () => <div/>;\n`;
  const manifest = { schemaVersion: 1, at: '2026-09-27T00:00:00.000Z', scope: 'local-reader-source-output-and-hosts', ok: true,
    startHead: '1'.repeat(40), endHead: '1'.repeat(40), expectedModuleSha256: digest(module),
    mirrorsMatch: true, hostsMatch: true, errors: [], changedDuringCheck: [],
    files: Object.fromEntries(PATHS.map(file => [file, entry('fixture source')])),
    pins: Object.fromEntries(HOSTS.map(file => [file, [{ line: 3, url: moduleUrl }]])) };
  HOSTS.forEach(file => { manifest.files[file] = entry(host); });
  OUTPUTS.forEach(file => { manifest.files[file] = entry(module); });
  const calls = [];
  const fetchImpl = async (url, options) => { calls.push({ url, options }); return response(url, url === HOST_URL ? host : module); };
  const check = extra => verifyDeployedReader({ manifestBytes: Buffer.from(JSON.stringify(manifest)), hostUrl: HOST_URL, fetchImpl, ...extra });
  return { host, module, moduleUrl, manifest, calls, fetchImpl, check };
}

describe('served reader/host byte verification', () => {
  it('hashes both ordinary and revalidated responses without executing either artifact', async () => {
    const f = fixture(), before = JSON.stringify(f.manifest), report = await f.check();
    expect(report.ok).toBe(true); expect(report.manifestSha256).toBe(digest(before));
    expect(report.baseline.head).toBe(f.manifest.startHead);
    expect(report.requests.map(r => [r.kind, r.mode, r.sha256])).toEqual([
      ['host', 'ordinary', digest(f.host)], ['reader', 'ordinary', digest(f.module)],
      ['host', 'revalidate', digest(f.host)], ['reader', 'revalidate', digest(f.module)]
    ]);
    expect(f.calls.map(c => c.url)).toEqual([HOST_URL, f.moduleUrl, HOST_URL, f.moduleUrl]);
    expect(f.calls[0].options.headers).toEqual({});
    expect(f.calls[2].options.headers).toEqual({ 'Cache-Control': 'no-cache', Pragma: 'no-cache' });
    expect(f.calls.every(c => c.options.method === 'GET' && c.options.redirect === 'manual' && c.options.credentials === 'omit')).toBe(true);
    expect(report.requests[0].headers).toEqual({ etag: '"fixture"', 'cf-cache-status': 'HIT', age: '60' });
    expect(JSON.stringify(f.manifest)).toBe(before);
  });
  it('fails when an unchanged content-hash URL serves different module bytes', async () => {
    const f = fixture();
    const report = await f.check({ fetchImpl: async url => response(url, url === HOST_URL ? f.host : f.module.replace('Reader', 'READER')) });
    expect(report.ok).toBe(false); expect(codes(report)).toEqual(['reader-bytes-mismatch', 'reader-bytes-mismatch']);
  });
  it('fails if ordinary cached bytes differ even when revalidation returns the expected release', async () => {
    const f = fixture();
    const report = await f.check({ fetchImpl: async (url, options) => response(url, url === HOST_URL ? f.host : options.headers.Pragma ? f.module : 'old cached reader') });
    expect(report.ok).toBe(false); expect(report.errors).toHaveLength(1); expect(report.errors[0].mode).toBe('ordinary');
  });
  it('fails if the release changes between the two passes', async () => {
    const f = fixture();
    const report = await f.check({ fetchImpl: async (url, options) => response(url, (url === HOST_URL ? f.host : f.module) + (options.headers.Pragma ? '// changed' : '')) });
    expect(report.ok).toBe(false); expect(codes(report)).toEqual(['host-bytes-mismatch', 'reader-bytes-mismatch']);
  });
  it('does not let matching reader bytes hide a different host', async () => {
    const f = fixture();
    const report = await f.check({ fetchImpl: async url => response(url, url === HOST_URL ? f.host + '// changed host' : f.module) });
    expect(codes(report)).toEqual(['host-bytes-mismatch', 'host-bytes-mismatch']);
    expect(report.requests.filter(r => r.kind === 'reader')).toHaveLength(2);
  });
  it.each([
    ['missing', 'const App = () => <div/>;'],
    ['comment only', "// loadModule('ViewSimplifiedModule', 'https://untrusted.test/module.js');"],
    ['dynamic', "loadModule('ViewSimplifiedModule', anotherUrl);"],
    ['foreign URL', "loadModule('ViewSimplifiedModule', 'https://untrusted.test/module.js');"],
    ['duplicate', "loadModule('ViewSimplifiedModule', 'one'); loadModule('ViewSimplifiedModule', 'two');"]
  ])('rejects %s reader loaders without following their URLs', async (_label, host) => {
    const f = fixture(), requests = [];
    const report = await f.check({ fetchImpl: async url => { requests.push(url); return response(url, host); } });
    expect(report.ok).toBe(false); expect(codes(report)).toContain('served-loader-mismatch'); expect(requests).toEqual([HOST_URL, HOST_URL]);
  });
  it('rejects an HTML fallback even when the server reports HTTP 200', async () => {
    const f = fixture(), report = await f.check({ fetchImpl: async url => response(url, '<!doctype html><html>fallback</html>') });
    expect(codes(report)).toContain('host-bytes-mismatch'); expect(codes(report)).toContain('served-host-parse-failed');
  });
  it.each([301, 304, 401, 404, 503])('rejects HTTP %i without following redirects or treating missing bytes as a match', async status => {
    const f = fixture(), report = await f.check({ fetchImpl: async url => response(url, f.host, { status }) });
    expect(report.ok).toBe(false); expect(codes(report)).toEqual(['host-request-failed', 'host-request-failed']);
    expect(report.requests).toHaveLength(2);
  });
  it('rejects an unexpected final response URL', async () => {
    const f = fixture(), report = await f.check({ fetchImpl: async url => response('https://elsewhere.test/', f.host) });
    expect(codes(report)).toEqual(['host-request-failed', 'host-request-failed']);
  });
  it('records unavailable module requests without reporting deployment success', async () => {
    const f = fixture(), report = await f.check({ fetchImpl: async url => { if (url !== HOST_URL) throw Error('network offline'); return response(url, f.host); } });
    expect(codes(report)).toEqual(['reader-request-failed', 'reader-request-failed']);
    expect(report.errors.every(e => e.message === 'network offline')).toBe(true);
  });
  it('rejects failed or inconsistent baseline manifests before sending requests', async () => {
    const changes = [m => { m.ok = false; }, m => { m.errors = [{ code: 'stale' }]; }, m => { m.changedDuringCheck = ['source']; },
      m => { m.endHead = '2'.repeat(40); }, m => { m.schemaVersion = 2; }, m => { m.hostsMatch = false; },
      m => { m.files[OUTPUTS[1]].sha256 = '3'.repeat(64); }, m => { m.files[HOSTS[1]].bytes++; },
      m => { delete m.files[PATHS[0]]; }, m => { m.expectedModuleSha256 = '4'.repeat(64); },
      m => { m.pins[HOSTS[0]][0].url = 'https://untrusted.test/module.js'; }, m => { m.pins[HOSTS[0]].push(m.pins[HOSTS[0]][0]); }];
    for (const change of changes) {
      const f = fixture(); change(f.manifest);
      expect(codes(await f.check())).toEqual(['invalid-baseline-or-url']); expect(f.calls).toHaveLength(0);
    }
  });
  it('requires an explicit credential-free HTTPS host URL before making requests', async () => {
    for (const hostUrl of ['', 'http://release.test/host', 'file:///host', 'https://user:secret@release.test/host', 'https://release.test/host#fragment']) {
      const f = fixture(); expect(codes(await f.check({ hostUrl }))).toEqual(['invalid-baseline-or-url']); expect(f.calls).toHaveLength(0);
    }
  });
  it('accepts PowerShell UTF-8 BOM reports but rejects truncated or malformed reports', () => {
    const f = fixture(); expect(validateManifest(Buffer.from('\uFEFF' + JSON.stringify(f.manifest))).moduleUrl).toBe(f.moduleUrl);
    for (const text of ['{', 'null', '{}']) expect(() => validateManifest(Buffer.from(text))).toThrow();
  });
  it('holds a captured baseline even if the caller changes its original manifest during the requests', async () => {
    const f = fixture();
    const report = await f.check({ fetchImpl: async (url, options) => { f.manifest.startHead = '2'.repeat(40); return f.fetchImpl(url, options); } });
    expect(report.ok).toBe(true); expect(report.baseline.head).toBe('1'.repeat(40));
  });
});

describe('bounded reads and command interface', () => {
  it('stops and cancels an oversized response independently of Content-Length', async () => {
    let cancelled = false;
    const fetchImpl = async url => response(url, '', { body: new ReadableStream({ start(c) { c.enqueue(Buffer.alloc(11)); }, cancel() { cancelled = true; } }) });
    const { result, bytes } = await readResponse(HOST_URL, 'ordinary', fetchImpl, 1000, 10);
    expect(result.error).toContain('verification limit'); expect(bytes).toBeUndefined(); expect(cancelled).toBe(true);
  });
  it('does not accept a partially read body after a stream error', async () => {
    const fetchImpl = async url => response(url, '', { body: new ReadableStream({ start(c) { c.enqueue(Buffer.from('part')); c.error(Error('stream failed')); } }) });
    const { result, bytes } = await readResponse(HOST_URL, 'ordinary', fetchImpl, 1000, 100);
    expect(result.error).toBe('stream failed'); expect(bytes).toBeUndefined(); expect(result.sha256).toBeUndefined();
  });
  it.each(['headers', 'body'])('times out while waiting for %s', async phase => {
    const fetchImpl = async (url, options) => {
      if (phase === 'headers') return new Promise((_, reject) => options.signal.addEventListener('abort', () => reject(Object.assign(Error('aborted'), { name: 'AbortError' }))));
      return response(url, '', { body: new ReadableStream({ start(c) { options.signal.addEventListener('abort', () => c.error(Object.assign(Error('aborted'), { name: 'AbortError' }))); } }) });
    };
    const { result } = await readResponse(HOST_URL, 'ordinary', fetchImpl, 10, 100);
    expect(result.error).toBe('Request timed out.');
  });
  it('validates required, duplicated and unknown command options', () => {
    expect(parseArgs(['--manifest', 'snapshot.json', '--host-url', HOST_URL, '--json'])).toEqual({ manifestPath: 'snapshot.json', hostUrl: HOST_URL, json: true });
    expect(parseArgs(['--help'])).toEqual({ help: true });
    for (const args of [[], ['--manifest', 'file'], ['--manifest'], ['--apply'], ['--help', '--json'], ['--manifest', 'a', '--manifest', 'b'], ['--manifest', 'a', '--host-url', HOST_URL, '--json', '--json']]) expect(() => parseArgs(args)).toThrow(/Usage/);
  });
  it('reports a manifest changed during the CLI check and never writes or invokes Git', async () => {
    const f = fixture(), output = [], process = {}, module = { exports: {} }; let reads = 0;
    const req = name => {
      if (name === 'node:fs') return { readFileSync() { return Buffer.from(JSON.stringify(reads++ ? { changed: true } : f.manifest)); } };
      if (name === './check_reader_release.cjs') return require('../dev-tools/check_reader_release.cjs');
      if (name === './lib/reader_compiler.cjs') return require('../dev-tools/lib/reader_compiler.cjs');
      if (name === 'node:crypto') return crypto;
      throw Error('Unexpected dependency: ' + name);
    };
    req.main = {};
    vm.runInNewContext(toolSource, { module, require: req, process, Buffer, URL, AbortController, setTimeout, clearTimeout, fetch: f.fetchImpl,
      console: { log: text => output.push(text), error: text => output.push(text) } });
    await module.exports.main(['--manifest', 'fixture.json', '--host-url', HOST_URL, '--json']);
    const report = JSON.parse(output[0]);
    expect(process.exitCode).toBe(1); expect(codes(report)).toEqual(['manifest-changed']); expect(report.ok).toBe(false); expect(reads).toBe(2);
  });
});
