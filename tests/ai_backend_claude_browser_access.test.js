// Claude (Anthropic) backend contract — 2026-08-04 fixes.
//
// Two production bugs made the in-app Claude backend unusable from a browser:
//  1. Requests to api.anthropic.com lacked the documented CORS opt-in header
//     `anthropic-dangerous-direct-browser-access`, so every browser-direct call
//     died in preflight before reaching Anthropic.
//  2. The payload carried `temperature` (testConnection sends 0) and the default
//     + catalog models were RETIRED ids (claude-sonnet-4-20250514,
//     claude-3-5-haiku-20241022) — current Claude models reject non-default
//     sampling params with a 400, and retired ids 404.
// These pins hold the fixed contract: right header, no sampling params, current ids.
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

const RETIRED_IDS = ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022'];

function claudeProvider(fetchWithRetry, models = {}) {
  return new AIProvider({
    backend: 'claude',
    apiKey: 'fixture-key',
    baseUrl: 'https://api.anthropic.com',
    models,
    fetchWithRetry,
    debugLog: () => {},
    warnLog: () => {},
  });
}

describe('Claude browser-direct request contract', () => {
  it('sends the CORS opt-in and version headers, no sampling params, to /v1/messages', async () => {
    const calls = [];
    const fetchWithRetry = vi.fn(async (url, options) => {
      calls.push({ url, options });
      return { json: async () => ({ content: [{ type: 'text', text: 'OK' }] }) };
    });
    const ai = claudeProvider(fetchWithRetry);

    const result = await ai.testConnection();
    expect(result.success).toBe(true);

    const messageCall = calls.find((c) => String(c.url).endsWith('/v1/messages'));
    expect(messageCall).toBeTruthy();
    expect(messageCall.options.headers['anthropic-dangerous-direct-browser-access']).toBe('true');
    expect(messageCall.options.headers['anthropic-version']).toBe('2023-06-01');
    expect(messageCall.options.headers['x-api-key']).toBe('fixture-key');

    const body = JSON.parse(messageCall.options.body);
    // Current Claude models 400 on non-default sampling params — the payload
    // must not carry them even though testConnection requests temperature 0.
    expect(body).not.toHaveProperty('temperature');
    expect(body).not.toHaveProperty('top_p');
    expect(body).not.toHaveProperty('top_k');
    expect(body.model).toBe('claude-sonnet-5');
  });

  it('defaults to a current model and catalogs only current ids', async () => {
    const ai = claudeProvider(async () => ({ json: async () => ({}) }));
    expect(ai.models.default).toBe('claude-sonnet-5');

    const catalog = await ai.listAvailableModels();
    const ids = catalog.map((m) => m.id);
    expect(ids).toContain('claude-sonnet-5');
    expect(ids).toContain('claude-opus-5');
    expect(ids).toContain('claude-haiku-4-5');
    for (const retired of RETIRED_IDS) {
      expect(ids).not.toContain(retired);
    }
  });
});
