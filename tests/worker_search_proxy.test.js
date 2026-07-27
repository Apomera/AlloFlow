import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

// GET /search on the catalog Worker replaces the retired Firebase search proxy
// as the Canvas web-search transport. It is deliberately unauthenticated
// (Canvas cannot mint Firebase Auth/App Check tokens) while spending a paid
// Serper budget, so the guards below are the whole security story: they are
// pinned here rather than left to review.

let worker;

beforeAll(async () => {
  // The Worker is an ES module using `export default`. Load it through a
  // data: URL so the test does not depend on a build step.
  const src = fs.readFileSync(
    path.resolve(process.cwd(), 'catalog/cloudflare-worker/src/index.js'),
    'utf8',
  );
  const mod = await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
  worker = mod.default;
});

function kvStub() {
  const store = new Map();
  return {
    store,
    get: async (k) => (store.has(k) ? store.get(k) : null),
    put: async (k, v) => { store.set(k, v); },
  };
}

function cacheStub() {
  const store = new Map();
  return {
    default: {
      match: async (req) => {
        const hit = store.get(req.url);
        return hit ? new Response(hit, { headers: { 'Content-Type': 'application/json' } }) : undefined;
      },
      put: async (req, res) => { store.set(req.url, await res.text()); },
    },
  };
}

function get(url, headers = {}) {
  return new Request(url, { method: 'GET', headers });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('worker GET /search', () => {
  it('returns 503 rather than failing open when no Serper key is configured', async () => {
    vi.stubGlobal('caches', cacheStub());
    const res = await worker.fetch(get('https://w.dev/search?q=main+idea'), {});
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('search-not-configured');
  });

  it('honours the kill switch without a redeploy', async () => {
    vi.stubGlobal('caches', cacheStub());
    const res = await worker.fetch(get('https://w.dev/search?q=main+idea'), {
      SERPER_API_KEY: 'k',
      DISABLE_SEARCH_PROXY: 'true',
    });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toBe('search-disabled');
  });

  it('rejects a too-short query before spending an API credit', async () => {
    vi.stubGlobal('caches', cacheStub());
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const res = await worker.fetch(get('https://w.dev/search?q=a'), { SERPER_API_KEY: 'k' });
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes results and never leaks the API key to the client', async () => {
    vi.stubGlobal('caches', cacheStub());
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      organic: [
        { link: 'https://www.thecorestandards.org/RI/3/2/', title: 'RI.3.2', snippet: 'Main idea.' },
        { link: 'javascript:alert(1)', title: 'bad', snippet: 'nope' },
      ],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })));

    const res = await worker.fetch(get('https://w.dev/search?q=main+idea&num=5'), { SERPER_API_KEY: 'super-secret' });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    // Non-http(s) URLs are dropped, not passed through to the browser.
    expect(body.results).toHaveLength(1);
    expect(body.results[0].url).toBe('https://www.thecorestandards.org/RI/3/2/');
    expect(body.results[0].source).toBe('Serper');
    expect(JSON.stringify(body)).not.toContain('super-secret');
  });

  it('sends the key upstream as a header only', async () => {
    vi.stubGlobal('caches', cacheStub());
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ organic: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await worker.fetch(get('https://w.dev/search?q=main+idea'), { SERPER_API_KEY: 'super-secret' });

    const [upstreamUrl, options] = fetchMock.mock.calls[0];
    expect(String(upstreamUrl)).toBe('https://google.serper.dev/search');
    expect(String(upstreamUrl)).not.toContain('super-secret');
    expect(options.headers['X-API-KEY']).toBe('super-secret');
  });

  it('caps the result count no matter what the caller asks for', async () => {
    vi.stubGlobal('caches', cacheStub());
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ organic: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    await worker.fetch(get('https://w.dev/search?q=main+idea&num=500'), { SERPER_API_KEY: 'k' });

    expect(JSON.parse(fetchMock.mock.calls[0][1].body).num).toBe(10);
  });

  it('serves a repeat query from cache without calling upstream again', async () => {
    vi.stubGlobal('caches', cacheStub());
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      organic: [{ link: 'https://example.org/a', title: 'A', snippet: 'a' }],
    }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    const env = { SERPER_API_KEY: 'k', SEARCH_RATE: kvStub() };

    await worker.fetch(get('https://w.dev/search?q=main+idea'), env);
    const second = await worker.fetch(get('https://w.dev/search?q=main+idea'), env);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect((await second.json()).cached).toBe(true);
  });

  it('does not throttle a school-sized burst from one NAT address', async () => {
    // A building of teachers shares one CF-Connecting-IP. The per-IP cap must
    // be loose enough that ordinary classroom traffic never trips it — the
    // daily budget, not the rate limit, is what protects the credit balance.
    vi.stubGlobal('caches', cacheStub());
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ organic: [] }), { status: 200 })));
    const env = { SERPER_API_KEY: 'k', SEARCH_RATE: kvStub() };
    const headers = { 'CF-Connecting-IP': '203.0.113.9' };

    const statuses = [];
    // 40 distinct queries in one minute from one school. Cache cannot absorb them.
    for (let i = 0; i < 40; i++) {
      const res = await worker.fetch(get(`https://w.dev/search?q=distinct+query+${i}`, headers), env);
      statuses.push(res.status);
    }

    expect(statuses.every((s) => s === 200)).toBe(true);
  });

  it('still stops a runaway loop from one IP', async () => {
    vi.stubGlobal('caches', cacheStub());
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ organic: [] }), { status: 200 })));
    const env = { SERPER_API_KEY: 'k', SEARCH_RATE: kvStub(), SEARCH_RATE_PER_MINUTE: '5' };
    const headers = { 'CF-Connecting-IP': '203.0.113.9' };

    const statuses = [];
    for (let i = 0; i < 9; i++) {
      const res = await worker.fetch(get(`https://w.dev/search?q=runaway+${i}`, headers), env);
      statuses.push(res.status);
    }

    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses.filter((s) => s === 429).length).toBeGreaterThan(0);
  });

  it('enforces a daily budget across all users, with its own error code', async () => {
    // The guard that actually protects a one-time 2,500-search free credit.
    vi.stubGlobal('caches', cacheStub());
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ organic: [] }), { status: 200 })));
    const env = { SERPER_API_KEY: 'k', SEARCH_RATE: kvStub(), SEARCH_DAILY_BUDGET: '3' };

    const bodies = [];
    for (let i = 0; i < 5; i++) {
      // Different IPs — the daily budget is global, not per-client.
      const res = await worker.fetch(get(`https://w.dev/search?q=day+budget+${i}`, { 'CF-Connecting-IP': `198.51.100.${i}` }), env);
      bodies.push({ status: res.status, body: await res.json() });
    }

    expect(bodies.slice(0, 3).every((b) => b.status === 200)).toBe(true);
    expect(bodies[3].status).toBe(429);
    // Distinguishable from rate-limiting: retrying in a minute will not help.
    expect(bodies[3].body.error).toBe('daily-budget-exhausted');
    expect(bodies[3].body.retryAfterHint).toBe('tomorrow');
  });

  it('lets a cache hit through even when the daily budget is spent', async () => {
    // Cache hits cost no Serper credit, so refusing them would degrade the app
    // for no saving.
    vi.stubGlobal('caches', cacheStub());
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({
      organic: [{ link: 'https://example.org/a', title: 'A', snippet: 'a' }],
    }), { status: 200 })));
    const env = { SERPER_API_KEY: 'k', SEARCH_RATE: kvStub(), SEARCH_DAILY_BUDGET: '1' };

    const first = await worker.fetch(get('https://w.dev/search?q=repeated+query'), env);
    expect(first.status).toBe(200);

    // Budget is now spent, but this exact query is cached.
    const cached = await worker.fetch(get('https://w.dev/search?q=repeated+query'), env);
    expect(cached.status).toBe(200);
    expect((await cached.json()).cached).toBe(true);

    // A different query is correctly refused.
    const fresh = await worker.fetch(get('https://w.dev/search?q=some+other+query'), env);
    expect(fresh.status).toBe(429);
  });

  it('fails open when the rate-limit namespace is not bound', async () => {
    // A missing KV binding must not take search offline.
    vi.stubGlobal('caches', cacheStub());
    vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ organic: [] }), { status: 200 })));

    const res = await worker.fetch(get('https://w.dev/search?q=no+kv+bound'), { SERPER_API_KEY: 'k' });

    expect(res.status).toBe(200);
  });

  it('does not forward the upstream error body', async () => {
    vi.stubGlobal('caches', cacheStub());
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Serper says: bad key sk-live-123', { status: 403 })));

    const res = await worker.fetch(get('https://w.dev/search?q=main+idea'), { SERPER_API_KEY: 'k' });
    const body = await res.json();

    expect(res.status).toBe(502);
    expect(JSON.stringify(body)).not.toContain('sk-live-123');
    expect(body.error).toBe('search-provider-error');
  });
});
