import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createHash, webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import { loadAlloModule } from './setup.js';
let Provider;
beforeAll(() => { loadAlloModule('ai_backend_module.js'); Provider = window.AIProvider; });
afterEach(() => { delete window.ALLOFLOW_MANAGED_AI_POLICY; vi.restoreAllMocks(); vi.unstubAllGlobals(); });
const fingerprint = key => createHash('sha256').update(key).digest('hex');
const policy = (backend = 'custom', baseUrl = 'https://approved.example', key = 'synthetic-approved-key') => ({ version: 1, connections: [{ backend, baseUrl, apiKeySha256: [fingerprint(key)] }], allowExternalSearch: false });
function gateDigest() {
  let enter, release;
  const entered = new Promise(resolve => { enter = resolve; });
  const resumed = new Promise(resolve => { release = resolve; });
  let first = true;
  vi.stubGlobal('crypto', { subtle: { digest: async (...args) => { if (first) { first = false; enter(); await resumed; } return webcrypto.subtle.digest(...args); } } });
  return { entered, release };
}
const response = text => ({ ok: true, status: 200, json: async () => ({ choices: [{ message: { content: text } }], candidates: [{ content: { parts: [{ text }] } }], content: [{ text }], data: [] }) });
function provider(extra = {}) {
  const transport = vi.fn(async () => response('synthetic result'));
  const ai = new Provider({ backend: 'custom', baseUrl: 'https://approved.example', apiKey: 'synthetic-approved-key', models: { default: 'approved-model' }, fetchWithRetry: transport, debugLog: vi.fn(), warnLog: vi.fn(), ...extra });
  return { ai, transport };
}
describe('AIProvider managed logical request races', () => {
  it('keeps the approved endpoint, credential and model immutable while hashing', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = policy(); const gate = gateDigest(); const h = provider();
    const pending = h.ai.generateText('SYNTHETIC_PRIVATE_PROMPT'); await gate.entered;
    h.ai.backend = 'claude'; h.ai.baseUrl = 'https://unapproved.example'; h.ai.apiKey = 'synthetic-unapproved-key'; h.ai.models.default = 'changed-model';
    gate.release(); await pending;
    expect(h.transport).toHaveBeenCalledOnce();
    const [url, options] = h.transport.mock.calls[0];
    expect(url).toBe('https://approved.example/v1/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer synthetic-approved-key');
    expect(JSON.parse(options.body).model).toBe('approved-model');
    await expect(h.ai.generateText('next synthetic prompt')).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(h.transport).toHaveBeenCalledOnce();
  });
  it('snapshots plain options originating in another window realm before authorization', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = policy('gemini', 'https://generativelanguage.googleapis.com/v1beta');
    const gate = gateDigest(); const options = runInNewContext('({ search: false })');
    const h = provider({ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' });
    const pending = h.ai.generateText('synthetic prompt', options); await gate.entered;
    options.search = true; gate.release(); await pending;
    expect(h.transport).toHaveBeenCalledOnce(); expect(JSON.parse(h.transport.mock.calls[0][1].body)).not.toHaveProperty('tools');
  });
  it('rejects a policy replacement during credential hashing', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = policy(); const gate = gateDigest(); const h = provider();
    const pending = h.ai.generateText('SYNTHETIC_PRIVATE_PROMPT'); const caught = pending.catch(error => error);
    await gate.entered; window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [], allowExternalSearch: false }; gate.release();
    expect(await caught).toMatchObject({ code: 'managed-ai-blocked' }); expect(h.transport).not.toHaveBeenCalled();
  });
  it('rejects in-place policy edits while a matching fingerprint is being computed', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = policy(); const gate = gateDigest(); const h = provider();
    const pending = h.ai.generateText('SYNTHETIC_PRIVATE_PROMPT'); const caught = pending.catch(error => error);
    await gate.entered; window.ALLOFLOW_MANAGED_AI_POLICY.connections[0].baseUrl = 'https://different.example'; gate.release();
    expect(await caught).toMatchObject({ code: 'managed-ai-blocked' }); expect(h.transport).not.toHaveBeenCalled();
  });
  it('does not issue a Gemini fallback after the policy is revoked', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [{ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', keyless: true }], allowExternalSearch: false };
    const transport = vi.fn(async () => { window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [] }; throw new Error('HTTP 429'); });
    const h = provider({ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKey: '', models: { default: 'primary', fallback: 'fallback' }, fetchWithRetry: transport });
    await expect(h.ai.generateText('SYNTHETIC_PRIVATE_PROMPT')).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(transport).toHaveBeenCalledOnce();
  });
  it('keeps model discovery on its approved credential and backend snapshot', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = policy(); const gate = gateDigest(); const h = provider();
    const fetch = vi.fn(async () => response('synthetic result')); vi.stubGlobal('fetch', fetch);
    const pending = h.ai.listAvailableModels(); await gate.entered;
    h.ai.backend = 'gemini'; h.ai.baseUrl = 'https://unapproved.example'; h.ai.apiKey = 'synthetic-unapproved-key';
    gate.release(); await pending;
    expect(fetch).toHaveBeenCalledOnce(); expect(fetch.mock.calls[0][0]).toBe('https://approved.example/v1/models');
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer synthetic-approved-key');
  });
  it('uses changed settings only for the next separately approved logical request', async () => {
    vi.stubGlobal('crypto', webcrypto); window.ALLOFLOW_MANAGED_AI_POLICY = policy(); const h = provider();
    await expect(h.ai.generateText('first synthetic prompt')).resolves.toBe('synthetic result');
    h.ai.backend = 'claude'; h.ai.baseUrl = 'https://next-approved.example'; h.ai.apiKey = 'synthetic-next-key'; h.ai.models.default = 'next-model';
    window.ALLOFLOW_MANAGED_AI_POLICY = policy('claude', 'https://next-approved.example', 'synthetic-next-key');
    await expect(h.ai.generateText('next synthetic prompt')).resolves.toBe('synthetic result');
    const [url, options] = h.transport.mock.calls[1]; expect(url).toBe('https://next-approved.example/v1/messages');
    expect(options.headers['x-api-key']).toBe('synthetic-next-key'); expect(JSON.parse(options.body).model).toBe('next-model');
  });
  it('hands a synchronous revocation guard to a cooperating retry transport', async () => {
    vi.stubGlobal('crypto', webcrypto); window.ALLOFLOW_MANAGED_AI_POLICY = policy();
    let enter, release; const entered = new Promise(r => { enter = r; }); const resumed = new Promise(r => { release = r; });
    const actualAttempt = vi.fn();
    const transport = vi.fn(async (_url, options) => { options.beforeRequest(); enter(); await resumed; options.beforeRequest(); actualAttempt(); return response('unused'); });
    const h = provider({ fetchWithRetry: transport }); const pending = h.ai.generateText('SYNTHETIC_PRIVATE_PROMPT'); const caught = pending.catch(e => e);
    await entered; window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [] }; release();
    expect(await caught).toMatchObject({ code: 'managed-ai-blocked' }); expect(actualAttempt).not.toHaveBeenCalled();
  });
  it('strips retry guard extensions before its default native fetch', async () => {
    vi.stubGlobal('crypto', webcrypto); window.ALLOFLOW_MANAGED_AI_POLICY = policy();
    const fetch = vi.fn(async () => response('ok')); vi.stubGlobal('fetch', fetch);
    const h = provider({ fetchWithRetry: undefined }); await h.ai.generateText('synthetic prompt');
    expect(fetch).toHaveBeenCalledOnce(); expect(fetch.mock.calls[0][1]).not.toHaveProperty('beforeRequest');
    expect(fetch.mock.calls[0][1].redirect).toBe('error');
  });
  it('blocks queued media when a managed policy is installed after enqueue', async () => {
    let release; const queue = new Promise(r => { release = r; });
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const h = provider({ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta' }); h.ai._ttsQueue = queue;
    const pending = h.ai.textToSpeech('SYNTHETIC_PRIVATE_SPEECH'); const caught = pending.catch(e => e);
    await vi.waitFor(() => expect(h.ai._ttsQueue).not.toBe(queue));
    window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [] }; release();
    expect(await caught).toMatchObject({ code: 'managed-ai-blocked' }); expect(fetch).not.toHaveBeenCalled();
  });
  it('does not downgrade a revoked stream into a non-stream request', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [{ backend: 'lmstudio', baseUrl: 'http://localhost:1234', keyless: true }] };
    let enter, release; const entered = new Promise(r => { enter = r; }); const resumed = new Promise(r => { release = r; });
    const transport = vi.fn(async () => ({ ok: true, body: { getReader: () => ({ read: async () => { enter(); await resumed; throw new Error('synthetic stream failure'); } }) } }));
    const h = provider({ backend: 'lmstudio', baseUrl: 'http://localhost:1234', apiKey: '', fetchWithRetry: transport });
    const pending = h.ai.generateText('synthetic local prompt', { onProgress: vi.fn() }); const caught = pending.catch(e => e);
    await entered; window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [] }; release();
    expect(await caught).toMatchObject({ code: 'managed-ai-blocked' }); expect(transport).toHaveBeenCalledOnce();
  });
  it('keeps Gemini repair under the same approval instead of starting a new request', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [{ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', keyless: true }] };
    const transport = vi.fn(async () => { window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [] }; return { ok: true, json: async () => ({ candidates: [{ finishReason: 'MALFORMED_FUNCTION_CALL', content: { parts: [{ text: '{synthetic broken' }] } }] }) }; });
    const h = provider({ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKey: '', fetchWithRetry: transport });
    await expect(h.ai.generateText('synthetic json prompt', { json: true })).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(transport).toHaveBeenCalledOnce();
  });
  it.each(['synthetic:generateContent?key=unapproved&extra=', 'name/with/path', 'name#fragment', '..', '%2e%2e', 'a'.repeat(201)])('rejects Gemini model URL syntax %s before transport', async model => {
    window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [{ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', keyless: true }] };
    const h = provider({ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKey: '', models: { default: model } });
    await expect(h.ai.generateText('synthetic prompt')).rejects.toMatchObject({ code: 'allo/invalid-model', isFatal: true });
    expect(h.transport).not.toHaveBeenCalled();
  });
  it.each([
    ['generateImage', ai => ai.generateImage('synthetic image')],
    ['editImage', ai => ai.editImage('synthetic edit', 'c3ludGhldGlj')],
    ['analyzeImage', ai => ai.analyzeImage('synthetic question', 'c3ludGhldGlj')],
    ['analyzeImages', ai => ai.analyzeImages('synthetic question', [{ data: 'c3ludGhldGlj' }])],
    ['analyzeAudio', ai => ai.analyzeAudio('synthetic question', 'c3ludGhldGlj')],
    ['textToSpeech', ai => ai.textToSpeech('synthetic speech')],
  ])('rejects malformed Gemini models on %s routes', async (_name, invoke) => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch);
    const model = 'synthetic:generateContent?key=unapproved&extra=';
    const h = provider({ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', models: { image: model, vision: model, tts: model } });
    await expect(invoke(h.ai)).rejects.toMatchObject({ code: 'allo/invalid-model', isFatal: true });
    expect(fetch).not.toHaveBeenCalled(); expect(h.transport).not.toHaveBeenCalled();
  });
  it('accepts canonical models/ prefixes without duplicate URL segments', async () => {
    const h = provider({ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', models: { default: 'models/gemini.synthetic-1' } });
    await expect(h.ai.generateText('synthetic prompt')).resolves.toBe('synthetic result');
    expect(h.transport.mock.calls[0][0]).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini.synthetic-1:generateContent');
  });
  it('preserves custom model identifiers inside JSON instead of imposing Gemini path rules', async () => {
    const h = provider({ models: { default: 'organization/model:synthetic' } }); await h.ai.generateText('synthetic prompt');
    expect(JSON.parse(h.transport.mock.calls[0][1].body).model).toBe('organization/model:synthetic');
  });
  it.each([false, null, 'guard', () => false, () => null, () => Promise.reject(new Error('synthetic async denial'))])('rejects invalid native request guards before dispatch', async beforeRequest => {
    const fetch = vi.fn(); vi.stubGlobal('fetch', fetch); const h = provider();
    await expect(Promise.resolve().then(() => h.ai._requestFetch('https://approved.example/synthetic', { beforeRequest }))).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(fetch).not.toHaveBeenCalled();
  });
});
