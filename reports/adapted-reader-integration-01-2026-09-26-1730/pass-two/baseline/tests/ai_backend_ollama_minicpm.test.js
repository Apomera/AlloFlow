// MiniCPM local profiles + the two Ollama request shapes they depend on.
//
// MiniCPM5-2B (OpenBMB, Apache-2.0, Ollama tag openbmb/minicpm5-2b) is the first
// small open model that looks usable for the keyless lanes, and MiniCPM-V 4.6 is
// its 1.3B vision sibling. Both only help if (1) the profile builder recognises
// the tag, (2) Ollama is told the context window the profile budgets against
// (its server default is 4096 whatever the model holds), and (3) images reach
// Ollama's native /api/chat in the shape it understands: a string `content`
// plus an `images` array of raw base64, not OpenAI content parts.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let AIProvider;
let buildLocalModelProfile;

beforeAll(() => {
  loadAlloModule('ai_backend_module.js');
  AIProvider = window.AIProvider;
  buildLocalModelProfile = window.AIBackendLocal && window.AIBackendLocal.buildLocalModelProfile;
  if (!AIProvider || !buildLocalModelProfile) throw new Error('ai_backend_module did not register AIProvider / AIBackendLocal');
});

function recorder(responder) {
  const calls = [];
  const fetchWithRetry = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, body });
    return { json: async () => responder(body) };
  };
  return { calls, fetchWithRetry };
}

function createProvider(backend, fetchWithRetry, overrides = {}) {
  return new AIProvider({
    backend,
    apiKey: '',
    baseUrl: 'http://127.0.0.1:11434',
    fetchWithRetry,
    debugLog: () => {},
    warnLog: () => {},
    ...overrides,
  });
}

describe('MiniCPM local model profiles', () => {
  it('recognises the namespaced Ollama tag and budgets a 16k window for MiniCPM5', () => {
    const profile = buildLocalModelProfile({ backend: 'ollama', models: { default: 'openbmb/minicpm5-2b' } });
    expect(profile.modelId).toBe('minicpm5-2b');
    expect(profile.contextWindow).toBe(16384);
    expect(profile.outputTokenLimit).toBe(2200);
    expect(profile.jsonOutputTokenLimit).toBe(1600);
    // The input budget grows with the window instead of the 4k fallback.
    expect(profile.inputTokenBudget).toBeGreaterThan(4096);
  });

  it('gives earlier MiniCPM generations the conservative 8k profile and leaves other families alone', () => {
    expect(buildLocalModelProfile({ backend: 'ollama', models: { default: 'minicpm-v4.6' } }).contextWindow).toBe(8192);
    expect(buildLocalModelProfile({ backend: 'ollama', models: { default: 'gemma3:4b' } }).contextWindow).toBe(8192);
    expect(buildLocalModelProfile({ backend: 'ollama', models: { default: 'qwen2.5:3b' } }).contextWindow).toBe(4096);
  });

  it('still honours an explicit context window in the tag over the family rule', () => {
    expect(buildLocalModelProfile({ backend: 'ollama', models: { default: 'minicpm5-2b-ctx32k' } }).contextWindow).toBe(32768);
  });
});

describe('Ollama request shapes', () => {
  it('sends num_ctx alongside num_predict so the server window matches the profile', async () => {
    const { calls, fetchWithRetry } = recorder(() => ({ message: { content: 'ok' }, done_reason: 'stop' }));
    const provider = createProvider('ollama', fetchWithRetry, { models: { default: 'openbmb/minicpm5-2b' } });
    const text = await provider.generateText('Summarise photosynthesis for grade 7.');
    expect(text).toBe('ok');
    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('http://127.0.0.1:11434/api/chat');
    expect(calls[0].body.model).toBe('openbmb/minicpm5-2b');
    expect(calls[0].body.options.num_ctx).toBe(16384);
    expect(calls[0].body.options.num_predict).toBeGreaterThan(0);
  });

  it('keeps num_ctx off the OpenAI-compatible servers, which have no such option', async () => {
    const { calls, fetchWithRetry } = recorder(() => ({ choices: [{ message: { content: 'ok' }, finish_reason: 'stop' }] }));
    const provider = createProvider('lmstudio', fetchWithRetry, { models: { default: 'minicpm5-2b' } });
    await provider.generateText('Hello');
    expect(calls[0].url).toBe('http://127.0.0.1:11434/v1/chat/completions');
    expect(calls[0].body.options).toBeUndefined();
    expect(calls[0].body.num_ctx).toBeUndefined();
  });

  it('posts images to Ollama as a string prompt plus a base64 images array', async () => {
    const { calls, fetchWithRetry } = recorder(() => ({ message: { content: 'A labelled diagram of a plant cell.' } }));
    const provider = createProvider('ollama', fetchWithRetry, { models: { default: 'openbmb/minicpm5-2b', vision: 'openbmb/minicpm-v4.6' } });
    const description = await provider.analyzeImage('Describe this image for a screen reader.', 'iVBORw0KGgo=', { mimeType: 'image/png' });
    expect(description).toBe('A labelled diagram of a plant cell.');
    expect(calls[0].url).toBe('http://127.0.0.1:11434/api/chat');
    expect(calls[0].body.model).toBe('openbmb/minicpm-v4.6');
    expect(calls[0].body.stream).toBe(false);
    expect(calls[0].body.messages).toEqual([{ role: 'user', content: 'Describe this image for a screen reader.', images: ['iVBORw0KGgo='] }]);
  });

  it('keeps the OpenAI content-part shape for LM Studio and the other /v1 servers', async () => {
    const { calls, fetchWithRetry } = recorder(() => ({ choices: [{ message: { content: 'described' } }] }));
    const provider = createProvider('lmstudio', fetchWithRetry, { models: { default: 'local-model', vision: 'minicpm-v4.6' } });
    await provider.analyzeImage('Describe.', 'AAAA', { mimeType: 'image/jpeg' });
    expect(calls[0].url).toBe('http://127.0.0.1:11434/v1/chat/completions');
    expect(calls[0].body.messages[0].content).toEqual([
      { type: 'text', text: 'Describe.' },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAAA' } },
    ]);
    expect(calls[0].body.messages[0].images).toBeUndefined();
  });

  it('defaults Ollama vision to moondream when no vision model is configured', () => {
    const provider = createProvider('ollama', async () => ({ json: async () => ({}) }), { models: { default: 'openbmb/minicpm5-2b' } });
    expect(provider.models.vision).toBe('moondream');
  });
});
