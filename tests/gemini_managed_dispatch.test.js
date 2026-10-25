import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash, webcrypto } from 'node:crypto';
import { loadAlloModule } from './setup.js';

let createApi;
const KEY_A = 'synthetic-approved-key';
const KEY_B = 'synthetic-unapproved-key';
const endpoint = 'https://generativelanguage.googleapis.com/v1beta';
const fingerprint = value => createHash('sha256').update(value).digest('hex');
beforeAll(() => { loadAlloModule('gemini_api_module.js'); createApi = window.AlloModules.createGeminiAPI; });
afterEach(() => { delete window.ALLOFLOW_MANAGED_AI_POLICY; delete window.WebSearchProvider; localStorage.clear(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
function policy(key = KEY_A, extra = {}) {
  window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, allowExternalSearch: false, connections: [{ backend: 'gemini', baseUrl: endpoint, apiKeySha256: [fingerprint(key)] }], ...extra };
}
function key(value) { localStorage.setItem('alloflow_ai_config', JSON.stringify({ backend: 'gemini', apiKey: value })); }
function barrier() { let enter, release; const entered = new Promise(resolve => { enter = resolve; }); const done = new Promise(resolve => { release = resolve; }); return { entered, release, wait: async () => { enter(); await done; } }; }
function digestBarrier() {
  const gate = barrier(); let once = true;
  vi.stubGlobal('crypto', { subtle: { digest: async (...args) => { if (once) { once = false; await gate.wait(); } return webcrypto.subtle.digest(...args); } } });
  return gate;
}
function response(text = 'Synthetic reply', finishReason = 'STOP') { const data = { candidates: [{ content: { parts: [{ text }] }, finishReason }] }; return { ok: true, status: 200, text: async () => JSON.stringify(data), json: async () => data }; }
function harness(extra = {}) {
  const transport = vi.fn(async (url, opts) => { if (opts.beforeRequest) opts.beforeRequest(); return response(); });
  const models = { default: 'synthetic-primary', fallback: 'synthetic-fallback', vision: 'synthetic-vision', flash: 'synthetic-flash', image: 'synthetic-image' };
  const api = createApi({ apiKey: '', _isCanvasEnv: false, GEMINI_MODELS: models, fetchWithExponentialBackoff: transport, optimizeImage: async x => x,
    warnLog: vi.fn(), debugLog: vi.fn(), getAbortSignal: () => null, canvasAuthBackoffMs: [], ...extra });
  return { api, transport, models };
}
function localFallback(guard, beforeGenerate = async () => {}) {
  const config = { backend: 'gemini', apiKey: KEY_A, localFallback: { enabled: true, backend: 'alloflow-local',
    baseUrl: 'http://127.0.0.1:32173', localModelProfile: { modelId: 'synthetic-local', taskSupport: { simpleText: 'pass' } } } };
  localStorage.setItem('alloflow_ai_config', JSON.stringify(config));
  vi.stubGlobal('AIProvider', class {
    constructor(deps) { this.transport = deps.fetchWithRetry; }
    async generateText() {
      await beforeGenerate();
      await this.transport('http://127.0.0.1:32173/v1/chat/completions', { method: 'POST', body: 'synthetic body', beforeRequest: guard });
      return 'Synthetic local reply';
    }
  });
  const transport = vi.fn(async (url, options) => {
    if (url.startsWith(endpoint)) { const error = new Error('429 Synthetic quota'); error.httpStatus = 429; throw error; }
    options.beforeRequest(); return response();
  });
  const h = harness({ fetchWithExponentialBackoff: transport }); h.models.fallback = h.models.default;
  return { ...h, transport };
}
describe('Gemini request authorization is bound to dispatched credentials and policy', () => {
  it('does not substitute a newly stored key after the approved key fingerprint check', async () => {
    key(KEY_A); policy(); const gate = digestBarrier(); const h = harness();
    const pending = h.api.callGeminiSingleAttempt('Synthetic student text');
    await gate.entered; key(KEY_B); gate.release(); await pending;
    expect(h.transport).toHaveBeenCalledOnce();
    expect(h.transport.mock.calls[0][1].headers['x-goog-api-key']).toBe(KEY_A);
    await expect(h.api.callGeminiSingleAttempt('Next synthetic request')).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(h.transport).toHaveBeenCalledOnce();
  });
  it('rejects replacement of the profile during asynchronous fingerprint verification', async () => {
    key(KEY_A); policy(); const gate = digestBarrier(); const h = harness();
    const pending = h.api.callGeminiSingleAttempt('Synthetic private text').then(value => ({ value }), error => ({ error }));
    await gate.entered; policy(KEY_B); gate.release();
    expect((await pending).error).toMatchObject({ code: 'managed-ai-blocked' }); expect(h.transport).not.toHaveBeenCalled();
  });
  it('rejects in-place replacement of approved connections during verification', async () => {
    key(KEY_A); policy(); const gate = digestBarrier(); const h = harness();
    const pending = h.api.callGeminiSingleAttempt('Synthetic private text').then(value => ({ value }), error => ({ error }));
    await gate.entered; window.ALLOFLOW_MANAGED_AI_POLICY.connections = []; gate.release();
    expect((await pending).error).toMatchObject({ code: 'managed-ai-blocked' }); expect(h.transport).not.toHaveBeenCalled();
  });
  it('honors a restrictive profile installed while an unmanaged request yields', async () => {
    key(KEY_A); const h = harness();
    const pending = h.api.callGeminiSingleAttempt('Synthetic private text').then(value => ({ value }), error => ({ error }));
    policy(KEY_B);
    expect((await pending).error).toMatchObject({ code: 'managed-ai-blocked' }); expect(h.transport).not.toHaveBeenCalled();
  });
  it('keeps the request model snapshot when settings change during verification', async () => {
    key(KEY_A); policy(); const gate = digestBarrier(); const h = harness();
    const pending = h.api.callGeminiSingleAttempt('Synthetic text');
    await gate.entered; h.models.default = 'changed-after-start'; gate.release(); await pending;
    expect(h.transport.mock.calls[0][0]).toContain('/models/synthetic-primary:');
  });
  it('rechecks after awaited Canvas search before sending the prompt', async () => {
    const gate = barrier();
    window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, allowExternalSearch: true, connections: [{ backend: 'gemini', baseUrl: endpoint, canvasHost: true }] };
    window.WebSearchProvider = { search: vi.fn(async () => { await gate.wait(); return { contextPrompt: 'Synthetic source context ', groundingMetadata: { groundingChunks: [{ web: { uri: 'https://synthetic.test/source', title: 'Synthetic source' } }] } }; }) };
    const h = harness({ apiKey: KEY_A, _isCanvasEnv: true });
    const pending = h.api.callGeminiSingleAttempt('Synthetic private text', false, true).then(value => ({ value }), error => ({ error }));
    await gate.entered; window.ALLOFLOW_MANAGED_AI_POLICY.connections = []; gate.release();
    expect((await pending).error).toMatchObject({ code: 'managed-ai-blocked' }); expect(h.transport).not.toHaveBeenCalled();
  });
  it('rechecks after callbacks immediately before the transport handoff', async () => {
    key(KEY_A); policy(); vi.stubGlobal('crypto', webcrypto); const h = harness();
    const telemetry = { onModel: () => { window.ALLOFLOW_MANAGED_AI_POLICY.connections = []; } };
    await expect(h.api.callGeminiSingleAttempt('Synthetic private text', false, false, null, null, null, false, telemetry)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(h.transport).not.toHaveBeenCalled();
  });
  it('does not send a model fallback after managed approval is revoked', async () => {
    key(KEY_A); policy(); vi.stubGlobal('crypto', webcrypto);
    const transport = vi.fn(async () => { window.ALLOFLOW_MANAGED_AI_POLICY.connections = []; const e = new Error('503 Synthetic unavailable'); e.httpStatus = 503; throw e; });
    const h = harness({ fetchWithExponentialBackoff: transport });
    await expect(h.api.callGeminiSingleAttempt('Synthetic private text')).rejects.toMatchObject({ code: 'managed-ai-blocked' }); expect(transport).toHaveBeenCalledOnce();
  });
  it('passes a dispatch guard that stops a delayed native attempt inside a transport', async () => {
    key(KEY_A); policy(); vi.stubGlobal('crypto', webcrypto);
    const gate = barrier(); const nativeFetch = vi.fn(async () => response());
    const transport = vi.fn(async (url, options) => { await gate.wait(); options.beforeRequest(); return nativeFetch(url, options); });
    const h = harness({ fetchWithExponentialBackoff: transport });
    const pending = h.api.callGeminiSingleAttempt('Synthetic private text').then(value => ({ value }), error => ({ error }));
    await gate.entered; window.ALLOFLOW_MANAGED_AI_POLICY.connections = []; gate.release();
    expect((await pending).error).toMatchObject({ code: 'managed-ai-blocked' });
    expect(transport).toHaveBeenCalledOnce(); expect(nativeFetch).not.toHaveBeenCalled();
  });
  it('keeps credentials and models fixed for a JSON repair request', async () => {
    key(KEY_A); policy(); vi.stubGlobal('crypto', webcrypto);
    let h;
    const transport = vi.fn(async (_url, options) => {
      options.beforeRequest();
      if (transport.mock.calls.length === 1) { key(KEY_B); h.models.default = 'changed-during-response'; return response('{broken', 'MALFORMED_FUNCTION_CALL'); }
      return response('{"ok":true}');
    });
    h = harness({ fetchWithExponentialBackoff: transport });
    expect(await h.api.callGeminiSingleAttempt('Synthetic JSON task', true)).toBe('{"ok":true}');
    expect(transport).toHaveBeenCalledTimes(2);
    for (const [url, options] of transport.mock.calls) {
      expect(url).toContain('/models/synthetic-primary:'); expect(options.headers['x-goog-api-key']).toBe(KEY_A);
      expect(Object.isFrozen(options)).toBe(true); expect(Object.isFrozen(options.headers)).toBe(true);
    }
  });
  it('does not send a JSON repair after managed approval is revoked', async () => {
    key(KEY_A); policy(); vi.stubGlobal('crypto', webcrypto);
    const transport = vi.fn(async () => { window.ALLOFLOW_MANAGED_AI_POLICY.connections = []; return response('{broken', 'MALFORMED_FUNCTION_CALL'); });
    const h = harness({ fetchWithExponentialBackoff: transport });
    await expect(h.api.callGeminiSingleAttempt('Synthetic JSON task', true)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(transport).toHaveBeenCalledOnce();
  });
  it('keeps the snapshot through the outer Canvas authentication retry', async () => {
    key(KEY_A); policy(); vi.stubGlobal('crypto', webcrypto);
    let h;
    const transport = vi.fn(async (_url, options) => {
      options.beforeRequest();
      if (transport.mock.calls.length === 1) { key(KEY_B); h.models.default = 'changed-during-retry'; const error = new Error('401 Synthetic rejected connection'); error.httpStatus = 401; throw error; }
      return response();
    });
    h = harness({ _isCanvasEnv: true, canvasAuthBackoffMs: [0], fetchWithExponentialBackoff: transport });
    await h.api.callGemini('Synthetic text'); expect(transport).toHaveBeenCalledTimes(2);
    for (const [url, options] of transport.mock.calls) {
      expect(url).toContain('/models/synthetic-primary:'); expect(options.headers['x-goog-api-key']).toBe(KEY_A);
    }
  });
  it('does not retry Canvas authentication after managed approval is revoked', async () => {
    key(KEY_A); policy(); vi.stubGlobal('crypto', webcrypto);
    const transport = vi.fn(async () => { const error = new Error('401 Synthetic rejected connection'); error.httpStatus = 401; throw error; });
    const h = harness({ _isCanvasEnv: true, canvasAuthBackoffMs: [0], fetchWithExponentialBackoff: transport });
    const telemetry = { onAuthRung: () => { window.ALLOFLOW_MANAGED_AI_POLICY.connections = []; } };
    await expect(h.api.callGemini('Synthetic text', false, false, null, null, null, false, telemetry)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(transport).toHaveBeenCalledOnce();
  });
  it('retains the original Gemini approval across an awaited local fallback', async () => {
    policy(); vi.stubGlobal('crypto', webcrypto); const gate = barrier(); const h = localFallback(() => true, gate.wait);
    const pending = h.api.callGeminiSingleAttempt('Synthetic text').then(value => ({ value }), error => ({ error }));
    await gate.entered; window.ALLOFLOW_MANAGED_AI_POLICY.connections = []; gate.release();
    expect((await pending).error).toMatchObject({ code: 'managed-ai-blocked' }); expect(h.transport).toHaveBeenCalledOnce();
  });
  it('rechecks the original Gemini approval after a composed guard callback', async () => {
    policy(); vi.stubGlobal('crypto', webcrypto);
    const h = localFallback(() => { window.ALLOFLOW_MANAGED_AI_POLICY.connections = []; return true; });
    await expect(h.api.callGeminiSingleAttempt('Synthetic text')).rejects.toMatchObject({ code: 'managed-ai-blocked' }); expect(h.transport).toHaveBeenCalledOnce();
  });
  it.each([
    ['absent', undefined], ['void result', () => undefined], ['true result', () => true],
  ])('allows a composed fallback guard with %s', async (_label, guard) => {
    policy(); vi.stubGlobal('crypto', webcrypto); const h = localFallback(guard);
    await expect(h.api.callGeminiSingleAttempt('Synthetic text')).resolves.toBe('Synthetic local reply'); expect(h.transport).toHaveBeenCalledTimes(2);
  });
  it.each([
    ['null callback', null], ['nonfunction callback', true], ['false result', () => false], ['null result', () => null],
    ['object result', () => ({})], ['thenable result', () => Promise.resolve(true)], ['rejected promise', () => Promise.reject(new Error('Synthetic guard rejection'))],
    ['thrown error', () => { throw new Error('Synthetic guard error'); }],
  ])('rejects a composed fallback guard with %s before dispatch', async (_label, guard) => {
    policy(); vi.stubGlobal('crypto', webcrypto); const h = localFallback(guard);
    await expect(h.api.callGeminiSingleAttempt('Synthetic text')).rejects.toMatchObject({ code: 'managed-ai-blocked' }); expect(h.transport).toHaveBeenCalledOnce();
  });
  it('preserves cancellation from a composed guard', async () => {
    policy(); vi.stubGlobal('crypto', webcrypto);
    const h = localFallback(() => { const error = new Error('Synthetic cancelled request'); error.name = 'AbortError'; throw error; });
    await expect(h.api.callGeminiSingleAttempt('Synthetic text')).rejects.toMatchObject({ name: 'AbortError' }); expect(h.transport).toHaveBeenCalledOnce();
  });
  it.each(['synthetic-model?key=synthetic-unapproved-key', 'synthetic-model#fragment', '../synthetic-model', 'synthetic\\model', 'https://synthetic.test/model', 'synthetic\nmodel'])('rejects model URL structure before transport: %s', async model => {
    key(KEY_A); policy(); vi.stubGlobal('crypto', webcrypto); const h = harness(); h.models.default = model;
    const onModel = vi.fn();
    await expect(h.api.callGeminiSingleAttempt('Synthetic private text', false, false, null, null, null, false, { onModel })).rejects.toMatchObject({ code: 'allo/invalid-model' });
    expect(h.transport).not.toHaveBeenCalled(); expect(onModel).not.toHaveBeenCalled();
  });
  it('accepts the documented models/ resource prefix without duplicating the path', async () => {
    key(KEY_A); const h = harness(); h.models.default = 'models/synthetic-primary'; await h.api.callGeminiSingleAttempt('Synthetic text');
    expect(h.transport.mock.calls[0][0]).toBe(endpoint + '/models/synthetic-primary:generateContent');
  });
  for (const action of ['callGeminiVision', 'callGeminiImageEdit']) it(action + ' rejects a policy installed while its unmanaged authorization yields', async () => {
    key(KEY_A); const nativeFetch = vi.fn(async () => response()); vi.stubGlobal('fetch', nativeFetch); const h = harness();
    const pending = h.api[action]('Synthetic media task', 'c3ludGhldGlj').then(value => ({ value }), error => ({ error }));
    policy(); expect((await pending).error).toMatchObject({ code: 'managed-ai-blocked' });
    expect(nativeFetch).not.toHaveBeenCalled(); expect(h.transport).not.toHaveBeenCalled();
  });
  for (const action of ['listAvailableModels', 'probeModelHealth']) it(action + ' binds its captured key too', async () => {
    key(KEY_A); policy(); const gate = digestBarrier(); const fetch = vi.fn(async () => ({ ...response(), json: async () => ({ models: [] }) })); vi.stubGlobal('fetch', fetch); const h = harness();
    const pending = h.api[action](); await gate.entered; key(KEY_B); gate.release(); await pending;
    expect(fetch).toHaveBeenCalledOnce(); expect(fetch.mock.calls[0][1].headers['x-goog-api-key']).toBe(KEY_A);
  });
  it('keeps unmanaged live-key updates for the next independent request', async () => {
    key(KEY_A); const h = harness(); await h.api.callGeminiSingleAttempt('One'); key(KEY_B); await h.api.callGeminiSingleAttempt('Two');
    expect(h.transport.mock.calls.map(call => call[1].headers['x-goog-api-key'])).toEqual([KEY_A, KEY_B]);
  });
});
