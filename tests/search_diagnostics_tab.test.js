import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

// The Web-search tab exists because a missing search transport is invisible:
// every failure in the chain is caught and flattened to "no results", so the
// UI shows nothing and the console shows nothing. These tests pin the two
// things the tab has to get right — it must say when NO transport is
// configured, and it must not claim a transport that isn't there.

let WebSearchProvider;
let originalCanvasDescriptor;

function forceCanvas(value) {
  Object.defineProperty(WebSearchProvider, '_isCanvas', { configurable: true, get: () => value });
}

function resetProvider() {
  WebSearchProvider._serperProxyUrl = null;
  WebSearchProvider._serperProxyMode = null;
  WebSearchProvider._serperAvailable = true;
  WebSearchProvider._serperConsecutiveFailures = 0;
  WebSearchProvider._serperCooldownUntil = 0;
  WebSearchProvider._serperInitialized = false;
  window.__alloSearchTrace = [];
}

beforeAll(() => {
  loadAlloModule('ai_backend_module.js');
  WebSearchProvider = window.WebSearchProvider;
  if (!WebSearchProvider) throw new Error('WebSearchProvider failed to register');
  originalCanvasDescriptor = Object.getOwnPropertyDescriptor(WebSearchProvider, '_isCanvas');
});

afterEach(() => {
  if (WebSearchProvider && originalCanvasDescriptor) {
    Object.defineProperty(WebSearchProvider, '_isCanvas', originalCanvasDescriptor);
  }
  resetProvider();
  delete window.ALLOFLOW_CANVAS_SEARCH_PROXY;
  delete window.ALLOFLOW_FUNCTIONS_HOST;
  delete window.__alloSearchSelfTest;
  window.localStorage.removeItem('alloflow_ai_config');
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('search transport reporting', () => {
  it('reports NO transport in Canvas with no proxy and no direct key', () => {
    forceCanvas(true);
    resetProvider();

    const t = WebSearchProvider.describeTransports();

    // This is the exact state that shipped after the maintainer proxy was
    // retired, and the state in which "Find standards" returns nothing.
    expect(t.isCanvas).toBe(true);
    expect(t.proxyUrl).toBeNull();
    expect(t.directSerperConfigured).toBe(false);
    expect(t.searxngEligible).toBe(false);
    expect(t.duckduckgoEligible).toBe(false);
    expect(t.anyTransport).toBe(false);
  });

  it('counts a user-supplied Serper key as a transport in Canvas', () => {
    forceCanvas(true);
    resetProvider();
    window.localStorage.setItem('alloflow_ai_config', JSON.stringify({ serperApiKey: 'abcd1234efgh5678' }));

    const t = WebSearchProvider.describeTransports();

    expect(t.directSerperConfigured).toBe(true);
    expect(t.anyTransport).toBe(true);
    // The key itself must never be echoed back into diagnostics output.
    expect(t.directSerperKeyHint).toBe('…5678');
    expect(JSON.stringify(t)).not.toContain('abcd1234efgh5678');
  });

  it('still reports transports outside Canvas, where SearXNG/DDG are eligible', () => {
    forceCanvas(false);
    resetProvider();

    const t = WebSearchProvider.describeTransports();

    expect(t.searxngEligible).toBe(true);
    expect(t.duckduckgoEligible).toBe(true);
    expect(t.anyTransport).toBe(true);
  });
});

describe('selfTest', () => {
  it('names the missing transport instead of reporting an empty search', async () => {
    forceCanvas(true);
    resetProvider();

    const res = await WebSearchProvider.selfTest('grade 3 main idea standard');

    expect(res.ok).toBe(false);
    expect(res.reason).toBe('no-transport');
    expect(res.message).toMatch(/Serper|transport/i);
    // "no transport" must be distinguishable from "searched and found nothing".
    expect(res.reason).not.toBe('no-results');
  });

  it('reports results when a transport answers', async () => {
    forceCanvas(true);
    resetProvider();
    window.localStorage.setItem('alloflow_ai_config', JSON.stringify({ serperApiKey: 'test-key-1234' }));
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        credits: 2490,
        organic: [{
          link: 'https://www.thecorestandards.org/ELA-Literacy/RI/3/2/',
          title: 'CCSS.ELA-LITERACY.RI.3.2',
          snippet: 'Determine the main idea of a text.',
        }],
      }),
    })));

    const res = await WebSearchProvider.selfTest('grade 3 main idea standard');

    expect(res.ok).toBe(true);
    expect(res.source).toBe('Serper (direct)');
    expect(res.sample[0].url).toBe('https://www.thecorestandards.org/ELA-Literacy/RI/3/2/');
  });

  it('sends the key as a header, never in the URL or body', async () => {
    forceCanvas(true);
    resetProvider();
    window.localStorage.setItem('alloflow_ai_config', JSON.stringify({ serperApiKey: 'secret-key-9999' }));
    const fetchMock = vi.fn(async () => ({ ok: true, status: 200, json: async () => ({ organic: [] }) }));
    vi.stubGlobal('fetch', fetchMock);

    await WebSearchProvider.selfTest('anything');

    const [url, options] = fetchMock.mock.calls[0];
    expect(String(url)).toBe('https://google.serper.dev/search');
    expect(String(url)).not.toContain('secret-key-9999');
    expect(options.headers['X-API-KEY']).toBe('secret-key-9999');
    expect(options.body).not.toContain('secret-key-9999');
  });

  it('is disabled by the kill switch', () => {
    forceCanvas(true);
    resetProvider();
    window.localStorage.setItem('alloflow_ai_config', JSON.stringify({ serperApiKey: 'abcd1234' }));
    window.ALLOFLOW_DISABLE_DIRECT_SERPER = true;
    try {
      expect(WebSearchProvider.describeTransports().directSerperConfigured).toBe(false);
    } finally {
      delete window.ALLOFLOW_DISABLE_DIRECT_SERPER;
    }
  });
});

describe('search trace', () => {
  it('records why a search produced nothing', async () => {
    forceCanvas(true);
    resetProvider();

    await WebSearchProvider.search('a query long enough to pass the guard', 3);

    const events = (window.__alloSearchTrace || []).map(e => e.event);
    expect(events).toContain('search-start');
    expect(events).toContain('search-empty');
    const empty = window.__alloSearchTrace.find(e => e.event === 'search-empty');
    expect(empty.detail).toMatch(/NO SEARCH TRANSPORT CONFIGURED/);
  });

  it('stays capped so a long session cannot grow it without bound', async () => {
    forceCanvas(true);
    resetProvider();

    for (let i = 0; i < 40; i++) {
      await WebSearchProvider.search(`query number ${i} with enough length`, 1);
    }

    expect(window.__alloSearchTrace.length).toBeLessThanOrEqual(60);
  });
});

describe('retired CSE diagnostic', () => {
  it('no longer throws TypeError on a helper that never existed', async () => {
    // testCSE() called this._loadCSEKeys() — undefined in this module since it
    // was written — so the "diagnostic" died on its first line.
    expect(WebSearchProvider._loadCSEKeys).toBeUndefined();
    const res = await WebSearchProvider.testCSE();
    expect(res.error).toBe('cse-not-supported');
    expect(res.message).toMatch(/selfTest/);
  });
});
