import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash, webcrypto } from 'node:crypto';
import { loadAlloModule } from './setup.js';

let Provider, Search;
beforeAll(() => { loadAlloModule('ai_backend_module.js'); Provider = window.AIProvider; Search = window.WebSearchProvider; });
afterEach(() => {
  delete window.ALLOFLOW_MANAGED_AI_POLICY; delete window.__alloFirebase; delete window._sdTurbo;
  window.WebSearchProvider = Search; vi.restoreAllMocks(); vi.unstubAllGlobals(); localStorage.clear();
});
function barrier() {
  let enter, release;
  const entered = new Promise(resolve => { enter = resolve; }), resumed = new Promise(resolve => { release = resolve; });
  return { entered, release, async wait() { enter(); await resumed; } };
}
function control() {
  let allowed = true;
  const beforeRequest = vi.fn(() => { if (!allowed) throw Object.assign(new Error('synthetic clinical denial'), { code: 'PROTECTED_REMOTE_NOT_APPROVED' }); });
  return { controls: { beforeRequest }, revoke() { allowed = false; }, allow() { allowed = true; } };
}
const response = (text = 'synthetic result') => ({ ok: true, status: 200, json: async () => ({
  choices: [{ message: { content: text } }], candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }], content: [{ text }], data: []
}) });
function provider(extra = {}) {
  const transport = vi.fn(async (_url, options) => { options.beforeRequest(); return response(); });
  const ai = new Provider({ backend: 'custom', baseUrl: 'https://synthetic-approved.example', apiKey: 'synthetic-key',
    models: { default: 'synthetic-primary', fallback: 'synthetic-fallback' }, fetchWithRetry: transport, debugLog() {}, warnLog() {}, ...extra });
  return { ai, transport };
}
function digestBarrier() {
  const gate = barrier(); let first = true;
  vi.stubGlobal('crypto', { subtle: { async digest(...args) { if (first) { first = false; await gate.wait(); } return webcrypto.subtle.digest(...args); } } });
  window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [{ backend: 'custom', baseUrl: 'https://synthetic-approved.example',
    apiKeySha256: [createHash('sha256').update('synthetic-key').digest('hex')] }], allowExternalSearch: false };
  return gate;
}
function proxySearch() {
  const scoped = Object.create(Search);
  Object.defineProperties(scoped, {
    _isCanvas: { value: false }, _serperProxyUrl: { value: 'https://synthetic-school.example/api/searchProxy' },
    _serperProxyMode: { value: 'authenticated-post' }, _serperAvailable: { value: true, writable: true },
    _initSearchProxy: { value: () => {} }, _serperDirectKey: { value: () => '' },
  });
  return scoped;
}

describe('AIProvider clinical request controls', () => {
  it('blocks clinical revocation during credential hashing without changing managed connection policy', async () => {
    const gate = digestBarrier(), h = provider(), c = control();
    const pending = h.ai.generateText('SYNTHETIC CLINICAL PROMPT', { requestControls: c.controls }).catch(error => error);
    await gate.entered; c.revoke(); gate.release();
    expect(await pending).toMatchObject({ code: 'managed-ai-blocked' }); expect(h.transport).not.toHaveBeenCalled();
  });
  it('captures the original guard before awaiting and ignores replacement in the caller options', async () => {
    const gate = digestBarrier(), h = provider(), c = control(), options = { requestControls: c.controls };
    const pending = h.ai.generateText('SYNTHETIC CLINICAL PROMPT', options).catch(error => error);
    await gate.entered; c.revoke(); c.controls.beforeRequest = () => true; options.requestControls = null; gate.release();
    expect(await pending).toMatchObject({ code: 'managed-ai-blocked' }); expect(h.transport).not.toHaveBeenCalled();
  });
  it.each([false, 4, 'guard', {}, { beforeRequest: false }, { beforeRequest: () => true, extra: true },
    Object.create({ beforeRequest: () => true })])(
    'rejects malformed request controls %s before dispatch', async requestControls => {
      const h = provider(); await expect(h.ai.generateText('synthetic prompt', { requestControls })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
      expect(h.transport).not.toHaveBeenCalled();
    });
  it.each([() => false, () => null, () => Promise.resolve(true), () => Promise.reject(new Error('synthetic asynchronous denial'))])(
    'requires a synchronous successful request guard', async beforeRequest => {
      const h = provider(); await expect(h.ai.generateText('synthetic prompt', { requestControls: { beforeRequest } })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
      expect(h.transport).not.toHaveBeenCalled();
    });
  it('rejects a requestControls accessor without invoking it', async () => {
    const h = provider(), getter = vi.fn();
    const options = Object.defineProperty({}, 'requestControls', { enumerable: true, get: getter });
    await expect(h.ai.generateText('synthetic prompt', options)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(getter).not.toHaveBeenCalled(); expect(h.transport).not.toHaveBeenCalled();
  });
  it('rejects a beforeRequest accessor without invoking it', async () => {
    const h = provider(), getter = vi.fn();
    const controls = Object.defineProperty({}, 'beforeRequest', { enumerable: true, get: getter });
    await expect(h.ai.generateText('synthetic prompt', { requestControls: controls })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(getter).not.toHaveBeenCalled(); expect(h.transport).not.toHaveBeenCalled();
  });
  it('rejects inherited request controls rather than silently dropping the restriction', async () => {
    const h = provider(), getter = vi.fn();
    const inherited = Object.defineProperty({}, 'requestControls', { get: getter });
    await expect(h.ai.generateText('synthetic prompt', Object.create(inherited))).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(getter).not.toHaveBeenCalled(); expect(h.transport).not.toHaveBeenCalled();
  });
  it('keeps independent concurrent request controls separate and checks result acceptance', async () => {
    const gate = barrier(), a = control(), b = control();
    const h = provider({ fetchWithRetry: vi.fn(async (_url, options) => {
      options.beforeRequest(); if (options.body.includes('SYNTHETIC FIRST')) await gate.wait(); return response();
    }) });
    const first = h.ai.generateText('SYNTHETIC FIRST', { requestControls: a.controls }).catch(error => error);
    await gate.entered; a.revoke();
    await expect(h.ai.generateText('SYNTHETIC SECOND', { requestControls: b.controls })).resolves.toBe('synthetic result');
    gate.release(); expect(await first).toMatchObject({ code: 'managed-ai-blocked' });
  });
  it('rechecks clinical permission on each retry transport attempt', async () => {
    const gate = barrier(), c = control(), actualSend = vi.fn();
    const h = provider({ fetchWithRetry: async (_url, options) => {
      options.beforeRequest(); actualSend(); await gate.wait(); options.beforeRequest(); actualSend(); return response();
    } });
    const pending = h.ai.generateText('synthetic prompt', { requestControls: c.controls }).catch(error => error);
    await gate.entered; c.revoke(); gate.release(); expect(await pending).toMatchObject({ code: 'managed-ai-blocked' });
    expect(actualSend).toHaveBeenCalledOnce();
  });
  it('does not issue a fallback model request after clinical permission is revoked', async () => {
    const c = control(), transport = vi.fn(async (_url, options) => { options.beforeRequest(); c.revoke(); throw new Error('HTTP 429'); });
    const h = provider({ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', fetchWithRetry: transport });
    await expect(h.ai.generateText('synthetic prompt', { requestControls: c.controls })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(transport).toHaveBeenCalledOnce();
  });
  it('preserves clinical controls through nested Gemini JSON repair', async () => {
    const c = control(), transport = vi.fn(async (_url, options) => {
      options.beforeRequest(); c.revoke(); return { ok: true, json: async () => ({ candidates: [{ finishReason: 'MALFORMED_FUNCTION_CALL', content: { parts: [{ text: '{synthetic broken' }] } }] }) };
    });
    const h = provider({ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', fetchWithRetry: transport });
    await expect(h.ai.generateText('synthetic json prompt', { json: true, requestControls: c.controls })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(transport).toHaveBeenCalledOnce();
  });
  it('does not downgrade a terminal stream denial to a non-stream request', async () => {
    const c = control(), transport = vi.fn(async () => { throw Object.assign(new Error('synthetic denied attempt'), { code: 'managed-ai-blocked' }); });
    const h = provider({ backend: 'lmstudio', baseUrl: 'http://localhost:1234', fetchWithRetry: transport });
    await expect(h.ai.generateText('synthetic prompt', { onProgress() {}, requestControls: c.controls })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(transport).toHaveBeenCalledOnce();
  });
  it('does not swallow terminal local JSON repair denial', async () => {
    const c = control(), transport = vi.fn(async (_url, options) => {
      options.beforeRequest(); if (transport.mock.calls.length === 2) throw Object.assign(new Error('synthetic denied repair'), { code: 'managed-ai-blocked' });
      return response('{synthetic broken');
    });
    const h = provider({ backend: 'lmstudio', baseUrl: 'http://localhost:1234', fetchWithRetry: transport });
    await expect(h.ai.generateText('synthetic json prompt', { json: true, requestControls: c.controls })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(transport).toHaveBeenCalledTimes(2);
  });
  it('preserves AbortError from a request guard', async () => {
    const h = provider(); await expect(h.ai.generateText('synthetic prompt', { requestControls: { beforeRequest() {
      throw Object.assign(new Error('synthetic cancelled'), { name: 'AbortError' });
    } } })).rejects.toMatchObject({ name: 'AbortError' }); expect(h.transport).not.toHaveBeenCalled();
  });
  it('does not turn terminal nested safety denial into a safe-content result', async () => {
    const c = control(), h = provider({ fetchWithRetry: async () => {
      throw Object.assign(new Error('synthetic terminal denial'), { code: 'managed-ai-blocked' });
    } });
    await expect(h.ai.checkSafety('synthetic content', { requestControls: c.controls })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
  });
  it('keeps image-edit denial terminal even if image generation is disabled concurrently', async () => {
    const c = control(), h = provider();
    h.ai._openaiEditImage = async () => {
      localStorage.setItem('alloflow_ai_image_generation_enabled', 'false');
      throw Object.assign(new Error('synthetic terminal denial'), { code: 'managed-ai-blocked' });
    };
    await expect(h.ai.editImage('synthetic edit', 'c3ludGhldGlj', { requestControls: c.controls })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
  });
  it('keeps local image handoff denial terminal when image generation becomes disabled', async () => {
    const c = control(), h = provider({ imageProvider: 'sd-local' });
    window._sdTurbo = { ready: true, generate: async () => {
      localStorage.setItem('alloflow_ai_image_generation_enabled', 'false');
      throw Object.assign(new Error('synthetic terminal denial'), { code: 'managed-ai-blocked' });
    } };
    await expect(h.ai.generateImage('synthetic image', { requestControls: c.controls })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(h.transport).not.toHaveBeenCalled();
  });
  it.each([
    ['generateImage', (ai, controls) => ai.generateImage('synthetic image', { requestControls: controls })],
    ['editImage', (ai, controls) => ai.editImage('synthetic image', 'c3ludGhldGlj', { requestControls: controls })],
    ['analyzeImage', (ai, controls) => ai.analyzeImage('synthetic image', 'c3ludGhldGlj', { requestControls: controls })],
    ['analyzeImages', (ai, controls) => ai.analyzeImages('synthetic images', [{ data: 'c3ludGhldGlj' }], { requestControls: controls })],
    ['analyzeAudio', (ai, controls) => ai.analyzeAudio('synthetic audio', 'c3ludGhldGlj', { requestControls: controls })],
    ['textToSpeech', (ai, controls) => ai.textToSpeech('synthetic speech', { requestControls: controls })],
  ])('denies %s media permission before any native or custom transport', async (_name, invoke) => {
    const c = control(), h = provider(), nativeFetch = vi.fn(); vi.stubGlobal('fetch', nativeFetch); c.revoke();
    await expect(invoke(h.ai, c.controls)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(h.transport).not.toHaveBeenCalled(); expect(nativeFetch).not.toHaveBeenCalled();
  });
  it('blocks queued speech at native dispatch after clinical revocation', async () => {
    const c = control(), gate = barrier(), nativeFetch = vi.fn(); vi.stubGlobal('fetch', nativeFetch);
    const h = provider({ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' });
    const queue = gate.wait(); h.ai._ttsQueue = queue;
    const pending = h.ai.textToSpeech('synthetic speech', { requestControls: c.controls }).catch(error => error);
    await vi.waitFor(() => expect(h.ai._ttsQueue).not.toBe(queue)); c.revoke(); gate.release();
    expect(await pending).toMatchObject({ code: 'managed-ai-blocked' }); expect(nativeFetch).not.toHaveBeenCalled();
  });
  it('permits an unchanged guarded request and strips internal controls from the native request', async () => {
    const c = control(), nativeFetch = vi.fn(async () => response()); vi.stubGlobal('fetch', nativeFetch);
    const h = provider({ fetchWithRetry: undefined });
    await expect(h.ai.generateText('synthetic prompt', { requestControls: c.controls })).resolves.toBe('synthetic result');
    expect(nativeFetch).toHaveBeenCalledOnce(); expect(nativeFetch.mock.calls[0][1]).not.toHaveProperty('beforeRequest');
    expect(nativeFetch.mock.calls[0][1]).not.toHaveProperty('requestControls');
  });
});

describe('clinical controls through separate public-search transport', () => {
  it('preserves shared failure counts and cooldown across independently controlled searches', async () => {
    const c = control(), search = proxySearch();
    Object.defineProperties(search, { _isSearXNGAvailable: { value: async () => false }, _fetchDuckDuckGo: { value: async () => [] } });
    window.__alloFirebase = { getFunctionSecurityHeaders: async () => ({ Authorization: 'Bearer synthetic-auth' }) };
    const nativeFetch = vi.fn(async () => ({ ok: false, status: 503, statusText: 'Synthetic unavailable' })); vi.stubGlobal('fetch', nativeFetch);
    for (let index = 0; index < 3; index++) {
      await search.searchTopic('Synthetic planning topic', 3, { requestControls: c.controls });
      expect(search._serperConsecutiveFailures).toBe(index < 2 ? index + 1 : 0);
    }
    expect(search._serperAvailable).toBe(false);
    expect(search._serperCooldownUntil).toBeGreaterThan(Date.now());
    const attempts = nativeFetch.mock.calls.length;
    await search.searchTopic('Synthetic planning topic', 3, { requestControls: c.controls });
    expect(nativeFetch).toHaveBeenCalledTimes(attempts);
  });
  it.each(['search', 'searchTopic'])('keeps %s controls through authenticated header waits and blocks fallback', async method => {
    const c = control(), gate = barrier(), search = proxySearch(), nativeFetch = vi.fn(), fallback = vi.fn();
    Object.defineProperty(search, '_isSearXNGAvailable', { value: fallback });
    window.__alloFirebase = { getFunctionSecurityHeaders: async () => { await gate.wait(); return { Authorization: 'Bearer synthetic-auth' }; } };
    vi.stubGlobal('fetch', nativeFetch);
    const options = { requestControls: c.controls };
    const pending = (method === 'search' ? search.search('Synthetic planning topic', 3, 'Synthetic planning topic', options) : search.searchTopic('Synthetic planning topic', 3, options)).catch(error => error);
    await gate.entered; c.revoke(); c.controls.beforeRequest = () => true; gate.release();
    expect(await pending).toMatchObject({ code: 'managed-ai-blocked' }); expect(nativeFetch).not.toHaveBeenCalled(); expect(fallback).not.toHaveBeenCalled();
  });
  it('passes AIProvider request scope into actual search augmentation', async () => {
    const c = control(), gate = barrier(), search = proxySearch(), nativeFetch = vi.fn(), h = provider();
    window.WebSearchProvider = search;
    window.__alloFirebase = { getFunctionSecurityHeaders: async () => { await gate.wait(); return { Authorization: 'Bearer synthetic-auth' }; } };
    vi.stubGlobal('fetch', nativeFetch);
    const pending = h.ai.generateText('SYNTHETIC CLINICAL PROMPT', { search: true, searchQuery: 'Synthetic planning topic', requestControls: c.controls }).catch(error => error);
    await gate.entered; c.revoke(); gate.release();
    expect(await pending).toMatchObject({ code: 'managed-ai-blocked' }); expect(nativeFetch).not.toHaveBeenCalled(); expect(h.transport).not.toHaveBeenCalled();
  });
  it('rejects a search result when permission is revoked during response parsing', async () => {
    const c = control(), search = proxySearch();
    window.__alloFirebase = { getFunctionSecurityHeaders: async () => ({ Authorization: 'Bearer synthetic-auth' }) };
    const nativeFetch = vi.fn(async () => ({ ok: true, json: async () => { c.revoke(); return { results: [{ title: 'Synthetic', url: 'https://synthetic.example', snippet: 'Synthetic result' }] }; } }));
    vi.stubGlobal('fetch', nativeFetch);
    await expect(search.searchTopic('Synthetic planning topic', 3, { requestControls: c.controls })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(nativeFetch).toHaveBeenCalledOnce();
  });
});
