import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = process.cwd();

function loadModuleInVm(relPath, extraGlobals = {}) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  const win = {
    AlloModules: {},
    React: {
      createElement: () => null,
      Fragment: 'Fragment',
      useState: (v) => [v, () => {}],
      useEffect: () => {},
      useRef: (v) => ({ current: v }),
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      memo: (c) => c,
    },
    console: { log: () => {}, warn: () => {}, error: () => {} },
    ...extraGlobals,
  };
  win.window = win;
  win.self = win;
  win.globalThis = win;
  const fakeDoc = {
    getElementById: () => null,
    createElement: () => ({ style: {}, setAttribute: () => {}, appendChild: () => {} }),
    head: { appendChild: () => {} },
    body: { appendChild: () => {}, style: {} },
    documentElement: { lang: 'en', dir: 'ltr' },
  };
  const ctx = vm.createContext({
    window: win,
    self: win,
    globalThis: win,
    document: fakeDoc,
    React: win.React,
    console: win.console,
    URL,
    AbortController,
    setTimeout,
    clearTimeout,
    Promise,
    Blob,
    Uint8Array,
    TextEncoder,
    TextDecoder,
    ...extraGlobals,
  });
  vm.runInContext(code, ctx, { filename: relPath });
  return win;
}

describe('Phase 17: Heavyweight Studios, Core Pipelines & Verified Sweeps', () => {
  it('sped_timelines_module.js: spedRollup does not pollute Object.prototype for "__proto__" provider', () => {
    const win = loadModuleInVm('sped_timelines_module.js');
    const { spedRollup } = win.AlloModules.SpedTimelines._testing;
    const before = Object.prototype.total;
    const rollup = spedRollup([
      { id: 'c1', student: 'A', provider: '__proto__', dueDate: '2026-12-01', type: 'annual' },
      { id: 'c2', student: 'B', provider: 'constructor', dueDate: '2026-12-02', type: 'annual', completedAt: '2026-11-18' },
    ], '2026-11-19');
    expect(Object.prototype.total).toBe(before);
    expect(Array.isArray(rollup.byProvider)).toBe(true);
    const protoEntry = rollup.byProvider.find((p) => p.provider === '__proto__');
    const ctorEntry = rollup.byProvider.find((p) => p.provider === 'constructor');
    expect(protoEntry && protoEntry.open).toBe(1);
    expect(ctorEntry && ctorEntry.done).toBe(1);
  });

  it('concept_graph_3d_module.js: normalizeNodeArt ignores prototype-pollution keys and handles scene graph with prototype node ids', () => {
    const win = loadModuleInVm('concept_graph_3d_module.js');
    const cg = win.AlloModules.ConceptGraph3D;
    const raw = JSON.parse('{"__proto__":{"type":"image","dataUrl":"data:image/png;base64,AAAA"},"constructor":{"type":"image","dataUrl":"data:image/png;base64,AAAA"},"n1":{"type":"image","dataUrl":"data:image/png;base64,AAAA"}}');
    const out = cg.normalizeNodeArt(raw);
    expect(Object.prototype.hasOwnProperty.call(out, '__proto__')).toBe(false);
    expect(Object.prototype.hasOwnProperty.call(out, 'constructor')).toBe(false);
    expect(out.n1 && out.n1.dataUrl).toBe('data:image/png;base64,AAAA');

    const scene = cg.buildScene({
      title: 'Proto Test',
      nodes: [
        { id: 'toString', label: 'ToString Node', lane: 'constructor', x: 0, y: 0, z: 0 },
        { id: 'valueOf', label: 'ValueOf Node', lane: '__proto__', x: 100, y: 0, z: 0 },
      ],
      edges: [{ fromId: 'toString', toId: 'valueOf', type: 'prerequisite', label: 'leads-to' }],
    });
    expect(scene.nodes.length).toBe(2);
    expect(Object.getPrototypeOf(scene.adjacency)).toBeNull();
    expect(scene.links.length).toBe(1);
    expect(scene.adjacency.toString).toEqual(['valueOf']);
  });

  it('memory_palace_module.js: mastery helpers handle prototype-named locus ids safely', () => {
    const win = loadModuleInVm('memory_palace_module.js');
    const mp = win.AlloModules.MemoryPalace;
    const updated = mp.updateMastery({}, { toString: { correct: true, attempts: 1 } }, '2026-11-19T12:00:00Z');
    expect(Object.prototype.hasOwnProperty.call(updated, 'toString')).toBe(true);
    expect(updated.toString.reps).toBe(1);
    expect(mp.masteryStrength({}, 'toString')).toBeNull();
    expect(mp.masteryStrength({}, 'constructor')).toBeNull();
    const res = mp.dueLoci({ route: ['toString', 'valueOf'] }, {}, '2026-11-19T12:00:00Z');
    expect(res.newIds).toEqual(['toString', 'valueOf']);
  });

  it('read_aloud_artifact_audio_module.js: preserves undefined fetch init on blob: URLs and attaches AbortSignal on https: URLs', async () => {
    const calls = [];
    const wavBytes = new Uint8Array(64).fill(65);
    const fakeBlob = { type: 'audio/wav', arrayBuffer: async () => wavBytes.buffer };
    const fakeFetch = async (url, init) => {
      calls.push({ url, init });
      return {
        ok: true,
        status: 200,
        blob: async () => fakeBlob,
      };
    };
    const win = loadModuleInVm('read_aloud_artifact_audio_module.js');
    const vmGlobals = {
      window: win, self: win, globalThis: win, console: win.console,
      Blob, Uint8Array, TextEncoder, TextDecoder, URL, setTimeout, clearTimeout, Promise,
      btoa: (s) => Buffer.from(s, 'binary').toString('base64'),
      atob: (s) => Buffer.from(s, 'base64').toString('binary'),
      FileReader: globalThis.FileReader,
    };
    for (const dep of ['karaoke_audio_store_module.js', 'read_aloud_audio_service_module.js', 'read_aloud_artifact_contract_module.js']) {
      vm.runInNewContext(fs.readFileSync(path.join(ROOT, dep), 'utf8'), vmGlobals, { filename: dep });
    }
    const api = win.AlloModules.createReadAloudArtifactAudio({
      fetch: fakeFetch,
      callTTS: async (text) => (text.includes('remote') ? 'https://example.test/audio.wav' : 'blob:local-audio'),
    });

    await api.prepare({
      ownerApproved: true,
      segments: [{ id: 's1', text: 'local blob segment' }],
    });
    expect(calls[0].url).toBe('blob:local-audio');
    expect(calls[0].init).toBeUndefined();

    await api.prepare({
      ownerApproved: true,
      segments: [{ id: 's2', text: 'remote https segment' }],
    });
    expect(calls[1].url).toBe('https://example.test/audio.wav');
    expect(calls[1].init && calls[1].init.signal).toBeDefined();
    expect(typeof calls[1].init.signal.aborted).toBe('boolean');
  });

  it('educator_evaluation_module.js: prototype-named frameworkProfile and cycleStatus fall back safely and live JSX <th> have scope="col"', () => {
    const win = loadModuleInVm('educator_evaluation_module.js');
    const testing = win.AlloModules.EducatorEvaluation._testing;
    expect(testing.aeTeacherStatus({ cycleStatus: 'toString' })).toBe('not_started');
    expect(testing.aeTeacherStatus({ cycleStatus: '__proto__' })).toBe('not_started');
    expect(testing.aeTeacherStatus({ cycleStatus: 'in_progress' })).toBe('in_progress');
    if (typeof testing.aeNormalizeWorkspace === 'function') {
      const norm = testing.aeNormalizeWorkspace({
        config: { frameworkProfile: 'constructor' },
        teachers: [{ id: 't1', name: 'Alex', cycleStatus: 'valueOf' }],
      });
      expect(norm.config.frameworkProfile).toBe('maine_pepg');
      expect(norm.teachers[0].cycleStatus).toBe('not_started');
    }
    const src = fs.readFileSync(path.join(ROOT, 'educator_evaluation_source.jsx'), 'utf8');
    expect(src).toContain('function aeHasOwn(');
    expect(src).toContain('<th scope="col">{t("educator_evaluation.status_3pd73"');
    expect(src).toContain('<th scope="col">{t("educator_evaluation.employee_type_1ridbwr"');
  });

  it('doc_pipeline_module.js: accessibility report exports include scope="col", esc(...) escaping, and 1000ms deferred revokeObjectURL', () => {
    const src = fs.readFileSync(path.join(ROOT, 'doc_pipeline_module.js'), 'utf8');
    expect(src).toContain('<th scope="col">Rule</th>');
    expect(src).toContain('<th scope="col">Impact</th>');
    expect(src).toContain('<th scope="col">WCAG</th>');
    expect(src).toContain('<th scope="col">Processing Status</th>');
    expect(src).toContain('esc(r.label)');
    expect(src).toContain('setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 1000)');
  });

  it('allopack-library.js and guide/guide-search.js: prototype-key revivers, AbortController timeouts, and output null guard', () => {
    const packSrc = fs.readFileSync(path.join(ROOT, 'allopack-library.js'), 'utf8');
    expect(packSrc).toContain('new AbortController()');
    expect(packSrc).toContain("k === '__proto__' || k === 'constructor' || k === 'prototype'");
    expect(packSrc).toContain('finally');

    const guideSrc = fs.readFileSync(path.join(ROOT, 'guide/guide-search.js'), 'utf8');
    expect(guideSrc).toContain('new AbortController()');
    expect(guideSrc).toContain('!form || !input || !status || !output');
    expect(guideSrc).toContain("k === '__proto__' || k === 'constructor' || k === 'prototype'");
    expect(guideSrc).toContain('Number.isFinite(sizeNum)');
  });

  it('Sweep #1: all 27 Phase 17 AI-gated modules enforce __alloAiSecretsLocked === true parity', () => {
    const files = [
      'audit_remediator_module.js', 'glossary_helpers_module.js', 'math_helpers_module.js',
      'onboarding_helpers_module.js', 'story_stage_module.js', 'visual_panel_module.js',
      'stem_lab/stem_lumen_study.js', 'stem_lab/stem_tool_angles.js', 'stem_lab/stem_tool_forge.js',
      'stem_lab/stem_tool_machinelab.js', 'stem_lab/stem_tool_manipulatives.js', 'stem_lab/stem_tool_money.js',
      'stem_lab/stem_tool_openbim.js', 'stem_lab/stem_tool_physics.js', 'stem_lab/stem_tool_printlab.js',
      'stem_lab/stem_tool_punnett.js', 'stem_lab/stem_tool_roadready.js', 'stem_lab/stem_tool_semiconductor.js',
      'stem_lab/stem_tool_sourcebook.js', 'stem_lab/stem_tool_spacecolony.js', 'stem_lab/stem_tool_statslab.js',
      'stem_lab/stem_tool_swimlab.js', 'stem_lab/stem_tool_titration.js', 'stem_lab/stem_tool_typingpractice.js',
      'stem_lab/stem_tool_universe.js', 'stem_lab/stem_tool_watercycle.js', 'stem_lab/stem_tool_worldbuilder.js',
    ];
    for (const rel of files) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} missing __alloAiSecretsLocked`).toContain('__alloAiSecretsLocked');
    }
  });

  it('Sweeps #2-#6: SEL AA contrast, deferred revokeObjectURL, STEM fetch timeouts, export <th scope>, and handled clipboard rejections', () => {
    // Sweep #2: SEL contrast
    // The parked-worries header keeps its sky-700 fill under white text via _anxBtnFill (black + yellow border in high contrast).
    const anxSrc = fs.readFileSync(path.join(ROOT, 'sel_hub/sel_tool_anxietytoolkit.js'), 'utf8');
    expect(anxSrc).toContain("background: _anxBtnFill('#0369a1'), border: _anxHC ? '1px solid #ffff00' : 'none', color: _anxFg('#fff')");
    expect(anxSrc).toContain("if (_anxHC) return '#000000';");
    expect(fs.readFileSync(path.join(ROOT, 'sel_hub/sel_tool_motivationalinterviewing.js'), 'utf8')).toContain("_moiBg('#0369a1')");
    const socSrc = fs.readFileSync(path.join(ROOT, 'sel_hub/sel_tool_social.js'), 'utf8');
    expect(socSrc).toContain("'#0ea5e9':'#0369a1'");
    expect(socSrc).toContain("blMode === 'learn' ? _socBg('#0ea5e9')");

    // Sweep #3: zero sync/0ms revokeObjectURL remaining in the 6 patched tools
    for (const rel of [
      'sel_hub/sel_tool_sociallab.js', 'stem_lab/stem_tool_applab.js', 'stem_lab/stem_tool_datastudio.js',
      'stem_lab/stem_tool_gamestudio.js', 'stem_lab/stem_tool_geosandbox.js', 'stem_lab/stem_tool_roadready.js',
    ]) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} still has sync revokeObjectURL`).not.toMatch(/a\.click\(\);\s*(?:\r?\n\s*)?URL\.revokeObjectURL/);
      expect(src, `${rel} still has 0ms revokeObjectURL`).not.toMatch(/URL\.revokeObjectURL\([^)]*\);\s*\},\s*0\)/);
    }

    // Sweep #4: STEM fetch timeouts + eligibility ancestor getComputedStyle
    for (const rel of [
      'stem_lab/stem_tool_eligibility.js', 'stem_lab/stem_tool_forge.js',
      'stem_lab/stem_tool_gisstudio.js', 'stem_lab/stem_tool_lawnavigator.js', 'stem_lab/stem_tool_zoomgallery.js',
    ]) {
      const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
      expect(src, `${rel} missing AbortController`).toContain('AbortController');
    }
    const eligSrc = fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_eligibility.js'), 'utf8');
    expect(eligSrc).toContain('for (var node = element; node && node !== dialog; node = node.parentElement)');

    // Sweep #5: STEM export table <th scope>
    for (const rel of [
      'stem_lab/stem_tool_aquaculture.js', 'stem_lab/stem_tool_cyberdefense.js',
      'stem_lab/stem_tool_openbim.js', 'stem_lab/stem_tool_renewables.js', 'stem_lab/stem_tool_weldlab.js',
    ]) {
      expect(fs.readFileSync(path.join(ROOT, rel), 'utf8'), `${rel} missing th scope="col"`).toContain('<th scope="col">');
    }
    expect(fs.readFileSync(path.join(ROOT, 'stem_lab/stem_tool_dinolab.js'), 'utf8')).toContain('<th scope="row">');

    // Sweep #6: STEM clipboard rejection handling (all 9 files)
    for (const rel of [
      'stem_lab/stem_tool_a11yauditor.js', 'stem_lab/stem_tool_arccity.js', 'stem_lab/stem_tool_coding.js',
      'stem_lab/stem_tool_economicslab.js', 'stem_lab/stem_tool_fractions.js', 'stem_lab/stem_tool_gamestudio.js',
      'stem_lab/stem_tool_raptorhunt.js', 'stem_lab/stem_tool_renewables.js', 'stem_lab/stem_tool_statslab.js',
    ]) {
      expect(fs.readFileSync(path.join(ROOT, rel), 'utf8'), `${rel} missing Promise.resolve clipboard wrapper`).toContain('Promise.resolve((window.StemLab && window.StemLab.writeClipboard');
    }
  });

  it('4-way mirror byte parity and 3-host manifest SRI/releaseId parity for all Phase 17 deliverables', () => {
    const manifestMod = require(path.join(ROOT, 'dev-tools/build_browser_delivery_manifest.cjs'));
    const hostPaths = [
      'AlloFlowANTI.txt',
      'desktop/web-app/src/AlloFlowANTI.txt',
      'desktop/web-app/src/App.jsx',
    ];
    const manifests = hostPaths.map((p) => manifestMod.readEmbeddedManifest(fs.readFileSync(path.join(ROOT, p), 'utf8')));
    expect(manifests[0].releaseId).toBe(manifests[1].releaseId);
    expect(manifests[1].releaseId).toBe(manifests[2].releaseId);

    const sampleDeliverables = [
      'personas_module.js', 'persona_ui_module.js', 'annotation_suite_module.js',
      'accessibility_lab_module.js', 'concept_graph_3d_module.js', 'memory_palace_module.js',
      'doc_pipeline_module.js', 'sped_timelines_module.js', 'brand_profile_editor_module.js',
      'onboarding_coach_module.js', 'translation_feedback_module.js', 'read_aloud_artifact_audio_module.js',
      'ui_language_selector_module.js', 'view_launch_pad_module.js', 'educator_evaluation_module.js',
      'allopack-library.js', 'audit_remediator_module.js', 'glossary_helpers_module.js',
      'math_helpers_module.js', 'onboarding_helpers_module.js', 'story_stage_module.js',
      'visual_panel_module.js', 'sel_hub/sel_tool_social.js', 'stem_lab/stem_tool_eligibility.js',
      'stem_lab/stem_tool_lawnavigator.js', 'stem_lab/stem_tool_raptorhunt.js',
    ];
    const mirrorRoots = ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];

    for (const rel of sampleDeliverables) {
      const rootBuf = fs.readFileSync(path.join(ROOT, rel));
      for (const mr of mirrorRoots) {
        const dest = path.join(ROOT, mr, rel);
        if (fs.existsSync(dest)) {
          expect(fs.readFileSync(dest).equals(rootBuf), `${mr}/${rel} differs from root`).toBe(true);
        }
      }
      if (manifests[0].assets[rel]) {
        const expectedSri = 'sha384-' + crypto.createHash('sha384').update(rootBuf).digest('base64');
        for (let i = 0; i < manifests.length; i++) {
          expect(manifests[i].assets[rel].integrity, `${hostPaths[i]} SRI mismatch for ${rel}`).toBe(expectedSri);
          expect(manifests[i].assets[rel].bytes, `${hostPaths[i]} bytes mismatch for ${rel}`).toBe(rootBuf.length);
        }
      }
    }
  });
});
