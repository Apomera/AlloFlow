import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const MIRROR_DIRS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const WAVE40_JS_FILES = [
  'agent_core_managed_asset_store_module.js',
  'agent_core_media_planner_module.js',
  'agent_core_media_security_module.js',
  'agent_core_openai_media_adapter_module.js',
  'agent_core_openai_media_production_guard_module.js',
  'agent_core_openai_media_runtime_module.js',
  'liblouis_braille_loader.js',
  'mathlive_loader.js',
  'sre_loader.js',
  'translate_loader.js',
  'piper_tts_loader.js',
  'phonics_g2p_loader.js',
  'dictionary_loader.js',
  'sd_turbo_loader.js',
];

const WAVE40_ALL_FILES = [...WAVE40_JS_FILES, 'translation_glossary.js'];

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function loadScriptInSandbox(relPath, extraGlobals = {}) {
  const src = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const win = Object.assign({}, extraGlobals.window || {});
  const ctxObj = Object.assign(
    {
      window: win,
      self: win,
      globalThis: win,
      console: { log() {}, warn() {}, error() {} },
      URL,
      Uint8Array,
      Uint16Array,
      Uint32Array,
      Int32Array,
      Float32Array,
      Uint8ClampedArray,
      BigInt64Array,
      ArrayBuffer,
      DataView,
      TextEncoder,
      TextDecoder,
      Promise,
      setTimeout,
      clearTimeout,
      AbortController,
      DOMException,
      Map,
      Set,
    },
    extraGlobals,
    { window: win, self: win, globalThis: win }
  );
  const ctx = vm.createContext(ctxObj);
  vm.runInContext(src, ctx, { filename: relPath, timeout: 5000 });
  return { win, ctx };
}

describe('Wave 40 — 15 Root Runtime Modules Hardening & Parity', () => {
  it('parses cleanly and survives 4-mode SSR across all 14 JS modules', () => {
    const modes = [
      ['bare', {}],
      ['window=null', { window: null }],
      ['window=primitive', { window: 42 }],
      ['self=null', { self: null }],
    ];
    for (const rel of WAVE40_JS_FILES) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(() => new vm.Script(src, { filename: rel })).not.toThrow();
      for (const [, ctxObj] of modes) {
        const ctx = vm.createContext(Object.assign({}, ctxObj));
        expect(() => vm.runInContext(src, ctx, { filename: rel, timeout: 2000 })).not.toThrow();
      }
    }
  });

  it('maintains 4-way SHA-256 mirror parity for all 15 Wave 40 files', () => {
    for (const rel of WAVE40_ALL_FILES) {
      const rootHash = sha256(path.join(ROOT, rel));
      for (const dir of MIRROR_DIRS) {
        const mirrorPath = path.join(ROOT, dir, rel);
        expect(fs.existsSync(mirrorPath)).toBe(true);
        expect(sha256(mirrorPath)).toBe(rootHash);
      }
    }
  });

  it('translation_glossary.js parses as valid comment-stripped JSON with tightened regexes', () => {
    const raw = fs.readFileSync(path.join(ROOT, 'translation_glossary.js'), 'utf8');
    const parsed = JSON.parse(raw.replace(/^\s*\/\/.*$/gm, '').trim());
    expect(parsed.DO_NOT_TRANSLATE).toEqual(expect.arrayContaining(['MTSS', 'LRE', 'FAPE', 'DBT', 'STEM']));
    const regexes = parsed.DNT_PATTERNS.map((p) => new RegExp(p, 'g'));
    const [phRe, unitRe, verRe, hexRe, urlRe] = regexes;
    expect('hello {student_name}'.match(phRe)).toEqual(['{student_name}']);
    expect('wait 10ms and 5min and 3m'.match(unitRe)).toEqual(['10ms', '5min', '3m']);
    expect('use v2.1 not rev2'.match(verRe)).toEqual(['v2.1']);
    expect('color #ff00aa not #ff00aabbcc'.match(hexRe)).toEqual(['#ff00aa']);
    expect('see [https://example.org/a] now'.match(urlRe)).toEqual(['https://example.org/a']);
  });

  it('agent_core_managed_asset_store_module snapshots verifyMagicBytes and rejects UTF-16 active markup', () => {
    const { win } = loadScriptInSandbox('agent_core_managed_asset_store_module.js');
    const opts = { verifyMagicBytes: true, maxAssetBytes: 1024 };
    const store = win.AlloModules.AgentCoreManagedAssetStore.createManagedAssetStore(opts);
    // Post-construction mutation must not disable magic-byte checking
    opts.verifyMagicBytes = false;
    const fakePng = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]);
    expect(() => store.importAsset({ bytes: fakePng, mimeType: 'image/png', altText: 'test' })).toThrow();

    // UTF-16LE "<svg" payload rejected even with verifyMagicBytes: false
    const storeNoMagic = win.AlloModules.AgentCoreManagedAssetStore.createManagedAssetStore({ verifyMagicBytes: false });
    const utf16Svg = new Uint8Array([0xff, 0xfe, 0x3c, 0x00, 0x73, 0x00, 0x76, 0x00, 0x67, 0x00]);
    expect(() => storeNoMagic.importAsset({ bytes: utf16Svg, mimeType: 'image/png', altText: 'test' })).toThrow();
  });

  it('agent_core_media_planner_module guards sparse arrays and prototype-key planIds', () => {
    const { win } = loadScriptInSandbox('agent_core_media_planner_module.js');
    const contracts = {
      validateMediaRequest: (r) => ({ ok: true, value: Object.assign({ requestId: 'req-1' }, r) }),
      validateProviderInventory: (inv) => ({ ok: true, value: inv }),
    };
    const sparse = new Array(200000);
    sparse[0] = 'ok';
    const res = win.AlloModules.AgentCoreMediaPlanner.planMediaBatch(
      {
        planId: '__proto__',
        requests: [{ kind: 'image', prompt: 'hello', extra: sparse }],
      },
      { providers: [] },
      {},
      contracts
    );
    expect(res.status).toBe('invalid');
    expect(res.errors.some((e) => e.path === 'planId')).toBe(true);
  });

  it('agent_core_openai_media_production_guard_module handles numeric epoch timestamps and QR object blocking', async () => {
    const { win } = loadScriptInSandbox('agent_core_openai_media_production_guard_module.js');
    const guardApi = win.AlloModules.AgentCoreOpenAIMediaProductionGuard;
    const nowMs = Date.UTC(2026, 10, 24, 12, 0, 0);
    // Numeric epoch timestamps must validate cleanly ('' === ok, not 'pricing-policy-dates-invalid')
    const errCode = guardApi.validateDatedPolicy(
      {
        schemaVersion: '1.0',
        provider: 'openai',
        model: 'gpt-image-1',
        effectiveAt: nowMs - 60000,
        expiresAt: nowMs + 3600000,
        sourceUrl: 'https://platform.openai.com/docs/pricing',
        estimateImageCost: () => ({ estimatedCostUsd: 0.04 }),
        calculateImageCost: () => ({ actualCostUsd: 0.04 }),
      },
      'openai',
      'gpt-image-1',
      nowMs
    );
    expect(errCode).toBe('');

    let called = 0;
    const mockRuntimeModule = {
      createGuardedOpenAIMediaAdapter: () => ({
        providerId: 'openai',
        model: 'gpt-image-1',
        prepare: () => ({
          ready: true,
          request: { kind: 'image', providerPolicy: { maxCostUsd: 1, maxOperations: 2 }, accessibility: { altTextRequired: false } },
          provider: 'openai',
          estimate: { estimatedCostUsd: 0.04 },
        }),
        execute: async () => {
          called++;
          return { ok: true, status: 'generated', asset: { handle: 'asset_1' }, usage: { actualCostUsd: 0.04, operations: 1 } };
        },
      }),
    };
    const guard = guardApi.createProductionOpenAIMediaAdapter({
      executionEnabled: true,
      now: () => nowMs,
      fetchAuthorized: async () => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => ({}) }),
      pricingPolicy: {
        schemaVersion: '1.0',
        provider: 'openai',
        model: 'gpt-image-1',
        effectiveAt: nowMs - 60000,
        expiresAt: nowMs + 3600000,
        sourceUrl: 'https://platform.openai.com/docs/pricing',
        estimateImageCost: () => ({ estimatedCostUsd: 0.04 }),
        calculateImageCost: () => ({ actualCostUsd: 0.04 }),
      },
      authorizeProductionExecution: () => true,
    }, mockRuntimeModule);

    // Truthy QR Student Mode object must fail closed
    win.__alloQrStudentMode = { active: true };
    await expect(guard.execute({ request: { kind: 'image' } })).rejects.toThrow();
    expect(called).toBe(0);
  });

  it('agent_core_openai_media_runtime_module freezes API and blocks truthy QR student mode objects', async () => {
    const { win } = loadScriptInSandbox('agent_core_openai_media_runtime_module.js');
    const runtimeApi = win.AlloModules.AgentCoreOpenAIMediaRuntime;
    expect(Object.isFrozen(runtimeApi)).toBe(true);
    const mockAdapterMod = {
      createOpenAIMediaAdapter: () => ({
        providerId: 'openai',
        model: 'gpt-image-1',
        prepare: () => ({ ready: true }),
        execute: async () => ({ status: 'generated' }),
      }),
    };
    win.__alloQrStudentMode = { session: 'qr-1' };
    const adapter = runtimeApi.createGuardedOpenAIMediaAdapter({}, mockAdapterMod);
    expect(Object.isFrozen(adapter)).toBe(true);
    const plan = adapter.prepare({ prompt: 'tree' });
    expect(plan.ready).toBe(false);
    expect(plan.code).toBe('ai-disabled-in-session');
    await expect(adapter.execute({ prompt: 'tree' })).rejects.toThrow();
  });

  it('liblouis_braille_loader handles smart quotes without PUA leakage and ignores unrelated window.Module', async () => {
    const unrelatedModule = { foo: 'bar' };
    const { win } = loadScriptInSandbox('liblouis_braille_loader.js', {
      window: { Module: unrelatedModule, __alloOfflineOnly: true },
    });
    const out = win.AlloBraille.toGrade1BRF('\u201cHello\u201d \uE000\uE001');
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
    expect(out.includes('\uE000')).toBe(false);
    expect(out.includes('\uE001')).toBe(false);
    // Unrelated window.Module must NOT be mistaken for a loaded Liblouis runtime
    expect(await win.AlloBraille.toUEB('Hello')).toBeNull();
  });

  it('sre_loader resolves parenthetical locales cleanly without false prefixes and keeps safe aria-labels', async () => {
    let seenLocale = null;
    let seenMathML = null;
    const { win } = loadScriptInSandbox('sre_loader.js', {
      DOMParser: globalThis.DOMParser,
      window: {
        SRE: {
          setupEngine: async (cfg) => { seenLocale = cfg && cfg.locale; },
          engineReady: async () => true,
          toSpeech: (mml) => { seenMathML = mml; return 'x'; },
        },
      },
    });
    // Esperanto/Cantonese must NOT falsely match 'es'/'ca'
    expect(await win.AlloMathSpeech.toSpeech('<math><mi>x</mi></math>', { lang: 'Esperanto' })).toBeNull();
    expect(await win.AlloMathSpeech.toSpeech('<math><mi>x</mi></math>', { lang: 'Cantonese' })).toBeNull();
    // Parenthetical region resolves cleanly to 'es' and keeps safe aria-label while stripping script/onclick
    const spoken = await win.AlloMathSpeech.toSpeech(
      '<math aria-label="one = 1" onclick="alert(1)"><mi>x</mi><script>alert(1)</script></math>',
      { lang: 'Spanish (Latin America)' }
    );
    expect(spoken).toBe('x');
    expect(seenLocale).toBe('es');
    expect(seenMathML).toContain('aria-label="one = 1"');
    expect(seenMathML).not.toContain('onclick');
    expect(seenMathML).not.toContain('<script');
  });

  it('translate_loader blocks remote CDN on local box and truthy QR student objects', async () => {
    const { win } = loadScriptInSandbox('translate_loader.js', {
      window: { __alloQrStudentMode: { active: true } },
    });
    expect(Object.isFrozen(win.AlloTranslate)).toBe(true);
    expect(win.AlloTranslate.supports('English', 'Spanish (Latin America)')).toBe(true);
    const translated = await win.AlloTranslate.translate('Hello world', 'English', 'Spanish');
    expect(translated).toBeNull();
  });

  it('phonics_g2p_loader aligns NFD accented words safely, blocks QR/offline remote loads, and stays unfrozen', async () => {
    const { win } = loadScriptInSandbox('phonics_g2p_loader.js', {
      window: { __alloQrStudentMode: { active: true } },
    });
    expect(Object.isFrozen(win.AlloPhonics)).toBe(false);
    expect(win.AlloPhonics.voiceFor('   ')).toBe('en-us');
    // NFD "nin\u0303o" must align into 4 intact grapheme units ['n','i','ñ','o']
    const aligned = win.AlloPhonics.alignGraphemes('nin\u0303o', 4);
    expect(aligned).toEqual(['n', 'i', 'ñ', 'o']);
    const result = await win.AlloPhonics.toPhonemes('cat');
    expect(result).toBeNull();
  });

  it('dictionary_loader blocks newline-obfuscated XSS URLs, omits injected fetch signal, and tolerates malformed entries', async () => {
    let seenOpts = null;
    const mockFetch = async (_url, opts) => {
      seenOpts = opts;
      return {
        ok: true,
        status: 200,
        json: async () => [
          {
            word: 'river',
            sourceUrls: ['java\nscript:alert(1)', 'https://en.wiktionary.org/wiki/river'],
            phonetics: [{ text: '/rɪvər/', audio: 'java\nscript:alert(1)' }, { text: '/rɪvər/', audio: '/\n/evil.com/x.mp3' }],
            meanings: [{ partOfSpeech: 'noun', definitions: [{ definition: 'A large natural stream of water.' }] }],
          },
        ],
      };
    };
    const { win } = loadScriptInSandbox('dictionary_loader.js', {
      fetch: mockFetch,
      navigator: { onLine: true },
    });
    const res = await win.AlloDictionary.lookupDetailed('river');
    expect(seenOpts.signal).toBeUndefined();
    expect(res.entry.audio).toBe('');
    expect(res.entry.sourceUrl).toBe('https://en.wiktionary.org/wiki/river');
    // Malformed entry tolerance
    expect(win.AlloDictionary.pickSense({ meanings: [null, { definitions: [null] }] }, 'water')).toBeNull();
    expect(win.AlloDictionary.matchPassageSense({ meanings: [null, { definitions: [null] }] }, 'water')).toBeNull();
  });

  it('sd_turbo_loader handles Uint8Array/unaligned fp16 tensors, NaN half-floats, and restricted mode blocking', async () => {
    const { win } = loadScriptInSandbox('sd_turbo_loader.js', {
      window: { __alloQrStudentMode: { active: true } },
    });
    const { toHalf, tensorToFloat32 } = win._sdTurbo.__internals;
    expect(toHalf(new Float32Array([NaN]))[0]).toBe(0x7e00);

    // Unaligned Uint8Array view holding fp16 1.0 (0x3c00 little-endian: 0x00, 0x3c)
    const backing = new Uint8Array([0xff, 0x00, 0x3c, 0x00, 0x40]);
    const unaligned = backing.subarray(1, 5);
    const floats = tensorToFloat32({ type: 'float16', data: unaligned, dims: [2] });
    expect(floats[0]).toBeCloseTo(1.0, 3);
    expect(floats[1]).toBeCloseTo(2.0, 3);

    await expect(win._sdTurbo.init()).rejects.toThrow(/disabled/i);
  });

  it('piper_tts_loader tolerates non-string languages and serializes concurrent multi-language predict calls', async () => {
    const callLog = [];
    let inFlight = 0;
    let maxConcurrent = 0;
    const mockLib = {
      PATH_MAP: { 'es_MX-ald-medium': 'es/es_MX/ald/medium/es_MX-ald-medium.onnx', 'fr_FR-siwis-medium': 'fr/fr_FR/siwis/medium/fr_FR-siwis-medium.onnx' },
      TtsSession: { _instance: {} },
      stored: async () => ['es_MX-ald-medium', 'fr_FR-siwis-medium'],
      download: async () => {},
      predict: async ({ voiceId }) => {
        inFlight++;
        maxConcurrent = Math.max(maxConcurrent, inFlight);
        callLog.push('start:' + voiceId);
        await new Promise((r) => setTimeout(r, 25));
        callLog.push('end:' + voiceId);
        inFlight--;
        return { size: 4 };
      },
    };
    const fakeUrl = {
      createObjectURL: () => 'blob:piper-' + Math.random().toString(36).slice(2),
      revokeObjectURL: () => {},
    };
    const { win } = loadScriptInSandbox('piper_tts_loader.js', {
      URL: fakeUrl,
      navigator: { onLine: false },
      window: {
        __alloLoadVerifiedRuntime: async () => mockLib,
      },
    });
    expect(win._piperTTS.supportsLanguage(123)).toBe(false);
    expect(win._piperTTS.supportsLanguage(Object.create(null))).toBe(false);
    expect(win._piperTTS.isLanguageReady(Object.create(null))).toBe(false);

    const [u1, u2] = await Promise.all([
      win._piperTTS.speak('hola', 'es-MX'),
      win._piperTTS.speak('bonjour', 'fr-FR'),
    ]);
    expect(u1).toMatch(/^blob:piper-/);
    expect(u2).toMatch(/^blob:piper-/);
    expect(maxConcurrent).toBe(1);
    expect(callLog.length).toBe(4);
    expect(callLog[1].startsWith('end:')).toBe(true);
    expect(callLog[2].startsWith('start:')).toBe(true);
  });
});
