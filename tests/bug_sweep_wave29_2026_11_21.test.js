import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();
const bdm = require(path.join(ROOT, 'dev-tools/build_browser_delivery_manifest.cjs'));

const WAVE29_PASS1 = [
  'dynamic_assessment_module.js',
  'student_analytics_module.js',
  'allohaven_module.js',
  'behavior_lens_module.js',
  'lingua_practice_module.js',
  'symbol_studio_module.js',
];

const WAVE29_PASS2 = [
  'video_studio_module.js',
  'poet_tree_module.js',
  'story_stage_module.js',
  'catalog_module.js',
  'arcade_mode_modelun.js',
  'music_studio/open_groove_core.js',
];

const WAVE29_PASS3 = [
  'stem_lab/stem_lab_module.js',
  'stem_lab/stem_tool_music.js',
  'stem_lab/stem_tool_llm_literacy.js',
  'stem_lab/stem_tool_cyberdefense.js',
  'stem_lab/stem_tool_economicslab.js',
  'stem_lab/stem_tool_arithmetic.js',
];

const WAVE29_ALL = [...WAVE29_PASS1, ...WAVE29_PASS2, ...WAVE29_PASS3];

const MIRROR_ROOTS = [
  '',
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const HOST_FILES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sha384Sri(buf) {
  return 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
}

function readSource(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function extractFunction(src, name) {
  const idx = src.indexOf('function ' + name + '(');
  if (idx < 0) return null;
  const open = src.indexOf('{', idx);
  if (open < 0) return null;
  let depth = 0, inStr = false, quote = '', esc = false;
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    if (inStr) {
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === quote) inStr = false;
    } else {
      if (ch === '"' || ch === "'" || ch === '`') { inStr = true; quote = ch; }
      else if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) return src.slice(idx, i + 1);
      }
    }
  }
  return null;
}

function runSsr(relPath) {
  const code = readSource(relPath);
  const sandbox = {
    console: { log() {}, warn() {}, error() {}, info() {} },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
  };
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.runInNewContext(code, sandbox, { filename: relPath, timeout: 3000 });
  return sandbox;
}

function runWithWindow(relPath, extra = {}) {
  const code = readSource(relPath);
  const win = Object.assign({
    AlloModules: {},
    StemLab: { registerTool() {} },
    addEventListener() {},
    removeEventListener() {},
    console: { log() {}, warn() {}, error() {}, info() {} },
  }, extra.window || {});
  const sandbox = Object.assign({
    window: win,
    console: { log() {}, warn() {}, error() {}, info() {} },
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
  }, extra.sandbox || {});
  sandbox.globalThis = sandbox;
  sandbox.self = sandbox;
  vm.runInNewContext(code, sandbox, { filename: relPath, timeout: 3000 });
  return { sandbox, win };
}

describe('Wave 29 bug sweep (18 flagship hand-authored deliverables)', () => {
  describe('4-way mirror SHA-256 parity', () => {
    for (const relPath of WAVE29_ALL) {
      it(`mirrors ${relPath} identically across all 4 targets`, () => {
        const hashes = MIRROR_ROOTS.map((dir) => {
          const full = path.join(ROOT, dir, relPath);
          expect(fs.existsSync(full), `Missing mirror: ${full}`).toBe(true);
          return sha256(fs.readFileSync(full));
        });
        expect(new Set(hashes).size).toBe(1);
      });
    }
  });

  describe('3-host browser-delivery SRI parity', () => {
    it('synchronizes identical releaseId and SHA-384 SRI for all 18 Wave 29 deliverables across all 3 hosts', () => {
      const manifests = HOST_FILES.map((hostRel) => {
        const parsed = bdm.readEmbeddedManifest(readSource(hostRel));
        expect(parsed, `Manifest block missing in ${hostRel}`).toBeTruthy();
        return parsed;
      });

      const releaseIds = manifests.map((m) => m.releaseId);
      expect(new Set(releaseIds).size).toBe(1);
      expect(releaseIds[0]).toMatch(/^[a-f0-9]{64}$/);

      for (const relPath of WAVE29_ALL) {
        const buf = fs.readFileSync(path.join(ROOT, relPath));
        const expectedSri = sha384Sri(buf);
        for (let i = 0; i < manifests.length; i++) {
          const entry = manifests[i].assets[relPath];
          expect(entry, `Missing SRI entry for ${relPath} in ${HOST_FILES[i]}`).toBeTruthy();
          expect(entry.integrity).toBe(expectedSri);
          expect(entry.bytes).toBe(buf.length);
        }
      }

      const fresh = bdm.buildManifest({ rootDir: ROOT });
      expect(fresh.releaseId).toBe(releaseIds[0]);
    });
  });

  describe('Node VM SSR evaluation (window & document undefined)', () => {
    for (const relPath of WAVE29_ALL) {
      it(`evaluates ${relPath} cleanly with window and document undefined`, () => {
        expect(() => runSsr(relPath)).not.toThrow();
      });
    }
  });

  describe('Behavioral unit checks for Wave 29 fixes', () => {
    it('open_groove_core hardens ogFinite, null projects, prototype keys, and NaN totalSteps', () => {
      const src = readSource('music_studio/open_groove_core.js');
      const ogFiniteSrc = extractFunction(src, 'ogFinite');
      expect(ogFiniteSrc).toBeTruthy();
      const ogFinite = vm.runInNewContext(`(${ogFiniteSrc})`);
      expect(ogFinite(null, 7)).toBe(7);
      expect(ogFinite('', 7)).toBe(7);
      expect(ogFinite('   ', 7)).toBe(7);
      expect(ogFinite(true, 7)).toBe(7);
      expect(ogFinite(false, 7)).toBe(7);
      expect(ogFinite(0, 7)).toBe(0);
      expect(ogFinite('42', 7)).toBe(42);

      const { win } = runWithWindow('music_studio/open_groove_core.js');
      const og = win.AlloModules.OpenGrooveCore;
      expect(og).toBeTruthy();

      expect(() => og.ogPrepareStemSlots(null)).toThrow(/project is not ready/i);

      const proj = og.ogCreateProject({ title: 'Wave29 Test' });
      const badTrack = og.ogAddTrack(proj, { id: '__proto__', name: 'Injected' });
      expect(badTrack.id).not.toBe('__proto__');
      expect(({}).polluted).toBeUndefined();

      const track = proj.tracks[0];
      const pat = proj.patterns[0];
      pat.bars = Number.NaN;
      const evt = og.ogSetAutomationPoint(proj, pat.id, track.id, 'volume', 2, Number.NaN, 0.5);
      expect(evt).toBeTruthy();
      expect(Number.isFinite(evt.startTick)).toBe(true);
      expect(Number.isFinite(evt.value)).toBe(true);

      proj.tracks.push(null);
      proj.patterns.push(null);
      expect(() => og.ogBuildMixerSnapshot(proj)).not.toThrow();
      expect(() => og.ogBuildPatternLauncher(proj)).not.toThrow();
    });

    it('stem_tool_cyberdefense handles negative/non-finite Caesar shifts and strips __proto__ in JSON parse', () => {
      const src = readSource('stem_lab/stem_tool_cyberdefense.js');
      const caesarSrc = extractFunction(src, 'caesarCipher');
      expect(caesarSrc).toBeTruthy();
      const caesarFn = vm.runInNewContext(`(${caesarSrc})`);
      expect(caesarFn('ABC', -3, true)).toBe('XYZ');
      expect(caesarFn('ABC', -29, true)).toBe('XYZ');
      expect(caesarFn('ABC', 3, false)).toBe('XYZ');
      expect(caesarFn('ABC', Number.NaN, true)).toBe('ABC');

      const parseSrc = extractFunction(src, '_cyberSafeJsonParse');
      expect(parseSrc).toBeTruthy();
      const parseFn = vm.runInNewContext(`(${parseSrc})`);
      const parsed = parseFn('{"ok":1,"__proto__":{"polluted":true}}');
      expect(parsed.ok).toBe(1);
      expect(Object.prototype.hasOwnProperty.call(parsed, '__proto__')).toBe(false);
    });

    it('stem_tool_arithmetic prevents divide-by-zero in roundNearest and truncTo', () => {
      const src = readSource('stem_lab/stem_tool_arithmetic.js');
      const roundToSrc = extractFunction(src, 'roundTo');
      const roundSrc = extractFunction(src, 'roundNearest');
      const truncSrc = extractFunction(src, 'truncTo');
      expect(roundToSrc && roundSrc && truncSrc).toBeTruthy();
      const { roundNearest: roundFn, truncTo: truncFn } = vm.runInNewContext(
        `${roundToSrc}\n${roundSrc}\n${truncSrc}\n({ roundNearest, truncTo })`
      );
      expect(Number.isFinite(roundFn(12.34, 0))).toBe(true);
      expect(Number.isFinite(truncFn(12.34, 0))).toBe(true);
      expect(roundFn(12.34, 1)).toBe(12);
      expect(truncFn(12.89, 1)).toBe(12);
    });

    it('stem_tool_llm_literacy aiSafetyGate has self-contained inline crisis fallback with 988/741741/911', () => {
      const src = readSource('stem_lab/stem_tool_llm_literacy.js');
      expect(src).toMatch(/988/);
      expect(src).toMatch(/741741/);
      expect(src).toMatch(/911/);
      const gateSrc = extractFunction(src, 'aiSafetyGate');
      expect(gateSrc).toBeTruthy();
      let flagged = null;
      const gateFn = vm.runInNewContext(`(${gateSrc})`, {
        window: {},
        ctx: { onSafetyFlag(f) { flagged = f; } },
      });
      const res = gateFn('I want to kill myself', 'coach');
      expect(res.action).toBe('block');
      expect(res.severity).toBe('critical');
      expect(flagged).toBeTruthy();
      expect(gateFn('How does tokenization work?', 'coach').action).toBe('continue');
    });

    it('allohaven runCuriousSafetyCheck blocks self-harm with 988/741741/911 even without SelHub, and _havenAiUsable honors managed/student/QR policies', () => {
      const src = readSource('allohaven_module.js');
      const mRe = src.match(/var _HAVEN_CRISIS_RE\s*=\s*[^\n]+;/);
      const mNotice = src.match(/var _HAVEN_CRISIS_NOTICE\s*=\s*[^\n]+;/);
      const mCheck = src.match(/function runCuriousSafetyCheck\([^)]*\)\s*\{[\s\S]*?\n  \}/);
      const mAi = src.match(/function _havenAiUsable\([^)]*\)\s*\{[\s\S]*?\n  \}/);
      expect(mRe && mNotice && mCheck && mAi).toBeTruthy();

      const checkFn = vm.runInNewContext(`${mRe[0]}\n${mNotice[0]}\n(${mCheck[0]})`, { window: {} });
      let flagged = null;
      const blocked = checkFn('I want to hurt myself tonight', 'test', (f) => { flagged = f; });
      expect(blocked.action).toBe('block');
      expect(blocked.severity).toBe('critical');
      expect(flagged).toBeTruthy();
      expect(flagged.resources).toContain('988');
      expect(flagged.resources).toContain('741741');
      expect(flagged.resources).toContain('911');
      expect(checkFn('My pet learned about volcanoes').action).toBe('continue');

      const dummyFn = () => 'ok';
      const evalAi = (winObj) => vm.runInNewContext(`(${mAi[0]})`, { window: winObj })('text', dummyFn);
      expect(evalAi({})).toBe(true);
      expect(evalAi({ ALLOFLOW_MANAGED_AI_POLICY: { allowAi: false } })).toBe(false);
      expect(evalAi({ StudentPolicy: { aiEnabled: false } })).toBe(false);
      expect(evalAi({ __alloQrStudentMode: { active: true } })).toBe(false);
      expect(evalAi({ __alloQrStudentMode: { allowAi: false } })).toBe(false);
    });

    it('catalog_module invokes all React hooks before the closed-modal early return', () => {
      const src = readSource('catalog_module.js');
      const fnBody = extractFunction(src, 'CommunityCatalog');
      expect(fnBody).toBeTruthy();
      const closedReturnIdx = fnBody.lastIndexOf('\n    if (!props.isOpen) return null;');
      expect(closedReturnIdx).toBeGreaterThan(-1);
      const afterReturn = fnBody.slice(closedReturnIdx);
      expect(afterReturn).not.toMatch(/\buse(?:State|Effect|Ref|Memo|Callback)\s*\(/);
    });

    it('story_stage_module keeps dual-pin _safeStoryImgUrl alias and blocks SVG data URIs', () => {
      const src = readSource('story_stage_module.js');
      expect(src).toContain('var _safeStoryImgUrl = safeStoryImgUrl;');
      expect(src).toMatch(/ALLOFLOW_MANAGED_AI_POLICY/);
      expect(src).toMatch(/alloflow-mute-changed/);
      expect(src).toMatch(/988/);
      expect(src).toMatch(/911/);
    });
  });

  describe('Cross-cutting Wave 29 hardening invariants', () => {
    const AI_POLICY_MODULES = [
      'dynamic_assessment_module.js',
      'student_analytics_module.js',
      'allohaven_module.js',
      'behavior_lens_module.js',
      'lingua_practice_module.js',
      'symbol_studio_module.js',
      'video_studio_module.js',
      'poet_tree_module.js',
      'story_stage_module.js',
      'catalog_module.js',
      'arcade_mode_modelun.js',
      'stem_lab/stem_lab_module.js',
      'stem_lab/stem_tool_music.js',
      'stem_lab/stem_tool_llm_literacy.js',
      'stem_lab/stem_tool_cyberdefense.js',
      'stem_lab/stem_tool_economicslab.js',
      'stem_lab/stem_tool_arithmetic.js',
    ];

    for (const relPath of AI_POLICY_MODULES) {
      it(`${relPath} enforces ALLOFLOW_MANAGED_AI_POLICY and StudentPolicy hard-deny`, () => {
        const src = readSource(relPath);
        expect(src).toContain('ALLOFLOW_MANAGED_AI_POLICY');
        expect(src).toContain('StudentPolicy');
      });
    }

    const MUTE_MODULES = [
      'allohaven_module.js',
      'lingua_practice_module.js',
      'symbol_studio_module.js',
      'video_studio_module.js',
      'poet_tree_module.js',
      'story_stage_module.js',
      'arcade_mode_modelun.js',
      'stem_lab/stem_lab_module.js',
      'stem_lab/stem_tool_music.js',
      'stem_lab/stem_tool_cyberdefense.js',
      'stem_lab/stem_tool_economicslab.js',
      'stem_lab/stem_tool_arithmetic.js',
    ];

    for (const relPath of MUTE_MODULES) {
      it(`${relPath} respects alloflow-global-muted and reacts to alloflow-mute-changed`, () => {
        const src = readSource(relPath);
        expect(src).toContain('alloflow-global-muted');
        expect(src).toContain('alloflow-mute-changed');
      });
    }

    it('behavior_lens_module gates focus-mode audio on alloflow-global-muted and skips hidden-tab poll ticks', () => {
      const src = readSource('behavior_lens_module.js');
      expect(src).toContain('alloflow-global-muted');
      expect(src).toContain('document.hidden');
      expect(src).toContain('_blSafeJsonParse');
      expect(src).toContain('_blFence');
    });

    const CRISIS_MODULES = [
      'allohaven_module.js',
      'lingua_practice_module.js',
      'symbol_studio_module.js',
      'video_studio_module.js',
      'poet_tree_module.js',
      'story_stage_module.js',
      'arcade_mode_modelun.js',
      'stem_lab/stem_lab_module.js',
      'stem_lab/stem_tool_llm_literacy.js',
      'stem_lab/stem_tool_economicslab.js',
    ];

    for (const relPath of CRISIS_MODULES) {
      it(`${relPath} includes crisis safety coverage with 988, 741741, and 911`, () => {
        const src = readSource(relPath);
        expect(src).toContain('988');
        expect(src).toContain('741741');
        expect(src).toContain('911');
      });
    }
  });
});
