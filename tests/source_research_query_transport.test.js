import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';

const TOPIC = 'photosynthesis';
const PRIVATE_MARKER = 'SYNTHETIC_PRIVATE_DOCUMENT_4812';
const PROMPT = `Research the following topic: ${TOPIC}. Teacher document: ${PRIVATE_MARKER}. Return a research brief.`;
const SOURCE = { title: 'How plants use light', link: 'https://science.example.edu/photosynthesis', snippet: 'Plants use light energy to make sugars.' };
const BACKENDS = ['openai', 'claude', 'localai', 'ollama'];
let AIProvider, searchProvider, searchFetch;

beforeAll(() => {
  loadAlloModule('ai_backend_module.js');
  loadAlloModule('gemini_api_module.js');
  AIProvider = window.AIProvider;
  searchProvider = window.WebSearchProvider;
});

beforeEach(() => {
  localStorage.setItem('alloflow_ai_config', JSON.stringify({ serperApiKey: 'synthetic-search-key' }));
  delete window.ALLOFLOW_MANAGED_AI_POLICY;
  window.__alloSearchTrace = [];
  vi.spyOn(console, 'log').mockImplementation(() => {});
  searchFetch = vi.fn(async (url) => {
    if (url !== 'https://google.serper.dev/search') throw new Error('Unexpected search transport');
    return { ok: true, json: async () => ({ organic: [SOURCE] }) };
  });
  vi.stubGlobal('fetch', searchFetch);
});

afterEach(() => {
  localStorage.removeItem('alloflow_ai_config');
  delete window.ALLOFLOW_MANAGED_AI_POLICY;
  delete window.__alloActiveAIBackend;
  delete window.callGemini;
  window.__alloSearchTrace = [];
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function provider(backend, apiKey = 'synthetic-provider-key') {
  const transport = vi.fn(async () => ({
    json: async () => backend === 'claude'
      ? { content: [{ text: 'A research brief.' }] }
      : backend === 'ollama'
        ? { message: { content: 'A research brief.' }, done_reason: 'stop' }
        : { choices: [{ message: { content: 'A research brief.' }, finish_reason: 'stop' }] },
  }));
  const ai = new AIProvider({
    backend, apiKey, baseUrl: 'https://provider.example.test',
    models: { default: 'fixture-model', fallback: 'fixture-model' },
    fetchWithRetry: transport, debugLog: () => {}, warnLog: () => {},
  });
  return { ai, transport };
}

describe('source research query transport', () => {
  it.each(['callGemini', 'callGeminiSingleAttempt'])('Canvas %s carries explicit topic intent without searching private context', async method => {
    const topic = 'How clouds form over mountains';
    const transport = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'A research brief.' }] } }] })));
    const api = window.AlloModules.createGeminiAPI({
      apiKey: 'synthetic-provider-key', _isCanvasEnv: true,
      GEMINI_MODELS: { default: 'fixture', fallback: 'fixture' },
      fetchWithExponentialBackoff: transport, canvasAuthBackoffMs: [],
      optimizeImage: async value => value, warnLog: () => {}, debugLog: () => {}, getAbortSignal: () => null,
    });
    const topicSearch = vi.spyOn(searchProvider, 'searchTopic');
    const controller = new AbortController();
    const result = await api[method](PROMPT, false, true, null, topic, controller.signal, false, null, { intent: 'user-topic' });
    expect(topicSearch).toHaveBeenCalledWith(topic, 10);
    expect(JSON.stringify(searchFetch.mock.calls)).not.toContain(PRIVATE_MARKER);
    expect(JSON.parse(searchFetch.mock.calls[0][1].body).q).toBe(topic);
    expect(transport.mock.calls[0][1].signal).toBe(controller.signal);
    expect(JSON.parse(transport.mock.calls[0][1].body).contents[0].parts[0].text).toContain(PRIVATE_MARKER);
    expect(result.groundingMetadata.groundingChunks).toHaveLength(1);
  });

  it('preserves native Gemini grounding for arbitrary research topics', async () => {
    const metadata = { groundingChunks: [{ web: { uri: SOURCE.link, title: SOURCE.title } }] };
    const transport = vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'A research brief.' }] }, groundingMetadata: metadata }] })));
    const api = window.AlloModules.createGeminiAPI({
      apiKey: 'synthetic-provider-key', _isCanvasEnv: false,
      GEMINI_MODELS: { default: 'fixture', fallback: 'fixture' },
      fetchWithExponentialBackoff: transport, canvasAuthBackoffMs: [],
      optimizeImage: async value => value, warnLog: () => {}, debugLog: () => {}, getAbortSignal: () => null,
    });
    const result = await api.callGemini('Research history of jazz', false, true, null, 'history of jazz', null, false, null, { intent: 'user-topic' });
    expect(searchFetch).not.toHaveBeenCalled();
    expect(JSON.parse(transport.mock.calls[0][1].body).tools).toEqual([{ google_search: {} }]);
    expect(result.groundingMetadata).toEqual(metadata);
  });

  it.each(BACKENDS)('%s searches arbitrary user topics without sending private writing context', async backend => {
    const topic = 'History of jazz in New Orleans';
    const { ai, transport } = provider(backend);
    const search = vi.spyOn(searchProvider, 'searchTopic');
    const result = await ai.generateText(PROMPT, { search: true, searchQuery: topic, searchIntent: 'user-topic' });

    expect(search).toHaveBeenCalledWith(topic, 10);
    expect(searchFetch).toHaveBeenCalledOnce();
    expect(JSON.parse(searchFetch.mock.calls[0][1].body)).toEqual({ q: topic, num: 10 });
    expect(JSON.stringify(searchFetch.mock.calls)).not.toContain(PRIVATE_MARKER);
    expect(JSON.stringify(search.mock.calls)).not.toContain(PRIVATE_MARKER);
    expect(JSON.stringify(window.__alloSearchTrace)).not.toContain(topic);
    expect(JSON.stringify(window.__alloSearchTrace)).not.toContain(PRIVATE_MARKER);
    expect(result.groundingMetadata.groundingChunks).toHaveLength(1);
    expect(JSON.parse(transport.mock.calls[0][1].body).messages[0].content).toContain(PRIVATE_MARKER);
  });

  it.each(BACKENDS)('%s never uses the prompt as a missing explicit research topic', async backend => {
    const { ai } = provider(backend);
    const result = await ai.generateText(PROMPT, { search: true, searchIntent: 'user-topic' });
    expect(searchFetch).not.toHaveBeenCalled();
    expect(result.groundingMetadata).toBeNull();
  });

  it.each(BACKENDS)('%s sends the explicit public topic, never the contextual prompt, to search', async backend => {
    const { ai, transport } = provider(backend);
    const search = vi.spyOn(searchProvider, 'search');
    const result = await ai.generateText(PROMPT, { search: true, searchQuery: TOPIC });

    expect(search).toHaveBeenCalledWith(TOPIC, 10, TOPIC);
    expect(searchFetch).toHaveBeenCalledOnce();
    expect(JSON.parse(searchFetch.mock.calls[0][1].body)).toEqual({ q: TOPIC, num: 10 });
    expect(JSON.stringify(searchFetch.mock.calls)).not.toContain(PRIVATE_MARKER);
    expect(JSON.stringify(search.mock.calls)).not.toContain(PRIVATE_MARKER);
    expect(JSON.stringify(window.__alloSearchTrace)).not.toContain(PRIVATE_MARKER);
    expect(result.groundingMetadata.groundingChunks).toEqual([{ web: { uri: SOURCE.link, title: SOURCE.title } }]);
    const aiPrompt = JSON.parse(transport.mock.calls[0][1].body).messages[0].content;
    expect(aiPrompt).toContain(PRIVATE_MARKER);
    expect(aiPrompt).toContain(SOURCE.snippet);
  });

  it.each(BACKENDS)('%s rejects an unapproved explicit query without falling back to an approved prompt', async backend => {
    const { ai } = provider(backend);
    const result = await ai.generateText(TOPIC, { search: true, searchQuery: `${TOPIC} ${PRIVATE_MARKER}` });

    expect(searchFetch).not.toHaveBeenCalled();
    expect(result.groundingMetadata).toBeNull();
    expect(JSON.stringify(window.__alloSearchTrace)).not.toContain(PRIVATE_MARKER);
  });

  it.each(BACKENDS)('%s still refuses to extract a missing query from private prompt context', async backend => {
    const { ai } = provider(backend);
    const extract = vi.spyOn(searchProvider, '_extractSearchQuery');
    const result = await ai.generateText(PROMPT, { search: true });

    expect(extract).not.toHaveBeenCalled();
    expect(searchFetch).not.toHaveBeenCalled();
    expect(result.groundingMetadata).toBeNull();
  });

  it.each(BACKENDS)('%s preserves topic-only search when no explicit query is supplied', async backend => {
    const { ai } = provider(backend);
    const result = await ai.generateText(TOPIC, { search: true });

    expect(searchFetch).toHaveBeenCalledOnce();
    expect(JSON.parse(searchFetch.mock.calls[0][1].body).q).toBe(TOPIC);
    expect(result.groundingMetadata.groundingChunks).toHaveLength(1);
  });

  it('does not perform external search unless search is enabled', async () => {
    const { ai } = provider('openai');
    const search = vi.spyOn(searchProvider, 'search');
    await ai.generateText(PROMPT, { search: false, searchQuery: TOPIC });
    expect(search).not.toHaveBeenCalled();
    expect(searchFetch).not.toHaveBeenCalled();
  });

  it('keeps managed external-search restrictions in force with an explicit query', async () => {
    window.ALLOFLOW_MANAGED_AI_POLICY = {
      version: 1, allowExternalSearch: false,
      connections: [{ backend: 'custom', baseUrl: 'https://provider.example.test', keyless: true }],
    };
    const { ai, transport } = provider('custom', '');
    await expect(ai.generateText(PROMPT, { search: true, searchQuery: TOPIC, searchIntent: 'user-topic' }))
      .rejects.toMatchObject({ code: 'managed-ai-blocked' });
    expect(searchFetch).not.toHaveBeenCalled();
    expect(transport).not.toHaveBeenCalled();
  });

  it('forwards the bridge fifth argument through the real provider to the public search transport', async () => {
    const hostSource = readFileSync('AlloFlowANTI.txt', 'utf8');
    const start = hostSource.indexOf('function _installLocalTextBridge(aiInstance, aiConfig)');
    const end = hostSource.indexOf('function _installLocalTextBridgeFromStorage()', start);
    expect(start).toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    const install = new Function('_usesLocalTextBackend', '_alloWrapCallGeminiForProvenance',
      '_installQrStudentAiGuard', '_installQrStudentAiCapabilityGuards', 'warnLog',
      'let callGemini, callGeminiSingleAttempt;\n' + hostSource.slice(start, end) + '\nreturn _installLocalTextBridge;')
      (() => true, fn => fn, () => {}, () => {}, () => {});
    const { ai } = provider('localai');
    const generateText = vi.spyOn(ai, 'generateText');
    expect(install(ai, { backend: 'localai' })).toBe(true);
    const result = await window.callGemini(PROMPT, false, true, null, TOPIC);

    expect(generateText).toHaveBeenCalledWith(PROMPT, expect.objectContaining({ search: true, searchQuery: TOPIC }));
    expect(searchFetch).toHaveBeenCalledOnce();
    expect(JSON.parse(searchFetch.mock.calls[0][1].body).q).toBe(TOPIC);
    expect(JSON.stringify(searchFetch.mock.calls)).not.toContain(PRIVATE_MARKER);
    expect(result.groundingMetadata.groundingChunks).toHaveLength(1);
  });
});
