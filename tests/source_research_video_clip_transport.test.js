import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const moduleText = readFileSync(resolve(process.cwd(), 'gemini_api_module.js'), 'utf8');
const videoUrl = 'https://www.youtube.com/watch?v=9hE5-98ZeCg';
const videoClip = { startSeconds: 40, endSeconds: 80 };
const resultText = JSON.stringify({ status: 'ok', title: 'Water cycle', transcript: 'Water evaporates and later condenses into clouds.' });
const models = { default: 'gemini-test-video', fallback: 'gemini-test-video', vision: 'gemini-test-video' };

function response() {
  return {
    ok: true,
    text: async () => JSON.stringify({ candidates: [{ content: { parts: [{ text: resultText }] }, finishReason: 'STOP' }] }),
  };
}

function makeApi(overrides = {}) {
  (0, eval)(moduleText);
  const fetchRequest = vi.fn(async () => response());
  const api = window.AlloModules.createGeminiAPI({
    apiKey: 'video-clip-test-key',
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

function readVideo(api, options = { videoUrl, videoClip }, signal = null, search = false, code = false) {
  return api.callGemini('Transcribe only the requested clip into JSON.', true, search, 0.1, null, signal, code, null, options);
}

function payload(fetchRequest, index = 0) {
  return JSON.parse(fetchRequest.mock.calls[index][1].body);
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

describe('Gemini research video clip transport', () => {
  it('attaches clip offsets to the video part and preserves the untrusted-media boundary', async () => {
    const controller = new AbortController();
    const { api, fetchRequest } = makeApi();
    await expect(readVideo(api, { videoUrl, videoClip }, controller.signal)).resolves.toBe(resultText);
    expect(fetchRequest).toHaveBeenCalledTimes(1);
    const [url, options] = fetchRequest.mock.calls[0];
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test-video:generateContent');
    expect(options.headers['x-goog-api-key']).toBe('video-clip-test-key');
    expect(options.signal).toBe(controller.signal);
    expect(payload(fetchRequest).contents[0].parts).toEqual([
      { text: expect.stringMatching(/^SECURITY BOUNDARY:.*UNTRUSTED DATA/) },
      { fileData: { fileUri: videoUrl, mimeType: 'video/*' }, videoMetadata: { startOffset: '40s', endOffset: '80s' } },
    ]);
    expect(payload(fetchRequest).tools).toBeUndefined();
  });

  it('supports a zero-second start and a one-second clip', async () => {
    const { api, fetchRequest } = makeApi();
    await readVideo(api, { videoUrl, videoClip: { startSeconds: 0, endSeconds: 1 } });
    expect(payload(fetchRequest).contents[0].parts[1].videoMetadata).toEqual({ startOffset: '0s', endOffset: '1s' });
  });

  it('exposes enumerable clip capability flags on both call paths', () => {
    const { api } = makeApi();
    for (const call of [api.callGemini, api.callGeminiSingleAttempt]) {
      expect(call._alloflowVideoClipInput).toBe(true);
      expect(Object.keys(call)).toContain('_alloflowVideoClipInput');
      expect(call._alloflowVideoInput).toBe(true);
    }
  });

  it.each([
    null, undefined, false, '40:80', 40, [], {},
    { startSeconds: 0 }, { endSeconds: 80 },
    { startSeconds: '40', endSeconds: 80 },
    { startSeconds: 40, endSeconds: '80' },
    { startSeconds: null, endSeconds: 80 },
    { startSeconds: -1, endSeconds: 80 },
    { startSeconds: 40, endSeconds: 40 },
    { startSeconds: 80, endSeconds: 40 },
    { startSeconds: 0.5, endSeconds: 80 },
    { startSeconds: 40, endSeconds: 80.5 },
    { startSeconds: NaN, endSeconds: 80 },
    { startSeconds: 40, endSeconds: Infinity },
    { startSeconds: 0, endSeconds: Number.MAX_SAFE_INTEGER + 1 },
    Object.create({ startSeconds: 40, endSeconds: 80 }),
  ].map(value => [value]))('rejects malformed clip %j before requesting, without whole-video fallback', async invalid => {
    const { api, fetchRequest } = makeApi();
    await expect(readVideo(api, { videoUrl, videoClip: invalid })).rejects.toMatchObject({ code: 'allo/invalid-video-clip' });
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it('rejects clip metadata without its own video URL', async () => {
    const { api, fetchRequest } = makeApi();
    await expect(readVideo(api, { videoClip })).rejects.toMatchObject({ code: 'allo/invalid-video-clip' });
    const inheritedUrl = Object.assign(Object.create({ videoUrl }), { videoClip });
    await expect(readVideo(api, inheritedUrl)).rejects.toMatchObject({ code: 'allo/invalid-video-clip' });
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it('retains canonical URL validation for clipped requests', async () => {
    const { api, fetchRequest } = makeApi();
    await expect(readVideo(api, { videoUrl: `${videoUrl}&t=40`, videoClip })).rejects.toMatchObject({ code: 'allo/invalid-video-url' });
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it('validates clip metadata on the single-attempt call path', async () => {
    const { api, fetchRequest } = makeApi();
    await expect(api.callGeminiSingleAttempt('Read clip.', true, false, null, null, null, false, null,
      { videoUrl, videoClip: { startSeconds: 40, endSeconds: 20 } })).rejects.toMatchObject({ code: 'allo/invalid-video-clip' });
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it.each([[true, false], [false, true]])('keeps clipped videos incompatible with search=%s/code=%s', async (search, code) => {
    const { api, fetchRequest } = makeApi();
    await expect(readVideo(api, { videoUrl, videoClip }, null, search, code)).rejects.toMatchObject({ code: 'allo/video-tools-unsupported' });
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it('keeps clipped media blocked by the managed text policy', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = {
      version: 1, allowExternalSearch: true,
      connections: [{ backend: 'gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', canvasHost: true }],
    };
    const { api, fetchRequest } = makeApi({ _isCanvasEnv: true });
    await expect(readVideo(api)).rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(fetchRequest).not.toHaveBeenCalled();
  });

  it('retains the clip on bounded Canvas authentication retry', async () => {
    const fetchRequest = vi.fn().mockRejectedValueOnce(new Error('401 Unauthorized')).mockResolvedValueOnce(response());
    const { api } = makeApi({ _isCanvasEnv: true, fetchWithExponentialBackoff: fetchRequest });
    await expect(readVideo(api)).resolves.toBe(resultText);
    expect(fetchRequest).toHaveBeenCalledTimes(2);
    for (const [, options] of fetchRequest.mock.calls) {
      expect(JSON.parse(options.body).contents[0].parts[1]).toEqual({
        fileData: { fileUri: videoUrl, mimeType: 'video/*' },
        videoMetadata: { startOffset: '40s', endOffset: '80s' },
      });
    }
  });

  it('does not retry a provider-rejected clip as the whole video', async () => {
    const fetchRequest = vi.fn(async () => { throw new Error('400 INVALID_ARGUMENT: Invalid video clip bounds'); });
    const { api } = makeApi({ fetchWithExponentialBackoff: fetchRequest });
    await expect(readVideo(api)).rejects.toThrow();
    expect(fetchRequest).toHaveBeenCalledTimes(1);
    expect(payload(fetchRequest).contents[0].parts[1].videoMetadata).toEqual({ startOffset: '40s', endOffset: '80s' });
  });

  it('does not send a clipped video to the local text fallback on quota failure', async () => {
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

  it('propagates cancellation without another request', async () => {
    const controller = new AbortController();
    controller.abort();
    const { api, fetchRequest } = makeApi();
    await expect(readVideo(api, { videoUrl, videoClip }, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
    expect(fetchRequest).not.toHaveBeenCalled();
    const error = Object.assign(new Error('Cancelled'), { name: 'AbortError' });
    fetchRequest.mockRejectedValueOnce(error);
    await expect(readVideo(api)).rejects.toBe(error);
    expect(fetchRequest).toHaveBeenCalledTimes(1);
  });

  it('leaves whole-video requests unchanged when no own clip option exists', async () => {
    const { api, fetchRequest } = makeApi();
    await readVideo(api, { videoUrl });
    await readVideo(api, Object.assign(Object.create({ videoClip }), { videoUrl }));
    expect(fetchRequest).toHaveBeenCalledTimes(2);
    for (let index = 0; index < 2; index++) {
      expect(payload(fetchRequest, index).contents[0].parts[1]).toEqual({ fileData: { fileUri: videoUrl } });
    }
  });

  it('leaves ordinary JSON/search/code requests unchanged', async () => {
    const { api, fetchRequest } = makeApi();
    await api.callGemini('Ordinary prompt.', true, true, 0.2, 'Water cycle', null, true, null, { intent: 'user-topic' });
    expect(payload(fetchRequest).contents).toEqual([{ parts: [{ text: 'Ordinary prompt.' }] }]);
    expect(payload(fetchRequest).tools).toEqual([{ google_search: {} }, { code_execution: {} }]);
    expect(fetchRequest).toHaveBeenCalledTimes(1);
  });
});
