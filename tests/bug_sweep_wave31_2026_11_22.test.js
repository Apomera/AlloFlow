import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import vm from 'vm';

const ROOT = path.resolve(__dirname, '..');

const WAVE31_DELIVERABLES = [
  'export_module.js',
  'generation_helpers_module.js',
  'personas_module.js',
  'phase_o_misc_handlers_module.js',
  'misc_handlers_module.js',
  'word_sounds_take_home_loader.js',
  'view_persona_chat_module.js',
  'view_gemini_bridge_module.js',
  'view_misc_modals_module.js',
  'view_word_sounds_preview_module.js',
  'view_alignment_report_module.js',
  'view_lesson_teaching_script_module.js',
  'stem_lab/stem_tool_kitchenlab.js',
  'stem_lab/stem_tool_atctower.js',
  'stem_lab/stem_tool_wheelandfire.js',
  'stem_lab/stem_tool_cellular.js',
  'stem_lab/stem_tool_geometryworld_builder.js',
  'stem_lab/stem_tool_microbiology.js',
];

const SSR_INDEPENDENT_15 = WAVE31_DELIVERABLES.filter(
  (rel) => !['export_module.js', 'personas_module.js', 'phase_o_misc_handlers_module.js'].includes(rel)
);

const MIRROR_DIRS = [
  ROOT,
  path.join(ROOT, 'desktop', 'web-app', 'public'),
  path.join(ROOT, 'desktop', 'web-app', 'build'),
  path.join(ROOT, 'desktop', 'app-build'),
];

function sha256File(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readRoot(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function runInSsrVm(rel) {
  const code = readRoot(rel);
  const ctx = vm.createContext({
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    URL,
    TextEncoder,
    TextDecoder,
    Uint8Array,
    Map,
    Set,
    Promise,
    Math,
    Date,
    JSON,
    Object,
    Array,
    Number,
    String,
    Boolean,
    RegExp,
    Error,
    TypeError,
    RangeError,
  });
  ctx.globalThis = ctx;
  vm.runInContext(code, ctx, { filename: rel, timeout: 3000 });
  return ctx;
}

describe('Wave 31 (2026-11-22) - 18 Flagship Browser Deliverables Hardening', () => {
  it('maintains 4-way SHA-256 mirror parity across all 18 Wave 31 deliverables', () => {
    for (const rel of WAVE31_DELIVERABLES) {
      const hashes = MIRROR_DIRS.map((dir) => {
        const full = path.join(dir, rel);
        expect(fs.existsSync(full), `Missing mirror: ${full}`).toBe(true);
        return sha256File(full);
      });
      expect(new Set(hashes).size, `Mirror hash mismatch for ${rel}`).toBe(1);
    }
  });

  it('maintains 3-host browser-delivery SRI manifest parity', () => {
    const hosts = [
      'AlloFlowANTI.txt',
      'desktop/web-app/src/AlloFlowANTI.txt',
      'desktop/web-app/src/App.jsx',
    ];
    const hostTexts = hosts.map((rel) => readRoot(rel));
    for (const rel of WAVE31_DELIVERABLES) {
      const buf = fs.readFileSync(path.join(ROOT, rel));
      const expectedSri = 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
      const expectedSnippet = JSON.stringify(rel) + ':{"bytes":' + buf.length + ',"integrity":' + JSON.stringify(expectedSri) + '}';
      for (let i = 0; i < hosts.length; i++) {
        expect(hostTexts[i].includes(expectedSnippet), `Missing or stale SRI entry for ${rel} in ${hosts[i]}`).toBe(true);
      }
    }
  });

  it('loads all 15 SSR-independent deliverables cleanly in a bare Node VM without window or document', () => {
    for (const rel of SSR_INDEPENDENT_15) {
      expect(() => runInSsrVm(rel), `SSR VM throw in ${rel}`).not.toThrow();
    }
  });

  describe('Pass 1: Core Export, Generation, Personas, Handlers & Take-Home Modules', () => {
    it('personas_module.js fixes self-harm pause deadlock, adds 911/inline crisis & AI/search gating', () => {
      const code = readRoot('personas_module.js');
      expect(code).toContain('988');
      expect(code).toContain('741741');
      expect(code).toContain('911');
      expect(code).toContain('_personaCanOpenAiSetup');
      expect(code).toContain('_personaAiUsable');
    });

    it('export_module.js hardens style escaping, URL credentials, SVG scripts, crisis & Blob cleanup', () => {
      const code = readRoot('export_module.js');
      expect(code).toContain('_storybookStudentAiBlocked');
      expect(code).toContain('SafetyContentChecker');
      expect(code).toContain('revokeObjectURL');
      expect(code).toMatch(/<\\\/style|<\/style/i);
    });

    it('generation_helpers_module.js has SSR guard, UNTRUSTED fencing, crisis check & policy gate', () => {
      const code = readRoot('generation_helpers_module.js');
      expect(code).toContain("typeof window === 'undefined'");
      expect(code).toContain('_ghIsPolicyAiBlocked');
      expect(code).toContain('UNTRUSTED_');
      expect(code).toContain('988');
      expect(code).toContain('document.hidden');
    });

    it('phase_o_misc_handlers_module.js gates AI calls, fences untrusted input & checks crisis', () => {
      const code = readRoot('phase_o_misc_handlers_module.js');
      expect(code).toContain('UNTRUSTED_');
      expect(code).toContain('988');
      expect(code).toContain('741741');
    });

    it('misc_handlers_module.js caps CSV OOM, cleans FERPA SEL localStorage & gates AI', () => {
      const code = readRoot('misc_handlers_module.js');
      expect(code).toContain("typeof window === 'undefined'");
      expect(code).toContain('_miscIsAiBlocked');
      expect(code).toContain('MAX_CSV_ROWS');
      expect(code).toContain('MAX_CSV_CELLS');
      expect(code).toContain('alloflow_sel_tool_usage');
    });

    it('word_sounds_take_home_loader.js blocks prototype pollution in parseResult at runtime', () => {
      const code = readRoot('word_sounds_take_home_loader.js');
      const win = { AlloModules: {} };
      const ctx = vm.createContext({
        window: win,
        console,
        URL,
        JSON,
        Object,
        Array,
        String,
        Number,
        Boolean,
        Math,
        Date,
        Map,
        Set,
        RegExp,
        Error,
      });
      ctx.globalThis = ctx;
      vm.runInContext(code, ctx, { filename: 'word_sounds_take_home_loader.js', timeout: 3000 });
      const api = win.AlloWordSoundsTakeHome;
      expect(api && typeof api.parseResult === 'function').toBe(true);

      const hostile = '{"kind":"alloflow-take-home-result","schemaVersion":1,"lessonId":"lesson-1","lessonTitle":"Test","studentName":"Student","items":[{"activity":"__proto__","word":"cat","correct":true,"supports":{"__proto__":{"polluted":true},"hint":true}},{"activity":"constructor","word":"dog","correct":false}]}';
      const parsed = api.parseResult(hostile);
      expect(({}).polluted).toBeUndefined();
      expect(parsed && parsed.ok).toBe(true);
      const res = parsed.result;
      expect(res && res.byActivity && typeof res.byActivity === 'object').toBe(true);
      expect(Object.prototype.hasOwnProperty.call(res.byActivity, '__proto__')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(res.byActivity, 'constructor')).toBe(false);
      expect(res.byActivity.invalid && res.byActivity.invalid.items).toBe(2);
      expect(res.items.every((row) => row.activity === 'invalid')).toBe(true);
    });
  });

  describe('Pass 2: High-Traffic Views, Bridges, Modals & Previews', () => {
    it('view_persona_chat_module.js enforces fail-closed AI locks, crisis screening & global mute', () => {
      const code = readRoot('view_persona_chat_module.js');
      expect(code).toContain('_pcHardAiPolicyBlocked');
      expect(code).toContain('_pcScreenCrisis');
      expect(code).toContain('_pcIsGlobalMuted');
      expect(code).toContain('alloflow-mute-changed');
      expect(code).toContain('988');
      expect(code).toContain('911');
    });

    it('view_gemini_bridge_module.js resolves karaoke deadlock, fixes mute typo & enforces AI/crisis gates', () => {
      const code = readRoot('view_gemini_bridge_module.js');
      expect(code).toContain('karaokeResolveRef');
      expect(code).toContain('audioFinishRef');
      expect(code).toContain('_bridgeIsGlobalMuted');
      expect(code).toContain('alloflow-mute-changed');
      expect(code).toContain('_bridgeScreenCrisis');
      expect(code).toContain('_bridgeSafeTtsSpeed');
      expect(code).toContain('__alloGlobalMuted');
    });

    it('view_misc_modals_module.js closes student AI settings bypass, sanitizes searchEntryPoint & screens crisis', () => {
      const code = readRoot('view_misc_modals_module.js');
      expect(code).toContain('isStudentModeBlocked');
      expect(code).toContain('diagnosticsBlocked');
      expect(code).toContain('_vmSanitizeSearchEntryPoint');
      expect(code).toContain('_vmScreenCrisis');
      expect(code).toContain('_vmHardAiPolicyBlocked');
      expect(code).toContain('UNTRUSTED_RECENT_CHAT');
    });

    it('view_word_sounds_preview_module.js enforces global mute, hard AI gate & prototype-safe readiness', () => {
      const code = readRoot('view_word_sounds_preview_module.js');
      expect(code).toContain('_wsIsGlobalMuted');
      expect(code).toContain('_wsHardAiBlocked');
      expect(code).toContain('alloflow-mute-changed');
      expect(code).toContain('hasOwnProperty.call(readinessCategoryNames');
    });

    it('view_alignment_report_module.js enforces fail-closed AI policy, URL validation & CSP print hardening', () => {
      const code = readRoot('view_alignment_report_module.js');
      expect(code).toContain('_arHardAiBlocked');
      expect(code).toContain('_arSafeSourceUrl');
      expect(code).toContain('alloflow:ai-config-changed');
      expect(code).toContain("base-uri \\'none\\'; form-action \\'none\\';");
    });

    it('view_lesson_teaching_script_module.js enforces QR student gate, global mute, safe JSON parse & print CSP', () => {
      const code = readRoot('view_lesson_teaching_script_module.js');
      expect(code).toContain('_ltsIsGlobalMuted');
      expect(code).toContain('_ltsHardAiBlocked');
      expect(code).toContain('_ltsSafeJsonParse');
      expect(code).toContain('alloflow-mute-changed');
      expect(code).toContain('__alloQrStudentMode');
      expect(code).toContain("base-uri \\'none\\'; form-action \\'none\\';");
    });
  });

  describe('Pass 3: Flagship Interactive STEM Labs', () => {
    it('hardens all 6 STEM labs for global mute / prototype safety / SSR safety', () => {
      const kitchen = readRoot('stem_lab/stem_tool_kitchenlab.js');
      const atc = readRoot('stem_lab/stem_tool_atctower.js');
      const wheel = readRoot('stem_lab/stem_tool_wheelandfire.js');
      const cellular = readRoot('stem_lab/stem_tool_cellular.js');
      const geo = readRoot('stem_lab/stem_tool_geometryworld_builder.js');
      const micro = readRoot('stem_lab/stem_tool_microbiology.js');

      for (const [name, src] of [
        ['kitchenlab', kitchen],
        ['atctower', atc],
        ['wheelandfire', wheel],
        ['cellular', cellular],
        ['geometryworld_builder', geo],
        ['microbiology', micro],
      ]) {
        expect(src.length, `${name} should be non-empty`).toBeGreaterThan(1000);
        expect(src, `${name} should guard window for SSR`).toMatch(/typeof window\s*===?\s*['"]undefined['"]|typeof window\s*!==?\s*['"]undefined['"]/);
        expect(src, `${name} should guard own properties`).toContain('hasOwnProperty');
        expect(src, `${name} should guard IME composition`).toContain('isComposing');
      }
      expect(kitchen).toContain('alloflow-mute-changed');
      expect(atc).toContain('alloflow-mute-changed');
      expect(cellular).toContain('alloflow-mute-changed');
      expect(wheel).toContain('Object.create(null)');
      expect(geo).toContain('Object.create(null)');
      expect(micro).toContain('Object.create(null)');
    });
  });
});
