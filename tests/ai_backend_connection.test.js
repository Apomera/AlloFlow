import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { loadAlloModule } from './setup.js';

let AIProvider;

beforeAll(() => {
  loadAlloModule('ai_backend_module.js');
  AIProvider = window.AIProvider;
  if (!AIProvider) throw new Error('AIProvider failed to register');
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function provider(backend, fetchWithRetry, models = {}) {
  return new AIProvider({
    backend,
    apiKey: 'fixture-key',
    baseUrl: 'https://fixture.invalid',
    models,
    fetchWithRetry,
    debugLog: () => {},
    warnLog: () => {},
  });
}

describe('AIProvider connection verification', () => {
  it('fails when both discovery and the real text request are unreachable', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('network offline'); }));
    const ai = provider('openai', async () => { throw new Error('network offline'); });

    await expect(ai.testConnection()).resolves.toMatchObject({
      success: false,
      error: 'network offline',
    });
  });

  it('fails on an authentication error instead of treating an empty catalog as success', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: async () => ({}),
    })));
    const ai = provider('openai', async () => { throw new Error('HTTP 401: Unauthorized'); });

    const result = await ai.testConnection();
    expect(result.success).toBe(false);
    expect(result.error).toContain('401');
  });

  it('does not let Claude static catalog entries bypass a failed generation request', async () => {
    const ai = provider('claude', async () => { throw new Error('Failed to fetch'); });

    await expect(ai.testConnection()).resolves.toMatchObject({
      success: false,
      error: 'Failed to fetch',
    });
  });

  it('selects a discovered model and succeeds only after a non-empty text response', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 'gpt-fixture' }] }),
    })));
    const calls = [];
    const ai = provider('openai', async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return { json: async () => ({ choices: [{ message: { content: 'OK' } }] }) };
    });

    const result = await ai.testConnection();
    expect(result).toMatchObject({
      success: true,
      modelCount: 1,
      selectedModel: 'gpt-fixture',
      capabilities: { text: true, vision: false, image: false },
    });
    expect(calls).toHaveLength(1);
    expect(calls[0]).toMatchObject({ model: 'gpt-fixture', max_tokens: 8 });
  });

  it('fails when the provider returns an empty completion', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ data: [{ id: 'gpt-fixture' }] }),
    })));
    const ai = provider('openai', async () => ({
      json: async () => ({ choices: [{ message: { content: '' } }] }),
    }));

    await expect(ai.testConnection()).resolves.toMatchObject({
      success: false,
      error: 'The provider returned an empty text response.',
    });
  });
});
