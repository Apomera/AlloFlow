import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash, webcrypto } from 'node:crypto';
import { loadAlloModule } from './setup.js';

let createApi;
const key = 'synthetic-request-controls-key';
const reply = (text = 'Synthetic reply', finishReason = 'STOP') => {
  const data = { candidates: [{ content: { parts: [{ text }] }, finishReason }] };
  return { ok: true, status: 200, text: async () => JSON.stringify(data), json: async () => data };
};
const denied = () => Object.assign(new Error('Synthetic clinical permission revoked'), { code: 'PROTECTED_REMOTE_NOT_APPROVED' });
function barrier() { let enter, release; const entered = new Promise(r => { enter = r; }); const resumed = new Promise(r => { release = r; }); return { entered, release, async wait() { enter(); await resumed; } }; }
function permission() { let allowed = true; return { controls: Object.freeze({ beforeRequest() { if (!allowed) throw denied(); } }), revoke() { allowed = false; } }; }
function harness(transport, extra = {}) {
  transport ||= vi.fn(async (_url, options) => { options.beforeRequest(); return reply(); });
  const api = createApi({ apiKey: key, _isCanvasEnv: false, GEMINI_MODELS: { default: 'synthetic-primary', fallback: 'synthetic-fallback', vision: 'synthetic-vision', image: 'synthetic-image' },
    fetchWithExponentialBackoff: transport, optimizeImage: async value => value, debugLog() {}, warnLog() {}, getAbortSignal: () => null, canvasAuthBackoffMs: [], ...extra });
  return { api, transport };
}
function text(api, controls, extra = {}) { return api[extra.single ? 'callGeminiSingleAttempt' : 'callGemini']('Synthetic clinical prompt', !!extra.json, !!extra.search, null, extra.query || null, null, false, extra.telemetry || null, { requestControls: controls, ...(extra.searchOptions || {}) }); }
beforeAll(() => { loadAlloModule('gemini_api_module.js'); createApi = window.AlloModules.createGeminiAPI; });
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); delete window.ALLOFLOW_MANAGED_AI_POLICY; delete window.WebSearchProvider; delete window.AIProvider; localStorage.clear(); });

describe('Gemini request-scoped clinical controls', () => {
  it.each([false, true])('blocks revocation during credential authorization (single attempt %s)', async single => {
    const p = permission(), pause = barrier(), h = harness();
    window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [{ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKeySha256: [createHash('sha256').update(key).digest('hex')] }] };
    vi.stubGlobal('crypto', { subtle: { async digest(...args) { await pause.wait(); return webcrypto.subtle.digest(...args); } } });
    const pending = text(h.api, p.controls, { single }).then(value => ({ value }), error => ({ error }));
    await pause.entered; p.revoke(); pause.release();
    expect((await pending).error).toMatchObject({ code: 'managed-ai-blocked' }); expect(h.transport).not.toHaveBeenCalled();
  });
  it('captures the guard before mutable option replacement and keeps concurrent requests separate', async () => {
    const pause = barrier(), first = permission(), second = permission(), native = vi.fn();
    const transport = vi.fn(async (url, opts) => { if (opts.body.includes('first')) await pause.wait(); opts.beforeRequest(); native(opts.body); return reply(); });
    const h = harness(transport), options = { requestControls: { beforeRequest: first.controls.beforeRequest } };
    const pending = h.api.callGemini('first synthetic', false, false, null, null, null, false, null, options).then(value => ({ value }), error => ({ error }));
    await pause.entered; options.requestControls.beforeRequest = () => true; options.requestControls = second.controls; first.revoke();
    expect(await text(h.api, second.controls)).toBe('Synthetic reply'); pause.release();
    expect((await pending).error).toMatchObject({ code: 'managed-ai-blocked' }); expect(native).toHaveBeenCalledOnce();
  });
  it('checks again before each delayed native attempt', async () => {
    const p = permission(), pause = barrier(), native = vi.fn();
    const transport = vi.fn(async (_url, opts) => { opts.beforeRequest(); native(); await pause.wait(); opts.beforeRequest(); native(); return reply(); });
    const h = harness(transport), pending = text(h.api, p.controls).catch(error => error);
    await pause.entered; p.revoke(); pause.release(); expect(await pending).toMatchObject({ code: 'managed-ai-blocked' }); expect(native).toHaveBeenCalledOnce();
  });
  it.each(['model fallback', 'JSON repair'])('does not transmit %s after revocation', async kind => {
    const p = permission(), transport = vi.fn(async (_url, opts) => { opts.beforeRequest(); p.revoke(); if (kind === 'model fallback') throw Object.assign(new Error('503 synthetic unavailable'), { httpStatus: 503 }); return reply('{broken', 'MALFORMED_FUNCTION_CALL'); });
    const h = harness(transport); await expect(text(h.api, p.controls, { json: kind === 'JSON repair' })).rejects.toMatchObject({ code: 'managed-ai-blocked' }); expect(transport).toHaveBeenCalledOnce();
  });
  it('retains the guard on a permitted JSON repair and rejects its later response', async () => {
    const p = permission(), transport = vi.fn(async (_url, opts) => { opts.beforeRequest(); if (transport.mock.calls.length === 1) return reply('{broken', 'MALFORMED_FUNCTION_CALL'); p.revoke(); return reply('{"ok":true}'); });
    const h = harness(transport); await expect(text(h.api, p.controls, { json: true })).rejects.toMatchObject({ code: 'managed-ai-blocked' }); expect(transport).toHaveBeenCalledTimes(2);
  });
  it('preserves controls through a quota-to-local fallback', async () => {
    const p = permission(), localNative = vi.fn();
    localStorage.setItem('alloflow_ai_config', JSON.stringify({ backend: 'gemini', apiKey: key, localFallback: { enabled: true, backend: 'alloflow-local', baseUrl: 'http://127.0.0.1:32173', localModelProfile: { modelId: 'synthetic-local', taskSupport: { simpleText: 'pass' } } } }));
    window.AIProvider = class { constructor(deps) { this.transport = deps.fetchWithRetry; } async generateText(_prompt, options) { expect(options.requestControls.beforeRequest).toBe(p.controls.beforeRequest); p.revoke(); return this.transport('http://127.0.0.1:32173/v1/chat/completions', { method: 'POST' }); } };
    const transport = vi.fn(async (url, options) => { options.beforeRequest(); if (url.includes('googleapis')) throw Object.assign(new Error('429 synthetic quota'), { httpStatus: 429 }); localNative(); return reply(); });
    const h = harness(transport, { GEMINI_MODELS: { default: 'synthetic-primary', fallback: 'synthetic-primary' } });
    await expect(text(h.api, p.controls)).rejects.toMatchObject({ code: 'managed-ai-blocked' }); expect(localNative).not.toHaveBeenCalled();
  });
  it.each([{}, { beforeRequest: false }, { beforeRequest: () => false }, { beforeRequest: async () => true }, { beforeRequest: () => true, unexpected: true }])('fails closed for malformed or asynchronous controls %#', async controls => {
    const h = harness(); await expect(text(h.api, controls)).rejects.toMatchObject({ code: 'managed-ai-blocked' }); expect(h.transport).not.toHaveBeenCalled();
  });
  it.each(['inherited', 'getter'])('rejects %s requestControls option without evaluating it', async kind => {
    const h = harness(), getter = vi.fn(() => ({ beforeRequest: () => true }));
    const options = kind === 'inherited' ? Object.create({ requestControls: { beforeRequest: () => true } }) : Object.defineProperty({}, 'requestControls', { get: getter });
    await expect(h.api.callGemini('synthetic', false, false, null, null, null, false, null, options)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(getter).not.toHaveBeenCalled(); expect(h.transport).not.toHaveBeenCalled();
  });
  it.each(['vision', 'image edit'])('checks %s controls before transmission and after response processing', async kind => {
    const p = permission(), pause = barrier();
    const data = { candidates: [{ content: { parts: [{ inlineData: { data: 'AA==' } }] } }] };
    const native = vi.fn(async () => { p.revoke(); return { json: async () => data }; }); vi.stubGlobal('fetch', native);
    const transport = vi.fn(async (_url, opts) => { await pause.wait(); opts.beforeRequest(); return reply(); });
    const h = harness(transport);
    const pending = (kind === 'vision' ? h.api.callGeminiVision('synthetic media prompt', 'AA==', 'image/png', { requestControls: p.controls }) : h.api.callGeminiImageEdit('synthetic edit', 'AA==', 800, 0.9, null, { requestControls: p.controls })).catch(error => error);
    if (kind === 'vision') { await pause.entered; p.revoke(); pause.release(); }
    expect(await pending).toMatchObject({ code: 'managed-ai-blocked' }); expect(native).toHaveBeenCalledTimes(kind === 'vision' ? 0 : 1);
  });
  it.each(['public-reference', 'user-topic'])('forwards controls to Canvas %s search', async intent => {
    const p = permission(), searchNative = vi.fn();
    const search = vi.fn(async (...args) => { p.revoke(); args.at(-1).requestControls.beforeRequest(); searchNative(); return {}; });
    window.WebSearchProvider = { search, searchTopic: search };
    const h = harness(undefined, { _isCanvasEnv: true });
    await expect(text(h.api, p.controls, { search: true, query: 'synthetic query', searchOptions: { intent } })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(searchNative).not.toHaveBeenCalled(); expect(h.transport).not.toHaveBeenCalled();
  });
  it.each(['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'])('%s forwards controls through its actual local bridge', async file => {
    const source = readFileSync(file, 'utf8'), start = source.indexOf('const localCallGemini = async'), end = source.indexOf('localCallGemini._alloflowBackend', start);
    const ai = { generateText: vi.fn(async (_prompt, options) => { options.requestControls.beforeRequest(); return 'synthetic local reply'; }) };
    const localCall = new Function('aiInstance', 'backend', 'warnLog', source.slice(start, end) + '\nreturn localCallGemini;')(ai, 'synthetic-local', () => {});
    const p = permission(); expect(await text({ callGemini: localCall }, p.controls)).toBe('synthetic local reply'); p.revoke();
    await expect(text({ callGemini: localCall }, p.controls)).rejects.toMatchObject({ code: 'PROTECTED_REMOTE_NOT_APPROVED' });
  });
});
