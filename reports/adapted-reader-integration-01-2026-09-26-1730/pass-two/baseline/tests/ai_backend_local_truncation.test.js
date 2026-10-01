// The local text path used to read no finish_reason at all and had no JSON
// repair, while the Gemini path had both. That is backwards: a 3B/4B classroom
// model is far likelier to run out of output budget mid-object than Gemini is,
// and the dispatcher's parseJsonLenient salvage slices to the outermost bracket
// pair — which cannot repair a truncation, because the closing brace was never
// emitted. These tests pin the retry/repair behaviour AND pin that cloud
// backends are left strictly alone.
import { beforeAll, describe, expect, it } from 'vitest';
import { loadAlloModule } from './setup.js';

let AIProvider;

beforeAll(() => {
  loadAlloModule('ai_backend_module.js');
  AIProvider = window.AIProvider;
  if (!AIProvider) throw new Error('AIProvider failed to register');
});

// contextWindow 4096 with a jsonOutputTokenLimit of 1100 mirrors the shipped
// alloflow-qwen2.5-3b profile — the configuration that actually truncates.
const SMALL_MODEL = {
  modelId: 'qwen2.5-3b-instruct-q4_k_m',
  contextWindow: 4096,
  outputTokenLimit: 1400,
  jsonOutputTokenLimit: 1100,
  reserveTokens: 384,
};

function createProvider(backend, fetchWithRetry, overrides = {}) {
  return new AIProvider({
    backend,
    apiKey: '',
    baseUrl: 'http://127.0.0.1:32173',
    models: { default: 'local-model' },
    fetchWithRetry,
    debugLog: () => {},
    warnLog: () => {},
    localModelProfile: SMALL_MODEL,
    ...overrides,
  });
}

// One OpenAI-compatible non-stream body.
const openAiBody = (content, finishReason = 'stop') => ({
  choices: [{ message: { content }, finish_reason: finishReason }],
});

// Record every request so we can assert on max_tokens growth and call counts.
function recorder(responses) {
  const calls = [];
  const fetchWithRetry = async (url, options) => {
    const body = JSON.parse(options.body);
    calls.push({ url, body });
    const next = responses[Math.min(calls.length - 1, responses.length - 1)];
    return { json: async () => (typeof next === 'function' ? next(body) : next) };
  };
  return { calls, fetchWithRetry };
}

describe('local text truncation handling', () => {
  it('retries a truncated JSON generation with a larger output budget', async () => {
    const truncated = '{"documents":[{"title":"Doc A","excerpt":"Colonists deba';
    const complete = '{"documents":[{"title":"Doc A","excerpt":"short"}],"rubric":[]}';
    const { calls, fetchWithRetry } = recorder([
      openAiBody(truncated, 'length'),
      openAiBody(complete, 'stop'),
    ]);
    const provider = createProvider('alloflow-local', fetchWithRetry);

    const result = await provider.generateText('Build a DBQ.', { json: true });

    expect(result).toBe(complete);
    expect(calls).toHaveLength(2);
    // First call is clamped to the profile's conservative JSON ceiling...
    expect(calls[0].body.max_tokens).toBe(1100);
    // ...the retry is allowed to spend the real context headroom instead.
    expect(calls[1].body.max_tokens).toBeGreaterThan(calls[0].body.max_tokens);
    expect(calls[1].body.max_tokens).toBe(2200);
    // The retry re-sends the ORIGINAL prompt, not a repair instruction: the
    // model did nothing wrong, it simply ran out of room.
    expect(calls[1].body.messages[0].content).toContain('Build a DBQ.');
  });

  it('never exceeds the context window when growing the budget', async () => {
    // A prompt big enough that 2x the first budget would overrun 4096.
    const bigPrompt = 'x'.repeat(4000); // ~1000 tokens
    const { calls, fetchWithRetry } = recorder([
      openAiBody('{"a":', 'length'),
      openAiBody('{"a":1}', 'stop'),
    ]);
    const provider = createProvider('custom', fetchWithRetry);

    await provider.generateText(bigPrompt, { json: true });

    expect(calls).toHaveLength(2);
    const grown = calls[1].body.max_tokens;
    const promptTokens = Math.ceil(bigPrompt.length / 4);
    expect(grown + promptTokens + SMALL_MODEL.reserveTokens).toBeLessThanOrEqual(SMALL_MODEL.contextWindow);
  });

  it('stops after one retry when the model truncates every time', async () => {
    const partial = '{"questions":[{"q":"Why did';
    const { calls, fetchWithRetry } = recorder([openAiBody(partial, 'length')]);
    const provider = createProvider('alloflow-local', fetchWithRetry);

    const result = await provider.generateText('Make a quiz.', { json: true });

    // Exactly two transports: the original and one retry. A model that always
    // truncates must not spin a classroom laptop forever.
    expect(calls).toHaveLength(2);
    expect(result).toBe(partial);
  });

  it('honours Ollama done_reason as the truncation signal', async () => {
    const calls = [];
    const fetchWithRetry = async (url, options) => {
      calls.push(JSON.parse(options.body));
      return {
        json: async () => (calls.length === 1
          ? { message: { content: '{"items":[' }, done_reason: 'length' }
          : { message: { content: '{"items":[]}' }, done_reason: 'stop' }),
      };
    };
    const provider = createProvider('ollama', fetchWithRetry);

    const result = await provider.generateText('List events.', { json: true });

    expect(result).toBe('{"items":[]}');
    expect(calls).toHaveLength(2);
    expect(calls[1].options.num_predict).toBeGreaterThan(calls[0].options.num_predict);
  });
});

describe('local JSON self-healing repair', () => {
  it('repairs unparseable JSON that was not truncated', async () => {
    const malformed = '{"term":"mitosis",, "def":"cell division"}';
    const repaired = '{"term":"mitosis","def":"cell division"}';
    const { calls, fetchWithRetry } = recorder([
      openAiBody(malformed, 'stop'),
      openAiBody(repaired, 'stop'),
    ]);
    const provider = createProvider('lmstudio', fetchWithRetry);

    const result = await provider.generateText('Define one term.', { json: true });

    expect(result).toBe(repaired);
    expect(calls).toHaveLength(2);
    expect(calls[1].body.messages[0].content).toContain('malformed JSON');
    expect(calls[1].body.messages[0].content).toContain(malformed);
  });

  it('does not spend a repair round-trip on JSON the dispatcher can already salvage', async () => {
    // Prose + fences around valid JSON is exactly what parseJsonLenient strips,
    // so repairing it would be a wasted call on a slow local model.
    const fenced = 'Here you go!\n```json\n{"ok":true}\n```\nHope that helps.';
    const { calls, fetchWithRetry } = recorder([openAiBody(fenced, 'stop')]);
    const provider = createProvider('alloflow-local', fetchWithRetry);

    const result = await provider.generateText('Give me JSON.', { json: true });

    expect(result).toBe(fenced);
    expect(calls).toHaveLength(1);
  });

  it('returns the original text when repair also fails', async () => {
    const malformed = '{{{not json at all';
    const { calls, fetchWithRetry } = recorder([openAiBody(malformed, 'stop')]);
    const provider = createProvider('alloflow-local', fetchWithRetry);

    const result = await provider.generateText('Give me JSON.', { json: true });

    expect(result).toBe(malformed);
    expect(calls).toHaveLength(2);
  });

  it('leaves non-JSON generations alone even when they truncate', async () => {
    const { calls, fetchWithRetry } = recorder([
      openAiBody('A long passage that stops mid-sen', 'length'),
      openAiBody('A long passage that finishes.', 'stop'),
    ]);
    const provider = createProvider('alloflow-local', fetchWithRetry);

    const result = await provider.generateText('Simplify this.', { json: false });

    // Still worth retrying for the fuller answer, but never repair-prompted.
    expect(calls).toHaveLength(2);
    expect(calls[1].body.messages[0].content).not.toContain('malformed JSON');
    expect(result).toBe('A long passage that finishes.');
  });
});

describe('cloud backends are untouched', () => {
  it('does not retry or repair for hosted openai', async () => {
    const truncated = '{"documents":[{"title":"Doc A"';
    const { calls, fetchWithRetry } = recorder([openAiBody(truncated, 'length')]);
    const provider = createProvider('openai', fetchWithRetry, {
      baseUrl: 'https://api.openai.com',
    });

    const result = await provider.generateText('Build a DBQ.', { json: true });

    expect(result).toBe(truncated);
    expect(calls).toHaveLength(1);
  });

  it('leaves the gemini path on its own finishReason handling', async () => {
    const calls = [];
    const fetchWithRetry = async () => {
      calls.push(1);
      return {
        json: async () => ({
          candidates: [{ content: { parts: [{ text: '{"ok":true}' }] }, finishReason: 'MAX_TOKENS' }],
        }),
      };
    };
    const provider = createProvider('gemini', fetchWithRetry, {
      baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
      apiKey: 'fixture-key',
    });

    // MAX_TOKENS warns but returns; it must NOT pick up the local retry loop.
    await expect(provider.generateText('Hi.', { json: true })).resolves.toBe('{"ok":true}');
    expect(calls).toHaveLength(1);
  });
});
