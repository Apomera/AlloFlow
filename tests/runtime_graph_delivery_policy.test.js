import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';
import { Blob } from 'node:buffer';
import { createHash, webcrypto } from 'node:crypto';
import { URL } from 'node:url';
import { TextDecoder } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const source = fs.readFileSync('runtime_graph_delivery_policy.js', 'utf8');
const factory = vm.runInNewContext(source + '\n_alloCreateRuntimeGraphDeliveryPolicy;', { URL });
const hash = value => createHash('sha384').update(value).digest('hex');
const wasm = Buffer.from([0, 97, 115, 109, 1, 0, 0, 0]);
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const flush = async () => { for (let step = 0; step < 12; step++) await Promise.resolve(); };

function fixture() {
  const input = { schemaVersion: 1, assets: {}, graphs: {} }, bodies = new Map();
  const add = (id, kind, value, options = {}) => {
    const bytes = Buffer.isBuffer(value) ? value : Buffer.from(value);
    const extension = kind === 'wasm' ? 'wasm' : kind === 'part' ? 'part' : kind === 'data' ? 'data' : 'js';
    input.assets[id] = { kind, path: `runtime/${id}.${extension}`, bytes: bytes.length, sha384: hash(bytes), mirrors: [],
      ...(['module', 'worker'].includes(kind) ? { closed: true } : {}), ...options };
    bodies.set(input.assets[id].path, bytes);
    return input.assets[id];
  };
  add('entry', 'module', 'export function configure(a){if(!Object.isFrozen(a))throw Error("mutable");}export function own(){return __alloRuntimeAssets.wasm;}');
  add('worker', 'worker', 'self.__approvedWorker=true;');
  add('classic', 'script', 'self.__approvedClassic=true;');
  add('wasm', 'wasm', wasm);
  add('weights', 'data', 'synthetic model data');
  const composite = wasm;
  add('partA', 'part', composite.subarray(0, 4));
  add('partB', 'part', composite.subarray(4));
  input.assets.composite = { kind: 'wasm', path: null, bytes: composite.length, sha384: hash(composite), mirrors: [], parts: ['partA', 'partB'] };
  input.assets.entry.dependencies = ['wasm', 'worker', 'composite'];
  input.assets.worker.dependencies = ['wasm', 'classic'];
  input.graphs.fixture = { assets: Object.keys(input.assets), entry: 'entry', scripts: ['classic'], configureExport: 'configure', bindings: { wasm: 'wasm', child: 'worker' } };
  return { input, bodies, add };
}

function harness(data = fixture(), options = {}) {
  const baseUrl = options.baseUrl || 'https://school.example/app/';
  const routes = new Map(), fetches = [], blobs = new Map(), revoked = [], workers = [], readers = [];
  let sequence = 0;
  for (const [path, body] of data.bodies) {
    for (const url of [new URL(path, baseUrl).href, new URL('/' + path, baseUrl).href, 'https://alloflow-cdn.pages.dev/' + path]) routes.set(url, { body });
  }
  const createResponse = route => ({ status: route.status === undefined ? 200 : route.status,
    body: route.noReader ? {} : { getReader() {
      const state = { cancelled: false, index: 0 }; readers.push(state);
      const chunks = route.chunks || [route.body];
      return { async read() {
        if (route.gate && state.index === 0) { route.arrived?.resolve(); await route.gate.promise; }
        if (route.failRead) throw new Error('stream interrupted');
        if (state.index >= chunks.length) return { done: true };
        return { done: false, value: new Uint8Array(chunks[state.index++]) };
      }, async cancel() { state.cancelled = true; } };
    } },
  });
  class Worker {
    constructor(url, settings) { if (options.failWorker) throw new Error('Worker constructor denied'); this.url = url; this.settings = settings; this.terminated = 0; workers.push(this); }
    terminate() { this.terminated++; }
  }
  const mainFetch = vi.fn(async url => ({ url }));
  const mainWorld = vm.createContext({ URL, fetch: mainFetch, Worker, console });
  const importModule = vi.fn(async url => {
    if (!options.executeModules) return { configure: vi.fn(), url };
    const code = await blobs.get(url).text();
    // Isolation fixtures use valid module JS without export syntax and capture
    // their callable namespace. The native suite exercises actual ES imports.
    let captured;
    mainWorld.__captureModule = namespace => { captured = namespace; };
    try { vm.runInContext('(function(){' + code + '\n})();', mainWorld); }
    finally { delete mainWorld.__captureModule; }
    return captured;
  });
  const env = { baseUrl, isDesktopBundledApp: options.desktop === true, crypto: webcrypto, Blob, Worker,
    TextDecoder, AbortController, btoa: value => Buffer.from(value, 'binary').toString('base64'),
    URL: { createObjectURL(blob) { const url = 'blob:verified-fixture/' + ++sequence; blobs.set(url, blob); return url; },
      revokeObjectURL(url) { revoked.push(url); blobs.delete(url); } },
    fetch: vi.fn(async (url, settings) => {
      fetches.push({ url, settings });
      const route = routes.get(url);
      if (!route || route.networkError) throw new Error('fixture network unavailable');
      return createResponse(route);
    }), importModule,
  };
  if (options.env) Object.assign(env, options.env);
  const policy = factory(data.input, env);
  const workerWorld = async url => {
    const nativeFetch = vi.fn(async selected => ({ url: selected })), nativeScripts = vi.fn(), children = [];
    class WorkerURL extends URL {
      static createObjectURL(blob) { return env.URL.createObjectURL(blob); }
      static revokeObjectURL(value) { env.URL.revokeObjectURL(value); }
    }
    const world = vm.createContext({ URL: WorkerURL, Blob, fetch: nativeFetch, importScripts: nativeScripts,
      Worker: class { constructor(selected, settings) { this.url = selected; this.settings = settings; children.push(this); } terminate() {} }, console });
    world.self = world;
    vm.runInContext(await blobs.get(url).text(), world);
    return { world, nativeFetch, nativeScripts, children };
  };
  return { data, env, policy, routes, fetches, blobs, revoked, workers, readers, importModule, mainWorld, mainFetch, workerWorld,
    path: id => new URL(data.input.assets[id].path, baseUrl).href };
}

describe('complete runtime graph verification before execution', () => {
  it('withholds execution until the final selected part has been read and verified', async () => {
    const f = harness(), gate = deferred(), arrived = deferred();
    f.routes.set(f.path('partB'), { body: f.data.bodies.get(f.data.input.assets.partB.path), gate, arrived });
    const pending = f.policy.prepare('fixture').then(session => session.load());
    await arrived.promise;
    expect(f.importModule).not.toHaveBeenCalled(); expect(f.workers).toHaveLength(0); expect(f.blobs.size).toBe(0);
    gate.resolve(); await pending;
    expect(f.importModule).toHaveBeenCalledTimes(1);
    expect(f.fetches.every(call => call.settings.credentials === 'omit' && call.settings.cache === 'no-store')).toBe(true);
  });

  it.each(['entry', 'worker', 'wasm', 'partB'])('rejects altered %s before importing or constructing any worker', async id => {
    const f = harness(), original = f.data.bodies.get(f.data.input.assets[id].path), changed = Buffer.from(original);
    changed[changed.length - 1] ^= 1;
    f.routes.set(f.path(id), { body: changed });
    await expect(f.policy.prepare('fixture')).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    expect(f.importModule).not.toHaveBeenCalled(); expect(f.workers).toHaveLength(0); expect(f.blobs.size).toBe(0);
    expect(f.fetches.filter(call => call.url.endsWith(f.data.input.assets[id].path))).toHaveLength(1);
  });

  it.each(['overflow', 'truncated'])('bounds the decoded %s body and never tries a less-trusted fallback', async mode => {
    const f = harness(), approved = f.data.bodies.get(f.data.input.assets.wasm.path);
    f.routes.set(f.path('wasm'), { chunks: mode === 'overflow' ? [approved, Buffer.from([1])] : [approved.subarray(0, -1)] });
    await expect(f.policy.prepare('fixture')).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    expect(f.readers.some(reader => reader.cancelled)).toBe(true);
    expect(f.fetches.filter(call => call.url.endsWith('/wasm.wasm'))).toHaveLength(1);
    expect(f.importModule).not.toHaveBeenCalled();
  });

  it('uses only a reviewed mirror after an unavailable local response', async () => {
    const data = fixture(), record = data.input.assets.wasm, body = data.bodies.get(record.path);
    const mirror = 'https://cdn.jsdelivr.net/npm/runtime-fixture@1.0.0/engine.wasm';
    record.mirrors = [{ url: mirror, bytes: body.length, sha384: hash(body) }];
    const f = harness(data); f.routes.set(mirror, { body });
    f.routes.set(f.path('wasm'), { status: 503, body: Buffer.from('unavailable') });
    f.routes.set('https://school.example/' + record.path, { networkError: true });
    f.routes.set('https://alloflow-cdn.pages.dev/' + record.path, { status: 404, body: Buffer.from('missing') });
    await f.policy.prepare('fixture');
    expect(f.fetches.filter(call => call.url.endsWith('/wasm.wasm') || call.url === mirror).map(call => call.url)).toEqual([
      f.path('wasm'), 'https://school.example/' + record.path, 'https://alloflow-cdn.pages.dev/' + record.path, mirror,
    ]);
    expect(f.fetches.every(call => !call.url.includes('/main/') && !call.url.includes('@latest'))).toBe(true);
  });

  it('does not invent an unsigned/legacy source after every approved source fails', async () => {
    const f = harness(); f.routes.clear();
    await expect(f.policy.prepare('fixture')).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    expect(f.fetches.map(call => call.url)).toEqual([f.path('entry'), 'https://school.example/runtime/entry.js', 'https://alloflow-cdn.pages.dev/runtime/entry.js']);
    expect(f.importModule).not.toHaveBeenCalled();
  });

  it('does not trust a poisoned executable cache', async () => {
    const poisoned = { match: vi.fn(async () => ({ body: Buffer.from('unreviewed executable') })), put: vi.fn() };
    const f = harness(fixture(), { env: { caches: { open: vi.fn(async () => poisoned) } } });
    const session = await f.policy.prepare('fixture'); await session.load();
    expect(f.importModule).toHaveBeenCalledTimes(1);
    const entry = f.blobs.get(session.assets.entry);
    expect(await entry.text()).not.toContain('unreviewed executable');
  });

  it('does not retain a failed preparation as a poisoned session cache', async () => {
    const f = harness(), url = f.path('entry'), approved = f.routes.get(url);
    f.routes.set(url, { body: Buffer.from('tampered') });
    await expect(f.policy.prepare('fixture')).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    f.routes.set(url, approved);
    await (await f.policy.prepare('fixture')).load();
    expect(f.importModule).toHaveBeenCalledTimes(1);
  });

  it('deduplicates simultaneous preparation/imports while every selected asset remains verified', async () => {
    const f = harness(), one = f.policy.prepare('fixture'), two = f.policy.prepare('fixture');
    expect(one).toBe(two);
    const session = await one;
    await Promise.all([session.import('entry'), session.import('entry')]);
    expect(f.importModule).toHaveBeenCalledTimes(1);
    expect(f.fetches).toHaveLength(7);
  });

  it('fails closed when cryptographic verification is unavailable', async () => {
    const f = harness(fixture(), { env: { crypto: {} } });
    await expect(f.policy.prepare('fixture')).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    expect(f.importModule).not.toHaveBeenCalled(); expect(f.workers).toHaveLength(0);
  });
});

describe('immutable graph authority and exact executable capabilities', () => {
  it.each(['https://evil.example/runtime/entry.js', 'https://raw.githubusercontent.com/Owner/Repo/main/entry.js',
    './runtime/%2e%2e/entry.js', 'data:text/javascript,evil()', 'blob:unknown-executable'])('rejects unknown executable URL %s without a fetch', async url => {
    const f = harness(); expect(f.policy.isApprovedUrl(url)).toBe(false);
    await expect(f.policy.fetchText(url)).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    expect(() => f.policy.configureScript({}, url)).toThrow(); expect(f.fetches).toHaveLength(0);
  });

  it.each(['module', 'worker'])('requires reviewed closed metadata for every %s', kind => {
    const data = fixture(); data.input.assets[kind === 'module' ? 'entry' : 'worker'].closed = false;
    expect(() => harness(data)).toThrow(/unclosed executable/);
  });

  it('rejects a graph that omits a selected executable dependency', () => {
    const data = fixture(); data.input.graphs.fixture.assets = data.input.graphs.fixture.assets.filter(id => id !== 'worker');
    expect(() => harness(data)).toThrow(/omits a dependency/);
  });

  it('rejects cyclic part composition at the schema boundary before execution', () => {
    const data = fixture(); data.input.assets.partA.parts = ['composite'];
    expect(() => harness(data)).toThrow(/only WebAssembly may be composed/);
  });

  it('does not accept composed JavaScript disguised as a closed module', () => {
    const data = fixture(); data.input.assets.composite.kind = 'module'; data.input.assets.composite.closed = true;
    expect(() => harness(data)).toThrow(/only WebAssembly may be composed/);
  });

  it('rejects executable dependency cycles and revokes any partially built object URLs', async () => {
    const data = fixture(); data.input.assets.worker.dependencies.push('entry');
    const f = harness(data);
    await expect(f.policy.prepare('fixture')).rejects.toThrow(/cyclic executable dependencies/);
    expect(f.importModule).not.toHaveBeenCalled(); expect(f.blobs.size).toBe(0);
  });

  it('snapshots reviewed records instead of accepting later caller/manifest mutations', async () => {
    const data = fixture(), f = harness(data), changed = Buffer.from('unreviewed body');
    data.input.assets.entry.bytes = changed.length; data.input.assets.entry.sha384 = hash(changed);
    data.input.graphs.fixture.assets = ['entry']; f.routes.set(f.path('entry'), { body: changed });
    await expect(f.policy.prepare('fixture')).rejects.toMatchObject({ code: 'ALLO_RUNTIME_INTEGRITY' });
    expect(f.importModule).not.toHaveBeenCalled();
  });

  it('checks script kind/key and installs SRI before assigning a canonical executable src', () => {
    const f = harness(), script = {}, snapshots = [];
    Object.defineProperty(script, 'src', { set(value) { snapshots.push({ value, integrity: this.integrity, cors: this.crossOrigin }); } });
    f.policy.configureScript(script, f.path('classic') + '?v=cachehint', 'classic');
    expect(snapshots).toEqual([{ value: f.path('classic'), integrity: 'sha384-' + Buffer.from(f.data.input.assets.classic.sha384, 'hex').toString('base64'), cors: 'anonymous' }]);
    expect(() => f.policy.configureScript({}, f.path('entry'))).toThrow(/kind\/key/);
    expect(() => f.policy.configureScript({}, f.path('classic'), 'worker')).toThrow(/kind\/key/);
    expect(f.fetches).toHaveLength(0);
  });

  it('does not return malformed UTF-8 as executable script text', async () => {
    const data = fixture(); data.add('invalid', 'script', Buffer.from([0xc3, 0x28]));
    const f = harness(data);
    await expect(f.policy.fetchText(f.path('invalid'), 'invalid')).rejects.toThrow();
  });

  it('requires the declared module configuration export after import', async () => {
    const f = harness(fixture(), { env: { importModule: vi.fn(async () => ({})) } });
    await expect((await f.policy.prepare('fixture')).load()).rejects.toThrow(/configuration export missing/);
  });

  it('keeps simultaneous module capability maps lexical and leaves main-page globals unchanged', async () => {
    const data = fixture();
    for (const name of ['alpha', 'beta']) {
      data.add(name + '-wasm', 'wasm', wasm, { aliases: ['engine.wasm'] });
      data.add(name + '-entry', 'module', '__captureModule({own(){return __alloRuntimeAssets.wasm;}});', { dependencies: [name + '-wasm'] });
      data.input.graphs[name] = { assets: [name + '-wasm', name + '-entry'], entry: name + '-entry', bindings: { wasm: name + '-wasm' } };
    }
    const f = harness(data, { executeModules: true }), originalFetch = f.mainWorld.fetch, originalWorker = f.mainWorld.Worker;
    const a = await f.policy.prepare('alpha'), b = await f.policy.prepare('beta');
    const [one, two] = await Promise.all([a.load(), b.load()]);
    expect(one.own()).toBe(a.assets.wasm); expect(two.own()).toBe(b.assets.wasm); expect(one.own()).not.toBe(two.own());
    expect(f.mainWorld.fetch).toBe(originalFetch); expect(f.mainWorld.Worker).toBe(originalWorker);
    expect(f.mainWorld.__alloRuntimeAssets).toBeUndefined(); expect(f.mainWorld.__alloRuntimeFetch).toBeUndefined();
  });
});

describe('worker executable guards and concurrent lifetime ownership', () => {
  it.each(['importScripts', 'Worker', 'wasm fetch'])('denies an unknown worker %s before any native operation', async operation => {
    const f = harness(), session = await f.policy.prepare('fixture'), worker = session.createWorker('self.__fixtureStarted=true;');
    const w = await f.workerWorld(worker.url); w.nativeScripts.mockClear(); w.nativeFetch.mockClear(); w.children.length = 0;
    if (operation === 'importScripts') expect(() => w.world.importScripts('https://evil.example/payload.js')).toThrow(/Unreviewed/);
    else if (operation === 'Worker') expect(() => new w.world.Worker('https://evil.example/payload.js')).toThrow(/Unreviewed/);
    else await expect(w.world.fetch('https://evil.example/payload.wasm')).rejects.toThrow(/Unreviewed/);
    expect(w.nativeScripts).not.toHaveBeenCalled(); expect(w.nativeFetch).not.toHaveBeenCalled(); expect(w.children).toHaveLength(0);
  });

  it('allows this graph\'s verified Blob fetch and denies an unrelated Blob', async () => {
    const f = harness(), session = await f.policy.prepare('fixture'), worker = session.createWorker('');
    const w = await f.workerWorld(worker.url);
    await expect(w.world.fetch(session.assets.wasm)).resolves.toMatchObject({ url: session.assets.wasm });
    await expect(w.world.fetch('blob:unreviewed/asset')).rejects.toThrow(/Unreviewed/);
    expect(w.nativeFetch).toHaveBeenCalledTimes(1);
  });

  it('wraps a raw worker asset with the full session guard before it is exposed', async () => {
    const f = harness(), session = await f.policy.prepare('fixture'), asset = session.asset('worker');
    expect(asset.url).not.toBe(session.assets.worker);
    const w = await f.workerWorld(asset.url);
    expect(w.nativeScripts).toHaveBeenCalledWith(session.assets.worker);
    await expect(w.world.fetch(session.assets.wasm)).resolves.toMatchObject({ url: session.assets.wasm });
    expect(() => w.world.importScripts('https://evil.example/late.js')).toThrow(/Unreviewed/);
    asset.revoke(); session.dispose();
  });

  it('inherits all executable guards when a verified worker spawns a verified child', async () => {
    const data = fixture(); data.add('nested', 'worker', 'self.__nestedFixtureStarted=true;');
    data.input.assets.worker.dependencies.push('nested'); data.input.graphs.fixture.assets.push('nested');
    const f = harness(data), session = await f.policy.prepare('fixture'), parent = session.createWorker('');
    const outer = await f.workerWorld(parent.url);
    new outer.world.Worker('nested');
    expect(outer.children).toHaveLength(1);
    const child = await f.workerWorld(outer.children[0].url);
    child.nativeScripts.mockClear(); child.nativeFetch.mockClear(); child.children.length = 0;
    expect(() => child.world.importScripts('https://evil.example/child.js')).toThrow(/Unreviewed/);
    expect(() => new child.world.Worker('https://evil.example/grandchild.js')).toThrow(/Unreviewed/);
    await expect(child.world.fetch('https://evil.example/child.wasm')).rejects.toThrow(/Unreviewed/);
    expect(child.nativeScripts).not.toHaveBeenCalled(); expect(child.nativeFetch).not.toHaveBeenCalled(); expect(child.children).toHaveLength(0);
  });

  it('keeps independent leases alive until all releases after disposal, and closes new activity immediately', async () => {
    const f = harness(), session = await f.policy.prepare('fixture'), a = session.asset('wasm'), b = session.asset('wasm');
    a.revoke(); a.revoke(); expect(f.revoked).toHaveLength(0);
    session.dispose(); expect(f.revoked).toHaveLength(0); expect(f.blobs.has(b.url)).toBe(true);
    expect(() => session.asset('wasm')).toThrow(); expect(() => session.createWorker('')).toThrow();
    await expect(session.import('entry')).rejects.toThrow(); await expect(session.load()).rejects.toThrow();
    b.revoke(); expect(f.blobs.size).toBe(0); expect(new Set(f.revoked).size).toBe(f.revoked.length);
  });

  it('retains worker leases separately and cannot dispose a newer prepared session through an older worker', async () => {
    const f = harness(), old = await f.policy.prepare('fixture'), worker = old.createWorker('');
    old.dispose(); expect(f.blobs.has(worker.url)).toBe(true);
    const fresh = await f.policy.prepare('fixture');
    worker.terminate(); worker.terminate();
    expect(f.blobs.has(fresh.assets.wasm)).toBe(true); expect(await f.policy.prepare('fixture')).toBe(fresh);
    fresh.dispose(); expect(f.blobs.size).toBe(0);
  });
});

const releaseRoots = [];
afterEach(() => {
  while (releaseRoots.length) {
    const root = path.resolve(releaseRoots.pop());
    if (!root.startsWith(path.resolve(os.tmpdir()) + path.sep) || !path.basename(root).startsWith('alloflow-runtime-release-')) throw Error('Unexpected runtime release fixture');
    fs.rmSync(root, { recursive: true, force: true });
  }
});
function releaseFixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-runtime-release-')); releaseRoots.push(root);
  const buildDir = path.join(root, 'build'), templateDir = path.join(root, 'templates');
  const write = (directory, file, value) => { const target = path.join(directory, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
  write(buildDir, 'index.html', '<html><head><script src="./static/js/main.1234abcd.js"></script><link rel="stylesheet" href="./static/css/main.1234abcd.css"></head><body></body></html>');
  write(buildDir, 'static/js/main.1234abcd.js', 'window.__runtimeReleaseFixture=true;');
  write(buildDir, 'static/css/main.1234abcd.css', 'body{color:black}');
  write(templateDir, 'sw.js', fs.readFileSync('desktop/web-app/public/sw.js'));
  write(templateDir, 'alloflow_desktop_bridge.js', 'window.__fixtureBridge=true;');
  write(templateDir, 'alloflow_update.js', 'window.__fixtureUpdate=true;');
  const records = [{ asset: 'runtime_assets/fixture/engine.wasm' }, { asset: 'runtime_assets/fixture/engine.mjs' }];
  write(buildDir, records[0].asset, wasm); write(buildDir, records[1].asset, 'export const synthetic=42;');
  return { root, buildDir, templateDir, records };
}
function postbuildFixtureModule(stubs, { cli = false, environment = {} } = {}) {
  const filename = path.resolve('desktop/web-app/postbuild.js'), realRequire = createRequire(filename), module = { exports: {} };
  const require = name => Object.hasOwn(stubs, name) ? stubs[name] : realRequire(name); require.main = cli ? module : undefined;
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), { require, module, __dirname: path.dirname(filename), Buffer,
    process: { env: environment }, console: { log() {} } });
  return module.exports;
}

describe('runtime graph future-build integration', () => {
  it('hashes approved runtime assets for lazy caching without adding them to installation precache', () => {
    const f = releaseFixture(), checked = [];
    // This isolated stamping fixture supplies the verifier's reviewed records.
    // Actual graph verification is exercised by the unit/native policy suites.
    const api = postbuildFixtureModule({ '../../dev-tools/build_runtime_graph_delivery_policy.cjs': {
      assertRuntimeHost(input) { checked.push(input); return { id: 'f'.repeat(64), records: f.records }; },
    } });
    const result = api.postbuild({ buildDir: f.buildDir, templateDir: f.templateDir, runtimeDeliveryRoot: f.root, now: () => 1234 });
    expect(result.runtimeDeliveryValidated).toBe(true); expect(checked).toHaveLength(1);
    const worker = fs.readFileSync(path.join(f.buildDir, 'sw.js'), 'utf8');
    const paths = JSON.parse(worker.match(/^const PRECACHE_PATHS = ([^\r\n]+);$/m)[1]);
    const digests = JSON.parse(worker.match(/^const PRECACHE_DIGESTS = ([^\r\n]+);$/m)[1]);
    for (const record of f.records) {
      expect(paths).not.toContain('./' + record.asset);
      const body = fs.readFileSync(path.join(f.buildDir, record.asset));
      expect(digests['./' + record.asset]).toEqual({ sha384: hash(body), bytes: body.length });
    }
    expect(() => api.assertReleaseDigests(f.buildDir)).not.toThrow();
    fs.writeFileSync(path.join(f.buildDir, f.records[0].asset), Buffer.from(wasm).fill(1));
    expect(() => api.assertReleaseDigests(f.buildDir)).toThrow(/Final release asset bytes differ/);
  });

  it('runs the mandatory runtime gate before any default CLI stamp despite an attempted environment bypass', () => {
    const f = releaseFixture(), original = fs.readFileSync(path.join(f.buildDir, 'index.html'));
    const stubs = {
      '../../dev-tools/build_browser_delivery_manifest.cjs': { assertBuiltDelivery: () => ({ releaseId: 'fixture' }) },
      '../../dev-tools/build_optional_browser_delivery_policy.cjs': { assertOptionalHost: () => ({ id: 'fixture', records: [] }) },
      '../../dev-tools/build_runtime_graph_delivery_policy.cjs': { assertRuntimeHost: () => { throw Error('mandatory runtime graph check'); } },
    };
    expect(() => postbuildFixtureModule(stubs, { cli: true, environment: { BUILD_PATH: f.buildDir, ALLOFLOW_SKIP_RUNTIME_INTEGRITY: '1' } })).toThrow(/mandatory runtime graph check/);
    expect(fs.readFileSync(path.join(f.buildDir, 'index.html'))).toEqual(original);
    expect(fs.existsSync(path.join(f.buildDir, 'sw.js'))).toBe(false);
  });

  it('blocks primary approval on stale compiled loaders and inserts future runtime policy after optional policy', () => {
    const build = fs.readFileSync('build.js', 'utf8'), first = build.indexOf('function finalizeBrowserDeliveryHost(writeOutput) {');
    const last = build.indexOf('// ── Write output', first);
    expect(first).toBeGreaterThan(-1); expect(last).toBeGreaterThan(first);
    const writes = vi.fn(), primary = vi.fn(() => ({ assets: { fixture: {} }, releaseId: 'fixture' }));
    const scope = vm.createContext({ ROOT: 'fixture', mode: 'dev', gitHash: 'a'.repeat(40), content: 'host', console: { log() {} },
      assertPrivateLoaderCoverage: () => { throw Error('uncompiled private guard'); }, buildBrowserDeliveryManifest: primary,
      buildBrowserDeliveryHostBlock: () => 'primary', replaceBrowserDeliveryHostBlock: (before, block) => before + '|' + block,
      assertVendorAssets: () => ({ catalog: {} }), buildOptionalDeliveryBlock: () => 'optional', replaceOptionalDeliveryBlock: (before, block) => before + '|' + block,
      assertRuntimeAssets: () => ({ manifest: {} }), buildRuntimeGraphBlock: () => 'runtime', replaceRuntimeGraphBlock: (before, block) => before + '|' + block,
      writeWorkspaceFileAtomic: writes,
    });
    vm.runInContext(build.slice(first, last) + '\nthis.finalize=finalizeBrowserDeliveryHost;', scope);
    expect(() => scope.finalize(false)).toThrow(/uncompiled private guard/); expect(primary).not.toHaveBeenCalled(); expect(writes).not.toHaveBeenCalled();
    scope.assertPrivateLoaderCoverage = () => ({}); scope.finalize(false);
    expect(scope.content).toBe('host|primary|optional|runtime'); expect(writes).not.toHaveBeenCalled();
  });
});
