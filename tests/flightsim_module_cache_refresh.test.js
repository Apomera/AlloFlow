import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import vm from 'node:vm';

const origin = 'https://desktop.test';
const scope = origin + '/app/';
const workerTemplate = fs.readFileSync('desktop/web-app/public/sw.js', 'utf8');
const worker = workerTemplate.replace(/__RELEASE_ID__/g, 'new-release')
  .replace(/__BUILD_TS__/g, '1000').replace('__PRECACHE_PATHS__', '[]');
const moduleUrl = new URL('stem_lab/stem_tool_flightsim.js?v=unchanged-shell-pin', scope).href;

function harness(fetchImplementation) {
  const handlers = new Map(), entries = new Map();
  const urlOf = request => typeof request === 'string' ? request : request.url;
  const cache = {
    match: async request => entries.get(urlOf(request))?.clone(),
    put: vi.fn(async (request, response) => { entries.set(urlOf(request), response.clone()); }),
  };
  const fetch = vi.fn(fetchImplementation);
  const self = { location: { origin }, registration: { scope },
    addEventListener: (name, handler) => handlers.set(name, handler) };
  vm.runInNewContext(worker, { self, URL, Response, console: { log() {} }, fetch,
    caches: { open: async () => cache, match: cache.match } });
  return { fetch, cache,
    seed: (url, body) => entries.set(url, new Response(body)),
    read: url => entries.get(url)?.clone(),
    request: async url => {
      let response;
      handlers.get('fetch')({ request: new Request(url), respondWith: promise => { response = promise; } });
      if (!response) throw new Error('Expected a same-origin worker response for ' + url);
      return response;
    },
  };
}

describe('SkySchool modules after a service-worker release change', () => {
  it('revalidates an unchanged module URL instead of seeding the new worker with old HTTP-cached bytes', async () => {
    // The old SW cache was purged, but Chromium can still have a fresh HTTP
    // entry for the same ?v= URL. A normal fetch would return those old bytes.
    const oldBody = '/* older SkySchool module in browser HTTP cache */';
    const newBody = '/* current SkySchool module on the desktop server */';
    const app = harness(async (_request, options) => new Response(
      options?.cache === 'no-cache' ? newBody : oldBody,
      { headers: { 'Cache-Control': 'public, max-age=3600' } },
    ));
    const response = await app.request(moduleUrl);
    expect(await response.text()).toBe(newBody);
    expect(app.fetch).toHaveBeenCalledOnce();
    expect(app.fetch.mock.calls[0][1]).toEqual(expect.objectContaining({ cache: 'no-cache' }));
    expect(await app.read(moduleUrl).text()).toBe(newBody);
    expect(app.cache.put).toHaveBeenCalledOnce();
  });

  it('uses the current worker cache for a warm pinned module without contacting the network', async () => {
    const app = harness(async () => { throw new Error('A warm boot must not need network access'); });
    app.seed(moduleUrl, '/* validated current SkySchool module */');
    expect(await (await app.request(moduleUrl)).text()).toBe('/* validated current SkySchool module */');
    expect(app.fetch).not.toHaveBeenCalled();
    expect(app.cache.put).not.toHaveBeenCalled();
  });

  it('retains the existing offline cache fallback for an unversioned same-origin asset', async () => {
    const assetUrl = new URL('audio_bank.json', scope).href;
    const app = harness(async () => { throw new TypeError('Network unavailable'); });
    app.seed(assetUrl, '{"availableOffline":true}');
    const response = await app.request(assetUrl);
    expect(await response.json()).toEqual({ availableOffline: true });
    expect(app.fetch).toHaveBeenCalledOnce();
    expect(app.cache.put).not.toHaveBeenCalled();
  });
});
