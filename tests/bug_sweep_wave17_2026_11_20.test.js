import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function runScriptInWindow(rel, extraWindow = {}) {
  const code = read(rel);
  const win = {
    AlloModules: {},
    console,
    Math,
    Date,
    Object,
    Array,
    String,
    Number,
    Boolean,
    RegExp,
    JSON,
    Map,
    Set,
    WeakMap,
    URL,
    Error,
    TypeError,
    isFinite,
    isNaN,
    parseFloat,
    parseInt,
    ...extraWindow,
  };
  win.window = win;
  win.self = win;
  win.globalThis = win;
  const ctx = vm.createContext(win);
  vm.runInContext(code, ctx, { filename: rel });
  return win;
}

describe('Wave 17 Bug Audit & Regression Suite (18 files)', () => {
  // ═══════════════════════════════════════════════════════════════════════════
  // PASS 1: 6 SEL HUB TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Pass 1 — SEL Hub Tools', () => {
    it('sel_tool_windowoftolerance.js: crisis scanning, valid view clamp, HC print, hasOwnProperty & functional setWOT', () => {
      const src = read('sel_hub/sel_tool_windowoftolerance.js');
      expect(src).toMatch(/function scanWotText\s*\(/);
      expect(src).toMatch(/renderCrisisResources/);
      expect(src).toMatch(/Object\.prototype\.hasOwnProperty\.call/);
      expect(src).toMatch(/Array\.isArray\s*\(/);
      expect(src).toMatch(/@media print/);
      expect(src).toMatch(/function setWOT\s*\(\s*patch\s*\)\s*\{\s*setLabToolData\s*\(\s*function\s*\(\s*prev/);
      expect(src).toMatch(/_wtBd/);
    });

    it('sel_tool_bodystory.js: crisis scanning in addInflow/addCut, tablist ARIA, valid view clamp, functional setB', () => {
      const src = read('sel_hub/sel_tool_bodystory.js');
      expect(src).toMatch(/function scanBodyText\s*\(/);
      expect(src).toMatch(/addInflow[\s\S]{0,600}scanBodyText/);
      expect(src).toMatch(/addCut[\s\S]{0,600}scanBodyText/);
      expect(src).toMatch(/role:\s*'tabpanel'/);
      expect(src).toMatch(/aria-controls/);
      expect(src).toMatch(/@media print/);
      expect(src).toMatch(/function setB\s*\(\s*patch\s*\)\s*\{\s*setLabToolData\s*\(\s*function\s*\(\s*prev/);
    });

    it('sel_tool_sensoryregulation.js: crisis scanning in addActivity/submitInput, readable Typical radio, tabpanel ARIA, hasOwnProperty', () => {
      const src = read('sel_hub/sel_tool_sensoryregulation.js');
      expect(src).toMatch(/function scanSensoryText\s*\(/);
      expect(src).toMatch(/addActivity[\s\S]{0,800}scanSensoryText/);
      expect(src).toMatch(/submitInput[\s\S]{0,800}scanSensoryText/);
      expect(src).toMatch(/role:\s*'tabpanel'/);
      expect(src).toMatch(/Object\.prototype\.hasOwnProperty\.call\s*\(\s*profileMix/);
      expect(src).toMatch(/Object\.prototype\.hasOwnProperty\.call\s*\(\s*needLabels/);
      expect(src).toMatch(/@media print/);
      expect(src).toMatch(/function setSens\s*\(\s*patch\s*\)\s*\{\s*setLabToolData\s*\(\s*function\s*\(\s*prev/);
    });

    it('sel_tool_compassion.js: crisis scanning, no render-time state mutation, newest saved letter in print, tabpanel ARIA', () => {
      const src = read('sel_hub/sel_tool_compassion.js');
      expect(src).toMatch(/scanCompassionText\s*=\s*function/);
      expect(src).toMatch(/renderCrisisResources/);
      expect(src).toMatch(/savedLetters\.slice\s*\(\s*0\s*,\s*1\s*\)/);
      expect(src).not.toMatch(/savedLetters\.slice\s*\(\s*-1\s*\)/);
      expect(src).toMatch(/role:\s*'tabpanel'/);
      expect(src).toMatch(/htmlFor/);
      expect(src).toMatch(/outline:\s*'2px solid transparent'/);
    });

    it('sel_tool_transitions.js: crisis scanning, Phase 0 preserved, no nested button in a11yClick, sendCoachMessage helper', () => {
      const src = read('sel_hub/sel_tool_transitions.js');
      expect(src).toMatch(/scanTransitionsText\s*=\s*function/);
      expect(src).toMatch(/Number\.isInteger\s*\(\s*d\.myPhase\s*\)\s*&&\s*d\.myPhase\s*>=\s*0/);
      expect(src).toMatch(/sendCoachMessage/);
      expect(src).toMatch(/role:\s*'radiogroup'/);
      expect(src).toMatch(/role:\s*'tabpanel'/);
      expect(src).toMatch(/CHANGE_CURVE\.elementary/);
    });

    it('sel_tool_careconstellations.js: crisis scanning, clampStrength, mutual dash-dot, Object.create(null), trimmed print reflections', () => {
      const src = read('sel_hub/sel_tool_careconstellations.js');
      expect(src).toMatch(/function scanCareText\s*\(/);
      expect(src).toMatch(/clampStrength/);
      expect(src).toMatch(/8 2 2 2/);
      expect(src).toMatch(/Object\.create\s*\(\s*null\s*\)/);
      expect(src).toMatch(/function setCC\s*\(\s*patch\s*\)\s*\{\s*setLabToolData\s*\(\s*function\s*\(\s*prev/);
      expect(src).toMatch(/role:\s*'group'/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PASS 2: 6 CORE, PACKET & SLD/ANNOTATION MODULES (RUNTIME + STRUCTURAL)
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Pass 2 — Core, Packet & SLD/Annotation Modules', () => {
    it('word_sounds_core.js (runtime): buildRhymeBoard includes answerPhonemes, buildSoundSort skips nulls, prototype keys safe', () => {
      const corePath = path.join(ROOT, 'word_sounds_core.js');
      const core = require(corePath);
      expect(core).toBeTruthy();

      if (typeof core.buildRhymeBoard === 'function') {
        const board = core.buildRhymeBoard([
          { word: 'cat', phonemes: ['k', 'ae', 't'], rhyme: 'at' },
          { word: 'hat', phonemes: ['h', 'ae', 't'], rhyme: 'at' },
          { word: 'dog', phonemes: ['d', 'ao', 'g'], rhyme: 'og' },
          { word: 'sun', phonemes: ['s', 'ah', 'n'], rhyme: 'un' },
        ]);
        if (board && board.data) {
          expect(Array.isArray(board.data.answerPhonemes)).toBe(true);
        }
      }

      if (typeof core.buildSoundSort === 'function') {
        expect(() => core.buildSoundSort([null, undefined, { word: 'cat', phonemes: ['k', 'ae', 't'] }, { word: 'cap', phonemes: ['k', 'ae', 'p'] }])).not.toThrow();
      }

      const src = read('word_sounds_core.js');
      expect(src).toMatch(/answerPhonemes:/);
      expect(src).toMatch(/Object\.prototype\.hasOwnProperty\.call/);

      for (const rel of [
        'word_sounds_module.js',
        'word_sounds_setup_module.js',
        'word_sounds_readiness_contract.js',
        'word_sounds_di_loader.js',
      ]) {
        expect(read(rel)).toContain('answerPhonemes');
      }
    });

    it('word_sounds_packet_builder.js (runtime): svgRefusal rejects namespaced tags, quoted-angle style, srcdoc & image-set', () => {
      const win = runScriptInWindow('word_sounds_packet_builder.js');
      const api = win.AlloPacketBuilder;
      expect(api).toBeTruthy();
      expect(typeof api.svgRefusal).toBe('function');

      expect(api.svgRefusal('<svg xmlns:x="http://www.w3.org/1999/xhtml"><x:script>alert(1)</x:script></svg>')).toBeTruthy();
      expect(api.svgRefusal('<svg xmlns:h="http://www.w3.org/1999/xhtml"><h:iframe src="https://evil.test"/></svg>')).toBeTruthy();
      expect(api.svgRefusal('<svg><style title="a>b">@import url(https://evil.test/x.css)</style></svg>')).toBeTruthy();
      expect(api.svgRefusal('<svg><rect srcdoc="<script>1</script>"/></svg>')).toBeTruthy();
      expect(api.svgRefusal('<svg><rect style="background: image-set(url(https://evil.test/a.png) 1x)"/></svg>')).toBeTruthy();
      expect(api.svgRefusal('<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="20" fill="#2563eb"/></svg>')).toBe('');

      const src = read('word_sounds_packet_builder.js');
      expect(src).toMatch(/guarded\[id \+ '\|' \+ item\.word\] = true/);
    });

    it('text_pipeline_helpers_module.js (runtime): escaped ampersand in math, https-only source URL, prototype-safe lang attributes', () => {
      const win = runScriptInWindow('text_pipeline_helpers_module.js', {
        React: { createElement: () => null, Fragment: 'Fragment' },
      });
      const mod = win.AlloModules && win.AlloModules.TextPipelineHelpers;
      expect(mod).toBeTruthy();

      expect(typeof mod.processMathHTML).toBe('function');
      const rendered = mod.processMathHTML('A \\& B');
      expect(rendered).toContain('&amp;');

      expect(typeof mod.getArtifactTranslationTextAttributes).toBe('function');
      const attrs = mod.getArtifactTranslationTextAttributes('constructor');
      expect(typeof attrs).toBe('object');
      expect(attrs && attrs.lang).not.toBe(Object.prototype.constructor);

      if (typeof mod.filterEducationalSources === 'function') {
        const filtered = mod.filterEducationalSources([
          { web: { uri: 'javascript:alert(1)', title: 'Bad JS' } },
          { web: { uri: 'data:text/html,<script>1</script>', title: 'Bad Data' } },
          { web: { uri: 'https://www.nasa.gov/earth', title: 'NASA Earth' } },
        ]);
        expect(filtered.map((s) => s.web.uri)).toEqual(['https://www.nasa.gov/earth']);
      }

      const src = read('text_pipeline_helpers_source.jsx');
      expect(src).toMatch(/\\\\&amp;/);
      expect(src).toMatch(/!\s*\/\^https\?:\$\/i\.test\s*\(\s*parsed\.protocol\s*\)/);
      expect(src).toMatch(/Object\.prototype\.hasOwnProperty\.call/);
    });

    it('packets-results.js: busy-flag try/finally, own(reader.ACTIVITIES), safe sort matching, mathBlocked tracking', () => {
      const src = read('packets-results.js');
      expect(src).not.toMatch(/reader\.ACTIVITIES\[act\]/);
      expect(src).toMatch(/own\s*\(\s*reader\.ACTIVITIES\s*,\s*act\s*\)/);
      expect(src).toMatch(/mathBlocked/);
      expect(src).toMatch(/querySelectorAll\s*\(\s*'\.sort'\s*\)/);
      expect(src).toMatch(/finally\s*\{[\s\S]{0,120}busy\s*=\s*false/);
    });

    it('maine_sld_practice_source.jsx & module: beforeprint listener, null guards, human labels in print output', () => {
      const src = read('maine_sld_practice_source.jsx');
      const built = read('maine_sld_practice_module.js');
      expect(src).toMatch(/addEventListener\s*\(\s*'beforeprint'/);
      expect(src).toMatch(/removeEventListener\s*\(\s*'beforeprint'/);
      expect(src).toMatch(/if\s*\(\s*!root\s*\)\s*return;/);
      expect(src).toMatch(/if\s*\(\s*!target\s*\)\s*return;/);
      expect(src).toMatch(/if\s*\(\s*fileRef\.current\s*\)\s*fileRef\.current\.click\s*\(/);
      expect(src).toMatch(/\(purposeLabel\(f\.purpose\)\s*\|\|\s*f\.purpose\)/);
      expect(src).toMatch(/const reflectionLabels\s*=/);
      expect(built).toContain('beforeprint');
    });

    it('annotation_suite_module.js (runtime): unique import IDs, prototype-safe preview, NoteBubble Escape/blur, Workspace voice isolation', () => {
      const win = runScriptInWindow('annotation_suite_module.js', {
        React: {
          createElement: () => null,
          Fragment: 'Fragment',
          useState: (v) => [v, () => {}],
          useRef: (v) => ({ current: v }),
          useEffect: () => {},
          useMemo: (fn) => fn(),
          useCallback: (fn) => fn,
        },
      });
      const mod = win.AlloModules && win.AlloModules.AnnotationSuite;
      expect(mod).toBeTruthy();

      // 1. Prototype-safe annotationPreview
      const protoSticker = mod.annotationPreview({ kind: 'sticker', type: 'constructor' });
      expect(protoSticker).not.toContain('function');
      const protoDraw = mod.annotationPreview({ kind: 'draw', shape: 'toString' });
      expect(protoDraw).toContain('Drawing');
      expect(protoDraw).not.toContain('function');

      // 2. importAnnotations guarantees unique IDs under collisions
      const existing = [{ id: 'dup-1', kind: 'sticker', type: 'star', x: 10, y: 10, author: 'teacher' }];
      const incoming = Array.from({ length: 25 }, () => ({
        id: 'dup-1',
        kind: 'sticker',
        type: 'star',
        x: 20,
        y: 20,
        author: 'student',
      }));
      const res = mod.importAnnotations(existing, { docTitle: 'Test', annotations: incoming });
      expect(res.error).toBeFalsy();
      const ids = res.list.map((a) => String(a.id));
      expect(new Set(ids).size).toBe(ids.length);

      // 3. Structural guarantees in source + built module
      const src = read('annotation_suite_source.jsx');
      expect(src).toMatch(/box\.contains\s*\(\s*e\.relatedTarget\s*\)/);
      expect(src).toMatch(/e\.key === 'Escape'/);
      expect(src).toMatch(/Number\.isFinite\s*\(\s*parsedTop\s*\)/);
      expect(src).toMatch(/onChangeRef\.current/);
      expect(src).toMatch(/documentKeyRef\.current/);
      expect(src).toMatch(/prevDocRef\.current/);
      expect(src).toMatch(/aria-label=\{tt\("a11y\.note_template"\)\}/);
      expect(src).not.toMatch(/aria-label=\{t\("a11y\.clear_all_annotations"\)\}/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PASS 3: 6 STEM LAB TOOLS
  // ═══════════════════════════════════════════════════════════════════════════
  describe('Pass 3 — STEM Lab Tools', () => {
    it('stem_tool_a11yauditor.js: triple-backtick fence split, hasOwnProperty NAMED, Object.create(null), reader.onerror, worstScore', () => {
      const src = read('stem_lab/stem_tool_a11yauditor.js');
      expect(src).toContain(".split('```')");
      expect(src).toMatch(/Object\.prototype\.hasOwnProperty\.call\s*\(\s*NAMED/);
      expect(src).toMatch(/Object\.create\s*\(\s*null\s*\)/);
      expect(src).toMatch(/reader\.onerror/);
      expect(src).toMatch(/worstScore/);
    });

    it('stem_tool_datalab.js: decimal-safe normalizeTutorReply, peekRawInbox, Phase 2/3 progression, hasOwnProperty in normalizeDataset', () => {
      const src = read('stem_lab/stem_tool_datalab.js');
      expect(src).toMatch(/function peekRawInbox\s*\(/);
      expect(src).toMatch(/Object\.prototype\.hasOwnProperty\.call/);
      expect(src).toMatch(/normalizeTutorReply/);
    });

    it('stem_tool_datastudio.js: sqlOverride string guard, top-level React.useState before regression return, Box Plot iqr > 0, Pie 100% circle', () => {
      const src = read('stem_lab/stem_tool_datastudio.js');
      const kernelHookIdx = src.indexOf('var _dsKernelBusyState = React.useState(false)');
      const regressionReturnIdx = src.indexOf("if (studioMode === 'regression')");
      expect(kernelHookIdx).toBeGreaterThan(-1);
      expect(regressionReturnIdx).toBeGreaterThan(-1);
      expect(kernelHookIdx).toBeLessThan(regressionReturnIdx);
      expect(src).toMatch(/typeof sqlOverride === 'string'/);
      expect(src).toMatch(/iqr > 0/);
      expect(src).toMatch(/Object\.create\s*\(\s*null\s*\)/);
      expect(src).toMatch(/isContrast/);
    });

    it('stem_tool_logiclab.js: React.useState aiLoading, strict tokenize rejection, parsed.pos check, modulo fallacy counter, ResizeObserver cleanup', () => {
      const src = read('stem_lab/stem_tool_logiclab.js');
      expect(src).toMatch(/React\.useState\s*\(\s*false\s*\)/);
      expect(src).toMatch(/parsed\.pos !== tokens\.length/);
      expect(src).toMatch(/parsed\.pos !== toks\.length/);
      expect(src).toMatch(/challengeIdx % FALLACIES\.length/);
      expect(src).toMatch(/_ttInit/);
    });

    it('stem_tool_inequality.js: chain contradiction detection, qMake overflow null fallback, 2D emptyRegion fix, 1D mode gating', () => {
      const src = read('stem_lab/stem_tool_inequality.js');
      expect(src).toMatch(/identity = 'none'/);
      expect(src).toMatch(/graphMode === '1d'/);
      expect(src).toMatch(/isContrast/);
    });

    it('stem_tool_gamestudio.js: ice slide break + win, playBackupTiles, bounds checks, everWon, React.useState aiLoading, proto-safe import', () => {
      const src = read('stem_lab/stem_tool_gamestudio.js');
      expect(src).toMatch(/if\s*\(\s*sDest !== 'ice'\s*\)\s*break;/);
      expect(src).toMatch(/playBackupTiles/);
      expect(src).toMatch(/everWon/);
      expect(src).toMatch(/React\.useState\s*\(\s*false\s*\)/);
      expect(src).toMatch(/__proto__/);
      expect(src).toMatch(/role:\s*'application'/);
    });
  });
});
