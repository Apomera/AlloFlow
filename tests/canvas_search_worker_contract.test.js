import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { loadAlloModule } from './setup.js';

// End-to-end contract between the two halves of the Canvas search path:
//   WebSearchProvider (canvas-compat-get) -> Worker GET /search -> Serper
//
// These are written and deployed separately, so a drift in the query params or
// the response envelope would silently produce "no results" — which is exactly
// the failure mode that made the retired Firebase proxy's removal invisible.
// The Worker's real handler serves the real client here; nothing is faked
// except Serper itself.

let WebSearchProvider;
let worker;
let originalCanvasDescriptor;

const WORKER_URL = 'https://alloflow-catalog-submit.aaron-pomeranz.workers.dev/search';

beforeAll(async () => {
  loadAlloModule('ai_backend_module.js');
  WebSearchProvider = window.WebSearchProvider;
  originalCanvasDescriptor = Object.getOwnPropertyDescriptor(WebSearchProvider, '_isCanvas');

  const src = fs.readFileSync(
    path.resolve(process.cwd(), 'catalog/cloudflare-worker/src/index.js'),
    'utf8',
  );
  const mod = await import(`data:text/javascript;base64,${Buffer.from(src).toString('base64')}`);
  worker = mod.default;
});

afterEach(() => {
  if (WebSearchProvider && originalCanvasDescriptor) {
    Object.defineProperty(WebSearchProvider, '_isCanvas', originalCanvasDescriptor);
  }
  WebSearchProvider._serperProxyUrl = null;
  WebSearchProvider._serperProxyMode = null;
  WebSearchProvider._serperAvailable = true;
  WebSearchProvider._serperConsecutiveFailures = 0;
  WebSearchProvider._serperCooldownUntil = 0;
  WebSearchProvider._serperInitialized = false;
  window.__alloSearchTrace = [];
  delete window.ALLOFLOW_CANVAS_SEARCH_PROXY;
  window.localStorage.removeItem('alloflow_ai_config');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

function forceCanvas(value) {
  Object.defineProperty(WebSearchProvider, '_isCanvas', { configurable: true, get: () => value });
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

// Route the client's fetch into the Worker's real handler; let Serper's own
// endpoint be the only stub.
function wireClientToWorker(env, serperOrganic) {
  const serperCalls = [];
  vi.stubGlobal('caches', cacheStub());
  vi.stubGlobal('fetch', vi.fn(async (input, options) => {
    const url = String(input && input.url ? input.url : input);

    if (url.startsWith('https://google.serper.dev/')) {
      serperCalls.push({ url, options });
      return new Response(JSON.stringify({ organic: serperOrganic }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    if (url.startsWith(WORKER_URL)) {
      return worker.fetch(new Request(url, { method: 'GET', headers: { 'CF-Connecting-IP': '203.0.113.5' } }), env);
    }
    throw new Error(`Unexpected fetch to ${url}`);
  }));
  return serperCalls;
}

describe('Canvas -> Worker -> Serper', () => {
  it('returns grounded results through the real Worker handler', async () => {
    forceCanvas(true);
    window.ALLOFLOW_CANVAS_SEARCH_PROXY = WORKER_URL;
    const serperCalls = wireClientToWorker({ SERPER_API_KEY: 'server-side-secret' }, [
      {
        link: 'https://www.thecorestandards.org/ELA-Literacy/RI/3/2/',
        title: 'CCSS.ELA-LITERACY.RI.3.2',
        snippet: 'Determine the main idea of a text; recount the key details.',
      },
    ]);

    const out = await WebSearchProvider.search(
      'Find the CCSS standard for grade 3 main idea.',
      3,
      'CCSS grade 3 main idea',
    );

    // The client got real, attributable results — the thing that has been
    // missing in Canvas since the old proxy was retired.
    expect(out.results).toHaveLength(1);
    expect(out.source).toBe('Serper');
    expect(out.groundingMetadata.groundingChunks[0].web.uri)
      .toBe('https://www.thecorestandards.org/ELA-Literacy/RI/3/2/');
    expect(out.contextPrompt).toContain('Determine the main idea');

    // The key stayed server-side: the browser leg never carries it.
    expect(serperCalls).toHaveLength(1);
    expect(serperCalls[0].options.headers['X-API-KEY']).toBe('server-side-secret');
  });

  it('sends the query as ?q= and the cap as ?num=, which is what the Worker reads', async () => {
    forceCanvas(true);
    window.ALLOFLOW_CANVAS_SEARCH_PROXY = WORKER_URL;
    wireClientToWorker({ SERPER_API_KEY: 'k' }, [
      { link: 'https://example.org/a', title: 'A', snippet: 'a' },
    ]);

    await WebSearchProvider.search('anything at all here', 3, 'orbital period & seasons');

    // The '&' in the query must survive encoding, or the Worker sees a
    // truncated query and returns results for the wrong thing.
    const workerCall = fetch.mock.calls.find(([u]) => String(u).startsWith(WORKER_URL));
    expect(String(workerCall[0])).toContain('orbital%20period%20%26%20seasons');
    expect(String(workerCall[0])).toMatch(/num=3(&|$)/);
    expect(String(workerCall[1] && workerCall[1].method || 'GET').toUpperCase()).toBe('GET');
  });

  it('uses GET with no custom headers, so the browser sends no preflight', async () => {
    // Canvas is a cross-origin caller. Any custom request header would force a
    // CORS preflight, and a failed OPTIONS is another silent "no results".
    forceCanvas(true);
    window.ALLOFLOW_CANVAS_SEARCH_PROXY = WORKER_URL;
    wireClientToWorker({ SERPER_API_KEY: 'k' }, []);

    await WebSearchProvider.search('a query for the preflight check', 3);

    const [, options] = fetch.mock.calls.find(([u]) => String(u).startsWith(WORKER_URL));
    expect(String(options.method || 'GET').toUpperCase()).toBe('GET');
    expect(Object.keys(options.headers || {})).toEqual(['Accept']);
    expect(options.body).toBeUndefined();
  });

  it('falls back to a teacher key when the shared budget is exhausted', async () => {
    // The Worker refuses with 429 once the daily budget is spent. A teacher who
    // supplied their own key should keep working rather than inherit the
    // shared limit.
    forceCanvas(true);
    window.ALLOFLOW_CANVAS_SEARCH_PROXY = WORKER_URL;
    window.localStorage.setItem('alloflow_ai_config', JSON.stringify({ serperApiKey: 'teacher-own-key' }));

    const kv = (() => {
      const store = new Map([[`searchday:${new Date().toISOString().slice(0, 10)}`, '999']]);
      return { get: async (k) => store.get(k) ?? null, put: async (k, v) => { store.set(k, v); } };
    })();

    const serperCalls = wireClientToWorker(
      { SERPER_API_KEY: 'server-side-secret', SEARCH_RATE: kv, SEARCH_DAILY_BUDGET: '10' },
      [{ link: 'https://example.org/b', title: 'B', snippet: 'b' }],
    );

    const out = await WebSearchProvider.search('a query after the budget is gone', 3);

    expect(out.results).toHaveLength(1);
    expect(out.source).toBe('Serper (direct)');
    // Only the teacher's own key was used for the successful call.
    expect(serperCalls).toHaveLength(1);
    expect(serperCalls[0].options.headers['X-API-KEY']).toBe('teacher-own-key');

    const events = window.__alloSearchTrace.map(e => e.event);
    expect(events).toContain('serper-proxy-fail');
    expect(events).toContain('serper-direct-ok');
  });

  it('reports the proxy as a transport once the endpoint is configured', () => {
    forceCanvas(true);
    window.ALLOFLOW_CANVAS_SEARCH_PROXY = WORKER_URL;

    const t = WebSearchProvider.describeTransports();

    expect(t.proxyMode).toBe('canvas-compat-get');
    expect(t.proxyUrl).toBe(WORKER_URL);
    expect(t.anyTransport).toBe(true);
    // No teacher key needed for the default path to work.
    expect(t.directSerperConfigured).toBe(false);
  });
});
