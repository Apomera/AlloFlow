import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

describe('Phase 13 Wave 1 — Core resilience, leaks & security', () => {
  it('firestore_sync_module strips __proto__/constructor/prototype keys during hydration and boundary sanitization', () => {
    const src = read('firestore_sync_module.js');
    expect(src).toContain('function _fsSafeJsonReviver');
    expect(src).toContain('JSON.parse(parsedData, _fsSafeJsonReviver)');
    expect(src).toContain('JSON.parse(parsedGameData, _fsSafeJsonReviver)');

    const win = { AlloModules: {}, console };
    win.window = win;
    const ctx = vm.createContext(win);
    vm.runInContext(src, ctx, { filename: 'firestore_sync_module.js' });
    expect(typeof win.hydrateHistory).toBe('function');

    const hydrated = win.hydrateHistory([
      { id: 'h1', type: 'quiz', data: '{"__proto__":{"polluted":true},"questions":[]}' },
    ]);
    expect(({}).polluted).toBeUndefined();
    expect(Array.isArray(hydrated[0].data.questions)).toBe(true);
  });

  it('dispro_analyzer bounds SVG tick generation on extreme risk ratios and preserves parity line', () => {
    const src = read('dispro_analyzer_source.jsx');
    expect(src).toContain('const tickStep = axisMax <= 4 ? 0.5 : Math.max(1, Math.ceil(axisMax / 8));');
    expect(src).toContain('{!ticks.includes(1) && <line');
  });

  it('closes AudioContext on unmount in Music Studio and SpeechRecognition + isolated soundscape teardown in AlloHaven', () => {
    const og = read('music_studio/open_groove_module.js');
    expect(og).toMatch(/engineRef\.current\s*=\s*null;[\s\S]{0,120}engine\.ctx\.close\(\)/);

    const ah = read('allohaven_module.js');
    expect(ah).toMatch(/try\s*\{\s*if\s*\(ar\.crackleTimer\)\s*clearInterval\(ar\.crackleTimer\)/);
    expect(ah).toMatch(/useEffect\(function\(\)\s*\{\s*return function\(\)\s*\{\s*stopVoiceCapture\(\);/);
    expect(ah).toMatch(/Object\.keys\(DEFAULT_STATE\)\.forEach/);
  });

  it('caps AlloBot spokenEventIds, escapes dynamic selectors in Games & Export, and hardens Report Writer, Educator Eval, Research Hub, Analytics & Comms Studio', () => {
    expect(read('allobot_source.jsx')).toContain('if (spokenEventIds.size > 500) spokenEventIds.delete');

    const games = read('games_source.jsx');
    expect(games).not.toContain('querySelector(`[data-tchart-item-id="${itemId}"]`)');
    expect(games).not.toContain('querySelector(`[data-multi-bucket-item-id="${itemId}"]`)');
    expect(games).not.toContain('querySelector(`[data-multi-zone-item-id="${itemId}"]`)');

    const exp = read('export_handlers_module.js');
    expect(exp).not.toContain("act.querySelector('[data-venn-place-zone=\"' + zVal + '\"]')");
    expect(exp).toContain("if (!_resp.ok) throw new Error('HTTP ' + _resp.status);");
    expect(exp).toContain("dataUrl.indexOf('data:audio/') === 0");

    const rw = read('report_writer_module.js');
    expect(rw).toMatch(/finally\s*\{\s*endAiRun\('sections', run\);\s*setGenFraction\(null\);\s*setGenProgress\(''\);\s*setGenerating\(false\);/);

    const ee = read('educator_evaluation_source.jsx');
    expect(ee).toContain("if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;");
    expect(ee).toMatch(/new AbortController\(\)[\s\S]{0,120}10000/);

    const rh = read('research_hub_source.jsx');
    expect(rh).toContain('function safeJsonReviver');
    expect(rh).toContain('JSON.parse(payload, safeJsonReviver)');

    const sa = read('student_analytics_module.js');
    expect(sa).toContain("if (columnKey === '__proto__' || columnKey === 'constructor' || columnKey === 'prototype') return;");
    expect(sa).toContain('const answerCounts = new Map();');

    const cs = read('communications_studio_source.jsx');
    expect(cs).toContain('const out = Object.create(null);');
  });
});

describe('Phase 13 Wave 2 — SEL & STEM runtime leaks, crashes, AudioContext & AI gating', () => {
  it('cleans up Box Breathing & Body Scan timers in Mindfulness and Cooling & Mohs scratch timers in Rocks', () => {
    const mind = read('sel_hub/sel_tool_mindfulness.js');
    expect(mind).toContain('function stopBoxTimer()');
    expect(mind).toContain('cleanup: function() { stopBreathTimer(); stopScanTimer(); stopBoxTimer(); }');
    expect(mind).toContain('onClick: function() { stopBoxTimer(); upd({ techBoxActive: false }); }');
    expect(mind).toContain('window.__alloAiSecretsLocked !== true');

    const rocks = read('stem_lab/stem_tool_rocks.js');
    expect(rocks).toContain('window.__alloRkCoolInt');
    expect(rocks).toContain('window.__alloRkScratchInt');
    expect(rocks).toContain("'aria-hidden': 'true', focusable: 'false', 'data-rk-env-pin'");
    expect(rocks).toContain('window.__alloAiSecretsLocked === true');
  });

  it('stops rAF multiplication, localStorage crashes, AudioContext leaks, listener thrashing, null AI splits & getUserMedia races across STEM & SEL', () => {
    const ce = read('stem_lab/stem_tool_climateExplorer.js');
    expect(ce).toContain('cv._ceRafId = 0;');
    expect(ce).toContain('if (!cv._ceRafId) heroDraw();');

    const music = read('stem_lab/stem_tool_music.js');
    // Saved beats are read through the prototype-safe parser now; still array-checked inside try.
    expect(music).toContain("try { var _sb = _musSafeJsonParse(localStorage.getItem('alloflow_beats') || '[]', []); if (Array.isArray(_sb)) saved = _sb; } catch (_e) {}");

    const wave = read('stem_lab/stem_tool_wave.js');
    expect(wave).toContain('_waveAudio.dopplerFlyby.ctx.close()');
    expect(wave).toContain('ctx: ownCtx ? actx : null');

    const bl = read('stem_lab/stem_tool_behaviorlab.js');
    expect(bl).toContain('_blIoRef.current.io.disconnect()');
    expect(bl).toContain("document.removeEventListener('keydown', handler)");

    const uc = read('stem_lab/stem_tool_unitconvert.js');
    expect(uc).toContain('var mpCanvasRef = React.useCallback(function(cvEl)');
    expect(uc).toContain('ref: mpCanvasRef');

    const gw = read('stem_lab/stem_tool_geometryworld.js');
    expect(gw).toContain("if (typeof result !== 'string' || !result.trim())");

    const orat = read('stem_lab/stem_tool_oratory.js');
    expect(orat).toContain('var startingMicRef = React.useRef(false);');
    // A null reply still becomes '' (object replies are read too), and the phrase falls back to the default.
    expect(orat).toContain("var raw = typeof response === 'string' ? response : ((response && (response.text || response.output || response.response)) || '');\n              var text = String(raw).trim();\n              setMultiPhrase(text || 'Hello, how are you today?');");

    const sing = read('stem_lab/stem_tool_singing.js');
    expect(sing).toContain('var startingMicRef = React.useRef(false);');
    expect(sing).toContain('if (!singingMountedRef.current)');

    const selHub = read('sel_hub/sel_hub_module.js');
    expect(selHub).toContain('function _selIsGlobalMuted()');
    expect(selHub).toContain('if (_selIsGlobalMuted()) return Promise.resolve(null);');
    expect(selHub).toContain('var _selFallbackAudioCtx = null;');

    const safety = read('sel_hub/sel_safety_layer.js');
    expect(safety).toContain('!callGemini._alloQrBlocked');
    expect(safety).toContain('window.__alloAiSecretsLocked === true');

    expect(read('stem_lab/stem_tool_echotrainer.js')).toContain('cancelAnimationFrame(rafId2d)');
    expect(read('stem_lab/stem_tool_solarsystem.js')).toContain('cancelAnimationFrame(rafId)');
  });
});

describe('Phase 13 Wave 3 — Zero-clutter WCAG 2.2 AA & UX fixes', () => {
  it('adds role="img" to Anatomy modality canvases, fixes Simplified close labels, Quiz scoreboard a11y/contrast, Renderers buttons, ModelDiagnostics scope="col" and 5 host loading dialogs', () => {
    expect(read('stem_lab/stem_tool_anatomy.js')).toContain("h('canvas', { role: 'img', width: 640, height: 480");

    const simp = read('view_simplified_source.jsx');
    expect(simp).not.toContain("aria-label={t('common.close_fluency_session')}");
    expect(simp).not.toContain("aria-label={t('common.close_fluency_results')}");
    expect(simp).toContain("t('simplified.level_analysis_title')");
    expect(simp).toContain("t('simplified.rigor_check_title')");

    const quiz = read('view_quiz_source.jsx');
    expect(quiz).toContain('aria-label={`Subtract 100 points from ${team.name}`}');
    expect(quiz).toContain('aria-label={`Add 100 points to ${team.name}`}');
    expect(quiz).toContain('rounded-lg text-slate-300 hover:text-white');

    const rend = read('view_renderers_source.jsx');
    expect(rend).toContain('aria-label="Apply art change"');
    // The submit button's name is localized now (needs concept_space.create_art_aria in ui_strings.js).
    expect(rend).toContain("aria-label={t('concept_space.create_art_aria') || 'Create art'}");
    expect(rend).toContain("aria-pressed={artType === 'sculpture'}");
    expect(rend).toContain("aria-pressed={artType === 'image'}");

    const mm = read('view_misc_modals_source.jsx');
    expect((mm.match(/<th scope="col"/g) || []).length).toBeGreaterThanOrEqual(8);

    for (const host of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const h = read(host);
      expect(h, host).toContain('role="dialog" aria-modal="true" aria-label="Word Sounds"');
      expect(h, host).toContain('role="dialog" aria-modal="true" aria-label="Submit Panel"');
      expect(h, host).toContain('role="dialog" aria-modal="true" aria-label="Roster Panel"');
      expect(h, host).toContain('role="dialog" aria-modal="true" aria-label="Teacher Dashboard"');
    }
  });
});

describe('Phase 13 Delivery — 4-way mirror & 3-host SRI parity', () => {
  const SHIPPED = [
    'firestore_sync_module.js',
    'dispro_analyzer_module.js',
    'music_studio/open_groove_module.js',
    'allohaven_module.js',
    'allobot_module.js',
    'games_module.js',
    'export_handlers_module.js',
    'report_writer_module.js',
    'educator_evaluation_module.js',
    'research_hub_module.js',
    'student_analytics_module.js',
    'communications_studio_module.js',
    'sel_hub/sel_tool_mindfulness.js',
    'sel_hub/sel_hub_module.js',
    'sel_hub/sel_safety_layer.js',
    'stem_lab/stem_tool_rocks.js',
    'stem_lab/stem_tool_anatomy.js',
    'stem_lab/stem_tool_climateExplorer.js',
    'stem_lab/stem_tool_music.js',
    'stem_lab/stem_tool_wave.js',
    'stem_lab/stem_tool_behaviorlab.js',
    'stem_lab/stem_tool_unitconvert.js',
    'stem_lab/stem_tool_geometryworld.js',
    'stem_lab/stem_tool_oratory.js',
    'stem_lab/stem_tool_singing.js',
    'stem_lab/stem_tool_echotrainer.js',
    'stem_lab/stem_tool_solarsystem.js',
    'view_simplified_module.js',
    'view_quiz_module.js',
    'view_renderers_module.js',
    'view_misc_modals_module.js',
    'app_styles_module.js',
  ];

  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') {
      return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
    }
    return JSON.stringify(value);
  }

  it('all 32 Phase 13 deliverables are byte-identical across all 4 mirrors', () => {
    for (const rel of SHIPPED) {
      const rootBuf = fs.readFileSync(path.join(ROOT, rel));
      for (const m of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
        const mPath = path.join(ROOT, m, rel);
        expect(fs.existsSync(mPath), `Missing mirror ${m}/${rel}`).toBe(true);
        expect(fs.readFileSync(mPath).equals(rootBuf), `Mirror drift ${m}/${rel}`).toBe(true);
      }
    }
  });

  it('all 32 Phase 13 deliverables match SHA-384 SRI & bytes in all 3 host delivery manifests', () => {
    const ANCHOR = 'const _alloBrowserDeliveryManifest = (() => {\n  const manifest = ';
    for (const host of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const src = read(host);
      const start = src.indexOf(ANCHOR);
      const jsonStart = start + ANCHOR.length;
      const lineEnd = src.indexOf(';\n', jsonStart);
      const manifest = JSON.parse(src.slice(jsonStart, lineEnd));
      const { releaseId, ...body } = manifest;
      expect(crypto.createHash('sha256').update(canonical(body)).digest('hex'), host).toBe(releaseId);
      for (const rel of SHIPPED) {
        if (!Object.prototype.hasOwnProperty.call(manifest.assets, rel)) continue;
        const buf = fs.readFileSync(path.join(ROOT, rel));
        const expectedSri = 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
        expect(manifest.assets[rel].bytes, `${host}:${rel} bytes`).toBe(buf.length);
        expect(manifest.assets[rel].integrity, `${host}:${rel} integrity`).toBe(expectedSri);
      }
    }
  });
});
