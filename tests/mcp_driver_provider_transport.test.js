// The remediation driver's provider transport: ALLOFLOW_MCP_MODEL_BACKEND routes the
// pipeline's model calls to Claude, OpenAI, or a local OpenAI-style / Ollama server instead
// of Gemini, through the app's own AIProvider. Scripted loopback servers stand in for each
// provider; the contract under test is the envelope the page-side wrapper consumes:
// { ok: true, text } or { ok: false, error: {...classification} }, identical to the Gemini path.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const requireCjs = createRequire(import.meta.url);
const Driver = requireCjs(resolve(process.cwd(), 'desktop/mcp/remediation_headless_driver.cjs'));

const servers = [];
async function scripted(handler) {
  const seen = [];
  const server = createServer((req, res) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      let json = null;
      try { json = JSON.parse(body); } catch (_) {}
      const record = { path: req.url, headers: req.headers, body: json };
      seen.push(record);
      const reply = handler(record);
      res.writeHead(reply.status || 200, Object.assign({ 'Content-Type': 'application/json' }, reply.headers || {}));
      res.end(typeof reply.body === 'string' ? reply.body : JSON.stringify(reply.body));
    });
  });
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  servers.push(server);
  return { base: 'http://127.0.0.1:' + server.address().port, seen };
}

afterAll(() => { servers.forEach((server) => server.close()); });

function freshState(budget = 2) {
  return { throttled: false, retryAfterMs: null, notBeforeAt: 0, retryBudgetRemaining: budget, gateTail: null };
}

describe('resolveModelTransportConfig', () => {
  it('defaults to Gemini and leaves every Gemini path untouched', () => {
    expect(Driver.resolveModelTransportConfig({})).toEqual({ backend: 'gemini' });
    expect(Driver.resolveModelTransportConfig({ ALLOFLOW_MCP_MODEL_BACKEND: 'Gemini ' })).toEqual({ backend: 'gemini' });
  });

  it('rejects an unknown backend by name', () => {
    expect(() => Driver.resolveModelTransportConfig({ ALLOFLOW_MCP_MODEL_BACKEND: 'bard' })).toThrow(/must be one of gemini, claude/);
  });

  it('requires a key for the cloud providers and reports only its source label', () => {
    expect(() => Driver.resolveModelTransportConfig({ ALLOFLOW_MCP_MODEL_BACKEND: 'claude' })).toThrow(/ALLOFLOW_MCP_MODEL_KEY \(or ANTHROPIC_API_KEY\)/);
    const viaProviderEnv = Driver.resolveModelTransportConfig({ ALLOFLOW_MCP_MODEL_BACKEND: 'claude', ANTHROPIC_API_KEY: 'sk-ant-secret' });
    expect(viaProviderEnv).toMatchObject({ backend: 'claude', model: 'claude-sonnet-5', visionModel: 'claude-sonnet-5', keySource: 'env:ANTHROPIC_API_KEY', cloud: true, baseUrl: null });
    expect(viaProviderEnv.key).toBe('sk-ant-secret');
    const explicit = Driver.resolveModelTransportConfig({ ALLOFLOW_MCP_MODEL_BACKEND: 'openai', ALLOFLOW_MCP_MODEL_KEY: 'sk-x', ALLOFLOW_MCP_MODEL_NAME: 'gpt-model', ALLOFLOW_MCP_VISION_MODEL: 'gpt-vision' });
    expect(explicit).toMatchObject({ backend: 'openai', model: 'gpt-model', visionModel: 'gpt-vision', keySource: 'env:ALLOFLOW_MCP_MODEL_KEY' });
    expect(() => Driver.resolveModelTransportConfig({ ALLOFLOW_MCP_MODEL_BACKEND: 'openai', ALLOFLOW_MCP_MODEL_KEY: 'sk-x' })).toThrow(/ALLOFLOW_MCP_MODEL_NAME/);
  });

  it('lets local servers run keyless but insists on a model tag and honours a base URL', () => {
    expect(() => Driver.resolveModelTransportConfig({ ALLOFLOW_MCP_MODEL_BACKEND: 'ollama' })).toThrow(/ALLOFLOW_MCP_MODEL_NAME/);
    const ollama = Driver.resolveModelTransportConfig({ ALLOFLOW_MCP_MODEL_BACKEND: 'ollama', ALLOFLOW_MCP_MODEL_NAME: 'openbmb/minicpm5-2b', ALLOFLOW_MCP_VISION_MODEL: 'openbmb/minicpm-v4.6', ALLOFLOW_MCP_MODEL_BASE: 'http://10.0.0.5:11434' });
    expect(ollama).toMatchObject({ backend: 'ollama', key: '', keySource: 'none', cloud: false, model: 'openbmb/minicpm5-2b', visionModel: 'openbmb/minicpm-v4.6', baseUrl: 'http://10.0.0.5:11434' });
  });
});

describe('createProviderTransport', () => {
  it('answers text calls through an OpenAI-style server with the Gemini-shaped envelope', async () => {
    const { base, seen } = await scripted(({ body }) => ({ body: { choices: [{ message: { content: 'reply for: ' + body.messages[0].content }, finish_reason: 'stop' }] } }));
    const transport = Driver.createProviderTransport({ backend: 'lmstudio', key: '', model: 'local-model', visionModel: 'local-model', baseUrl: base }, { log: () => {} });
    const state = freshState();
    const result = await transport.call({ kind: 'text', prompt: 'Audit this HTML', parts: [{ text: 'Audit this HTML' }], signal: null, transportState: state });
    expect(result).toEqual({ ok: true, text: 'reply for: Audit this HTML' });
    expect(seen[0].path).toBe('/v1/chat/completions');
    expect(seen[0].body.model).toBe('local-model');
    expect(state.throttled).toBe(false);
  });

  it('turns the page\'s inline_data parts into one multi-image request per provider', async () => {
    const anthropic = await scripted(() => ({ body: { content: [{ type: 'text', text: 'claude saw the pages' }] } }));
    const ollama = await scripted(() => ({ body: { message: { content: 'ollama saw the pages' } } }));
    const parts = [{ text: 'Describe the attached pages' }, { inline_data: { mime_type: 'image/jpeg', data: 'AAAA' } }, { inline_data: { mime_type: 'image/jpeg', data: 'BBBB' } }];

    const claude = Driver.createProviderTransport({ backend: 'claude', key: 'sk-ant-secret', model: 'claude-sonnet-5', visionModel: 'claude-sonnet-5', baseUrl: anthropic.base }, { log: () => {} });
    expect(await claude.call({ kind: 'vision', prompt: 'Describe the attached pages', parts, signal: null, transportState: freshState() })).toEqual({ ok: true, text: 'claude saw the pages' });
    expect(anthropic.seen[0].path).toBe('/v1/messages');
    expect(anthropic.seen[0].headers['x-api-key']).toBe('sk-ant-secret');
    expect(anthropic.seen[0].body.messages[0].content.map((block) => block.type)).toEqual(['image', 'image', 'text']);
    expect(anthropic.seen[0].body.messages[0].content[0].source).toEqual({ type: 'base64', media_type: 'image/jpeg', data: 'AAAA' });

    const local = Driver.createProviderTransport({ backend: 'ollama', key: '', model: 'openbmb/minicpm5-2b', visionModel: 'openbmb/minicpm-v4.6', baseUrl: ollama.base }, { log: () => {} });
    expect(await local.call({ kind: 'vision', prompt: 'Describe the attached pages', parts, signal: null, transportState: freshState() })).toEqual({ ok: true, text: 'ollama saw the pages' });
    expect(ollama.seen[0].path).toBe('/api/chat');
    expect(ollama.seen[0].body.model).toBe('openbmb/minicpm-v4.6');
    expect(ollama.seen[0].body.messages[0]).toEqual({ role: 'user', content: 'Describe the attached pages', images: ['AAAA', 'BBBB'] });
  });

  it('classifies a 429 as quota, arms the shared throttle state, and clears it on the next success', async () => {
    let hits = 0;
    const { base } = await scripted(() => {
      hits += 1;
      if (hits === 1) return { status: 429, headers: { 'retry-after': '1' }, body: { error: { message: 'rate limited' } } };
      return { body: { choices: [{ message: { content: 'recovered' } }] } };
    });
    const transport = Driver.createProviderTransport({ backend: 'openai', key: 'sk-x', model: 'gpt-model', visionModel: 'gpt-model', baseUrl: base }, { log: () => {} });
    const state = freshState(2);
    const first = await transport.call({ kind: 'text', prompt: 'p', parts: [{ text: 'p' }], signal: null, transportState: state });
    expect(first.ok).toBe(false);
    expect(first.error.classification.kind).toBe('quota');
    expect(first.error.code).toBe('model_throttled');
    expect(first.error.isQuota).toBe(true);
    expect(state.throttled).toBe(true);
    expect(state.notBeforeAt).toBeGreaterThan(Date.now() - 1);

    const started = Date.now();
    const second = await transport.call({ kind: 'text', prompt: 'p', parts: [{ text: 'p' }], signal: null, transportState: state });
    expect(second).toEqual({ ok: true, text: 'recovered' });
    // The retry waited out the provider's retry-after before calling again.
    expect(Date.now() - started).toBeGreaterThanOrEqual(900);
    expect(state.throttled).toBe(false);
    expect(state.retryBudgetRemaining).toBe(1);
  });

  it('refuses to spend beyond the retry budget without touching the server', async () => {
    const { base, seen } = await scripted(() => ({ body: { choices: [{ message: { content: 'never' } }] } }));
    const transport = Driver.createProviderTransport({ backend: 'openai', key: 'sk-x', model: 'gpt-model', visionModel: 'gpt-model', baseUrl: base }, { log: () => {} });
    const state = Object.assign(freshState(0), { throttled: true, retryAfterMs: 5000, notBeforeAt: Date.now() + 5000 });
    const result = await transport.call({ kind: 'text', prompt: 'p', parts: [{ text: 'p' }], signal: null, transportState: state });
    expect(result.ok).toBe(false);
    expect(result.error.retryBudgetExhausted).toBe(true);
    expect(seen).toHaveLength(0);
  });

  it('maps 401 to auth, 404 to config, and a network failure to transient', async () => {
    const auth = await scripted(() => ({ status: 401, body: { error: 'bad key' } }));
    const missing = await scripted(() => ({ status: 404, body: { error: 'no such model' } }));
    const make = (base) => Driver.createProviderTransport({ backend: 'openai', key: 'sk-x', model: 'gpt-model', visionModel: 'gpt-model', baseUrl: base }, { log: () => {} });
    const req = { kind: 'text', prompt: 'p', parts: [{ text: 'p' }], signal: null, transportState: freshState() };
    expect((await make(auth.base).call(req)).error).toMatchObject({ message: 'API_AUTH_FAILED', isAuth: true, classification: { kind: 'auth' } });
    expect((await make(missing.base).call(req)).error).toMatchObject({ message: 'API_MODEL_NOT_FOUND', isConfig: true, classification: { kind: 'config' } });
    const dead = await make('http://127.0.0.1:1').call(req);
    expect(dead.ok).toBe(false);
    expect(dead.error.classification.kind).toBe('transient');
    expect(dead.error.message).toMatch(/Network error calling openai/);
  });

  it('returns the abort envelope instead of calling out when the run is cancelled', async () => {
    const { base, seen } = await scripted(() => ({ body: { choices: [{ message: { content: 'never' } }] } }));
    const transport = Driver.createProviderTransport({ backend: 'openai', key: 'sk-x', model: 'gpt-model', visionModel: 'gpt-model', baseUrl: base }, { log: () => {} });
    const controller = new AbortController();
    controller.abort();
    const result = await transport.call({ kind: 'text', prompt: 'p', parts: [{ text: 'p' }], signal: controller.signal, transportState: freshState() });
    expect(result.ok).toBe(false);
    expect(result.error.isAbort).toBe(true);
    expect(seen).toHaveLength(0);
  });
});
