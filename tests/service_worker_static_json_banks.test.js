import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const rootTemplate = readFileSync('desktop/web-app/public/sw.js', 'utf8');
const appSw = readFileSync('app/sw.js', 'utf8');
const publicAppSw = readFileSync('desktop/web-app/public/app/sw.js', 'utf8');

function compileWorker(source, base) {
  const events = new Map();
  const stores = new Map();
  const networkCalls = [];
  let networkHandler = () => new Response('missing', { status: 404 });

  const key = (req) => (typeof req === 'string' ? req : req.url);
  const cache = (name) => {
    if (!stores.has(name)) stores.set(name, new Map());
    const store = stores.get(name);
    return {
      match: async (req) => store.get(key(req))?.clone(),
      put: async (req, res) => { store.set(key(req), res.clone()); },
      delete: async (req) => store.delete(key(req)),
    };
  };

  const context = {
    self: {
      registration: { scope: base },
      location: { origin: new URL(base).origin },
      addEventListener: (event, handler) => events.set(event, handler),
      skipWaiting: vi.fn(),
      clients: { claim: async () => {} },
    },
    URL,
    Response,
    Headers,
    Uint8Array,
    TextDecoder,
    crypto: webcrypto,
    console: { log() {} },
    caches: {
      open: async (name) => cache(name),
      keys: async () => [...stores.keys()],
      delete: async (name) => stores.delete(name),
    },
    fetch: async (req, options) => {
      networkCalls.push({ url: key(req), options });
      return networkHandler(req, options);
    },
  };

  vm.runInNewContext(source, context);
  const cacheName = source.match(/const CACHE_NAME = '([^']+)';/)[1];
  return {
    base,
    stores,
    cacheName,
    networkCalls,
    setNetwork: (fn) => { networkHandler = fn; },
    async fetch(relative, options = {}) {
      let result;
      events.get('fetch')({
        request: {
          url: new URL(relative, base).href,
          method: 'GET',
          mode: 'cors',
          headers: options.headers || new Headers(),
          cache: options.cache || 'default',
        },
        respondWith: (p) => { result = p; },
      });
      return result === undefined ? undefined : await result;
    },
  };
}

function makeTemplateConcrete(src) {
  return src
    .replace(/__RELEASE_ID__/g, 'test-release-1')
    .replace(/__BUILD_TS__/g, '1000')
    .replace('__PRECACHE_PATHS__', '["./index.html"]')
    .replace('__PRECACHE_DIGESTS__', '{"./index.html":"00"}');
}

describe('service worker cache-first static JSON banks', () => {
  it('keeps app/sw.js and desktop/web-app/public/app/sw.js byte-identical', () => {
    expect(publicAppSw).toBe(appSw);
  });

  it.each([
    { label: 'root sw template', src: makeTemplateConcrete(rootTemplate), base: 'https://example.test/' },
    { label: 'student shell app/sw.js', src: appSw, base: 'https://example.test/app/' },
  ])('$label serves shard, kokoro bank, and vocab bank JSON cache-first and rejects HTML/non-JSON', async ({ src, base }) => {
    const h = compileWorker(src, base);
    const tick = () => new Promise((resolve) => setTimeout(resolve, 0));

    h.setNetwork(() => new Response('{"version":1,"words":[]}', {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=0' },
    }));

    for (const rel of ['word_audio_shards/w_001.json', 'word_audio_kokoro_bank.json', 'packets_vocab/en-1.json']) {
      const before = h.networkCalls.length;
      const first = await h.fetch(rel);
      expect(first.status).toBe(200);
      expect(await first.text()).toBe('{"version":1,"words":[]}');
      expect(h.networkCalls.length).toBe(before + 1);
      expect(h.networkCalls.at(-1).options).toMatchObject({ cache: 'no-cache', credentials: 'omit' });
      await tick();

      const second = await h.fetch(rel);
      expect(await second.text()).toBe('{"version":1,"words":[]}');
      expect(h.networkCalls.length).toBe(before + 1);
    }

    // Offline replay works after cache warm
    h.setNetwork(() => { throw new TypeError('offline'); });
    for (const rel of ['word_audio_shards/w_001.json', 'word_audio_kokoro_bank.json', 'packets_vocab/en-1.json']) {
      const offline = await h.fetch(rel);
      expect(offline.status).toBe(200);
      expect(await offline.text()).toBe('{"version":1,"words":[]}');
    }

    // HTML SPA fallback returned as 200 text/html must NOT enter CacheStorage
    h.setNetwork(() => new Response('<!doctype html><html></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }));
    const htmlRes = await h.fetch('packets_vocab/en-2.json');
    expect(htmlRes.status).toBe(200);
    await tick();
    const store = h.stores.get(h.cacheName);
    expect(store.get(new URL('packets_vocab/en-2.json', base).href)).toBeUndefined();

    // Private/credentialed/no-store requests continue bypassing cache
    h.setNetwork(() => new Response('{"secret":1}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    await h.fetch('word_audio_shards/w_002.json', { cache: 'no-store' });
    await tick();
    expect(store.get(new URL('word_audio_shards/w_002.json', base).href)).toBeUndefined();

    await h.fetch('word_audio_shards/w_003.json', { headers: new Headers({ Authorization: 'Bearer tok' }) });
    await tick();
    expect(store.get(new URL('word_audio_shards/w_003.json', base).href)).toBeUndefined();
  });
});
