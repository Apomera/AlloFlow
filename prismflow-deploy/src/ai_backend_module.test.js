/**
 * Tests for the additive, local-only streaming/progress path in
 * public/ai_backend_module.js (Phase 0 predicate + Phase 1 transport streaming).
 *
 * Invariant under test: ZERO behavior change for cloud backends
 * (gemini / claude / hosted openai) and for local backends when NO progress
 * sink is registered. Streaming engages only for a genuine-local backend AND a
 * registered sink, and always returns the SAME string the non-stream path would.
 */

// Browser IIFE that attaches to window and (guarded) exports for Node under jsdom.
const {
  AIProvider,
  LOCAL_BACKENDS,
  isLocalTextBackend,
  buildLocalModelProfile,
  buildLocalTaskSupportFromProbe,
  localModelSupportsTask,
} = require('../public/ai_backend_module.js');

// ── helpers ──────────────────────────────────────────────────────────────────
function jsonResponse(obj) {
  return { ok: true, json: async () => obj };
}
// Minimal Response-like object whose body streams the given (already newline-
// terminated) text lines, mimicking fetch().body.getReader().
function streamResponse(lines) {
  const enc = new TextEncoder();
  let i = 0;
  return {
    ok: true,
    body: {
      getReader() {
        return {
          read: async () =>
            i < lines.length
              ? { value: enc.encode(lines[i++]), done: false }
              : { value: undefined, done: true },
          releaseLock() {},
        };
      },
    },
  };
}

describe('Phase 0 — isLocalTextBackend / LOCAL_BACKENDS gate', () => {
  test('allowlist is exactly the genuine local backends', () => {
    expect(new Set(LOCAL_BACKENDS)).toEqual(
      new Set(['ollama', 'localai', 'lmstudio', 'alloflow-local', 'custom'])
    );
  });
  test('true for local servers', () => {
    ['ollama', 'localai', 'lmstudio', 'alloflow-local', 'custom'].forEach((b) =>
      expect(isLocalTextBackend(b)).toBe(true)
    );
  });
  test('false for cloud providers and junk (gemini / claude / hosted openai)', () => {
    ['gemini', 'claude', 'openai', undefined, null, ''].forEach((b) =>
      expect(isLocalTextBackend(b)).toBe(false)
    );
  });
});

describe('Local model probe task support', () => {
  test('records remediation readiness only when the remediation probe passes', () => {
    const support = buildLocalTaskSupportFromProbe({
      status: 'partial',
      generatedAt: '2026-07-08T12:00:00.000Z',
      tests: [
        { id: 'plain-text', ok: true },
        { id: 'strict-json', ok: true },
        { id: 'remediation-shape', ok: false },
      ],
    });
    expect(support).toMatchObject({
      status: 'partial',
      passed: 2,
      total: 3,
      simpleText: 'pass',
      strictJson: 'pass',
      remediationJson: 'fail',
    });
    const profile = buildLocalModelProfile({
      backend: 'alloflow-local',
      localModelProfile: { modelId: 'gemma-4-E4B-it-Q4_K_M', taskSupport: support },
    });
    expect(localModelSupportsTask(profile, 'strict-json')).toBe(true);
    expect(localModelSupportsTask(profile, 'remediation-json')).toBe(false);
  });
});

describe('Non-stream path is unchanged when no sink is registered', () => {
  test('ollama returns message.content and sends stream:false', async () => {
    const calls = [];
    const ai = new AIProvider({
      backend: 'ollama',
      fetchWithRetry: async (url, opts) => {
        calls.push({ url, body: JSON.parse(opts.body) });
        return jsonResponse({ message: { content: 'hello world' } });
      },
    });
    const out = await ai.generateText('hi');
    expect(out).toBe('hello world');
    expect(calls).toHaveLength(1);
    expect(calls[0].body.stream).toBe(false);
    expect(calls[0].url).toContain('/api/chat');
  });

  test('openai-compat (localai) returns choices[0].message.content, no stream flag', async () => {
    let body;
    const ai = new AIProvider({
      backend: 'localai',
      fetchWithRetry: async (url, opts) => {
        body = JSON.parse(opts.body);
        return jsonResponse({ choices: [{ message: { content: 'abc' } }] });
      },
    });
    expect(await ai.generateText('hi')).toBe('abc');
    expect(body.stream).toBeUndefined(); // unchanged non-stream payload
  });
});

describe('Phase 1 — streaming engages only for local backend + sink', () => {
  test('ollama NDJSON stream concatenates content and reports progress', async () => {
    const events = [];
    const lines = [
      JSON.stringify({ message: { content: 'Hel' }, done: false }) + '\n',
      JSON.stringify({ message: { content: 'lo!' }, done: false }) + '\n',
      JSON.stringify({ message: { content: '' }, done: true }) + '\n',
    ];
    let sawStream;
    const ai = new AIProvider({
      backend: 'ollama',
      fetchWithRetry: async (url, opts) => {
        sawStream = JSON.parse(opts.body).stream;
        return streamResponse(lines);
      },
    });
    const out = await ai.generateText('hi', { onProgress: (e) => events.push(e) });
    expect(out).toBe('Hello!');
    expect(sawStream).toBe(true);
    const last = events[events.length - 1];
    expect(last).toMatchObject({ done: true, backend: 'ollama', receivedChars: 6 });
    expect(events.some((e) => e.done === false)).toBe(true);
  });

  test('openai-compat SSE stream concatenates deltas and honors [DONE]', async () => {
    const lines = [
      'data: ' + JSON.stringify({ choices: [{ delta: { role: 'assistant' } }] }) + '\n\n', // no content
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'foo' } }] }) + '\n\n',
      'data: ' + JSON.stringify({ choices: [{ delta: { content: 'bar' } }] }) + '\n\n',
      'data: [DONE]\n\n',
    ];
    const ai = new AIProvider({
      backend: 'lmstudio',
      fetchWithRetry: async () => streamResponse(lines),
    });
    const out = await ai.generateText('hi', { onProgress: () => {} });
    expect(out).toBe('foobar');
  });

  test('handles a JSON object split across two read() chunks', async () => {
    const full = JSON.stringify({ message: { content: 'split-ok' }, done: true }) + '\n';
    const mid = Math.floor(full.length / 2);
    const ai = new AIProvider({
      backend: 'ollama',
      fetchWithRetry: async () => streamResponse([full.slice(0, mid), full.slice(mid)]),
    });
    expect(await ai.generateText('hi', { onProgress: () => {} })).toBe('split-ok');
  });

  test('ambient window.__alloLocalTextProgress hook is used when no opts.onProgress', async () => {
    const events = [];
    window.__alloLocalTextProgress = (e) => events.push(e);
    try {
      const lines = [JSON.stringify({ message: { content: 'hi' }, done: true }) + '\n'];
      const ai = new AIProvider({
        backend: 'ollama',
        fetchWithRetry: async () => streamResponse(lines),
      });
      expect(await ai.generateText('x')).toBe('hi');
      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1].done).toBe(true);
    } finally {
      delete window.__alloLocalTextProgress;
    }
  });

  test('a throwing sink never breaks generation', async () => {
    const lines = [JSON.stringify({ message: { content: 'safe' }, done: true }) + '\n'];
    const ai = new AIProvider({
      backend: 'ollama',
      fetchWithRetry: async () => streamResponse(lines),
    });
    expect(
      await ai.generateText('x', { onProgress: () => { throw new Error('boom'); } })
    ).toBe('safe');
  });
});

describe('Cloud safety — streaming never engages for cloud backends', () => {
  test('hosted openai does NOT stream even with a sink (stays non-stream)', async () => {
    let streamFlag;
    const ai = new AIProvider({
      backend: 'openai',
      apiKey: 'k',
      fetchWithRetry: async (url, opts) => {
        streamFlag = JSON.parse(opts.body).stream;
        return jsonResponse({ choices: [{ message: { content: 'cloud' } }] });
      },
    });
    const out = await ai.generateText('hi', {
      onProgress: () => { throw new Error('sink must never fire for hosted openai'); },
    });
    expect(out).toBe('cloud');
    expect(streamFlag).toBeUndefined(); // non-stream payload — no stream:true
  });

  test('search=true bypasses streaming (grounding return preserved)', async () => {
    let sawStream = false;
    const ai = new AIProvider({
      backend: 'ollama',
      fetchWithRetry: async (url, opts) => {
        if (JSON.parse(opts.body).stream) sawStream = true;
        return jsonResponse({ message: { content: 'grounded' } });
      },
    });
    // _webSearchAugment may run; we only assert we never took the streaming branch.
    const res = await ai.generateText('hi', { search: true, onProgress: () => {} });
    const text = typeof res === 'string' ? res : res.text;
    expect(text).toBe('grounded');
    expect(sawStream).toBe(false);
  });
});

describe('Fallback — any streaming problem falls back to the non-stream path', () => {
  test('a buffered (non-readable) response falls back and still returns text', async () => {
    let n = 0;
    const ai = new AIProvider({
      backend: 'ollama',
      fetchWithRetry: async (url, opts) => {
        n++;
        const body = JSON.parse(opts.body);
        // stream attempt: return a response with no readable .body → not streamable
        if (body.stream) return jsonResponse({ message: { content: 'ignored' } });
        return jsonResponse({ message: { content: 'fallback-text' } });
      },
    });
    const out = await ai.generateText('hi', { onProgress: () => {} });
    expect(out).toBe('fallback-text');
    expect(n).toBe(2); // stream attempt, then non-stream fallback
  });
});

describe('Stream line parsers (unit)', () => {
  const ai = new AIProvider({ backend: 'ollama', fetchWithRetry: async () => ({}) });
  test('ollama parser extracts content, skips non-content lines', () => {
    expect(ai._parseOllamaStreamLine(JSON.stringify({ message: { content: 'X' } }))).toBe('X');
    expect(ai._parseOllamaStreamLine('not json')).toBe('');
    expect(ai._parseOllamaStreamLine(JSON.stringify({ done: true }))).toBe('');
  });
  test('openai parser extracts delta content and terminal marker', () => {
    expect(
      ai._parseOpenAiStreamLine('data: ' + JSON.stringify({ choices: [{ delta: { content: 'Y' } }] }))
    ).toBe('Y');
    expect(typeof ai._parseOpenAiStreamLine('data: [DONE]')).toBe('symbol');
    expect(ai._parseOpenAiStreamLine('data: garbage')).toBe('');
    expect(ai._parseOpenAiStreamLine(': keep-alive comment')).toBe('');
  });
});
