// AIProvider.analyzeImages: one prompt plus several images in a single request, in the
// shape each backend actually understands. The remediation transport attaches every
// rendered page of a document at once, so a one-image method was never enough.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let AIProvider;

beforeAll(() => {
  loadAlloModule('ai_backend_module.js');
  AIProvider = window.AIProvider;
  if (!AIProvider) throw new Error('AIProvider failed to register');
});

function recorder(responder) {
  const calls = [];
  const fetchWithRetry = async (url, options) => {
    calls.push({ url, headers: options.headers, body: JSON.parse(options.body) });
    return { json: async () => responder(calls[calls.length - 1]) };
  };
  return { calls, fetchWithRetry };
}

function createProvider(backend, fetchWithRetry, overrides = {}) {
  return new AIProvider({
    backend, apiKey: 'secret-key', fetchWithRetry, debugLog: () => {}, warnLog: () => {},
    models: { default: 'text-model', vision: 'vision-model' },
    ...overrides,
  });
}

const PAGES = [{ data: 'AAAA', mimeType: 'image/jpeg' }, { data: 'BBBB', mimeType: 'image/jpeg' }];

describe('AIProvider.analyzeImages', () => {
  it('sends Gemini one inlineData part per image, keyed through the header', async () => {
    const { calls, fetchWithRetry } = recorder(() => ({ candidates: [{ content: { parts: [{ text: 'page one ' }, { text: 'page two' }] } }] }));
    const provider = createProvider('gemini', fetchWithRetry, { baseUrl: 'https://generativelanguage.googleapis.com/v1beta' });
    const text = await provider.analyzeImages('Describe both pages.', PAGES);
    expect(text).toBe('page one page two');
    expect(calls[0].url).toBe('https://generativelanguage.googleapis.com/v1beta/models/vision-model:generateContent');
    expect(calls[0].url).not.toContain('key=');
    expect(calls[0].headers['x-goog-api-key']).toBe('secret-key');
    expect(calls[0].body.contents[0].parts).toEqual([
      { text: 'Describe both pages.' },
      { inlineData: { mimeType: 'image/jpeg', data: 'AAAA' } },
      { inlineData: { mimeType: 'image/jpeg', data: 'BBBB' } },
    ]);
  });

  it('sends Claude native image blocks on /v1/messages, never the OpenAI compatibility layer', async () => {
    const { calls, fetchWithRetry } = recorder(() => ({ content: [{ type: 'text', text: 'described' }] }));
    const provider = createProvider('claude', fetchWithRetry);
    const text = await provider.analyzeImages('Describe both pages.', PAGES, { maxTokens: 2048 });
    expect(text).toBe('described');
    expect(calls[0].url).toBe('https://api.anthropic.com/v1/messages');
    expect(calls[0].headers['x-api-key']).toBe('secret-key');
    expect(calls[0].body.model).toBe('vision-model');
    expect(calls[0].body.max_tokens).toBe(2048);
    expect(calls[0].body.messages[0].content).toEqual([
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'AAAA' } },
      { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: 'BBBB' } },
      { type: 'text', text: 'Describe both pages.' },
    ]);
  });

  it('sends Claude a PDF part as a native document block', async () => {
    const { calls, fetchWithRetry } = recorder(() => ({ content: [{ type: 'text', text: 'read the pdf' }] }));
    const provider = createProvider('claude', fetchWithRetry);
    await provider.analyzeImages('Audit this document.', [{ data: 'JVBERi0=', mimeType: 'application/pdf' }, { data: 'AAAA', mimeType: 'image/png' }]);
    expect(calls[0].body.messages[0].content.map((block) => block.type)).toEqual(['document', 'image', 'text']);
    expect(calls[0].body.messages[0].content[0].source).toEqual({ type: 'base64', media_type: 'application/pdf', data: 'JVBERi0=' });
  });

  it('sends Ollama a string prompt plus an images array on its native /api/chat', async () => {
    const { calls, fetchWithRetry } = recorder(() => ({ message: { content: 'ollama saw two pages' } }));
    const provider = createProvider('ollama', fetchWithRetry, { baseUrl: 'http://127.0.0.1:11434' });
    const text = await provider.analyzeImages('Describe both pages.', PAGES);
    expect(text).toBe('ollama saw two pages');
    expect(calls[0].url).toBe('http://127.0.0.1:11434/api/chat');
    expect(calls[0].body).toEqual({
      model: 'vision-model', stream: false,
      messages: [{ role: 'user', content: 'Describe both pages.', images: ['AAAA', 'BBBB'] }],
    });
  });

  it('sends the OpenAI-style servers text plus one image_url part per image', async () => {
    const { calls, fetchWithRetry } = recorder(() => ({ choices: [{ message: { content: 'lm studio saw two pages' } }] }));
    const provider = createProvider('lmstudio', fetchWithRetry, { baseUrl: 'http://127.0.0.1:1234' });
    const text = await provider.analyzeImages('Describe both pages.', PAGES, { maxTokens: 512 });
    expect(text).toBe('lm studio saw two pages');
    expect(calls[0].url).toBe('http://127.0.0.1:1234/v1/chat/completions');
    expect(calls[0].headers.Authorization).toBe('Bearer secret-key');
    expect(calls[0].body.max_tokens).toBe(512);
    expect(calls[0].body.messages[0].content).toEqual([
      { type: 'text', text: 'Describe both pages.' },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,AAAA' } },
      { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,BBBB' } },
    ]);
  });

  it('accepts the page-side inline_data spelling and drops empty images', async () => {
    const { calls, fetchWithRetry } = recorder(() => ({ message: { content: 'ok' } }));
    const provider = createProvider('ollama', fetchWithRetry, { baseUrl: 'http://127.0.0.1:11434' });
    await provider.analyzeImages('x', [{ data: 'CCCC', mime_type: 'image/png' }, { data: '' }, null]);
    expect(calls[0].body.messages[0].images).toEqual(['CCCC']);
  });

  it('refuses to start when the signal is already aborted', async () => {
    const provider = createProvider('claude', async () => { throw new Error('must not fetch'); });
    const controller = new AbortController();
    controller.abort();
    await expect(provider.analyzeImages('x', PAGES, { signal: controller.signal })).rejects.toMatchObject({ name: 'AbortError' });
  });
});
