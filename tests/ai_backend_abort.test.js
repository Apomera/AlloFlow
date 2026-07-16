import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let AIProvider;

beforeAll(() => {
  loadAlloModule('ai_backend_module.js');
  AIProvider = window.AIProvider;
  if (!AIProvider) throw new Error('AIProvider failed to register');
});

function createProvider(backend, fetchWithRetry, overrides = {}) {
  return new AIProvider({
    backend,
    apiKey: 'fixture-key',
    baseUrl: 'https://fixture.invalid',
    models: { default: 'fixture-primary', fallback: 'fixture-fallback' },
    fetchWithRetry,
    debugLog: () => {},
    warnLog: () => {},
    ...overrides,
  });
}

describe('AIProvider text cancellation', () => {
  it('rejects an already-aborted request before starting a transport', async () => {
    let calls = 0;
    const provider = createProvider('gemini', async () => {
      calls++;
      throw new Error('transport should not run');
    });
    const controller = new AbortController();
    controller.abort();

    await expect(provider.generateText('Plan a demo.', { signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(calls).toBe(0);
  });

  it.each([
    ['gemini', { candidates: [{ content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' }] }],
    ['claude', { content: [{ text: 'ok' }] }],
    ['openai', { choices: [{ message: { content: 'ok' } }] }],
  ])('forwards the same signal to the %s transport', async (backend, body) => {
    const calls = [];
    const provider = createProvider(backend, async (_url, options) => {
      calls.push(options);
      return { json: async () => body };
    });
    const controller = new AbortController();

    await expect(provider.generateText('Plan a demo.', { signal: controller.signal })).resolves.toBe('ok');
    expect(calls).toHaveLength(1);
    expect(calls[0].signal).toBe(controller.signal);
  });

  it('does not retry or fall back when Gemini is aborted', async () => {
    let calls = 0;
    const provider = createProvider('gemini', async () => {
      calls++;
      const error = new Error('cancelled');
      error.name = 'AbortError';
      throw error;
    });
    const controller = new AbortController();

    await expect(provider.generateText('Plan a demo.', { signal: controller.signal }))
      .rejects.toMatchObject({ name: 'AbortError' });
    expect(calls).toBe(1);
  });

  it('does not convert a cancelled local stream into a non-stream retry', async () => {
    let calls = 0;
    const provider = createProvider('localai', async () => {
      calls++;
      const error = new Error('cancelled');
      error.name = 'AbortError';
      throw error;
    });
    const controller = new AbortController();

    await expect(provider._openaiGenerateText('Plan a demo.', {
      json: false,
      search: false,
      temperature: null,
      maxTokens: 128,
      onProgress: () => {},
      signal: controller.signal,
    })).rejects.toMatchObject({ name: 'AbortError' });
    expect(calls).toBe(1);
  });
});
