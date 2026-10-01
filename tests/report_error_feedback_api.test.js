import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Exercise the canonical source before the coordinating agent builds mirrors.
const source = readFileSync(resolve(process.cwd(), 'gemini_api_source.jsx'), 'utf8');
const factory = new Function(source + '\nreturn createGeminiAPI;')();
const models = { default: 'primary', fallback: 'primary', vision: 'vision', image: 'image' };
const failure = (status, message = 'provider rejected request') => Object.assign(new Error(message), { httpStatus: status });
const response = (text = 'Usable output') => ({ text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] }) });
const history = () => window.__alloApiFeedbackHistory || [];

function makeApi(fetch, extras = {}) {
  return factory({
    apiKey: 'fixture-key', _isCanvasEnv: false, GEMINI_MODELS: models,
    fetchWithExponentialBackoff: fetch, canvasAuthBackoffMs: [],
    optimizeImage: async value => value, warnLog: vi.fn(), debugLog: vi.fn(),
    getAbortSignal: () => null, ...extras,
  });
}

beforeEach(() => {
  document.getElementById('alloflow-quota-banner')?.remove();
  delete window.__alloflowQuotaState;
  delete window.__alloApiFeedbackHistory;
  delete window.__alloGeminiQuotaHits;
  delete window.ALLOFLOW_MANAGED_AI_POLICY;
  sessionStorage.removeItem('__alloflowQuotaBannerDismissed');
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('truthful API classification and recovery', () => {
  it('keeps HTTP 401/403 connection errors distinct from HTTP 429 quota errors', () => {
    const api = makeApi(vi.fn());
    const denied = api._classifyGeminiError(failure(403, 'Cannot generate content: permission denied'));
    expect(denied.kind).toBe('auth');
    expect(denied.httpStatus).toBe(403);
    expect(api._classifyGeminiError(failure(401, 'rate limit exceeded in unrelated prior diagnostic')).kind).toBe('auth');
    expect(api._classifyGeminiError(failure(429, 'Authentication check completed')).kind).toBe('quota');
    expect(api._classifyGeminiError(failure(403, 'quota check failed')).kind).toBe('quota');
    expect(denied.userMessage).toMatch(/key|permission/i);
    expect(denied.userMessage).not.toMatch(/heavy usage|brief rate-limit|midnight|key is not/i);
  });

  it('retains a recovered Canvas auth attempt with one request ID and no active failure', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(failure(401, 'Private source and key=secret')).mockResolvedValueOnce(response());
    const api = makeApi(fetch, { _isCanvasEnv: true, canvasAuthBackoffMs: [0, 0] });
    await expect(api.callGemini('Private source')).resolves.toBe('Usable output');
    expect(history().map(entry => entry.state)).toEqual(['pending', 'retrying', 'succeeded']);
    expect(new Set(history().map(entry => entry.requestId)).size).toBe(1);
    expect(history()[1]).toMatchObject({ kind: 'auth', httpStatus: 401, attempt: 1 });
    expect(JSON.stringify(history())).not.toMatch(/Private source|key=secret/);
    expect(console.error).not.toHaveBeenCalled();
    expect(document.getElementById('alloflow-quota-banner')).toBeNull();
  });

  it('reports exactly one terminal failure after bounded retries exhaust', async () => {
    const fetch = vi.fn().mockRejectedValue(failure(403));
    const api = makeApi(fetch, { _isCanvasEnv: true, canvasAuthBackoffMs: [0, 0] });
    await expect(api.callGemini('x')).rejects.toMatchObject({ isAuth: true, httpStatus: 403 });
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(history().map(entry => entry.state)).toEqual(['pending', 'retrying', 'retrying', 'failed']);
    expect(history().at(-1)).toMatchObject({ kind: 'auth', httpStatus: 403, attempt: 3 });
  });

  it('retains a primary-model quota attempt when a model fallback succeeds', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(failure(429)).mockResolvedValueOnce(response());
    const api = makeApi(fetch, { GEMINI_MODELS: { ...models, fallback: 'fallback' } });
    await expect(api.callGemini('x')).resolves.toBe('Usable output');
    expect(history().map(entry => entry.state)).toEqual(['pending', 'retrying', 'succeeded']);
    expect(history()[1]).toMatchObject({ kind: 'quota', httpStatus: 429 });
    expect(document.getElementById('alloflow-quota-banner')).toBeNull();
  });

  it('preserves both failed remote attempts when an approved local fallback completes the task', async () => {
    const originalProvider = window.AIProvider;
    localStorage.setItem('alloflow_ai_config', JSON.stringify({
      backend: 'gemini', localFallback: { enabled: true, backend: 'alloflow-local',
        localModelProfile: { taskSupport: { simpleText: 'pass' } } },
    }));
    window.AIProvider = class { async generateText() { return 'Local task output'; } };
    try {
      const fetch = vi.fn().mockRejectedValueOnce(failure(429)).mockRejectedValueOnce(failure(403));
      const api = makeApi(fetch, { GEMINI_MODELS: { ...models, fallback: 'fallback' } });
      await expect(api.callGemini('x')).resolves.toBe('Local task output');
      expect(fetch).toHaveBeenCalledTimes(2);
      expect(history().map(entry => entry.state)).toEqual(['pending', 'retrying', 'retrying', 'retrying', 'succeeded']);
      expect(history()[1]).toMatchObject({ kind: 'quota', httpStatus: 429 });
      expect(history()[2]).toMatchObject({ kind: 'auth', httpStatus: 403 });
      expect(console.error).not.toHaveBeenCalled();
    } finally {
      window.AIProvider = originalProvider;
      localStorage.removeItem('alloflow_ai_config');
    }
  });

  it('does not announce recovery for an empty candidate or empty Vision response', async () => {
    const api = makeApi(vi.fn().mockRejectedValue(failure(401)));
    for (let i = 0; i < 3; i++) await expect(api.callGemini('x')).rejects.toMatchObject({ isAuth: true });
    const empty = makeApi(vi.fn().mockResolvedValue(response('')));
    await expect(empty.callGemini('x')).rejects.toThrow(/Empty response text/);
    expect(window.__alloflowQuotaState.active).toBe(true);
    await expect(empty.callGeminiVision('x', 'fixture', 'image/png')).rejects.toThrow(/No text generated/);
    expect(window.__alloflowQuotaState.active).toBe(true);
    expect(history().at(-1).state).toBe('failed');
  });

  it('an old recovery timer cannot remove a newer failure notice', async () => {
    vi.useFakeTimers();
    let current = () => Promise.reject(failure(401));
    const api = makeApi((...args) => current(...args));
    for (let i = 0; i < 3; i++) await expect(api.callGemini('x')).rejects.toMatchObject({ isAuth: true });
    current = () => Promise.resolve(response());
    await api.callGemini('x');
    expect(document.getElementById('alloflow-quota-banner').getAttribute('role')).toBe('status');
    current = () => Promise.reject(failure(429));
    await expect(api.callGemini('x')).rejects.toMatchObject({ isQuota: true });
    await vi.advanceTimersByTimeAsync(6000);
    const banner = document.getElementById('alloflow-quota-banner');
    expect(banner).toBeTruthy();
    expect(banner.getAttribute('role')).toBe('alert');
    expect(window.__alloflowQuotaState).toMatchObject({ active: true, kind: 'quota' });
    expect(window.__alloGeminiQuotaHits).toHaveLength(1);
  });

  it('interruption cancels retry backoff immediately, including an ambient Stop signal', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const fetch = vi.fn().mockRejectedValue(failure(401));
    const api = makeApi(fetch, { _isCanvasEnv: true, canvasAuthBackoffMs: [3000, 3000], getAbortSignal: () => controller.signal });
    const promise = api.callGemini('x');
    const result = expect(promise).rejects.toMatchObject({ name: 'AbortError' });
    await vi.advanceTimersByTimeAsync(0);
    expect(history().at(-1).state).toBe('retrying');
    controller.abort();
    await result;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    expect(history().map(entry => entry.state)).toEqual(['pending', 'retrying', 'cancelled']);
  });

  it('a pre-cancelled request never fetches or announces failure', async () => {
    const controller = new AbortController(); controller.abort();
    const fetch = vi.fn();
    const api = makeApi(fetch);
    await expect(api.callGemini('x', false, false, null, null, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetch).not.toHaveBeenCalled();
    expect(history().map(entry => entry.state)).toEqual(['pending', 'cancelled']);
  });

  it('an absent direct API key is an actionable auth failure instead of an empty success', async () => {
    localStorage.removeItem('alloflow_ai_config');
    const fetch = vi.fn();
    const api = makeApi(fetch, { apiKey: '' });
    await expect(api.callGemini('x')).rejects.toMatchObject({ isAuth: true });
    expect(fetch).not.toHaveBeenCalled();
    expect(history().map(entry => entry.state)).toEqual(['pending', 'failed']);
    expect(history().at(-1).message).toMatch(/key|connection/i);
  });

  it('concurrent failures and successes remain separate requests', async () => {
    let resolveSuccess;
    const success = new Promise(resolve => { resolveSuccess = resolve; });
    const fetch = vi.fn().mockRejectedValueOnce(failure(401)).mockReturnValueOnce(success);
    const api = makeApi(fetch);
    const failed = api.callGemini('first');
    const succeeded = api.callGemini('second');
    await expect(failed).rejects.toMatchObject({ isAuth: true });
    resolveSuccess(response()); await succeeded;
    const failures = history().filter(entry => entry.state === 'failed');
    const successes = history().filter(entry => entry.state === 'succeeded');
    expect(failures).toHaveLength(1); expect(successes).toHaveLength(1);
    expect(failures[0].requestId).not.toBe(successes[0].requestId);
  });
});
