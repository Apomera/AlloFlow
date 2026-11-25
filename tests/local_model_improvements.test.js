// Local model improvements + cloud non-regression tests (2026-11-24).
// Verifies:
//   1. onnx-npu is a first-class local backend in AIProvider
//   2. Model profile rules cover Qwen 1.5B, Phi-4 Mini, MiniCPM5, Gemma 3/4 consistently
//   3. Thinking/reasoning tags (<think>...</think> and reasoning_content/thinking stream deltas)
//      are handled cleanly on local backends while leaving Gemini, OpenAI, and Claude untouched
//   4. Local testConnection() uses a 45s cold-load budget, catches empty-catalog placeholder models,
//      and surfaces Ollama OLLAMA_ORIGINS CORS guidance without affecting cloud providers
//   5. AlloFlowANTI local bridge routes vision/image calls for genuine local backends & Desktop SANA/FLUX
//      while keeping Gemini/OpenAI/Claude behavior unchanged
//   6. AI Settings modal exposes Vision Model selector, SANA image provider option, and Ollama CORS tip
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';
import { readFileSync as readHostFileSync } from './helpers/host_source.js';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

let AIProvider;
let AIBackendLocal;

beforeAll(() => {
  loadAlloModule('ai_backend_module.js');
  AIProvider = window.AIProvider;
  AIBackendLocal = window.AIBackendLocal;
  if (!AIProvider || !AIBackendLocal) throw new Error('ai_backend_module failed to register');
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

function createProvider(backend, fetchWithRetry, overrides = {}) {
  return new AIProvider({
    backend,
    apiKey: backend === 'openai' || backend === 'claude' || backend === 'gemini' ? 'test-cloud-key' : '',
    baseUrl: backend === 'gemini' ? 'https://generativelanguage.googleapis.com/v1beta'
      : backend === 'openai' ? 'https://api.openai.com'
      : backend === 'claude' ? 'https://api.anthropic.com'
      : undefined,
    fetchWithRetry,
    debugLog: () => {},
    warnLog: () => {},
    ...overrides,
  });
}

function makeStreamResponse(lines) {
  const encoder = new TextEncoder();
  const payload = encoder.encode(lines.join('\n') + '\n');
  let consumed = false;
  return {
    ok: true,
    status: 200,
    body: {
      getReader() {
        return {
          async read() {
            if (consumed) return { done: true, value: undefined };
            consumed = true;
            return { done: false, value: payload };
          },
          releaseLock() {},
          async cancel() {},
        };
      },
    },
  };
}

describe('onnx-npu and local model profile coverage', () => {
  it('treats onnx-npu as a genuine local backend with its localhost:11435 default URL', () => {
    expect(AIBackendLocal.isLocalTextBackend('onnx-npu')).toBe(true);
    expect(AIBackendLocal.isLocalTextBackend('gemini')).toBe(false);
    expect(AIBackendLocal.isLocalTextBackend('openai')).toBe(false);
    expect(AIBackendLocal.isLocalTextBackend('claude')).toBe(false);

    const provider = createProvider('onnx-npu', async () => ({ json: async () => ({ choices: [{ message: { content: 'ok' } }] }) }));
    expect(provider.baseUrl).toBe('http://localhost:11435');
  });

  it('gives Qwen 1.5B a conservative 4k profile and Phi-4 Mini an 8k profile', () => {
    const q15 = AIBackendLocal.buildLocalModelProfile({ backend: 'alloflow-local', models: { default: 'qwen2.5-1.5b-instruct-q4_k_m.gguf' } });
    expect(q15.id).toBe('qwen-1.5b-local');
    expect(q15.contextWindow).toBe(4096);
    expect(q15.outputTokenLimit).toBe(1200);
    expect(q15.jsonOutputTokenLimit).toBe(900);

    const phi4 = AIBackendLocal.buildLocalModelProfile({ backend: 'alloflow-local', models: { default: 'microsoft_Phi-4-mini-instruct-Q4_K_M.gguf' } });
    expect(phi4.id).toBe('phi-local');
    expect(phi4.contextWindow).toBe(8192);
    expect(phi4.outputTokenLimit).toBe(1800);
    expect(phi4.jsonOutputTokenLimit).toBe(1400);
  });

  it('keeps desktop runtime profiles and alloflow-local availability in sync', () => {
    const runtimeSrc = fs.readFileSync(path.join(ROOT, 'desktop', 'runtime', 'alloflow-desktop-runtime.cjs'), 'utf8');
    const presetStart = runtimeSrc.indexOf("id: 'alloflow-local'");
    const presetBlock = runtimeSrc.slice(presetStart, presetStart + 320);
    expect(presetBlock).toContain('availableToday: true');
    expect(runtimeSrc).toContain("id: 'minicpm5-local'");
    expect(runtimeSrc).toContain("id: 'qwen-1.5b-local'");
    expect(runtimeSrc).toContain("id: 'phi-local'");
    expect(runtimeSrc).toMatch(/id:\s*'gemma-local'[^}]+maxContextSize:\s*32768/);
  });
});

describe('local thinking/reasoning model support with cloud non-regression', () => {
  it('strips <think>...</think> blocks from local JSON output without wasting a repair retry', async () => {
    const calls = [];
    const provider = createProvider('alloflow-local', async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return {
        json: async () => ({
          choices: [{
            message: { content: '<think>Plan the JSON carefully.</think>\n{"terms":[{"term":"cell","def":"basic unit"}]}' },
            finish_reason: 'stop',
          }],
        }),
      };
    }, { models: { default: 'Qwen3-4B-Instruct-2507-Q4_K_M' } });

    const out = await provider.generateText('Extract vocabulary.', { json: true });
    expect(out).toBe('{"terms":[{"term":"cell","def":"basic unit"}]}');
    expect(calls).toHaveLength(1);
  });

  it('strips <think>...</think> from local plain text responses', async () => {
    const provider = createProvider('ollama', async () => ({
      json: async () => ({
        message: { content: '<think>Check grade level.</think>\nPlants use sunlight to make food.' },
        done_reason: 'stop',
      }),
    }), { models: { default: 'qwen3:4b' } });

    const out = await provider.generateText('Explain photosynthesis simply.', { json: false });
    expect(out).toBe('Plants use sunlight to make food.');
  });

  it('retries when a local thinking model hits length mid-<think> block', async () => {
    const calls = [];
    const provider = createProvider('alloflow-local', async (_url, options) => {
      calls.push(JSON.parse(options.body));
      return {
        json: async () => ({
          choices: [{
            message: {
              content: calls.length === 1
                ? '<think>I am still reasoning about how to format this'
                : '<think>Done.</think>{"ok":true}',
            },
            finish_reason: calls.length === 1 ? 'length' : 'stop',
          }],
        }),
      };
    }, {
      models: { default: 'qwen2.5-3b' },
      localModelProfile: { modelId: 'qwen2.5-3b', contextWindow: 4096, outputTokenLimit: 1400, jsonOutputTokenLimit: 1100, reserveTokens: 384 },
    });

    const out = await provider.generateText('Return JSON.', { json: true });
    expect(out).toBe('{"ok":true}');
    expect(calls).toHaveLength(2);
    expect(calls[1].max_tokens).toBeGreaterThan(calls[0].max_tokens);
  });

  it('reports local streaming reasoning_content and Ollama thinking deltas without polluting final output', async () => {
    const events = [];
    const openAiProvider = createProvider('alloflow-local', async () => makeStreamResponse([
      'data: {"choices":[{"delta":{"reasoning_content":"Step 1... "}}]}',
      'data: {"choices":[{"delta":{"content":"Final answer."},"finish_reason":"stop"}]}',
      'data: [DONE]',
    ]), { models: { default: 'Qwen3-4B' } });

    const openAiOut = await openAiProvider.generateText('Say hi.', { onProgress: (evt) => events.push(evt) });
    expect(openAiOut).toBe('Final answer.');
    expect(events.some((evt) => evt.phase === 'thinking' && evt.thinkingChars > 0)).toBe(true);

    const ollamaEvents = [];
    const ollamaProvider = createProvider('ollama', async () => makeStreamResponse([
      JSON.stringify({ message: { thinking: 'Checking facts...' }, done: false }),
      JSON.stringify({ message: { content: 'Clean Ollama reply.' }, done: true, done_reason: 'stop' }),
    ]), { models: { default: 'qwen3:4b' } });

    const ollamaOut = await ollamaProvider.generateText('Say hi.', { onProgress: (evt) => ollamaEvents.push(evt) });
    expect(ollamaOut).toBe('Clean Ollama reply.');
    expect(ollamaEvents.some((evt) => evt.phase === 'thinking' && evt.thinkingChars > 0)).toBe(true);
  });

  it('leaves Gemini, OpenAI, and Claude outputs strictly untouched (even if they contain <think> text)', async () => {
    const raw = '<think>example tag</think>\nKeep verbatim.';
    const gemini = createProvider('gemini', async () => ({
      json: async () => ({ candidates: [{ content: { parts: [{ text: raw }] }, finishReason: 'STOP' }] }),
    }));
    const openai = createProvider('openai', async () => ({
      json: async () => ({ choices: [{ message: { content: raw }, finish_reason: 'stop' }] }),
    }));
    const claude = createProvider('claude', async () => ({
      json: async () => ({ content: [{ type: 'text', text: raw }] }),
    }));

    expect(await gemini.generateText('Echo')).toBe(raw);
    expect(await openai.generateText('Echo')).toBe(raw);
    expect(await claude.generateText('Echo')).toBe(raw);
  });
});

describe('local testConnection diagnostics with cloud non-regression', () => {
  it('surfaces OLLAMA_ORIGINS CORS guidance when Ollama fetch fails in the browser', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const ollama = createProvider('ollama', async () => { throw new TypeError('Failed to fetch'); });

    const result = await ollama.testConnection();
    expect(result.success).toBe(false);
    expect(result.error).toContain('OLLAMA_ORIGINS');
  });

  it('reports clearly when Ollama has no models pulled instead of probing gemini-3-flash-preview', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ models: [] }),
    })));
    const generateSpy = vi.fn(async () => { throw new Error('should not probe gemini placeholder'); });
    const ollama = createProvider('ollama', generateSpy);

    const result = await ollama.testConnection();
    expect(result.success).toBe(false);
    expect(result.error).toContain('No models are available in ollama');
    expect(generateSpy).not.toHaveBeenCalled();
  });

  it('keeps cloud timeout at 15s and local timeout at 45s without adding Ollama hints to cloud errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const openai = createProvider('openai', async () => { throw new TypeError('Failed to fetch'); });
    const cloudErr = await openai.testConnection();
    expect(cloudErr.success).toBe(false);
    expect(cloudErr.error).toBe('Failed to fetch');
    expect(cloudErr.error).not.toContain('OLLAMA_ORIGINS');

    const abortErr = Object.assign(new Error('Aborted'), { name: 'AbortError' });
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        models: [{ name: 'models/gemini-flash-fixture', supportedGenerationMethods: ['generateContent'] }],
        data: [{ id: 'local-fixture-model' }],
      }),
    })));
    const gemini = createProvider('gemini', async () => { throw abortErr; });
    const geminiTimeout = await gemini.testConnection();
    expect(geminiTimeout).toEqual({ success: false, error: 'Connection test timed out after 15 seconds.' });

    const local = createProvider('lmstudio', async () => { throw abortErr; });
    const localTimeout = await local.testConnection();
    expect(localTimeout.success).toBe(false);
    expect(localTimeout.error).toContain('45 seconds');
  });
});

describe('AlloFlowANTI local vision/image bridging and capability resolution', () => {
  const anti = readHostFileSync(path.resolve(ROOT, 'AlloFlowANTI.txt'), 'utf8');

  const grabFn = (mark) => {
    const s = anti.indexOf(mark);
    expect(s, mark).toBeGreaterThan(-1);
    const e = anti.indexOf('\n}', s) + 2;
    return anti.slice(s, e);
  };
  const grabLine = (mark) => {
    const s = anti.indexOf(mark);
    expect(s, mark).toBeGreaterThan(-1);
    return anti.slice(s, anti.indexOf('\n', s));
  };

  function liftResolver({ canvas = false, config = null, hostKey = '', desktopSana = false, sdTurboReady = false }) {
    const code = [
      `const _isCanvasEnv = ${JSON.stringify(canvas)};`,
      `const apiKey = ${JSON.stringify(hostKey)};`,
      'const _alloHasAnyStudentEntry = () => false;',
      `const localStorage = { getItem: () => ${JSON.stringify(config ? JSON.stringify(config) : null)} };`,
      `const window = {
        sessionStorage: { getItem: () => null },
        __alloLearnerRoleActive: false,
        AlloDesktopImages: ${desktopSana ? '{ isEnabled: () => true }' : 'null'},
        _sdTurbo: ${sdTurboReady ? '{ ready: true }' : 'null'},
      };`,
      grabFn('function _alloPastedAiKeyFenceActive()'),
      grabLine('const _ALLO_AI_SECRET_FIELD = '),
      grabLine('const _ALLO_KEYLESS_AI_BACKENDS = '),
      grabFn('function _alloAiCredentialDestination(config)'),
      grabFn('function _alloStripAiSecrets(config)'),
      grabFn('function _alloStoredAiConfig()'),
      grabFn('function _readAlloAiUserConfig()'),
      grabFn('function _alloEffectiveGeminiApiKey()'),
      grabFn('function _usesLocalTextBackend(config)'),
      grabFn('function resolveAiCapability()'),
      'return resolveAiCapability();',
    ].join('\n');
    return new Function(code)();
  }

  it('reports images:true for local backends when Desktop SANA, SD-Turbo, SANA, or FLUX is active, and false when off or absent', () => {
    expect(liftResolver({ config: { backend: 'ollama' } })).toEqual({ text: true, images: false, tts: 'local', reason: 'local-backend' });
    expect(liftResolver({ config: { backend: 'ollama', imageProvider: 'flux' } }).images).toBe(true);
    expect(liftResolver({ config: { backend: 'alloflow-local', imageProvider: 'sana' } }).images).toBe(true);
    expect(liftResolver({ config: { backend: 'alloflow-local' }, desktopSana: true }).images).toBe(true);
    expect(liftResolver({ config: { backend: 'lmstudio' }, sdTurboReady: true }).images).toBe(true);
    expect(liftResolver({ config: { backend: 'alloflow-local', imageProvider: 'off' }, desktopSana: true, sdTurboReady: true }).images).toBe(false);
    // Cloud paths unchanged:
    expect(liftResolver({ canvas: true })).toEqual({ text: true, images: true, tts: 'full', reason: 'canvas' });
    expect(liftResolver({ config: { backend: 'gemini', apiKey: 'k' } })).toEqual({ text: true, images: true, tts: 'full', reason: 'api-key' });
  });

  it('bridges callGeminiVision and callGeminiImageEdit for genuine local backends only, leaving OpenAI/Claude untouched', () => {
    const fnSrc = grabFn('function _installLocalTextBridge(aiInstance, aiConfig)');
    const runBridge = (backend, hasGeminiKey = false) => {
      const sentinelVision = function originalVision() {};
      const sentinelEdit = function originalEdit() {};
      const code = `
        const _isCanvasEnv = false;
        const _usesLocalTextBackend = (cfg) => Boolean(cfg && cfg.backend && cfg.backend !== 'gemini');
        const _alloEffectiveGeminiApiKey = () => ${JSON.stringify(hasGeminiKey ? 'g-key' : '')};
        const _alloWrapCallGeminiForProvenance = (fn) => fn;
        const _installQrStudentAiGuard = () => {};
        const _installQrStudentAiCapabilityGuards = () => {};
        const warnLog = () => {};
        let callGemini = null;
        let callGeminiSingleAttempt = null;
        let callGeminiVision = sentinelVision;
        let callGeminiImageEdit = sentinelEdit;
        const window = { AIBackendLocal: { isLocalTextBackend: (b) => ['ollama','localai','lmstudio','alloflow-local','onnx-npu','custom'].includes(b) } };
        ${fnSrc}
        _installLocalTextBridge(aiInstance, { backend: ${JSON.stringify(backend)} });
        return { callGeminiVision, callGeminiImageEdit, sentinelVision, sentinelEdit };
      `;
      const aiInstance = {
        generateText: async () => 'text',
        analyzeImage: async (p, b, o) => ({ p, b, o }),
        editImage: async (p, b, o) => ({ edited: true, p, b, o }),
        generateImage: async (p, o) => ({ generated: true, p, o }),
      };
      return new Function('aiInstance', 'sentinelVision', 'sentinelEdit', code)(aiInstance, sentinelVision, sentinelEdit);
    };

    const ollamaRes = runBridge('ollama', false);
    expect(ollamaRes.callGeminiVision).not.toBe(ollamaRes.sentinelVision);
    expect(ollamaRes.callGeminiImageEdit).not.toBe(ollamaRes.sentinelEdit);

    const openaiRes = runBridge('openai', false);
    expect(openaiRes.callGeminiVision).toBe(openaiRes.sentinelVision);
    expect(openaiRes.callGeminiImageEdit).toBe(openaiRes.sentinelEdit);

    const claudeRes = runBridge('claude', false);
    expect(claudeRes.callGeminiVision).toBe(claudeRes.sentinelVision);
    expect(claudeRes.callGeminiImageEdit).toBe(claudeRes.sentinelEdit);
  });

  it('delegates callImagen to ai.generateImage for Desktop SANA and explicit SANA/FLUX preferences', () => {
    expect(anti).toContain("(_desktopSanaEnabled || _imgPref === 'sana' || _imgPref === 'flux') && ai && typeof ai.generateImage === 'function'");
    expect(anti).toContain('return await ai.generateImage(prompt, { width, quality: qual, signal: _signal });');
  });
});

describe('AI Settings modal local-model controls', () => {
  it('renders Vision Model selector, SANA image provider option, and Ollama OLLAMA_ORIGINS tip', async () => {
    const React = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react'));
    const ReactDOMClient = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react-dom/client'));
    const { act } = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react-dom/test-utils'));
    global.React = window.React = React;
    global.IS_REACT_ACT_ENVIRONMENT = true;
    loadAlloModule('view_misc_modals_module.js');
    const Modal = window.AlloModules.AIBackendModal;
    expect(Modal).toBeTruthy();

    window.localStorage.clear();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = ReactDOMClient.createRoot(container);
    try {
      await act(async () => {
        root.render(React.createElement(Modal, {
          _isCanvasEnv: false,
          ai: null,
          showAIBackendModal: true,
          setShowAIBackendModal: () => {},
          t: () => '',
          GEMINI_MODELS: {},
        }));
      });

      // Guided Ollama path mentions OLLAMA_ORIGINS
      await act(async () => {
        container.querySelector('[data-help-key="ai_backend_guided_card_connect"]').click();
      });
      await act(async () => {
        container.querySelector('[data-help-key="ai_backend_guided_connect_ollama"]').click();
      });
      expect(container.textContent).toContain('OLLAMA_ORIGINS');

      // Advanced surface exposes Vision Model select, SANA image option, and local model tools
      await act(async () => {
        container.querySelector('[data-help-key="ai_backend_advanced_toggle"]').click();
      });
      const visionSelect = container.querySelector('#ai-backend-model-vision');
      expect(visionSelect).toBeTruthy();
      const imageSelect = container.querySelector('#ai-backend-image-provider');
      expect(imageSelect).toBeTruthy();
      const optionValues = Array.from(imageSelect.options).map((o) => o.value);
      expect(optionValues).toContain('sana');
      expect(optionValues).toContain('sd-local');
      expect(optionValues).toContain('flux');

      // Local Model Tools (probe button + schema toggle) visible for Ollama
      expect(container.querySelector('#ai-backend-local-probe-btn')).toBeTruthy();
      const schemaToggle = container.querySelector('#ai-backend-local-schema-toggle');
      expect(schemaToggle).toBeTruthy();
      expect(schemaToggle.checked).toBe(false);
      await act(async () => { schemaToggle.click(); });
      expect(window.localStorage.getItem('alloflow_local_json_schema')).toBe('1');
      await act(async () => { schemaToggle.click(); });
      expect(window.localStorage.getItem('alloflow_local_json_schema')).toBeNull();

      // Switching back to Gemini hides Local Model Tools so cloud UX stays untouched
      const providerSelect = container.querySelector('#ai-backend-provider');
      await act(async () => {
        providerSelect.value = 'gemini';
        providerSelect.dispatchEvent(new Event('change', { bubbles: true }));
      });
      expect(container.querySelector('#ai-backend-local-options')).toBeNull();
    } finally {
      await act(async () => root.unmount());
      container.remove();
    }
  });
});

describe('Batch 2: live local metadata discovery, universal probe, audio bridge, scaled excerpts, and hardware controls', () => {
  it('discovers context window and vision capability from Ollama /api/show, llama-server /props, and LM Studio /api/v0/models — and never fetches for cloud backends', async () => {
    // Cloud backends: zero fetches, returns null
    const cloudFetch = vi.fn(async () => { throw new Error('cloud should not probe local metadata'); });
    vi.stubGlobal('fetch', cloudFetch);
    for (const cloudBackend of ['gemini', 'openai', 'claude']) {
      const p = createProvider(cloudBackend, cloudFetch);
      await expect(p.probeLocalServerMetadata()).resolves.toBeNull();
    }
    expect(cloudFetch).not.toHaveBeenCalled();

    // Ollama /api/show (clamps 131072 down to safe 32768 auto cap; detects vision & thinking)
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).endsWith('/api/show')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            model_info: { 'qwen3.context_length': 131072, 'qwen3.vision.block_count': 24 },
            capabilities: ['completion', 'vision', 'thinking'],
          }),
        };
      }
      throw new Error('unexpected url: ' + url);
    }));
    const ollama = createProvider('ollama', async () => ({}), { models: { default: 'qwen3-vl:8b' } });
    const ollamaMeta = await ollama.probeLocalServerMetadata();
    expect(ollamaMeta).toMatchObject({ contextWindow: 32768, vision: true, thinking: true, source: 'ollama-show' });
    expect(ollama.localModelProfile.contextWindow).toBe(32768);
    expect(ollama.localModelProfile.vision).toBe(true);

    // alloflow-local /props
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).endsWith('/props')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            default_generation_settings: { n_ctx: 16384 },
            modalities: { vision: false },
          }),
        };
      }
      throw new Error('unexpected url: ' + url);
    }));
    const builtin = createProvider('alloflow-local', async () => ({}), { models: { default: 'gemma-4-E4B-it-Q4_K_M' } });
    const builtinMeta = await builtin.probeLocalServerMetadata();
    expect(builtinMeta).toMatchObject({ contextWindow: 16384, vision: false, source: 'llama-props' });
    expect(builtin.localModelProfile.contextWindow).toBe(16384);

    // LM Studio /api/v0/models
    vi.stubGlobal('fetch', vi.fn(async (url) => {
      if (String(url).endsWith('/api/v0/models')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            data: [{ id: 'llava-1.6', type: 'vlm', state: 'loaded', loaded_context_length: 12288 }],
          }),
        };
      }
      throw new Error('unexpected url: ' + url);
    }));
    const lmstudio = createProvider('lmstudio', async () => ({}), { models: { default: 'llava-1.6' } });
    const lmsMeta = await lmstudio.probeLocalServerMetadata();
    expect(lmsMeta).toMatchObject({ contextWindow: 12288, vision: true, source: 'lmstudio-v0' });
  });

  it('runs the 3-test universal probeLocalCapabilities() on Ollama and populates taskSupport, while remaining unsupported on cloud backends', async () => {
    const cloudSpy = vi.fn();
    vi.stubGlobal('fetch', cloudSpy);
    const gemini = createProvider('gemini', cloudSpy);
    const cloudRes = await gemini.probeLocalCapabilities();
    expect(cloudRes.status).toBe('unsupported');
    expect(cloudSpy).not.toHaveBeenCalled();

    let callIdx = 0;
    const replies = [
      'OK',
      '{"ok":true,"items":["a","b"]}',
      '{"sections":[{"heading":"Summary","body":"Short sentence."}]}',
    ];
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })));
    const ollama = createProvider('ollama', async () => ({
      json: async () => ({ message: { content: replies[callIdx++] }, done_reason: 'stop' }),
    }), { models: { default: 'qwen2.5:7b' } });

    const probe = await ollama.probeLocalCapabilities();
    expect(probe.status).toBe('pass');
    expect(probe.tests).toHaveLength(3);
    expect(probe.taskSupport).toMatchObject({
      status: 'pass',
      passed: 3,
      total: 3,
      simpleText: 'pass',
      strictJson: 'pass',
      remediationJson: 'pass',
    });
    expect(AIBackendLocal.localTaskState(ollama.localModelProfile, 'strict-json')).toBe('pass');
  });

  it('bridges local analyzeAudio via window.transcribeAudioLocal and fenced local LLM grading while leaving Gemini/OpenAI/Claude unchanged', async () => {
    const seenPrompts = [];
    window.transcribeAudioLocal = vi.fn(async () => 'Photosynthesis turns sunlight into glucose.');
    try {
      const ollama = createProvider('ollama', async (_url, options) => {
        const body = JSON.parse(options.body);
        seenPrompts.push(body.messages[0].content);
        return { json: async () => ({ message: { content: '{"score":3,"feedback":"Accurate"}' }, done_reason: 'stop' }) };
      }, { models: { default: 'qwen2.5:7b' } });

      const graded = await ollama.analyzeAudio('Grade the spoken answer.', 'data:audio/webm;base64,AAAA');
      expect(window.transcribeAudioLocal).toHaveBeenCalledWith('AAAA', 'audio/webm', expect.any(Object));
      expect(seenPrompts).toHaveLength(1);
      expect(seenPrompts[0]).toContain('<UNTRUSTED_AUDIO_TRANSCRIPT>');
      expect(seenPrompts[0]).toContain('Photosynthesis turns sunlight into glucose.');
      expect(graded).toContain('"score":3');

      // OpenAI and Claude do NOT invoke local ASR bridge — they still throw the same error
      window.transcribeAudioLocal.mockClear();
      const openai = createProvider('openai', async () => ({}));
      await expect(openai.analyzeAudio('Grade', 'AAAA')).rejects.toThrow(/Audio input not supported on this backend \(openai\)/);
      expect(window.transcribeAudioLocal).not.toHaveBeenCalled();

      // Local backend falls back to clear error when local ASR returns null
      window.transcribeAudioLocal = vi.fn(async () => null);
      await expect(ollama.analyzeAudio('Grade', 'AAAA')).rejects.toThrow(/whisper\.cpp/);
    } finally {
      delete window.transcribeAudioLocal;
    }
  });

  it('scales localCharBudget() and localExcerpt() proportionally for larger local context windows while keeping 4k unchanged', () => {
    const src = fs.readFileSync(path.join(ROOT, 'generate_dispatcher_source.jsx'), 'utf8');
    const start = src.indexOf('const localCharBudget = (baseChars = 6000, hardCap = 36000) => {');
    expect(start).toBeGreaterThan(-1);
    const excerptMarker = src.indexOf('const localExcerpt = (text, maxChars = 6000) => {', start);
    expect(excerptMarker).toBeGreaterThan(start);
    const end = src.indexOf('\n    };', excerptMarker) + 7;
    const fnBody = src.slice(start, end);
    const evalHelpers = (ctx) => {
      const fn = new Function('usesLocalTextBackend', 'window', `${fnBody}\nreturn { localCharBudget, localExcerpt };`);
      return fn(true, { __alloActiveAIBackend: { localModelProfile: { contextWindow: ctx, inputTokenBudget: Math.floor(ctx * 0.55) } } });
    };

    const at4k = evalHelpers(4096);
    expect(at4k.localCharBudget(3500, 9000)).toBe(3500);
    expect(at4k.localCharBudget(7000, 24000)).toBe(7000);
    const excerpt4k = at4k.localExcerpt('x'.repeat(20000), 6000);
    expect(excerpt4k).toContain('[Source excerpt trimmed for local model context.]');
    expect(excerpt4k.length).toBeLessThan(6100);

    const at16k = evalHelpers(16384);
    expect(at16k.localCharBudget(3500, 9000)).toBe(9000);
    expect(at16k.localCharBudget(7000, 24000)).toBeGreaterThan(20000);
    const excerpt16k = at16k.localExcerpt('x'.repeat(20000), 6000);
    expect(excerpt16k).not.toContain('[Source excerpt trimmed');
    expect(excerpt16k.length).toBe(20000);

    const at32k = evalHelpers(32768);
    const excerpt32k = at32k.localExcerpt('x'.repeat(45000), 6000);
    expect(excerpt32k.length).toBeGreaterThan(35000);
    expect(excerpt32k.length).toBeLessThan(36200);

    // Adaptation chunking and local analysis ranges use localCharBudget while keeping cloud path unchanged
    expect(src).toContain('chunkText(textWithoutRefs, usesLocalTextBackend ? localCharBudget(3500, 9000) : 9000)');
    expect(src).toContain('localAnalysisRanges(textToProcess, localCharBudget(7000, 24000))');
  });

  it('strips <think> tags in Desktop Command Center engine probe and renders live thinking activity + onnx-npu sketch vision in host', () => {
    const runtimeSrc = fs.readFileSync(path.join(ROOT, 'desktop', 'runtime', 'alloflow-desktop-runtime.cjs'), 'utf8');
    expect(runtimeSrc).toContain('function stripEngineThinkingTags(raw)');
    expect(runtimeSrc).toContain('const content = stripEngineThinkingTags(rawContent);');
    // Verify the stripped helper directly
    const fnStart = runtimeSrc.indexOf('function stripEngineThinkingTags(raw)');
    const fnEnd = runtimeSrc.indexOf('\n}', fnStart) + 2;
    const stripFn = new Function(`${runtimeSrc.slice(fnStart, fnEnd)}; return stripEngineThinkingTags;`)();
    expect(stripFn('<think>Checking prompt</think>\nready')).toBe('ready');
    expect(stripFn('<think>Planning JSON</think>{"ok":true,"steps":["a","b","c"],"score":3}')).toBe('{"ok":true,"steps":["a","b","c"],"score":3}');

    for (const hostPath of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const hostSrc = readHostFileSync(path.resolve(ROOT, hostPath), 'utf8');
      expect(hostSrc).toContain("'onnx-npu': 'On-Device NPU'");
      expect(hostSrc).toContain("thinkingChars: evt.thinkingChars || 0");
      expect(hostSrc).toContain("localStreamActivity.phase === 'thinking' && !localStreamActivity.chars");
    }
  });

  it('registers sentence-frames, timeline, and concept-sort schemas while keeping opt-in off by default', () => {
    expect(AIBackendLocal.localSchemaModeEnabled()).toBe(false);
    expect(Object.keys(AIBackendLocal.LOCAL_RESOURCE_SCHEMAS)).toEqual(
      expect.arrayContaining(['glossary', 'faq', 'brainstorm', 'lesson-plan', 'sentence-frames', 'timeline', 'concept-sort'])
    );
    expect(AIBackendLocal.LOCAL_RESOURCE_SCHEMAS['anchor-chart']).toBeUndefined();
    expect(AIBackendLocal.LOCAL_RESOURCE_SCHEMAS.dbq).toBeUndefined();
    expect(AIBackendLocal.LOCAL_RESOURCE_SCHEMAS['note-taking']).toBeUndefined();
  });

  it('exposes context window, GPU layers, KV cache q8_0, and Flash Attention controls in Desktop Command Center', () => {
    const html = fs.readFileSync(path.join(ROOT, 'desktop', 'command-center', 'index.html'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'desktop', 'command-center', 'command-center.js'), 'utf8');
    expect(html).toContain('id="engine-context-select"');
    expect(html).toContain('id="engine-gpu-layers"');
    expect(html).toContain('id="engine-kv-q8"');
    expect(html).toContain('id="engine-flash-attn"');
    expect(html).toContain('id="engine-hardware-save"');
    expect(js).toContain('saveEngineHardwareSettings');
    expect(js).toContain("kvQ8 && kvQ8.checked ? 'q8_0' : ''");
    expect(js).toContain('flashAttention');
    expect(js).toContain("hwBadges.push('q8_0 KV')");
  });

  it('strips <think> tags in local vision/multi-image responses, keeps Gemini/OpenAI/Claude verbatim, and picks smart local vision/TTS defaults', async () => {
    const rawVision = '<think>Examine the diagram carefully.</think>\nA labeled water cycle diagram.';

    // Local single-image and multi-image strip <think>
    const ollamaVision = createProvider('ollama', async () => ({
      json: async () => ({ message: { content: rawVision } }),
    }), { models: { default: 'gemma4:e4b' } });
    // Gemma 4 on Ollama keeps itself as vision model instead of forcing moondream
    expect(ollamaVision.models.vision).toBe('gemma4:e4b');
    expect(ollamaVision.models.tts).toBe('kokoro');
    expect(await ollamaVision.analyzeImage('Describe', 'AAAA')).toBe('A labeled water cycle diagram.');
    expect(await ollamaVision.analyzeImages('Describe', [{ data: 'AAAA', mimeType: 'image/png' }])).toBe('A labeled water cycle diagram.');

    // Text-only Ollama model still defaults vision to moondream; alloflow-local / onnx-npu default TTS to kokoro
    const ollamaTextOnly = createProvider('ollama', async () => ({}), { models: { default: 'qwen2.5:7b' } });
    expect(ollamaTextOnly.models.vision).toBe('moondream');
    expect(createProvider('alloflow-local', async () => ({})).models.tts).toBe('kokoro');
    expect(createProvider('onnx-npu', async () => ({})).models.tts).toBe('kokoro');

    // Cloud providers (Gemini, OpenAI, Claude) keep vision outputs strictly verbatim and Gemini TTS default unchanged
    const gemini = createProvider('gemini', async () => ({
      json: async () => ({ candidates: [{ content: { parts: [{ text: rawVision }] } }] }),
    }));
    expect(gemini.models.tts).toBe('gemini-3-flash-preview');
    expect(await gemini.analyzeImages('Describe', [{ data: 'AAAA', mimeType: 'image/png' }])).toBe(rawVision);

    const openai = createProvider('openai', async () => ({
      json: async () => ({ choices: [{ message: { content: rawVision } }] }),
    }));
    expect(await openai.analyzeImage('Describe', 'AAAA')).toBe(rawVision);
    expect(await openai.analyzeImages('Describe', [{ data: 'AAAA', mimeType: 'image/png' }])).toBe(rawVision);

    const claude = createProvider('claude', async () => ({
      json: async () => ({ content: [{ type: 'text', text: rawVision }] }),
    }));
    expect(await claude.analyzeImages('Describe', [{ data: 'AAAA', mimeType: 'image/png' }])).toBe(rawVision);

    // AlloBot privacy banner includes LocalAI and On-Device NPU labels
    const privacySrc = fs.readFileSync(path.join(ROOT, 'allobot_privacy.js'), 'utf8');
    expect(privacySrc).toContain("localai: 'LocalAI'");
    expect(privacySrc).toContain("'onnx-npu': 'On-Device NPU'");
  });

  it('profiles DeepSeek-R1, Qwen3, Granite/Ministral, and SmolLM consistently, strips <think> on local search replies, and gives actionable local connection hints without altering cloud errors', async () => {
    const deepseek = AIBackendLocal.buildLocalModelProfile({ backend: 'ollama', models: { default: 'deepseek-r1:8b' } });
    expect(deepseek).toMatchObject({ id: 'deepseek-local', contextWindow: 16384, outputTokenLimit: 2400, jsonOutputTokenLimit: 1800 });

    const qwen3 = AIBackendLocal.buildLocalModelProfile({ backend: 'alloflow-local', models: { default: 'Qwen3-4B-Instruct-2507-Q4_K_M.gguf' } });
    expect(qwen3).toMatchObject({ id: 'qwen3-local', contextWindow: 16384, outputTokenLimit: 2400, jsonOutputTokenLimit: 1800 });

    const granite = AIBackendLocal.buildLocalModelProfile({ backend: 'ollama', models: { default: 'granite3.2:8b' } });
    expect(granite).toMatchObject({ id: 'granite-local', contextWindow: 8192 });

    const smol = AIBackendLocal.buildLocalModelProfile({ backend: 'ollama', models: { default: 'smollm2:1.7b' } });
    expect(smol).toMatchObject({ id: 'smollm-local', contextWindow: 4096, outputTokenLimit: 1200 });

    // Local web-grounded search response strips <think> tags; OpenAI keeps raw verbatim
    const origSearch = window.WebSearchProvider && window.WebSearchProvider.search;
    if (window.WebSearchProvider) {
      window.WebSearchProvider.search = vi.fn(async () => ({ results: [], contextPrompt: '', groundingMetadata: { webSearchQueries: ['cells'] } }));
    }
    try {
      const ollama = createProvider('ollama', async () => ({
        json: async () => ({ message: { content: '<think>Verify source.</think>\nCells are the basic unit of life.' } }),
      }), { models: { default: 'qwen3:4b' } });
      const localSearchRes = await ollama.generateText('What is a cell?', { search: true, searchQuery: 'cell biology' });
      expect(localSearchRes.text).toBe('Cells are the basic unit of life.');

      const openai = createProvider('openai', async () => ({
        json: async () => ({ choices: [{ message: { content: '<think>keep</think>\nExact cloud text.' } }] }),
      }));
      const cloudSearchRes = await openai.generateText('What is a cell?', { search: true, searchQuery: 'cell biology' });
      expect(cloudSearchRes.text).toBe('<think>keep</think>\nExact cloud text.');
    } finally {
      if (window.WebSearchProvider && origSearch) window.WebSearchProvider.search = origSearch;
    }

    // Actionable local hints for LM Studio CORS and alloflow-local startup; cloud unchanged
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch'); }));
    const lms = createProvider('lmstudio', async () => { throw new TypeError('Failed to fetch'); });
    const lmsErr = await lms.testConnection();
    expect(lmsErr.success).toBe(false);
    expect(lmsErr.error).toContain('Enable CORS');

    const builtin = createProvider('alloflow-local', async () => { throw new TypeError('Failed to fetch'); });
    const builtinErr = await builtin.testConnection();
    expect(builtinErr.success).toBe(false);
    expect(builtinErr.error).toContain('Command Center');

    const claude = createProvider('claude', async () => { throw new TypeError('Failed to fetch'); });
    const claudeErr = await claude.testConnection();
    expect(claudeErr.success).toBe(false);
    expect(claudeErr.error).toBe('Failed to fetch');
  });

  it('fixes PDF remediation _localTextProfile modelId/live-profile lookup, exposes GPU binary URL+SHA-256 UI, registers 11 constrained schemas, and wires local audio bridge cleanly off-Canvas', () => {
    // 1. PDF remediation _localTextProfile passes modelId + models + active.localModelProfile
    const pipeSrc = fs.readFileSync(path.join(ROOT, 'remediation_modules', 'pipeline', '01b_core_orchestration_head.js'), 'utf8');
    expect(pipeSrc).toContain('modelId: active.model || (cfg.models && cfg.models.default)');
    expect(pipeSrc).toContain('localModelProfile: active.localModelProfile || cfg.localModelProfile || cfg.capability');
    expect(pipeSrc).toContain("'onnx-npu'");

    // 2. Command Center GPU binary URL + SHA-256 controls
    const html = fs.readFileSync(path.join(ROOT, 'desktop', 'command-center', 'index.html'), 'utf8');
    const js = fs.readFileSync(path.join(ROOT, 'desktop', 'command-center', 'command-center.js'), 'utf8');
    expect(html).toContain('id="engine-binary-url"');
    expect(html).toContain('id="engine-binary-sha256"');
    expect(js).toContain('binaryUrl, binarySha256');

    // 3. All 11 constrained JSON schemas registered (with anchor-chart/dbq/note-taking still absent)
    expect(Object.keys(AIBackendLocal.LOCAL_RESOURCE_SCHEMAS).sort()).toEqual([
      'adventure',
      'brainstorm',
      'concept-sort',
      'faq',
      'gemini-bridge',
      'glossary',
      'lesson-plan',
      'outline',
      'persona',
      'sentence-frames',
      'timeline',
    ]);
    expect(AIBackendLocal.LOCAL_RESOURCE_SCHEMAS['anchor-chart']).toBeUndefined();
    expect(AIBackendLocal.LOCAL_RESOURCE_SCHEMAS.dbq).toBeUndefined();
    expect(AIBackendLocal.LOCAL_RESOURCE_SCHEMAS['note-taking']).toBeUndefined();

    // 4. Local audio bridge is strictly off-Canvas & gated for local backends only across all 3 host files
    for (const hostPath of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const hostSrc = readHostFileSync(path.resolve(ROOT, hostPath), 'utf8');
      expect(hostSrc).toContain('const _localAudioBridge = (() => {');
      expect(hostSrc).toContain('if (_isCanvasEnv) return null;');
      expect(hostSrc).toContain('fn._alloflowLocalAudio = true;');
      expect(hostSrc).toContain('callGeminiAudio: (studentAiFeaturesHidden ? null : (_localAudioBridge || callGeminiAudio))');
    }
  });
});
