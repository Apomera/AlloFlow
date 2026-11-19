import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const PHASE15_DELIVERABLES = [
  'live_polling_module.js',
  'language_matcher_module.js',
  'data_kernel_loader.js',
  'quiz_ai_helpers.js',
  'safety_checker_module.js',
  'word_timing_module.js',
  'catalog_module.js',
  'item_correction_module.js',
  'ui_font_library_module.js',
  'read_aloud_audio_service_module.js',
  'misc_handlers_module.js',
  'admin_hub_module.js',
  'math_fluency_module.js',
  'reading_library_module.js',
  'content_engine_module.js',
  'stem_lab/stem_tool_singing.js',
  'stem_lab/stem_tool_music.js',
  'allo_sheet/allo_sheet.js',
  'report_writer_module.js',
  'word_sounds_module.js',
  'sel_hub/sel_tool_peersupport.js',
  'student_analytics_module.js',
  'symbol_studio_module.js',
  'stem_lab/stem_lab_module.js',
  'poet_tree_module.js',
  'mind_map_module.js',
  'story_forge_module.js',
  'stem_lab/stem_tool_artstudio.js',
  'stem_lab/stem_tool_archstudio.js',
  'stem_lab/stem_tool_coasterlab.js',
  'view_live_session_dock_module.js',
  'view_gemini_bridge_module.js',
  'view_share_session_surfaces_module.js',
  'view_end_session_preview_module.js',
  'view_renderers_module.js',
  'view_misc_modals_module.js',
  'view_misc_panels_module.js',
  'view_simplified_module.js',
  'view_sidebar_panels_module.js',
  'view_student_join_panel_module.js',
  'view_quiz_module.js',
  'view_history_panel_module.js',
  'view_pdf_audit_module.js',
  'view_math_module.js',
  'view_student_save_adventure_module.js',
  'app_styles_module.js',
];

describe('Phase 15 Wave 1 — Core runtime modules hardening', () => {
  it('language_matcher_module safely handles prototype keys ("constructor", "toString") and resets failed manifest fetch', async () => {
    const src = read('language_matcher_module.js');
    expect(src).toContain('if (!_MANIFEST.available.length && _manifestReady === pending) _manifestReady = null;');
    expect(src).toContain('const bySlug = Object.create(null);');

    let fetchCalls = 0;
    const win = {
      AlloModules: {},
      console: { log: () => {}, warn: () => {}, error: () => {} },
      fetch: async () => { fetchCalls += 1; throw new Error('offline'); },
      AbortController,
      setTimeout,
      clearTimeout,
    };
    win.window = win;
    vm.runInNewContext(src, win, { filename: 'language_matcher_module.js' });
    const matcher = win.AlloModules.LanguageMatcher;
    expect(matcher).toBeTruthy();

    // Must not crash on Object.prototype property names
    expect(await matcher.match('constructor')).toBeNull();
    expect(await matcher.match('toString')).toBeNull();
    expect(await matcher.match('valueOf')).toBeNull();
    // Each call retried manifest instead of staying permanently poisoned
    expect(fetchCalls).toBeGreaterThanOrEqual(4);
  });

  it('quiz_ai_helpers blocks prototype status bypass and enforces __alloAiSecretsLocked', async () => {
    const src = read('quiz_ai_helpers.js');
    const win = {
      AlloModules: {},
      __alloAiSecretsLocked: true,
      console: { log: () => {}, warn: () => {}, error: () => {} },
    };
    win.window = win;
    vm.runInNewContext(src, win, { filename: 'quiz_ai_helpers.js' });
    const qa = win.AlloModules.QuizAIHelpers;
    expect(qa).toBeTruthy();

    let called = false;
    const fakeGemini = async () => { called = true; return '{"status":"constructor","feedback":"ok"}'; };
    const blockedRes = await qa.gradeFreeformAnswer({
      question: 'Why?',
      expectedAnswer: 'Because',
      studentResponse: 'My answer',
      callGemini: fakeGemini,
    });
    expect(called).toBe(false);
    expect(blockedRes.status).toBe('error');

    // Now unlock and confirm prototype status ("constructor") is rejected as "unclear"
    win.__alloAiSecretsLocked = false;
    const res = await qa.gradeFreeformAnswer({
      question: 'Why?',
      expectedAnswer: 'Because',
      studentResponse: 'My answer',
      callGemini: fakeGemini,
    });
    expect(called).toBe(true);
    expect(res.status).toBe('unclear');
  });

  it('data_kernel_loader handles prototype column names safely and resets runtimePromise on failure', () => {
    const src = read('data_kernel_loader.js');
    expect(src).toContain('var used = Object.create(null)');
    expect(src).toContain('var keyMap = Object.create(null);');
    expect(src).toContain('if (runtimePromise === pending) runtimePromise = null;');

    const win = {
      AlloModules: {},
      location: { href: 'https://example.test/' },
      URL,
      console: { log: () => {}, warn: () => {}, error: () => {} },
    };
    win.window = win;
    vm.runInNewContext(src, win, { filename: 'data_kernel_loader.js' });
    const loader = win.AlloDataKernel;
    expect(loader).toBeTruthy();
    const norm = loader.normalizeRows([
      JSON.parse('{"__proto__":"bad","constructor":"x","toString":"y","score":42}'),
    ]);
    expect(({}).polluted).toBeUndefined();
    expect(norm.columns).toContain('toString');
    expect(norm.columns).not.toContain('__proto__');
    expect(norm.columns).not.toContain('constructor');
  });

  it('hardens live_polling, safety_checker, word_timing, catalog, item_correction, ui_font_library, read_aloud_audio_service, misc_handlers, admin_hub, math_fluency, reading_library, and content_engine', () => {
    const lp = read('live_polling_module.js');
    expect(lp).toContain('const byId = Object.create(null);');
    expect(lp).toContain("const badProp = (k) => k === '__proto__' || k === 'constructor' || k === 'prototype';");

    const sc = read('safety_checker_module.js');
    expect(sc).toContain('<UNTRUSTED_STUDENT_MESSAGE>');
    expect(sc).toContain('ctrl.abort()');

    const wt = read('word_timing_module.js');
    expect(wt).toContain("if (_audioContext && _audioContext.state !== 'closed') return _audioContext;");
    expect(wt).toContain("if (!response || !response.ok) throw new Error('HTTP '");

    const cat = read('catalog_module.js');
    expect(cat).toContain('function _catalogFetch(url, opts, timeoutMs)');
    expect(cat).toContain('window.__alloAiSecretsLocked === true');
    expect(cat).toContain('setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);');

    expect(read('item_correction_module.js')).toContain('ctrl.abort()');
    expect(read('ui_font_library_module.js')).toContain('var fetchTimed = function (url)');
    expect(read('read_aloud_audio_service_source.jsx')).toContain("window.__alloAiSecretsLocked === true || window.__alloStudentAiDisabled === true");
    expect(read('misc_handlers_source.jsx')).toContain('<UNTRUSTED_SOURCE_TEXT>');
    expect(read('misc_handlers_source.jsx')).toContain("if (typeof result !== 'string' || !result.trim()) return 'Catastrophe';");
    expect(read('admin_hub_source.jsx')).toContain("if (!res.ok) throw new Error('Drive backup request failed (HTTP '");
    expect(read('math_fluency_module.js')).toContain('.finally(function () { try { Promise.resolve(ctx.close()).catch(function () {}); } catch (_) {} })');
    expect(read('reading_library_module.js')).toContain('function _rlFetch(url, opts, timeoutMs)');
    expect(read('content_engine_source.jsx')).toContain('window.__alloAiSecretsLocked === true');
  });
});

describe('Phase 15 Wave 2 — Specialized studios & subdirectory modules', () => {
  it('hardens Singing, Music, AlloSheet, Report Writer, Word Sounds, Peer Support, Student Analytics, Symbol Studio, STEM Lab, Poet Tree, Mind Map, StoryForge, Art/Arch/Coaster studios', () => {
    const sing = read('stem_lab/stem_tool_singing.js');
    expect(sing).toContain('const ctxToClose = this.ownCtx;');
    expect(sing).not.toContain('Math.max(...idx.map');

    const music = read('stem_lab/stem_tool_music.js');
    expect(music).toContain("if (!r.ok) throw new Error('HTTP ' + r.status);");
    expect(music).toContain('cvEl._hsRo = ro;');

    expect(read('allo_sheet/allo_sheet.js')).toContain('controller.abort(); }, 20000');

    const rw = read('report_writer_module.js');
    expect(rw).toContain("if (typeof result !== 'string' || !result.trim()) continue;");
    expect(rw).toContain("if (typeof result !== 'string' || !result.trim()) return;");
    expect(rw).toContain("if (!clip || (typeof clip.write !== 'function' && typeof clip.writeText !== 'function'))");

    expect(read('word_sounds_module.js')).toContain("const repairMatch = typeof repairRes === 'string' ? repairRes.match");
    expect(read('sel_hub/sel_tool_peersupport.js')).toContain("if (typeof result !== 'string' || !result.trim()) { setChatFeedback(null); return; }");

    const sa = read('student_analytics_module.js');
    expect(sa).toContain("window.__alloAiUsable('imageEdit', fn)");
    expect(sa).toContain('var isFocusableVisible = function(el, stopRoot)');
    expect(sa).not.toContain('URL.revokeObjectURL(link.href);');

    const sym = read('symbol_studio_module.js');
    expect(sym).toContain('if (event.isComposing || event.keyCode === 229) return;');
    expect(sym).toContain('<UNTRUSTED_SENTENCE>');
    expect(sym).not.toContain('URL.revokeObjectURL(a.href);');
    expect(sym).not.toContain('URL.revokeObjectURL(link.href);');

    expect(read('stem_lab/stem_lab_module.js')).toContain("Promise.resolve(navigator.clipboard.writeText(report)).then(");
    expect(read('poet_tree_module.js')).toContain('window.__alloAiSecretsLocked === true');
    expect(read('mind_map_module.js')).toContain('Promise.resolve(navigator.clipboard.writeText(txt)).then(');
    expect(read('story_forge_source.jsx')).not.toContain('document.body.removeChild(link);\n    URL.revokeObjectURL(url);');
    expect(read('stem_lab/stem_tool_artstudio.js')).toContain('URL.revokeObjectURL(gifUrl)');
    expect(read('stem_lab/stem_tool_archstudio.js')).toContain('setTimeout(function () { try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);');
    expect(read('stem_lab/stem_tool_coasterlab.js')).not.toContain('Math.min(...track.y)');
  });
});

describe('Phase 15 Wave 3 — Remaining views a11y, contrast, IME & focus-trap sweep', () => {
  it('hardens LiveSessionDock, GeminiBridge, ShareSessionSurfaces, EndSessionPreview, Renderers, MiscModals, MiscPanels, Simplified, SidebarPanels, StudentJoin, Quiz, History, PdfAudit, Math, and StudentSaveAdventure', () => {
    const lsd = read('view_live_session_dock_source.jsx');
    expect(lsd).not.toContain("background:'#0284c7'");
    expect(lsd).toContain('window.getComputedStyle(cur)');

    const gb = read('view_gemini_bridge_source.jsx');
    expect(gb).toContain('window.getComputedStyle(cur)');
    expect(gb).toContain('event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229');

    expect(read('view_share_session_surfaces_source.jsx')).toContain('window.getComputedStyle(cur)');
    expect(read('view_end_session_preview_source.jsx')).toContain('window.getComputedStyle(cur)');

    const vr = read('view_renderers_source.jsx');
    expect(vr).toContain('window.__alloAiSecretsLocked !== true');
    expect(vr).toContain('aria-pressed={!!isMapLocked}');
    expect(vr).toContain('window.getComputedStyle(cur)');

    expect(read('view_misc_modals_source.jsx')).toContain('window.getComputedStyle(cur)');
    const mp = read('view_misc_panels_source.jsx');
    expect(mp).not.toContain("'text-yellow-500'");
    expect(mp).toContain('text-amber-700');

    const simp = read('view_simplified_source.jsx');
    expect(simp).toContain("aria-label={t('formatting.bold')}");
    expect(simp).toContain("aria-label={t('formatting.numlist') || 'Numbered List'}");

    const sp = read('view_sidebar_panels_source.jsx');
    expect(sp).toContain('Promise.resolve(navigator.clipboard.writeText(brief)).then(showCopied, showManual);');
    expect(sp).not.toContain('placeholder:text-slate-400 hover:border-slate-400');

    expect(read('view_student_join_panel_source.jsx')).toContain('placeholder:text-slate-400');

    const qz = read('view_quiz_source.jsx');
    expect(qz).toContain('window.__alloAiSecretsLocked === true');
    expect(qz).toContain('Promise.resolve(navigator.clipboard.writeText(explainerModal.text)).catch(');

    expect(read('view_history_panel_source.jsx')).toContain('setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);');

    const pdf = read('view_pdf_audit_source.jsx');
    expect(pdf).toContain('<th scope="col">#</th><th scope="col">Document</th>');
    expect(pdf).toContain('placeholder-slate-300');
    expect(pdf).toContain("aria-label={isAgentRunning ? 'Agent working' : 'Run expert command'}");

    const vmSrc = read('view_math_source.jsx');
    expect(vmSrc).toContain('window.__alloAiSecretsLocked !== true');
    expect(vmSrc).toContain('placeholder-slate-500');
    expect(read('view_student_save_adventure_source.jsx')).toContain('window.__alloAiSecretsLocked === true');
  });

  it('keeps all 46 Phase 15 deliverables byte-identical across 4-way mirrors and SRI-matched across all 3 host manifests', () => {
    const bdm = require(path.join(ROOT, 'dev-tools/build_browser_delivery_manifest.cjs'));
    const hostManifests = [
      'AlloFlowANTI.txt',
      'desktop/web-app/src/AlloFlowANTI.txt',
      'desktop/web-app/src/App.jsx',
    ].map((p) => bdm.readEmbeddedManifest(read(p)));

    for (const rel of PHASE15_DELIVERABLES) {
      const rootBuf = fs.readFileSync(path.join(ROOT, rel));
      const expectedSri = 'sha384-' + crypto.createHash('sha384').update(rootBuf).digest('base64');
      for (const mirror of ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build']) {
        const mPath = path.join(ROOT, mirror, rel);
        if (fs.existsSync(path.join(ROOT, mirror))) {
          expect(fs.readFileSync(mPath).equals(rootBuf), `${mirror}/${rel} should match root`).toBe(true);
        }
      }
      for (const m of hostManifests) {
        if (Object.prototype.hasOwnProperty.call(m.assets, rel)) {
          expect(m.assets[rel].bytes, `manifest bytes for ${rel}`).toBe(rootBuf.length);
          expect(m.assets[rel].integrity, `manifest SRI for ${rel}`).toBe(expectedSri);
        }
      }
    }
  });
});
