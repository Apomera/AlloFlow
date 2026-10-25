import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
const moduleText = readFileSync('utils_pure_module.js', 'utf8');
const ARTICLE = 'Synthetic public lesson text about rivers and forests. '.repeat(30);
const KEY = 'SYNTHETIC_HEADER_KEY';
const CANARY = 'SYNTHETIC_SOURCE_CAPABILITY';
const WEB = 'https://school.example/SYNTHETIC_PRIVATE_PATH?access_token=' + CANARY;
const VIDEO = 'https://www.youtube.com/watch?v=' + CANARY;
const isGemini = url => String(url).startsWith('https://generativelanguage.googleapis.com/');
const ready = () => ({ ok: true, status: 200, text: async () => ARTICLE,
  json: async () => ({ candidates: [{ content: { parts: [{ text: ARTICLE }] } }] }) });
function harness(fetchImpl = async () => ready()) {
  const diagnostics = [], record = (...args) => diagnostics.push(args);
  vi.spyOn(console, 'log').mockImplementation(record);
  vi.spyOn(console, 'warn').mockImplementation(record);
  vi.spyOn(console, 'error').mockImplementation(record);
  window.warnLog = record; window.__alloDebugLog = record;
  window.apiKey = KEY; window._isCanvasEnv = true; window.GEMINI_MODELS = { default: 'synthetic-model' };
  delete window.AlloModules.UtilsPureModule; delete window.AlloModules.UtilsPure;
  const fetch = vi.fn(fetchImpl); vi.stubGlobal('fetch', fetch);
  new Function(moduleText)();
  return { api: window.AlloModules.UtilsPure, fetch, diagnostics, toast: vi.fn() };
}
afterEach(() => {
  vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals();
  delete window.ALLOFLOW_MANAGED_AI_POLICY; delete window.apiKey; delete window._isCanvasEnv; delete window.GEMINI_MODELS;
  delete window.warnLog; delete window.__alloDebugLog; delete window.AlloModules.UtilsPureModule; delete window.AlloModules.UtilsPure;
});

describe('managed legacy source import', () => {
  for (const [name, profile] of [
    ['deny profile', { version: 1, allowExternalSearch: false, connections: [] }],
    ['approved text/search profile', { version: 1, allowExternalSearch: true, connections: [{ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', canvasHost: true }] }],
    ['unsupported profile', { version: 99 }], ['malformed false profile', false]
  ]) for (const url of [WEB, VIDEO]) {
    it('blocks relays and direct Gemini for ' + name + ' / ' + (url === WEB ? 'web' : 'video'), async () => {
      const h = harness(); window.ALLOFLOW_MANAGED_AI_POLICY = profile;
      const cleanup = vi.fn(async () => ARTICLE);
      await expect(h.api.fetchAndCleanUrl(url, cleanup, h.toast)).rejects.toMatchObject({ code: 'managed-ai-blocked', isFatal: true });
      expect(h.fetch).not.toHaveBeenCalled(); expect(cleanup).not.toHaveBeenCalled();
      expect(JSON.stringify(h.diagnostics)).not.toContain(CANARY);
      expect(JSON.stringify(h.toast.mock.calls)).not.toContain(CANARY);
    });
  }
  for (const profile of ['absent', 'null']) for (const url of [WEB, VIDEO]) {
    it('preserves ' + profile + ' unmanaged source attribution / ' + (url === WEB ? 'web' : 'video'), async () => {
      const h = harness(); if (profile === 'null') window.ALLOFLOW_MANAGED_AI_POLICY = null;
      await expect(h.api.fetchAndCleanUrl(url, null, h.toast)).resolves.toContain('Source: ' + url);
      expect(h.fetch).toHaveBeenCalledTimes(1);
      const [endpoint, init] = h.fetch.mock.calls[0];
      expect(init).toMatchObject({ redirect: 'error', credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store' });
      if (isGemini(endpoint)) {
        expect(init.headers['x-goog-api-key']).toBe(KEY);
        expect(String(endpoint)).not.toContain(KEY);
      }
      const diagnostics = JSON.stringify(h.diagnostics);
      expect(diagnostics).not.toContain(CANARY); expect(diagnostics).not.toContain('SYNTHETIC_PRIVATE_PATH'); expect(diagnostics).not.toContain(KEY);
    });
  }
  it('stops the next relay/cloud fallback if policy changes during a pending relay', async () => {
    const h = harness(async () => {
      window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [] };
      return { ok: false, status: 503 };
    });
    await expect(h.api.fetchAndCleanUrl(WEB, null, h.toast)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(h.fetch).toHaveBeenCalledTimes(1);
  });
  it('does not downgrade a failed video request into relays after policy is installed', async () => {
    const h = harness(async () => {
      window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [] };
      throw new Error('SYNTHETIC_PRIVATE_PROVIDER_BODY');
    });
    await expect(h.api.fetchAndCleanUrl(VIDEO, null, h.toast)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(h.fetch).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(h.diagnostics)).not.toContain('SYNTHETIC_PRIVATE_PROVIDER_BODY');
  });
  it('checks policy again before sending retrieved text to an optional cleanup caller', async () => {
    const h = harness(async () => ({ ok: true, status: 200, text: async () => {
      window.ALLOFLOW_MANAGED_AI_POLICY = { version: 1, connections: [] }; return ARTICLE;
    } }));
    const cleanup = vi.fn(async () => ARTICLE);
    await expect(h.api.fetchAndCleanUrl(WEB, cleanup, h.toast)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(cleanup).not.toHaveBeenCalled(); expect(h.fetch).toHaveBeenCalledTimes(1);
  });
  it('omits source URLs, echoed credentials and provider bodies from terminal errors and diagnostics', async () => {
    const bodyReader = vi.fn(async () => 'SYNTHETIC_PRIVATE_PROVIDER_BODY ' + KEY + ' ' + CANARY);
    const h = harness(async () => ({ ok: false, status: 403, statusText: 'SYNTHETIC_PRIVATE_PROVIDER_BODY', text: bodyReader, json: bodyReader }));
    let error; try { await h.api.fetchAndCleanUrl(WEB, null, h.toast); } catch (e) { error = e; }
    expect(error).toMatchObject({ code: 'source-import-failed' });
    const text = JSON.stringify([h.diagnostics, h.toast.mock.calls, error.message]);
    for (const privateText of [KEY, CANARY, 'SYNTHETIC_PRIVATE_PROVIDER_BODY', 'SYNTHETIC_PRIVATE_PATH']) expect(text).not.toContain(privateText);
    expect(bodyReader).not.toHaveBeenCalled();
    expect(h.fetch.mock.calls.filter(([url]) => isGemini(url))).toHaveLength(1);
  });
});

describe('actual retry transport dispatch guard', () => {
  it('runs a synchronous guard after attempt telemetry and before native fetch', async () => {
    const h = harness(); let approved = true;
    const beforeRequest = vi.fn(() => { if (!approved) throw Object.assign(new Error(CANARY), { code: 'managed-ai-blocked' }); });
    await expect(h.api.fetchWithExponentialBackoff('https://synthetic-api.example/text', { beforeRequest }, 5, 10000,
      { onInnerAttempt: () => { approved = false; } })).rejects.toMatchObject({ code: 'managed-ai-blocked', isFatal: true });
    expect(beforeRequest).toHaveBeenCalledTimes(1); expect(h.fetch).not.toHaveBeenCalled();
  });
  it('does not expose the application-only callback to native fetch', async () => {
    const h = harness(), beforeRequest = vi.fn();
    await h.api.fetchWithExponentialBackoff('https://synthetic-api.example/text', { method: 'POST', body: 'synthetic', beforeRequest }, 1);
    expect(beforeRequest).toHaveBeenCalledTimes(1);
    expect(h.fetch.mock.calls[0][1]).toMatchObject({ method: 'POST', body: 'synthetic' });
    expect(h.fetch.mock.calls[0][1]).not.toHaveProperty('beforeRequest');
  });
  it('rechecks after retry telemetry and prevents a second request after revocation', async () => {
    vi.useFakeTimers(); const h = harness(async () => ({ ok: false, status: 503 })); let approved = true;
    const beforeRequest = vi.fn(() => { if (!approved) throw Object.assign(new Error(CANARY), { code: 'managed-ai-blocked' }); });
    const pending = h.api.fetchWithExponentialBackoff('https://synthetic-api.example/text', { beforeRequest }, 5, 10000,
      { onInnerBackoff: () => { approved = false; } });
    const rejected = expect(pending).rejects.toMatchObject({ code: 'managed-ai-blocked', isFatal: true });
    await vi.runAllTimersAsync(); await rejected;
    expect(h.fetch).toHaveBeenCalledTimes(1); expect(beforeRequest).toHaveBeenCalledTimes(2);
  });
  for (const [name, beforeRequest] of [
    ['invalid callback', 'not-a-function'], ['null callback', null], ['false result', () => false], ['async result', async () => true]
  ]) it('fails closed without retry for ' + name, async () => {
    const h = harness(); await expect(h.api.fetchWithExponentialBackoff('https://synthetic-api.example/text', { beforeRequest }, 5))
      .rejects.toMatchObject({ code: 'managed-ai-blocked', isFatal: true });
    expect(h.fetch).not.toHaveBeenCalled();
  });
  it('treats a guard cancellation as final without retrying it as a timeout', async () => {
    const h = harness();
    await expect(h.api.fetchWithExponentialBackoff('https://synthetic-api.example/text', { beforeRequest: () => { throw Object.assign(new Error(CANARY), { name: 'AbortError' }); } }, 5))
      .rejects.toMatchObject({ name: 'AbortError', isFatal: true });
    expect(h.fetch).not.toHaveBeenCalled();
  });
});
