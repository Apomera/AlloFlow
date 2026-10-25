import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let search;
const policy = allowExternalSearch => ({ version: 1, connections: [], allowExternalSearch });
beforeAll(() => { loadAlloModule('ai_backend_module.js'); search = window.WebSearchProvider; });
afterEach(() => { delete window.ALLOFLOW_MANAGED_AI_POLICY; delete window.__alloFirebase; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function configureProxy() {
  // Keep mutable provider configuration isolated without replacing its methods.
  const scoped = Object.create(search);
  Object.defineProperties(scoped, {
    _isCanvas: { value: false }, _serperProxyUrl: { value: 'https://synthetic-school.example/api/searchProxy' },
    _serperProxyMode: { value: 'authenticated-post' }, _serperAvailable: { value: true },
    _initSearchProxy: { value: () => {} }, _serperDirectKey: { value: () => '' },
  });
  return scoped;
}
function headerBarrier() {
  let enter, release;
  const entered = new Promise(r => { enter = r; }); const resumed = new Promise(r => { release = r; });
  window.__alloFirebase = { getFunctionSecurityHeaders: async () => { enter(); await resumed; return { Authorization: 'Bearer synthetic-auth' }; } };
  return { entered, release };
}
describe('WebSearch managed policy dispatch races', () => {
  it.each([false, true])('rejects policy replacement while Firebase headers resolve (new allow=%s)', async allowed => {
    window.ALLOFLOW_MANAGED_AI_POLICY = policy(true); const gate = headerBarrier(); const scoped = configureProxy();
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const pending = scoped._fetchSerper('Synthetic planning topic', 3); const caught = pending.catch(e => e);
    await gate.entered; window.ALLOFLOW_MANAGED_AI_POLICY = policy(allowed); gate.release();
    expect(await caught).toMatchObject({ code: 'managed-ai-blocked' }); expect(fetch).not.toHaveBeenCalled();
  });
  it('rejects in-place revocation during the authenticated proxy header wait', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = policy(true); const gate = headerBarrier(); const scoped = configureProxy();
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const pending = scoped._fetchSerper('Synthetic planning topic', 3); const caught = pending.catch(e => e);
    await gate.entered; window.ALLOFLOW_MANAGED_AI_POLICY.allowExternalSearch = false; gate.release();
    expect(await caught).toMatchObject({ code: 'managed-ai-blocked' }); expect(fetch).not.toHaveBeenCalled();
  });
  it('does not dispatch a search queued before a managed policy was installed', async () => {
    const gate = headerBarrier(); const scoped = configureProxy(); const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const pending = scoped._fetchSerper('Synthetic planning topic', 3); const caught = pending.catch(e => e);
    await gate.entered; window.ALLOFLOW_MANAGED_AI_POLICY = policy(true); gate.release();
    expect(await caught).toMatchObject({ code: 'managed-ai-blocked' }); expect(fetch).not.toHaveBeenCalled();
  });
  it('does not fall back to another search transport after revocation', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = policy(true); const gate = headerBarrier(); const scoped = configureProxy();
    const availability = vi.fn(); const duck = vi.fn(); Object.defineProperties(scoped, { _isSearXNGAvailable: { value: availability }, _fetchDuckDuckGo: { value: duck } });
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const pending = scoped.searchTopic('Synthetic planning topic', 3); const caught = pending.catch(e => e);
    await gate.entered; window.ALLOFLOW_MANAGED_AI_POLICY = policy(false); gate.release();
    expect(await caught).toMatchObject({ code: 'managed-ai-blocked' }); expect(fetch).not.toHaveBeenCalled();
    expect(availability).not.toHaveBeenCalled(); expect(duck).not.toHaveBeenCalled();
  });
  it('rechecks direct Serper policy after settings callbacks', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = policy(true); const scoped = Object.create(search);
    scoped._serperDirectKey = () => { window.ALLOFLOW_MANAGED_AI_POLICY.allowExternalSearch = false; return 'synthetic-key'; };
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(scoped._fetchSerperDirect('Synthetic planning topic', 3)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('rechecks a self-hosted search after URL construction', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = policy(true); const scoped = Object.create(search);
    scoped.searxngUrl = { toString: () => { window.ALLOFLOW_MANAGED_AI_POLICY.allowExternalSearch = false; return 'https://synthetic-search.example'; } };
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    await expect(scoped._fetchSearXNG('Synthetic planning topic', 3)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(fetch).not.toHaveBeenCalled();
  });
  it('allows an unchanged approved search and preserves its authenticated request shape', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = policy(true); const scoped = configureProxy();
    window.__alloFirebase = { getFunctionSecurityHeaders: async () => ({ Authorization: 'Bearer synthetic-auth' }) };
    const fetch = vi.fn(async () => ({ ok: true, json: async () => ({ organic: [] }) })); vi.stubGlobal('fetch', fetch);
    await expect(scoped._fetchSerper('Synthetic planning topic', 3)).resolves.toEqual([]);
    expect(fetch).toHaveBeenCalledOnce(); expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer synthetic-auth');
    expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ query: 'Synthetic planning topic', num: 3 });
  });
});
