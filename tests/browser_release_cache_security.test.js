import { afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import vm from 'node:vm';
import http from 'node:http';
import { createHash, webcrypto } from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { postbuild, assertReleaseDigests } = require('../desktop/web-app/postbuild.js');
const workerTemplate = fs.readFileSync('desktop/web-app/public/sw.js', 'utf8');
const roots = [];
const digest = value => createHash('sha384').update(value).digest('hex');

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'alloflow-release-security-'));
  roots.push(root);
  const buildDir = path.join(root, 'build'), templateDir = path.join(root, 'templates');
  fs.mkdirSync(templateDir);
  fs.mkdirSync(path.join(buildDir, 'static/js'), { recursive: true });
  fs.mkdirSync(path.join(buildDir, 'static/css'), { recursive: true });
  fs.writeFileSync(path.join(templateDir, 'sw.js'), workerTemplate);
  const files = {
    'index.html': '<!doctype html><html><head><title>Approved boot</title>'
      + '<script id="alloflow-ai-backend-script" src="./ai_backend_module.js" defer></script>'
      + '<script src="./alloflow_update.js" defer></script><script src="./alloflow_desktop_bridge.js" defer></script>'
      + '<script src="./static/js/main.12345678.js" defer></script>'
      + '<link rel="stylesheet" href="./static/css/main.12345678.css"></head><body>Classroom</body></html>',
    'ai_backend_module.js': 'window.approvedBackend=true;',
    'alloflow_update.js': 'window.approvedUpdate=true;',
    'alloflow_desktop_bridge.js': 'window.approvedBridge=true;',
    'static/js/main.12345678.js': 'window.approvedBoot=(window.approvedBoot||0)+1;',
    'static/css/main.12345678.css': 'body{color:rgb(12, 34, 56)}',
    'static/js/87654321.chunk.js': 'window.approvedLazy=true;',
  };
  for (const [name, bytes] of Object.entries(files)) fs.writeFileSync(path.join(buildDir, name), bytes);
  const read = name => fs.readFileSync(path.join(buildDir, name), 'utf8');
  const build = () => postbuild({ buildDir, templateDir, now: () => 1000 });
  build();
  return { buildDir, read, build,
    write: (name, value) => fs.writeFileSync(path.join(buildDir, name), value),
    digests: () => JSON.parse(read('sw.js').match(/const PRECACHE_DIGESTS = (.*);/)[1]),
    paths: () => JSON.parse(read('sw.js').match(/const PRECACHE_PATHS = (.*);/)[1]),
  };
}

function harness(app) {
  const base = 'https://example.test/app/', events = new Map(), stores = new Map(), requests = [];
  const key = request => typeof request === 'string' ? request : request.url;
  let network = request => {
    const name = new URL(key(request)).pathname.replace('/app/', '');
    try { return new Response(app.read(name)); } catch (_) { return new Response('missing', { status: 404 }); }
  };
  const cache = name => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return { match: async request => store.get(key(request))?.clone(),
      put: async (request, response) => { store.set(key(request), response.clone()); },
      delete: async request => store.delete(key(request)) };
  };
  const context = {
    self: { registration: { scope: base }, location: { origin: new URL(base).origin },
      addEventListener: (event, handler) => events.set(event, handler), skipWaiting: vi.fn(), clients: { claim: async () => {} } },
    URL, Response, Uint8Array, TextDecoder, crypto: webcrypto, console: { log() {} },
    caches: { open: async name => cache(name), keys: async () => [...stores.keys()], delete: async name => stores.delete(name),
      match() { throw new Error('Cross-release cache lookup is forbidden'); } },
    fetch: async (request, options) => { requests.push({ url: key(request), options }); return network(request, options); },
  };
  vm.runInNewContext(app.read('sw.js'), context);
  const cacheName = app.read('sw.js').match(/const CACHE_NAME = '([^']+)';/)[1];
  return { base, requests, stores, cacheName,
    setNetwork: fn => { network = fn; },
    install() { let result; events.get('install')({ waitUntil: promise => { result = promise; } }); return result; },
    async put(name, relative, response) { await cache(name).put(new URL(relative, base).href, response); },
    async fetch(relative, options = {}) {
      let response;
      events.get('fetch')({ request: { url: new URL(relative, base).href, method: 'GET', mode: 'cors',
        headers: new Headers(), cache: 'default', ...options }, respondWith: promise => { response = promise; } });
      return response === undefined ? undefined : await response;
    },
  };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    expect(path.dirname(root)).toBe(path.resolve(os.tmpdir()));
    expect(path.basename(root)).toMatch(/^alloflow-release-security-/);
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('approved browser release assets', () => {
  it('validates final release bytes after an approved student-shell cache-prefix rewrite', () => {
    const app = fixture();
    const initial = assertReleaseDigests(app.buildDir);
    expect(initial.checkedFiles).toBe(7);
    app.write('sw.js', app.read('sw.js').replace(/alloflow-v/g, 'alloflow-student-shell-v'));
    expect(assertReleaseDigests(app.buildDir)).toEqual(initial);
    app.write('static/js/87654321.chunk.js', 'window.modifiedAfterStamp=true;');
    expect(() => assertReleaseDigests(app.buildDir)).toThrow(/asset bytes differ/);
  });

  it('rejects post-stamp HTML transformations and missing boot/static digest records without mutating files', () => {
    const app = fixture(), originalHtml = app.read('index.html'), originalWorker = app.read('sw.js');
    app.write('index.html', originalHtml.replace('Classroom', 'Changed classroom'));
    expect(() => assertReleaseDigests(app.buildDir)).toThrow(/asset bytes differ/);
    expect(app.read('index.html')).not.toBe(originalHtml);
    app.write('index.html', originalHtml);
    const records = app.digests(); delete records['./static/js/87654321.chunk.js'];
    app.write('sw.js', originalWorker.replace(/^const PRECACHE_DIGESTS = .*;$/m, 'const PRECACHE_DIGESTS = ' + JSON.stringify(records) + ';'));
    expect(() => assertReleaseDigests(app.buildDir)).toThrow(/Required release digest is missing/);
  });

  it('parses emitted digests as JSON without evaluating worker expressions', () => {
    const app = fixture();
    app.write('sw.js', app.read('sw.js').replace(/^const PRECACHE_DIGESTS = .*;$/m,
      'const PRECACHE_DIGESTS = (globalThis.__digestVerifierExecuted=true, {});'));
    expect(() => assertReleaseDigests(app.buildDir)).toThrow(/JSON only/);
    expect(globalThis.__digestVerifierExecuted).toBeUndefined();
  });

  it('rejects linked asset ancestry even when linked target bytes have the approved digest', () => {
    const app = fixture(), source = path.join(app.buildDir, 'static/css'), target = path.join(app.buildDir, 'approved-css');
    fs.renameSync(source, target);
    fs.symlinkSync(target, source, process.platform === 'win32' ? 'junction' : 'dir');
    expect(() => assertReleaseDigests(app.buildDir)).toThrow(/symbolic link/);
  });

  it('anchors full final HTML/boot hashes in the worker and SRI in every local script/style', () => {
    const app = fixture(), html = app.read('index.html'), manifest = app.digests();
    const tags = html.match(/<(?:script|link)\b[^>]*\b(?:src|href)=[^>]+>/g);
    expect(tags).toHaveLength(5);
    for (const tag of tags) {
      const reference = tag.match(/\b(?:src|href)="([^"]+)"/)[1];
      const bytes = app.read(reference.split('?')[0]);
      expect(tag).toContain('integrity="sha384-' + createHash('sha384').update(bytes).digest('base64') + '"');
      expect(tag).toContain('crossorigin="anonymous"');
      expect(manifest[reference]).toEqual({ sha384: digest(bytes), bytes: Buffer.byteLength(bytes) });
    }
    expect(manifest['./index.html']).toEqual({ sha384: digest(html), bytes: Buffer.byteLength(html) });
    const worker = app.read('sw.js'); app.build();
    expect(app.read('sw.js')).toBe(worker);
    expect(app.read('index.html')).toBe(html);
  });

  it('approves lazy generated chunks without precaching them and includes their bytes in release identity', async () => {
    const app = fixture(), before = app.read('sw.js');
    expect(app.paths()).not.toContain('./static/js/87654321.chunk.js');
    expect(app.digests()['./static/js/87654321.chunk.js']).toBeDefined();
    const env = harness(app);
    expect((await env.fetch('./static/js/87654321.chunk.js')).status).toBe(200);
    expect((await env.fetch('./static/js/unapproved.js')).status).toBe(503);
    expect((await env.fetch('./static/js/87654321.chunk.js?v=other-release')).status).toBe(503);
    app.write('static/js/87654321.chunk.js', 'window.approvedLazy="updated";'); app.build();
    expect(app.read('sw.js')).not.toBe(before);
  });

  it('rejects a same-length altered boot asset before writing any candidate cache entry', async () => {
    const app = fixture(), env = harness(app);
    env.setNetwork(request => {
      const name = new URL(request).pathname.replace('/app/', '');
      const body = app.read(name);
      return new Response(name.endsWith('.css') ? body.replace('12, 34, 56', '65, 43, 21') : body);
    });
    await expect(env.install()).rejects.toThrow(/digest mismatch/);
    expect([...env.stores.values()].every(store => store.size === 0)).toBe(true);
  });

  it('blocks poisoned cached code offline and repairs it only from matching approved network bytes', async () => {
    const app = fixture(), env = harness(app), asset = './static/js/main.12345678.js';
    await env.install();
    await env.put(env.cacheName, asset, new Response('window.attackerExecuted=true;'));
    await env.put('unrelated-old-release', asset, new Response('window.foreignCache=true;'));
    env.setNetwork(() => { throw new Error('offline'); });
    expect((await env.fetch(asset)).status).toBe(503);
    env.setNetwork(() => new Response(app.read('static/js/main.12345678.js')));
    const recovered = await env.fetch(asset);
    expect(recovered.status).toBe(200);
    expect(await recovered.text()).toBe(app.read('static/js/main.12345678.js'));
  });

  it('keeps shell A until activation and never caches shell B under worker A', async () => {
    const app = fixture(), env = harness(app), approved = app.read('index.html');
    await env.install(); env.requests.length = 0;
    const otherRelease = approved.replace(/window\.__alloReleaseId="[a-f0-9]+"/, 'window.__alloReleaseId="' + 'f'.repeat(64) + '"');
    env.setNetwork(() => new Response(otherRelease));
    expect(await (await env.fetch('./', { mode: 'navigate' })).text()).toBe(approved);
    expect(env.requests).toHaveLength(0);
    env.stores.get(env.cacheName).delete(new URL('./index.html', env.base).href);
    expect((await env.fetch('./', { mode: 'navigate' })).status).toBe(503);
    expect(env.stores.get(env.cacheName).has(new URL('./index.html', env.base).href)).toBe(false);
  });

  it('bounds decoded asset lengths and does not accept an unapproved query as a generic cache key', async () => {
    const app = fixture(), env = harness(app);
    env.setNetwork(() => new Response('x'.repeat(1024)));
    expect((await env.fetch('./static/js/main.12345678.js')).status).toBe(503);
    expect((await env.fetch('./ai_backend_module.js?v=unapproved')).status).toBe(503);
  });

  it('never substitutes caches for API, authenticated, no-store or non-GET requests', async () => {
    const app = fixture(), env = harness(app);
    const cases = [['./api/classroom', {}], ['./private.json', { headers: new Headers({ Authorization: 'Bearer synthetic' }) }],
      ['./no-store.json', { cache: 'no-store' }], ['./header.json', { headers: new Headers({ 'Cache-Control': 'no-store' }) }]];
    for (const [asset, options] of cases) {
      await env.put(env.cacheName, asset, new Response('private cached data'));
      env.setNetwork(() => { throw new Error('offline'); });
      await expect(env.fetch(asset, options)).rejects.toThrow('offline');
      expect(env.requests.at(-1).options.cache).toBe('no-store');
    }
    const count = env.requests.length;
    expect(await env.fetch('./api/classroom', { method: 'POST' })).toBeUndefined();
    expect(env.requests).toHaveLength(count);
  });

  it('does not store private responses or use another release cache for generic offline content', async () => {
    const app = fixture(), env = harness(app);
    for (const policy of ['private, max-age=60', 'no-store']) {
      env.setNetwork(() => new Response('synthetic private content', { headers: { 'Cache-Control': policy } }));
      expect((await env.fetch('./private.json')).status).toBe(200);
      expect([...env.stores.values()].every(store => store.size === 0)).toBe(true);
    }
    await env.put('unrelated-old-release', './generic.json', new Response('foreign release data'));
    env.setNetwork(() => { throw new Error('offline'); });
    expect((await env.fetch('./generic.json')).status).toBe(503);
  });

  it('real Chromium blocks altered boot JS and CSS through generated SRI before worker installation', async () => {
    const app = fixture(), { chromium } = require('playwright');
    let tamper = false;
    const server = http.createServer((request, response) => {
      const url = new URL(request.url, 'http://localhost'), name = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      try {
        let bytes = app.read(name);
        if (tamper && name === 'static/js/main.12345678.js') bytes = 'window.attackerExecuted=true;';
        if (tamper && name === 'static/css/main.12345678.css') bytes = 'body{color:rgb(255,0,0)}';
        response.writeHead(200, { 'Content-Type': name.endsWith('.js') ? 'application/javascript' : name.endsWith('.css') ? 'text/css' : 'text/html', 'Cache-Control': 'no-store' });
        response.end(bytes);
      } catch (_) { response.writeHead(404); response.end(); }
    });
    let browser;
    try {
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      const executablePath = [process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH, chromium.executablePath(),
        'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
        'C:/Program Files/Microsoft/Edge/Application/msedge.exe'].find(candidate => candidate && fs.existsSync(candidate));
      browser = await chromium.launch(executablePath ? { executablePath } : {});
      const page = await browser.newPage(), base = 'http://127.0.0.1:' + server.address().port;
      await page.goto(base);
      expect(await page.evaluate(() => window.approvedBoot)).toBe(1);
      expect(await page.locator('body').evaluate(element => getComputedStyle(element).color)).toBe('rgb(12, 34, 56)');
      tamper = true; await page.reload();
      expect(await page.evaluate(() => window.attackerExecuted || window.approvedBoot || false)).toBe(false);
      expect(await page.locator('body').evaluate(element => getComputedStyle(element).color)).not.toBe('rgb(255, 0, 0)');
      expect(await page.evaluate(() => window.approvedBackend && window.approvedBridge && window.approvedUpdate)).toBe(true);
    } finally {
      if (browser) await browser.close();
      server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    }
  }, 90000);
});
