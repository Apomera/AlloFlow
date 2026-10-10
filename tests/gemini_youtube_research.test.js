import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const moduleText = readFileSync(resolve(process.cwd(), 'gemini_api_module.js'), 'utf8');
const videoUrl = 'https://www.youtube.com/watch?v=9hE5-98ZeCg';
const resultText = JSON.stringify({ status: 'ok', title: 'Water cycle', transcript: 'Water evaporates and later condenses into clouds.' });
const models = { default: 'gemini-test-video', fallback: 'gemini-test-video', vision: 'gemini-test-video' };

function response(parts = [{ text: resultText }], finishReason = 'STOP', extra = {}) {
  return {
    ok: true,
    text: async () => JSON.stringify({ candidates: [{ content: { parts }, ...(finishReason ? { finishReason } : {}) }], ...extra }),
  };
}

function makeApi(overrides = {}) {
  (0, eval)(moduleText);
  const fetchRequest = vi.fn(async () => response());
  const api = window.AlloModules.createGeminiAPI({
    apiKey: 'video-test-key',
    _isCanvasEnv: false,
    GEMINI_MODELS: models,
    fetchWithExponentialBackoff: fetchRequest,
    optimizeImage: async value => value,
    warnLog: vi.fn(),
    debugLog: vi.fn(),
    getAbortSignal: () => null,
    canvasAuthBackoffMs: [0, 0],
    ...overrides,
  });
  return { api, fetchRequest };
}

function readVideo(api, options = { videoUrl }, signal = null, useSearch = false, useCodeExecution = false, telemetry = null) {
  return api.callGemini('Transcribe the attached video into JSON.', true, useSearch, 0.1, null, signal, useCodeExecution, telemetry, options);
}

beforeEach(() => {
  localStorage.removeItem('alloflow_ai_config');
  delete window.ALLOFLOW_MANAGED_AI_POLICY;
  delete window.__alloflowQuotaState;
  document.getElementById('alloflow-quota-banner')?.remove();
});

afterEach(() => {
  localStorage.removeItem('alloflow_ai_config');
  delete window.ALLOFLOW_MANAGED_AI_POLICY;
  delete window.__alloflowQuotaState;
  document.getElementById('alloflow-quota-banner')?.remove();
  vi.restoreAllMocks();
});

describe('Gemini research video transport', () => {
  it('attaches only the canonical video and preserves configured model, JSON, authentication, pacing and signal', async () => {
    const controller = new AbortController();
    const { api, fetchRequest } = makeApi({ maxTextOutputTokens: 3072 });
    const onModel = vi.fn();
    expect(api.callGemini._alloflowVideoInput).toBe(true);
    expect(api.callGeminiSingleAttempt._alloflowVideoInput).toBe(true);
    await expect(readVideo(api, { videoUrl, trustedAttachment: true }, controller.signal, false, false, { onModel })).resolves.toBe(resultText);
    expect(fetchRequest).toHaveBeenCalledTimes(1);
    const [url, options, attempts, timeout] = fetchRequest.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test-video:generateContent');
    expect(url).not.toContain('video-test-key');
    expect(options.headers).toEqual({ 'Content-Type': 'application/json', 'x-goog-api-key': 'video-test-key' });
    expect(options.signal).toBe(controller.signal);
    expect(attempts).toBe(2);
    expect(timeout).toBe(80000);
    const body = JSON.parse(options.body);
    expect(body.contents[0].parts).toHaveLength(2);
    expect(body.contents[0].parts[0].text).toMatch(/^SECURITY BOUNDARY:.*UNTRUSTED DATA/);
    expect(body.contents[0].parts[0].text).toContain('TRUSTED TASK:\nTranscribe the attached video into JSON.');
    expect(body.contents[0].parts[1]).toEqual({ fileData: { fileUri: videoUrl } });
    expect(body.generationConfig).toEqual({ maxOutputTokens: 3072, responseMimeType: 'application/json', temperature: 0.1 });
    expect(body.tools).toBeUndefined();
    expect(onModel).toHaveBeenCalledWith('gemini-test-video');
  });

  it.each([
    null, undefined, '', 5, {},
    'https://www.youtube.com/watch?v=short',
    'https://www.youtube.com/watch?v=9hE5-98ZeCg&list=private-context',
    'https://www.youtube.com/watch?v=9hE5-98ZeCg#private-context',
    'https://www.youtube.com.evil.test/watch?v=9hE5-98ZeCg',
    'https://www.youtube.com@evil.test/watch?v=9hE5-98ZeCg',
    'http://www.youtube.com/watch?v=9hE5-98ZeCg',
    'https://youtu.be/9hE5-98ZeCg',
    'https://www.youtube.com/embed/9hE5-98ZeCg',
    ' https://www.youtube.com/watch?v=9hE5-98ZeCg',
    'https://www.youtube.com/watch?v=9hE5-98ZeCg\n',
  ])('rejects noncanonical or invalid video attachment %s before requesting', async invalid => {
    const { api, fetchRequest } = makeApi();
    await expect(readVideo(api, { videoUrl: invalid })).rejects.toMatchObject({ code: 'allo/invalid-video-url' });
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it.each([[true, false], [false, true], [true, true]])('forbids search=%s/code=%s with a video attachment', async (search, code) => {
    const { api, fetchRequest } = makeApi();
    await expect(readVideo(api, { videoUrl }, null, search, code)).rejects.toMatchObject({ code: 'allo/video-tools-unsupported' });
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it('keeps media blocked under the v1 managed text policy even with an approved Canvas connection', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = {
      version: 1, allowExternalSearch: true,
      connections: [{ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', canvasHost: true }],
    };
    const { api, fetchRequest } = makeApi({ _isCanvasEnv: true });
    await expect(readVideo(api)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it('throws actionable errors without a key, including the single-attempt transport', async () => {
    const { api, fetchRequest } = makeApi({ apiKey: '' });
    await expect(readVideo(api)).rejects.toMatchObject({ originalMessage: expect.stringContaining('AI Backend Settings') });
    await expect(api.callGeminiSingleAttempt('Read video.', true, false, null, null, null, false, null, { videoUrl }))
      .rejects.toMatchObject({ code: 'allo/no-api-key', message: expect.stringContaining('AI Backend Settings') });
    await expect(api.callGeminiSingleAttempt('Legacy text.', true)).resolves.toBe('{}');
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it('supports keyless Canvas host requests without adding fake authentication', async () => {
    const { api, fetchRequest } = makeApi({ apiKey: '', _isCanvasEnv: true });
    await expect(readVideo(api)).resolves.toBe(resultText);
    expect(fetchRequest.mock.calls[0][1].headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('uses the key saved after the factory was created', async () => {
    const { api, fetchRequest } = makeApi({ apiKey: '' });
    localStorage.setItem('alloflow_ai_config', JSON.stringify({ backend: 'gemini', apiKey: 'new-key' }));
    await expect(readVideo(api)).resolves.toBe(resultText);
    expect(fetchRequest.mock.calls[0][1].headers['x-goog-api-key']).toBe('new-key');
  });

  it.each(['MAX_TOKENS', 'MALFORMED_FUNCTION_CALL', 'SAFETY', null])('rejects finish reason %s without JSON repair or a second generation', async reason => {
    const fetchRequest = vi.fn(async () => response([{ text: resultText }], reason));
    const { api } = makeApi({ fetchWithExponentialBackoff: fetchRequest });
    await expect(readVideo(api)).rejects.toMatchObject({ code: 'allo/video-response-incomplete' });
    expect(fetchRequest).toHaveBeenCalledTimes(1);
  });

  it('does not convert a blocked transcript into an empty success response', async () => {
    const fetchRequest = vi.fn(async () => response([], 'STOP', { promptFeedback: { blockReason: 'SAFETY' } }));
    const { api } = makeApi({ fetchWithExponentialBackoff: fetchRequest });
    await expect(readVideo(api)).rejects.toThrow('Content Blocked');
    expect(fetchRequest).toHaveBeenCalledTimes(1);
  });

  it('excludes thought parts from the transcript and does not revive thought-only output', async () => {
    const fetchRequest = vi.fn()
      .mockResolvedValueOnce(response([{ thought: true, text: 'Private reasoning.' }, { text: resultText }]))
      .mockResolvedValueOnce(response([{ thought: true, text: resultText }]));
    const { api } = makeApi({ fetchWithExponentialBackoff: fetchRequest });
    await expect(readVideo(api)).resolves.toBe(resultText);
    await expect(readVideo(api)).rejects.toThrow('Empty response text');
    expect(fetchRequest).toHaveBeenCalledTimes(2);
  });

  it('keeps the video attachment on the existing bounded Canvas auth retry', async () => {
    const fetchRequest = vi.fn()
      .mockRejectedValueOnce(new Error('401 Unauthorized'))
      .mockResolvedValueOnce(response());
    const { api } = makeApi({ _isCanvasEnv: true, fetchWithExponentialBackoff: fetchRequest });
    await expect(readVideo(api)).resolves.toBe(resultText);
    expect(fetchRequest).toHaveBeenCalledTimes(2);
    for (const [, options] of fetchRequest.mock.calls) {
      expect(JSON.parse(options.body).contents[0].parts[1]).toEqual({ fileData: { fileUri: videoUrl } });
    }
  });

  it('does not send a video transcription prompt to a local text fallback after quota failure', async () => {
    const provider = vi.fn(function () { this.generateText = vi.fn(async () => 'invented transcript'); });
    const previousProvider = window.AIProvider;
    window.AIProvider = provider;
    localStorage.setItem('alloflow_ai_config', JSON.stringify({ localFallback: {
      enabled: true, backend: 'alloflow-local', localModelProfile: { taskSupport: { strictJson: 'pass' } },
    } }));
    try {
      const fetchRequest = vi.fn(async () => { throw new Error('429 RESOURCE_EXHAUSTED'); });
      const { api } = makeApi({ fetchWithExponentialBackoff: fetchRequest });
      await expect(readVideo(api)).rejects.toMatchObject({ isQuota: true });
      expect(provider).not.toHaveBeenCalled();
      expect(fetchRequest).toHaveBeenCalledTimes(1);
    } finally {
      window.AIProvider = previousProvider;
    }
  });

  it('does not request after cancellation and propagates in-flight cancellation without fallback', async () => {
    const controller = new AbortController();
    controller.abort();
    const { api, fetchRequest } = makeApi();
    await expect(readVideo(api, { videoUrl }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchRequest).not.toHaveBeenCalled();
    const abortError = Object.assign(new Error('Cancelled'), { name: 'AbortError' });
    fetchRequest.mockRejectedValueOnce(abortError);
    await expect(readVideo(api)).rejects.toBe(abortError);
    expect(fetchRequest).toHaveBeenCalledTimes(1);
  });

  it('preserves ordinary text, JSON, search and code-execution request shapes', async () => {
    const { api, fetchRequest } = makeApi();
    await api.callGemini('Ordinary prompt.', true, true, 0.2, 'Water cycle', null, true, null, { intent: 'user-topic' });
    const payload = JSON.parse(fetchRequest.mock.calls[0][1].body);
    expect(payload.contents).toEqual([{ parts: [{ text: 'Ordinary prompt.' }] }]);
    expect(payload.tools).toEqual([{ google_search: {} }, { code_execution: {} }]);
    expect(payload.generationConfig).toEqual({ maxOutputTokens: 65536, responseMimeType: 'application/json', temperature: 0.2 });
    expect(fetchRequest).toHaveBeenCalledTimes(1);
  });
});
