import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

let AIProvider;
let fixture;
let originalFetch;

beforeAll(() => {
  loadAlloModule('ai_backend_module.js');
  AIProvider = window.AIProvider;
  fixture = JSON.parse(readFileSync(
    resolve(process.cwd(), 'test_data/agent_core/gemini_request_shapes.json'),
    'utf8'
  ));
  if (!AIProvider) throw new Error('AIProvider failed to register');
  originalFetch = globalThis.fetch;
});

afterEach(() => {
  vi.restoreAllMocks();
  globalThis.fetch = originalFetch;
  window.fetch = originalFetch;
});

function createProvider(overrides = {}) {
  return new AIProvider({
    backend: 'gemini',
    apiKey: 'fixture-key',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    models: {
      default: 'gemini-fixture-primary',
      fallback: 'gemini-fixture-fallback',
      imagen: 'imagen-fixture',
      image: 'gemini-image-fixture',
    },
    optimizeImage: async (url) => url,
    debugLog: () => {},
    warnLog: () => {},
    ...overrides,
  });
}

function response(json, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    json: async () => json,
    text: async () => JSON.stringify(json),
  };
}

describe('Gemini request-shape regression fixtures', () => {
  it('pins JSON mode, search grounding, safety settings, and API-key URL behavior', async () => {
    const calls = [];
    const provider = createProvider({
      fetchWithRetry: async (url, options) => {
        calls.push({ url, options });
        return response({
          candidates: [{ content: { parts: [{ text: '{"ok":true}' }] }, finishReason: 'STOP' }],
          groundingMetadata: { groundingChunks: [] },
        });
      },
    });
    const result = await provider._geminiGenerateText('Return a grounded JSON fixture.', {
      json: true,
      search: true,
      temperature: 0.2,
      maxTokens: 512,
    });
    expect(result.text).toBe('{"ok":true}');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe(fixture.text.url);
    expect(calls[0].options.method).toBe('POST');
    expect(calls[0].options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(calls[0].options.body)).toEqual(fixture.text.body);
  });

  it('pins keyless Gemini URL behavior used by host-provided environments', async () => {
    const calls = [];
    const provider = createProvider({
      apiKey: '',
      fetchWithRetry: async (url) => {
        calls.push(url);
        return response({ candidates: [{ content: { parts: [{ text: 'ok' }] }, finishReason: 'STOP' }] });
      },
    });
    await provider._geminiGenerateText('Keyless fixture.', {
      json: false, search: false, temperature: null, maxTokens: 64,
    });
    expect(calls[0]).toBe(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-fixture-primary:generateContent'
    );
  });

  it('pins the existing Imagen generation endpoint and payload', async () => {
    const calls = [];
    const fetchMock = vi.fn(async (url, options) => {
      calls.push({ url, options });
      return response({ predictions: [{ bytesBase64Encoded: 'aW1hZ2U=' }] });
    });
    globalThis.fetch = fetchMock;
    window.fetch = fetchMock;
    const provider = createProvider();
    const result = await provider._geminiGenerateImage(
      'A labeled-free water-cycle illustration.', 800, 0.8
    );
    expect(result).toBe('data:image/png;base64,aW1hZ2U=');
    expect(calls[0].url).toBe(fixture.imageGeneration.url);
    expect(calls[0].options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(calls[0].options.body)).toEqual(fixture.imageGeneration.body);
  });

  it('pins Gemini image editing with a source and reference image', async () => {
    const calls = [];
    const fetchMock = vi.fn(async (url, options) => {
      calls.push({ url, options });
      return response({ candidates: [{ content: { parts: [{ inlineData: { data: 'ZWRpdGVk' } }] } }] });
    });
    globalThis.fetch = fetchMock;
    window.fetch = fetchMock;
    const provider = createProvider();
    const result = await provider._geminiEditImage(
      'Remove the label while preserving the diagram.',
      'c291cmNlLWltYWdl',
      1024,
      0.9,
      'cmVmZXJlbmNlLWltYWdl'
    );
    expect(result).toBe('data:image/png;base64,ZWRpdGVk');
    expect(calls[0].url).toBe(fixture.imageEditing.url);
    expect(calls[0].options.headers).toEqual({ 'Content-Type': 'application/json' });
    expect(JSON.parse(calls[0].options.body)).toEqual(fixture.imageEditing.body);
  });
});
