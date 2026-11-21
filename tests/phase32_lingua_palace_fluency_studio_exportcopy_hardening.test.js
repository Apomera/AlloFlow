import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { createHash } from 'crypto';
import { execFileSync } from 'child_process';

const ROOT = process.cwd();
const MIRRORS = [
  '.',
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];
const HOST_FILES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];
const PHASE32_ALL_FILES = [
  'export_runtime_copy_module.js',
  'memory_palace_module.js',
  'lingua_practice_module.js',
  'symbol_runner_core.js',
  'math_fluency_module.js',
  'studio_module.js',
];
const PHASE32_MANIFEST_FILES = [
  'export_runtime_copy_module.js',
  'memory_palace_module.js',
  'lingua_practice_module.js',
  'math_fluency_module.js',
  'studio_module.js',
];

function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  }
  return JSON.stringify(value);
}

describe('Phase 32: 4-way mirror parity & 3-host SRI / releaseId sync', () => {
  it('keeps all 6 Phase 32 deliverables syntax-valid, 4-way byte-identical, and synced in all 3 hosts', () => {
    const hashes = {};
    for (const file of PHASE32_ALL_FILES) {
      const buf = fs.readFileSync(path.join(ROOT, file));
      expect(() => new Function(buf.toString('utf8'))).not.toThrow();
      for (const mirror of MIRRORS.slice(1)) {
        const mBuf = fs.readFileSync(path.join(ROOT, mirror, file));
        expect(mBuf.equals(buf), `${file} mirror mismatch in ${mirror}`).toBe(true);
      }
      hashes[file] = {
        bytes: buf.length,
        integrity: 'sha384-' + createHash('sha384').update(buf).digest('base64'),
      };
    }

    const releaseIds = new Set();
    for (const host of HOST_FILES) {
      const src = fs.readFileSync(path.join(ROOT, host), 'utf8');
      const m = src.match(/const manifest = (\{[\s\S]*?\});\r?\n\s*Object\.keys\(manifest\.assets\)\.forEach/);
      expect(m, `manifest block in ${host}`).toBeTruthy();
      const manifest = JSON.parse(m[1]);
      for (const file of PHASE32_MANIFEST_FILES) {
        expect(manifest.assets[file], `${file} in ${host}`).toEqual(hashes[file]);
      }
      const { releaseId, ...body } = manifest;
      const expectedReleaseId = createHash('sha256').update(canonical(body)).digest('hex');
      expect(releaseId).toBe(expectedReleaseId);
      releaseIds.add(releaseId);
    }
    expect(releaseIds.size).toBe(1);
  });
});

describe('Phase 32: Export Runtime Copy hardening', () => {
  const src = fs.readFileSync(path.join(ROOT, 'export_runtime_copy_module.js'), 'utf8');

  it('guards non-object window.AlloModules and freezes null-prototype catalog & language maps', () => {
    const sandbox = { window: { AlloModules: 'corrupted' } };
    sandbox.self = sandbox.window;
    sandbox.globalThis = sandbox.window;
    vm.runInNewContext(src, sandbox);

    const copy = sandbox.window.AlloModules.ExportRuntimeCopy;
    expect(copy).toBeTruthy();
    expect(Object.isFrozen(copy)).toBe(true);
    expect(Object.isFrozen(copy.catalog)).toBe(true);
    expect(Object.getPrototypeOf(copy.catalog)).toBe(null);
    expect('constructor' in copy.catalog).toBe(false);
    expect('__proto__' in copy.catalog).toBe(false);

    const langs = Object.keys(copy.catalog);
    expect(langs.length).toBeGreaterThanOrEqual(40);
    for (const lang of langs) {
      expect(Object.getPrototypeOf(copy.catalog[lang])).toBe(null);
      expect(Object.isFrozen(copy.catalog[lang])).toBe(true);
      expect('toString' in copy.catalog[lang]).toBe(false);
    }
  });
});

describe('Phase 32: Memory Palace hardening', () => {
  const src = fs.readFileSync(path.join(ROOT, 'memory_palace_module.js'), 'utf8');

  it('validates textures, rejects SVG/external URLs, preserves Three.js SRI & timeout, and cleans up XR/GPU resources', () => {
    expect(src).toContain('function _mpUnsafeKey');
    expect(src).toContain('function _mpSafeTextureUrl');
    expect(src).toContain('sha384-WgG62qhSmnkOoW866eO1eLJd4HfFyZ2f8XnAK/VJR9mv/JffD14EgnvgpNEw3MmF');
    expect(src).toContain('__alloConfigureTrustedScript');
    expect(src).toContain('displacementMap.dispose');
    expect(src).toContain('Object.setPrototypeOf(frameRefs, null)');
    expect(src).toContain('removeEventListener(\'selectstart\'');
    expect(src).toContain('_unseatVR()');
    expect(src).not.toMatch(/l\.mnemonic\s*=\s*String\(t2/);
  });

  it('enforces prototype safety in parsePromptEval, normalizeRouteOrder, and updateMastery', () => {
    const sandbox = { window: { AlloModules: {} } };
    vm.runInNewContext(src, sandbox);
    const MP = sandbox.window.AlloModules.MemoryPalace;

    expect(MP.parsePromptEval('["not","an","object"]')).toBe(null);
    const evalRes = MP.parsePromptEval('{"__proto__":{"polluted":true},"verdict":"ok","reason":"Good"}');
    expect(evalRes).toBeTruthy();
    expect(evalRes.verdict).toBe('ok');
    expect(({}).polluted).toBeUndefined();

    const route = MP.normalizeRouteOrder(['__entry', 'a', 'b'], ['constructor', 'b', 'a']);
    expect(route).toEqual(['__entry', 'b', 'a']);

    const mastery = MP.updateMastery(
      { locus1: { streak: 1, seen: 1 } },
      'constructor',
      true,
      Date.now(),
    );
    expect(mastery).toBeTruthy();
    expect(Object.prototype.hasOwnProperty.call(mastery, 'constructor')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(mastery, 'locus1')).toBe(true);
  });
});

describe('Phase 32: Lingua Practice hardening', () => {
  const src = fs.readFileSync(path.join(ROOT, 'lingua_practice_module.js'), 'utf8');

  it('fails closed on student/QR AI blocks, fences prompts, enforces raster-only images, and fixes IDB/regex/voice bugs', () => {
    expect(src).toContain('__alloStudentAiDisabled');
    expect(src).toContain('__alloAiSecretsLocked');
    expect(src).toContain('__alloQrStudentMode');
    expect(src).toContain('_alloQrBlocked');
    expect(src).toContain('function _lpFence');
    expect(src).toContain('function _lpUnsafeKey');
    expect(src).toContain('function _lpSafeJsonParse');
    expect(src).toContain('data:image\\/(?:png|jpeg|jpg|webp|gif);base64,');
    expect(src).toContain("referrerPolicy:'no-referrer'");
    expect(src).toContain('AbortController');
    expect(src).toContain('_closeImgDb');
    expect(src).toContain('chatVoiceAttemptRef');
    expect(src).not.toMatch(/\.replace\(\/s\+\/g/);
  });

  it('fences prompts and handles prototype keys safely at runtime', () => {
    const reactStub = { createElement: () => null };
    const sandbox = { window: { AlloModules: {}, React: reactStub }, React: reactStub, console };
    vm.runInNewContext(src, sandbox);
    const LP = sandbox.window.AlloModules.LinguaPractice;

    expect(LP._dialectOptions('constructor')).toEqual([]);
    expect(typeof LP._translate('__proto__', 'back')).toBe('string');
    expect(LP._fallbackLesson('toString')).toBe(null);
    expect(LP._termImagePrompt('French', { term: 'bonjour', english: 'hello' })).toContain('<UNTRUSTED_');

    const validBackup = LP._createBackup({
      profile: { level: 'A1', register: 'neutral' },
      progress: {},
      wordBank: [],
    });
    const rawWithProto = JSON.stringify(validBackup).replace('"progress":{}', '"progress":{"__proto__":{"polluted":true}}');
    const parsed = LP._parseBackup(rawWithProto);
    expect(parsed).toBeTruthy();
    expect(({}).polluted).toBeUndefined();
  });
});

describe('Phase 32: Symbol Runner Core & Math Fluency hardening', () => {
  const srSrc = fs.readFileSync(path.join(ROOT, 'symbol_runner_core.js'), 'utf8');
  const mfSrc = fs.readFileSync(path.join(ROOT, 'math_fluency_module.js'), 'utf8');

  it('keeps embedded SymbolRunnerCore synced with symbol_runner_core.js', () => {
    expect(() => execFileSync(process.execPath, [path.join(ROOT, 'dev-tools/sync_symbol_runner_in_math_fluency.cjs'), '--check'], {
      cwd: ROOT,
      stdio: 'pipe',
    })).not.toThrow();
  });

  it('hardens SymbolRunnerCore print CSP, SVG/atob fail-closed checks, prototype keys, and singleton AudioContext', () => {
    expect(srSrc).toContain('Content-Security-Policy');
    expect(srSrc).toContain('&#39;');
    expect(srSrc).toContain('if (typeof root.atob !== \'function\') return \'\';');
    expect(srSrc).toContain('Object.prototype.hasOwnProperty.call(LOOK_ALIKES');
    expect(srSrc).toContain('Object.prototype.hasOwnProperty.call(SPOKEN_MAP');
    expect(srSrc).toContain('_sharedChimeCtx');

    const sandbox = { window: {} };
    vm.runInNewContext(srSrc, sandbox);
    const SR = sandbox.window.AlloSymbolRunnerCore;
    expect(SR).toBeTruthy();
    const html = SR.buildPrintableRanSheetHtml({
      title: 'Test',
      items: [{ sym: 'constructor', label: 'toString', img: 'data:image/svg+xml;base64,PHN2Zz4=' }],
    });
    expect(html).toContain('Content-Security-Policy');
    expect(html).not.toContain('data:image/svg+xml');
  });

  it('hardens Math Fluency AI gate, cleanAnswerInput regex, CSP print report, fetch bounds, and 3D maze refs/braces', () => {
    expect(mfSrc).toContain('function _mfAiUsable');
    expect(mfSrc).toContain('function _mfUnsafeKey');
    expect(mfSrc).toContain('function _mfSafeJsonParse');
    expect(mfSrc).toContain('UNTRUSTED_LANGUAGE');
    expect(mfSrc).toContain('id="mf-print-now"');
    expect(mfSrc).not.toContain('onclick="window.print()"');
    expect(mfSrc).toContain('keyCollectedRef');
    expect(mfSrc).toContain('monsterPosRef');
    expect(mfSrc).toContain('gameOverRef');
    expect(mfSrc).toContain('/^\\s*[-−]/');
    expect(mfSrc).not.toContain('/^s*[-−]/');
  });
});

describe('Phase 32: AlloStudio hardening', () => {
  const src = fs.readFileSync(path.join(ROOT, 'studio_module.js'), 'utf8');

  it('enforces fail-closed AI gate, prototype safety, print/export CSP & sandbox, prompt fencing, and PPTX/FileReader hardening', () => {
    expect(src).toContain('function _stAiUsable');
    expect(src).toContain('function _stUnsafeKey');
    expect(src).toContain('function _stSafeJsonParse');
    expect(src).toContain('function _stFenceUntrusted');
    expect(src).toContain('function _stInjectExportCsp');
    expect(src).toContain('sandbox\', \'allow-modals allow-same-origin\'');
    expect(src).toContain('TargetMode');
    expect(src).toContain('mountedRef');
    expect(src).toContain('agentPreviewRef');

    const sandbox = { window: { AlloModules: {} }, React: { createElement: () => null } };
    vm.runInNewContext(src, sandbox);
    const ST = sandbox.window.AlloModules.AlloStudio;
    expect(typeof ST.stSafeFontFamily('constructor')).toBe('string');
    expect(ST.stSafeFontFamily('constructor')).not.toContain('native code');
    expect(typeof ST.stSafeFontFamily('__proto__')).toBe('string');
    expect(ST.stSafeFontFamily('__proto__')).not.toContain('[object');
    const doc = ST.stCreateDoc('constructor', 'Test');
    expect(doc.canvas.preset).toBe('letter-portrait');
    expect(() => ST.stAppend(doc, { type: 'doc.title', title: 'X' }, 'constructor', 1)).toThrow();
  });
});
