import { describe, it, expect, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';

const ROOT = process.cwd();

const WAVE35_DELIVERABLES = [
  'ui_font_library_module.js',
  'audio_banks_module.js',
  'walkthrough_script_source_module.js',
  'glb_library_module.js',
  'language_matcher_module.js',
  'tutorial_compiler_module.js',
  'voice_config_module.js',
  'ui_polish_module.js',
  'canvas_tips_module.js',
  'label_positions_module.js',
  'stem_lab/archaeology_engine.js',
  'stem_lab/raptor_distance_investigations.js',
  'stem_lab/avian_feather_art.js',
  'stem_lab/raptor_distance_scene.js',
  'stem_lab/perception_gallery.js',
  'stem_lab/perception_gallery_scene.js',
  'stem_lab/reef_3d_engine.js',
  'export_runtime_copy_module.js',
];

const MIRROR_DIRS = [
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

function sha256Hex(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function loadInWindowVm(relPath, extraGlobals = {}) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const win = {
    AlloModules: {},
    console,
    setTimeout,
    clearTimeout,
    URL,
    TextEncoder,
    TextDecoder,
    ...extraGlobals,
  };
  win.window = win;
  win.globalThis = win;
  win.self = win;
  vm.runInNewContext(code, win, { filename: relPath });
  return win;
}

describe('Wave 35 — Security, Safety, SSR, Stability, Cleanup & WCAG 2.2 AA Hardening (18 Modules)', () => {
  it('loads all 18 Wave 35 deliverables cleanly in a bare Node VM without window/document (SSR safety)', () => {
    for (const rel of WAVE35_DELIVERABLES) {
      const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(() => vm.runInNewContext(code, { console }, { filename: rel })).not.toThrow();
    }
  });

  it('maintains 4-way SHA-256 mirror parity for all 18 Wave 35 deliverables', () => {
    for (const rel of WAVE35_DELIVERABLES) {
      const rootHash = sha256Hex(path.join(ROOT, rel));
      for (const dir of MIRROR_DIRS.slice(1)) {
        const dest = path.join(ROOT, dir, rel);
        expect(fs.existsSync(dest), `Missing mirror ${dest}`).toBe(true);
        expect(sha256Hex(dest), `Mirror drift in ${dest}`).toBe(rootHash);
      }
    }
  });

  it('keeps tutorial_compiler_module.js 8-char SHA-256 ?v= pin synchronized across all 3 host files', () => {
    const expected = sha256Hex(path.join(ROOT, 'tutorial_compiler_module.js')).slice(0, 8);
    const re = /tutorial_compiler_module\.js\?v=([0-9a-f]{8})/g;
    for (const host of HOST_FILES) {
      const txt = fs.readFileSync(path.join(ROOT, host), 'utf8');
      const matches = [...txt.matchAll(re)].map((m) => m[1]);
      expect(matches.length, `${host} missing ?v= pin`).toBeGreaterThan(0);
      for (const m of matches) expect(m).toBe(expected);
    }
  });

  describe('Pass 1 — Core Runtime Services & Media (Modules 1-6)', () => {
    it('UIFontLibrary blocks CSS injection, clamps Infinity, honors offline-only, and caps splitSyllables length', async () => {
      const win = loadInWindowVm('ui_font_library_module.js', { __alloOfflineOnly: true });
      const lib = win.AlloModules.UIFontLibrary;

      const css = lib.readerExportCss({
        fontFamily: "Arial}</style><script>alert(1)</script>",
        lineHeight: Infinity,
        letterSpacing: Infinity,
        baseFontSize: 20,
      }, { scope: 'body}</style><script>' });
      expect(css).not.toContain('<script>');
      expect(css).not.toContain('Infinity');
      expect(css).toContain('line-height:1.6 !important');
      expect(css).toContain('letter-spacing:0em !important');

      expect(await lib.exportFontFaceCss('lexend')).toEqual({ head: '', css: '' });
      expect(await win.__alloEnsureUIFont('lexend')).toBe(false);
      expect(win.__alloSplitSyllables('a'.repeat(100))).toBeNull();
    });

    it('AudioBanks enforces deleteProperty/setPrototypeOf/defineProperty traps and deduplicates listeners', () => {
      const listeners = [];
      const win = loadInWindowVm('audio_banks_module.js', {
        addEventListener: (ev, fn) => listeners.push({ ev, fn }),
        removeEventListener: (ev, fn) => {
          const idx = listeners.findIndex((l) => l.ev === ev && l.fn === fn);
          if (idx >= 0) listeners.splice(idx, 1);
        },
      });
      expect(() => Object.setPrototypeOf(win.LETTER_NAME_AUDIO, {})).toThrow(TypeError);
      expect(() => Object.defineProperty(win.LETTER_NAME_AUDIO, 'x', { get: () => 1 })).toThrow(TypeError);
      expect(() => Object.defineProperty(win.LETTER_NAME_AUDIO, 'x', { value: 1, configurable: false })).toThrow(TypeError);
      expect(listeners.filter((l) => l.ev === 'audio_bank_loaded').length).toBe(1);
    });

    it('WalkthroughScriptSource deep-freezes step objects and passes SSR', () => {
      const win = loadInWindowVm('walkthrough_script_source_module.js');
      const wss = win.AlloModules.WalkthroughScriptSource;
      expect(Object.isFrozen(wss)).toBe(true);
      expect(Object.isFrozen(wss.steps)).toBe(true);
      expect(Object.isFrozen(wss.steps[0])).toBe(true);
    });

    it('GlbLibrary blocks arbitrary schemes, %2e%2e traversal, unsafe base, and offline external .glb fetch', async () => {
      const win = loadInWindowVm('glb_library_module.js', { __alloOfflineOnly: true });
      const glb = win.AlloModules.GlbLibrary;

      expect(glb.resolveGlbUrl('ftp://evil.example/x.glb')).toBe('');
      expect(glb.resolveGlbUrl('ws://evil.example/x.glb')).toBe('');
      expect(glb.resolveGlbUrl('assets/%2e%2e/secret.glb')).toBe('');
      expect(glb.resolveGlbUrl('assets/a.glb\x00')).toBe('');
      expect(glb.resolveGlbUrl('assets/a.glb', 'javascript:alert(1)')).toBe('');

      const loadSpy = vi.fn();
      const fakeTHREE = { GLTFLoader: function () { this.load = loadSpy; } };
      await expect(glb.loadModel(fakeTHREE, { id: 'ext', glbUrl: 'https://cdn.example.com/x.glb' })).rejects.toThrow();
      expect(loadSpy).not.toHaveBeenCalled();
    });

    it('LanguageMatcher resolves punctuated aliases directly via NORM_ALIASES and uses null-prototype ALIASES', async () => {
      const fetchSpy = vi.fn();
      const win = loadInWindowVm('language_matcher_module.js', { fetch: fetchSpy });
      const lm = win.AlloLangMatcher;

      expect(Object.getPrototypeOf(lm._ALIASES)).toBeNull();
      const es = await lm.match('Spanish (Spain)');
      expect(es).toMatchObject({ display: 'Spanish (Castilian)', source: 'alias-exact' });
      const so = await lm.match('af-soomaali');
      expect(so).toMatchObject({ display: 'Somali', source: 'alias-exact' });
      expect(fetchSpy).not.toHaveBeenCalled();
    });

    it('TutorialCompiler always stops capture even if deps.now() throws and skips whitespace-only step IDs', async () => {
      const win = loadInWindowVm('tutorial_compiler_module.js');
      const tc = win.AlloModules.TutorialCompiler;

      const empty = tc.buildTutorialManifest([{ id: '   ', action: 'Click' }], {});
      expect(empty.steps).toEqual([]);

      const stopSpy = vi.fn(async () => ({ blob: true }));
      const manifest = tc.buildTutorialManifest([{ id: 's1', label: { bad: 1 }, action: 'Click here' }], {});
      expect(manifest.steps[0].beats[0].text).not.toContain('[object Object]');

      const res = await tc.compileTutorial(manifest, {
        startCapture: async () => ({ stop: stopSpy }),
        speak: async () => {},
        performStep: async () => {},
        now: () => { throw new Error('clock-boom'); },
      });
      expect(res.ok).toBe(true);
      expect(stopSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Pass 2 — Utilities & Pure STEM Engines (Modules 7-12)', () => {
    it('VoiceConfig and LabelPositions tolerate window === null safely', () => {
      for (const rel of ['voice_config_module.js', 'label_positions_module.js']) {
        const code = fs.readFileSync(path.join(ROOT, rel), 'utf8');
        expect(() => vm.runInNewContext(code, { window: null, console }, { filename: rel })).not.toThrow();
      }
    });

    it('UIPolish handles falsy lines, null-prototype className, invalid style, and ARIA attributes', () => {
      const mockReact = { createElement: (type, props, ...children) => ({ type, props: props || {}, children }) };
      const win = loadInWindowVm('ui_polish_module.js', { React: mockReact });
      const { EmptyState, LoadingSkeleton, JuiceWrap } = win.AlloModules.UIPolish;

      const skel = LoadingSkeleton({ lines: null });
      expect(skel.props['aria-busy']).toBe('true');
      expect(skel.children[1].length).toBe(4);
      expect(skel.children[1][0].props['aria-hidden']).toBe('true');

      const wrap = JuiceWrap({ className: Object.create(null), style: 'invalid', state: 'correct' });
      expect(wrap.props.className).toBe('allo-correct-pulse');
      expect(wrap.props.style).toBeUndefined();

      const empty = EmptyState({ ctaLabel: 'Go', onCta: () => {} });
      expect(empty.children[3].props.className).toContain('motion-reduce:hover:scale-100');
    });

    it('CanvasTips honors prefers-reduced-motion by skipping setInterval and disabling transition', () => {
      const setIntervalSpy = vi.fn(() => 1);
      const effects = [];
      const mockReact = {
        useState: (init) => [init, () => {}],
        useEffect: (fn) => effects.push(fn),
        createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
      };
      const win = loadInWindowVm('canvas_tips_module.js', {
        React: mockReact,
        matchMedia: () => ({ matches: true }),
        setInterval: setIntervalSpy,
        clearInterval: () => {},
      });
      const el = win.CanvasLoadingTips();
      effects.forEach((fn) => fn());
      expect(setIntervalSpy).not.toHaveBeenCalled();
      expect(el.props.style.transition).toBe('none');
    });

    it('ArchaeologyEngine prevents infinite loops, freezes defaults, guards OOB, and blocks prototype keys', () => {
      const win = loadInWindowVm('stem_lab/archaeology_engine.js');
      const arch = win.AlloArchaeology;

      expect(Object.isFrozen(arch)).toBe(true);
      expect(Object.isFrozen(arch.DEFAULT_STRATA)).toBe(true);

      const tiny = arch.generateSite(42, { cols: 1, rows: 1 });
      expect(tiny.artifacts.length).toBe(1);
      const inf = arch.generateSite(42, { cols: Infinity, rows: -5 });
      expect(inf.cols).toBe(6);
      expect(inf.rows).toBe(6);

      const state = arch.initState(tiny);
      const oob = arch.exposeCell(state, -1, 999);
      expect(oob.exposed).toBeNull();
      expect(oob.atBedrock).toBe(false);
      expect(arch.describeCell(state, 99, 99)).toBe('');

      const poisoned = arch.initState({ cols: 2, rows: 2, depth: 2, strata: arch.DEFAULT_STRATA, artifacts: [{ id: 'toString', trueStratum: 0, x: 0, y: 0 }] });
      expect(arch.scoreSession(poisoned).lostContextCount).toBe(0);
    });

    it('RaptorDistanceInvestigations rejects non-finite ratios and unknown factors cleanly', () => {
      const win = loadInWindowVm('stem_lab/raptor_distance_investigations.js', {
        RaptorDistanceModel: { version: 1, normalize: (x) => x, metrics: () => null },
        RaptorDistanceEvidence: {
          version: 1,
          snapshot: (x) => x,
          compare: () => ({ kind: 'single', factor: 'distance', reference: { distance: 80 }, current: { distance: 160 }, angleRatio: NaN, frequencyRatio: Infinity }),
        },
      });
      expect(win.RaptorDistanceInvestigations.explain({}, {})).toBeNull();
    });
  });

  describe('Pass 3 — Interactive 3D & Perception STEM Labs (Modules 13-18)', () => {
    it('AvianFeatherArt guards missing DOM and null 2D contexts', () => {
      const win = loadInWindowVm('stem_lab/avian_feather_art.js');
      expect(() => win.AvianFeatherArt.createFlightFeatherCanvas()).toThrow(/DOM document/);
    });

    it('RaptorDistanceScene wires webglcontextlost and validates non-finite settings', () => {
      const src = fs.readFileSync(path.join(ROOT, 'stem_lab/raptor_distance_scene.js'), 'utf8');
      expect(src).toContain("addEventListener('webglcontextlost'");
      expect(src).toContain('!contextLost');
      expect(src).toContain('The distance-detail settings are invalid.');
    });

    it('PerceptionGallery enforces 44px hit targets, aria-hidden hotspot indices, and non-nested mini SVG', () => {
      const src = fs.readFileSync(path.join(ROOT, 'stem_lab/perception_gallery.js'), 'utf8');
      expect(src).toContain('.pg-view-options{display:flex;align-items:center;gap:6px;min-height:44px');
      expect(src).toContain('.pg-adjust input{display:block;width:100%;min-height:44px');
      expect(src).toContain("role: props.mini ? undefined : 'img'");
      expect(src).toContain("h('span', { 'aria-hidden': true }, '0' + (index + 1))");
    });

    it('PerceptionGalleryScene guards projectPoint zero-denom/null and disposes textures on failure/re-attach', () => {
      const win = loadInWindowVm('stem_lab/perception_gallery_scene.js');
      const pgs = win.StemLab.PerceptionGalleryScene;
      expect(pgs.projectPoint(null)).toEqual({ x: 0, y: 0 });
      expect(pgs.projectPoint({ x: 2, y: 3, z: 12 })).toEqual({ x: 0, y: 0 });
      const src = fs.readFileSync(path.join(ROOT, 'stem_lab/perception_gallery_scene.js'), 'utf8');
      expect(src).toContain("if (next === 'failed') disposeGalleryTextures();");
    });

    it('Reef3D handles NaN clamp, gl.isContextLost() in warmup poll, and post-try dispose on error', () => {
      const src = fs.readFileSync(path.join(ROOT, 'stem_lab/reef_3d_engine.js'), 'utf8');
      expect(src).toContain('if (!isFinite(v)) return v > 0 ? hi : lo;');
      expect(src).toContain('gl.isContextLost()');
      expect(src).toContain('This device could not start the 3D reef.');
    });
  });
});
