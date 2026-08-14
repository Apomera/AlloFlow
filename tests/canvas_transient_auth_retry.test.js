import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

// In Gemini Canvas the app never holds an API key — Canvas injects it — so an
// HTTP 401 is almost always a brief throttle, not a dead credential. The
// classifier has flagged that as `canvasTransientAuth` since 2026-06-19, but
// only doc_pipeline and view_pdf_audit ever read the flag. Every other caller
// (grammar repair, glossary, personas, adventure…) treated one throttled call
// as permanent and surfaced its own generic "…failed" message, which reads as a
// feature bug rather than a hiccup.
//
// Field evidence 2026-07-27: a teacher's read-aloud trace logged 401, 401, then
// a clean success on the same key in the same session, while grammar repair —
// one call, no retry — reported failure. These tests pin the retry that now
// lives in callGemini itself, so every call site inherits it.

let createGeminiAPI;

const OK_TEXT = JSON.stringify({
  candidates: [{ content: { parts: [{ text: 'hello' }] }, finishReason: 'STOP' }],
  modelVersion: 'gemini-3-flash-preview',
});

// fetchWithExponentialBackoff throws on non-OK; the classifier reads the HTTP
// status out of the thrown message.
const throwStatus = (status, label) => {
  const e = new Error(`Gemini API error: ${status} ${label}`);
  e.status = status;
  return e;
};

const okResponse = () => ({ ok: true, status: 200, text: async () => OK_TEXT });

beforeAll(() => {
  loadAlloModule('gemini_api_module.js');
  createGeminiAPI = (window.AlloModules && window.AlloModules.createGeminiAPI) || window.createGeminiAPI;
  if (typeof createGeminiAPI !== 'function') throw new Error('createGeminiAPI failed to register');
});

afterEach(() => {
  vi.restoreAllMocks();
});

function makeApi({ isCanvas, apiKey, fetchImpl }) {
  return createGeminiAPI({
    apiKey,
    _isCanvasEnv: isCanvas,
    GEMINI_MODELS: { default: 'gemini-3-flash-preview', fallback: 'gemini-3-flash-preview' },
    fetchWithExponentialBackoff: fetchImpl,
    optimizeImage: async (x) => x,
    warnLog: () => {},
    debugLog: () => {},
    getAbortSignal: () => null,
  });
}

describe('Canvas transient 401 retry', () => {
  it('recovers when the throttle clears on a later attempt', async () => {
    const fetchImpl = vi.fn()
      .mockRejectedValueOnce(throwStatus(401, 'UNAUTHENTICATED'))
      .mockRejectedValueOnce(throwStatus(401, 'UNAUTHENTICATED'))
      .mockResolvedValueOnce(okResponse());

    const api = makeApi({ isCanvas: true, apiKey: '', fetchImpl });
    const out = await api.callGemini('say hello');

    // Exactly the 401 / 401 / ok sequence from the field trace.
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(out).toContain('hello');
  }, 30000);

  it('exposes an unladdered single-attempt entry for the document pipeline', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(throwStatus(401, 'UNAUTHENTICATED'));

    const api = makeApi({ isCanvas: true, apiKey: '', fetchImpl });
    expect(typeof api.callGeminiSingleAttempt).toBe('function');
    await expect(api.callGeminiSingleAttempt('say hello')).rejects.toBeTruthy();

    // The document pipeline owns its outer breaker/retry; this entry makes one
    // Gemini request and does not add the Canvas auth ladder on top of it.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  }, 30000);

  it('gives up after a bounded number of attempts', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(throwStatus(401, 'UNAUTHENTICATED'));

    const api = makeApi({ isCanvas: true, apiKey: '', fetchImpl });
    await expect(api.callGemini('say hello')).rejects.toBeTruthy();

    // 3 total: the original plus two retries. A genuinely dead key must not be
    // hammered forever.
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  }, 30000);

  it("does not retry a 401 outside Canvas, where the key is really the user's", async () => {
    const fetchImpl = vi.fn().mockRejectedValue(throwStatus(401, 'UNAUTHENTICATED'));

    const api = makeApi({ isCanvas: false, apiKey: 'a-real-user-key', fetchImpl });
    await expect(api.callGemini('say hello')).rejects.toBeTruthy();

    // A bad key on a self-hosted deployment is permanent — retrying turns one
    // clear failure into three and delays the real message.
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  }, 30000);

  it('does not retry a quota error, which retrying would only make worse', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(throwStatus(429, 'RESOURCE_EXHAUSTED'));

    const api = makeApi({ isCanvas: true, apiKey: '', fetchImpl });
    await expect(api.callGemini('say hello')).rejects.toBeTruthy();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
  }, 30000);

  it('succeeds on the first call without retrying', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(okResponse());

    const api = makeApi({ isCanvas: true, apiKey: '', fetchImpl });
    const out = await api.callGemini('say hello');

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(out).toContain('hello');
  }, 30000);
});
