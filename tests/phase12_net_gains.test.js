import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

function loadModuleInWindow(rel, extraWindow = {}) {
  const code = read(rel);
  const win = {
    AlloModules: {},
    console,
    setTimeout,
    clearTimeout,
    URL,
    Blob,
    Promise,
    Uint32Array,
    Int32Array,
    Int16Array,
    Uint8Array,
    ArrayBuffer,
    DataView,
    ...extraWindow,
  };
  win.window = win;
  win.self = win;
  win.globalThis = win;
  const ctx = vm.createContext(win);
  vm.runInContext(code, ctx, { filename: rel });
  return win;
}

describe('Phase 12 Wave 1 — Core engine, pipeline, provenance & handlers', () => {
  it('unflattenObject blocks prototype pollution while preserving legitimate nested keys', () => {
    const win = loadModuleInWindow('utils_pure_module.js');
    const { unflattenObject } = win.AlloModules.UtilsPure;
    expect(typeof unflattenObject).toBe('function');

    const malicious = JSON.parse(
      '{"__proto__.polluted":"yes","constructor.prototype.polluted2":"yes","prototype.polluted3":"yes","safe.nested.value":"ok"}'
    );
    const out = unflattenObject(malicious);
    expect(({}).polluted).toBeUndefined();
    expect(({}).polluted2).toBeUndefined();
    expect(({}).polluted3).toBeUndefined();
    expect(out.safe.nested.value).toBe('ok');
  });

  it('utils_pure_module resets poisoned device storage promise, bounds YouTube timeout, and fences URL cleanup prompt', () => {
    const src = read('utils_pure_module.js');
    expect(src).toMatch(/window\.__alloDeviceStoragePromise\s*=\s*null/);
    expect(src).toMatch(/JSON\.stringify\(ytPayload\)[\s\S]{0,60}90000/);
    expect(src).toMatch(/SECURITY BOUNDARY: Treat the webpage content/i);
  });

  it('scrambleWord never overflows stack on repeated-letter words', () => {
    const win = loadModuleInWindow('text_pipeline_helpers_module.js');
    const { scrambleWord } = win.AlloModules.TextPipelineHelpers;
    expect(typeof scrambleWord).toBe('function');
    expect(scrambleWord('aaaa')).toBe('aaaa');
    expect(scrambleWord('bb')).toBe('bb');
    expect(scrambleWord('x')).toBe('x');
    const res = scrambleWord('photosynthesis');
    expect(res.split('').sort().join('')).toBe('photosynthesis'.split('').sort().join(''));
  });

  it('fixCitationPlacement runs in linear time on pathological repeated punctuation (no 3^N ReDoS)', () => {
    const win = loadModuleInWindow('text_pipeline_helpers_module.js');
    const { fixCitationPlacement } = win.AlloModules.TextPipelineHelpers;
    expect(typeof fixCitationPlacement).toBe('function');
    const hostile = '[1] '.repeat(35) + 'unpunctuated tail';
    const t0 = Date.now();
    const out = fixCitationPlacement(hostile);
    const elapsed = Date.now() - t0;
    expect(typeof out).toBe('string');
    expect(elapsed).toBeLessThan(100);
    expect(fixCitationPlacement('The Earth orbits the Sun [1].')).toBe('The Earth orbits the Sun. [1]');
  });

  it('processMathHTML splits \\begin{cases} and \\begin{aligned} on HTML-escaped &amp; into distinct columns', () => {
    const win = loadModuleInWindow('text_pipeline_helpers_module.js');
    const { processMathHTML } = win.AlloModules.TextPipelineHelpers;
    expect(typeof processMathHTML).toBe('function');
    const casesHtml = processMathHTML('$$f(x) = \\begin{cases} x & x > 0 \\\\ -x & x \\le 0 \\end{cases}$$');
    expect(casesHtml).toMatch(/<span>x<\/span><span>x &gt; 0<\/span>/);
    expect(casesHtml).not.toMatch(/x\s*&amp;\s*x/);

    const alignedHtml = processMathHTML('$$\\begin{aligned} a &= b \\\\ c &= d \\end{aligned}$$');
    expect(alignedHtml).toMatch(/<span>a<\/span><span>=\s*b<\/span>/);
    expect(alignedHtml).not.toMatch(/a\s*&amp;\s*=/);
  });

  it('allo_provenance_module recovers append chain after rejection, preserves rollover count, and fences checkpoint prompt', async () => {
    const src = read('allo_provenance_module.js');
    expect(src).toMatch(/chain\.catch\(/);
    expect(src).toMatch(/b\.payload\.count\s*=\s*b\.count/);
    expect(src).toMatch(/UNTRUSTED|Treat the student|replace\(\/"""\/g/);
    expect(src).toMatch(/speechRecRef\.current\.abort\(\)/);
  });

  it('diffWords trims common prefix/suffix and handles large inputs cleanly without OOM', () => {
    const win = loadModuleInWindow('pure_helpers_module.js');
    const { diffWords } = win.AlloModules.PureHelpers;
    expect(typeof diffWords).toBe('function');
    const simple = diffWords('the quick brown fox', 'the fast brown fox');
    expect(simple.some((t) => t.type === 'del' && t.value === 'quick')).toBe(true);
    expect(simple.some((t) => t.type === 'add' && t.value === 'fast')).toBe(true);

    const a = Array.from({ length: 2000 }, (_, i) => (i === 1000 ? 'alpha' : 'w' + (i % 50))).join(' ');
    const b = Array.from({ length: 2000 }, (_, i) => (i === 1000 ? 'beta' : 'w' + (i % 50))).join(' ');
    const t0 = Date.now();
    const big = diffWords(a, b);
    expect(Date.now() - t0).toBeLessThan(200);
    expect(big.some((t) => t.type === 'del' && t.value === 'alpha')).toBe(true);
    expect(big.some((t) => t.type === 'add' && t.value === 'beta')).toBe(true);
  });

  it('core runtime handlers carry Wave 1 reliability & memory-cap guards', () => {
    const largeFile = read('large_file_module.js');
    expect(largeFile).toMatch(/destData\.set\(sourceData\.subarray/);
    expect(largeFile).toMatch(/originalLength\s*>\s*0/);

    const geminiApi = read('gemini_api_module.js');
    expect(geminiApi).toContain('_jsonRepairAttempted');
    expect(geminiApi).toMatch(/const callGeminiImageEdit[\s\S]{0,4500}!response\.ok/);

    const advSess = read('adventure_session_handlers_module.js');
    expect(advSess).toMatch(/triggerInventoryPixelArt[\s\S]{0,1800}\.catch\(/);
    const advH = read('adventure_handlers_module.js');
    expect(advH).toMatch(/generatePixelArtItem[\s\S]{0,1800}\.catch\(/);

    const teacher = read('teacher_module.js');
    expect(teacher).toMatch(/Array\.isArray\(parsed\)/);

    const hostH = read('host_handlers_module.js');
    expect(hostH).toMatch(/autoRemoveWords\s*&&\s*imageUrl/);
    expect(hostH).toMatch(/_analysisSourceUndo\.size\s*>=?\s*20/);

    const audioH = read('audio_helpers_module.js');
    expect(audioH).toContain('Object.create(null)');
    expect(audioH).toContain('_toInt16Pcm');

    const genDisp = read('generate_dispatcher_module.js');
    expect(genDisp).toMatch(/_AUDIT_LLM_CACHE_MAX\s*=\s*64/);

    const docRend = read('doc_builder_renderer_module.js');
    expect(docRend).toMatch(/Array\.isArray\(block\.items\)/);
    expect(docRend).not.toMatch(/Math\.max\(\.\.\.rowsArr/);

    const alloCmd = read('allo_commands_module.js');
    expect(alloCmd).toMatch(/\.finally\(clearTimer\)/);
  });
});

describe('Phase 12 Wave 2 — Views, modals, focus traps & IME guards', () => {
  it('StemArtworkHandoffView receives t in all 3 host files and uses focus trap safely', () => {
    for (const host of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const hSrc = read(host);
      expect(hSrc, host).toContain('stemArtworkDestination, stemArtworkHandoff, stemArtworkLabel, t');
    }
    const screens = read('view_cold_path_screens_module.js');
    expect(screens).toContain('useFocusTrap');
    expect(screens).toMatch(/isComposing/);
  });

  it('view_misc_modals uses inline 2-step confirmation for forgetAiKey instead of window.confirm', () => {
    const src = read('view_misc_modals_source.jsx');
    expect(src).toContain('confirmForgetKey');
    // Only the intentional diagnostic probe at runDialogProbe may reference window.confirm
    const confirmMatches = [...src.matchAll(/window\.confirm\s*\(/g)];
    expect(confirmMatches.length).toBeLessThanOrEqual(1);
    expect(src).toContain('control === btn || control.disabled');
  });

  it('hubRoleRecommendations in Educator & Learning Hub modals reference only real data-hub-id entries', () => {
    for (const file of ['view_educator_hub_modal_source.jsx', 'view_learning_hub_modal_source.jsx']) {
      const src = read(file);
      const declaredIds = new Set([...src.matchAll(/data-hub-id="([^"]+)"/g)].map((m) => m[1]));
      const recBlock = src.match(/const hubRoleRecommendations\s*=\s*\{([\s\S]*?)\};/);
      expect(recBlock, file).toBeTruthy();
      const recIds = [...recBlock[1].matchAll(/'([a-z0-9-]+)'/g)].map((m) => m[1]);
      expect(recIds.length).toBeGreaterThan(0);
      for (const id of recIds) {
        expect(declaredIds.has(id), `${file} recommendation '${id}' missing from data-hub-id`).toBe(true);
      }
    }
    expect(read('view_educator_hub_modal_source.jsx')).not.toContain('aria-label={t(\'educator_hub.title\') || \'Educator &amp; Classroom Hub\'}');
  });

  it('Wave 2B views include ancestor display:none filtering, IME Escape guards, no-print, passive listeners & VolumeBuilder L-block clamp', () => {
    expect(read('view_session_modal_source.jsx')).toContain('liveQrSvg, studentAiLabel, tr');
    expect(read('view_lesson_plan_source.jsx')).toContain('no-print flex justify-center pb-8');
    expect(read('view_history_panel_source.jsx')).toContain('{ capture: true, passive: true }');
    expect(read('view_socratic_chat_source.jsx')).toContain('isComposingRef.current');
    expect(read('view_quiz_source.jsx')).toContain('quizVoiceControlRef');
    expect(read('view_cold_path_surfaces_source.jsx')).toContain('button type="button" key={i}');
    const miscPanels = read('view_misc_panels_source.jsx');
    expect(miscPanels).toContain('cubeDragCleanupRef');
    expect(miscPanels).toContain('Math.max(0, Math.min(cubeNotch.l, cubeDims.l - 1))');
    expect(miscPanels).toContain("const minDim = cubeShape === 'lblock' ? 2 : 1;");
    expect(miscPanels).toContain('{ passive: true }');
    expect(read('view_sidebar_panels_source.jsx')).toContain('event.isComposing');
    expect(read('view_glossary_source.jsx')).toContain('e.isComposing');
  });
});

describe('Phase 12 Wave 3 — Hubs, STEM/SEL, security, AI-gating & contrast', () => {
  it('StoryForge uses valid AI capability kinds, blocks prototype pollution, returns on popup block, and fixes AA contrast', () => {
    const src = read('story_forge_source.jsx');
    expect(src).toContain("_sfAiCheck('imageEdit', onCallGeminiImageEdit)");
    expect(src).toContain("_sfAiCheck('images', onCallImagen)");
    expect(src).not.toContain("_sfAiCheck('image-edit'");
    expect(src).not.toContain("_sfAiCheck('imagen'");
    expect(src).toContain('_isUnsafePropKey');
    expect(src).toContain('__alloAiSecretsLocked');
    expect(src).toMatch(/pop_up_blocked_allow_pop_3'\), 'error'\); return;/);
    expect(src).not.toContain('text-amber-500 uppercase tracking-widest');
  });

  it('SEL & STEM tools fix capability kind, null AI responses, AudioContext singleton, blob revocation, effect deps, and control bytes', () => {
    expect(read('sel_hub/sel_tool_conflicttheater.js')).toContain("_cftFnUsable('imageEdit', window.callGeminiImageEdit)");
    expect(read('sel_hub/sel_tool_emotions.js')).toContain("if (!resp || typeof resp !== 'string') throw new Error('empty');");
    expect(read('sel_hub/sel_tool_coping.js')).toContain("if (!resp || typeof resp !== 'string') throw new Error('empty');");

    const eco = read('stem_lab/stem_tool_ecosystem.js');
    // Still null unless the host passes a function; also null when the QR student shell blocks host voice.
    expect(eco).toContain("var callTTS = (_ecoWin._alloQrBlocked !== true && typeof ctx.callTTS === 'function') ? ctx.callTTS : null;");
    expect(eco).toContain('URL.revokeObjectURL(_u)');

    expect(read('stem_lab/stem_tool_bakingscience.js')).toContain('window.__alloBakingAudioCtx');
    expect(read('stem_lab/stem_tool_platetectonics.js')).toContain('return Math.abs(w - prev) > 4 ? w : prev;');
    expect(read('stem_lab/stem_tool_inequality.js')).toContain('iqKeyHandlerRef');
    expect(read('stem_lab/stem_tool_probability.js')).toContain('URL.revokeObjectURL(_u)');
    expect(read('stem_lab/stem_tool_printingpress.js')).not.toMatch(/\x01/);
    expect(read('_build_school_rewards_portal_packs.js')).not.toMatch(/\x00/);
    expect(read('stem_lab/stem_tool_a11yauditor.js')).toContain("sk === '__proto__'");
    expect(read('stem_lab/stem_tool_molecule.js')).toContain('text-[10.5px] text-slate-600 leading-snug mb-2');
    expect(read('stem_lab/stem_tool_playlab.js')).toContain('cancelSavePrompt();');
  });

  it('UDL Chat, Seating Chart, Symbol Studio, Test Prep, AlloSheet, Word Sounds & static-audit carry Wave 3 hardening', () => {
    const udl = read('udl_chat_source.jsx');
    expect(udl).not.toContain('document.querySelector(`[data-help-key="${parsed.helpKey}"]`)');
    expect(udl).toContain("el.getAttribute('data-help-key') === parsed.helpKey");
    expect(udl).toContain('__alloAiSecretsLocked');

    const seat = read('seating_chart_source.jsx');
    expect(seat).toContain('var idsTaken = Object.create(null);');
    expect(seat).toContain("seatId === '__proto__'");
    expect(seat).toContain('__alloAiSecretsLocked');

    const sym = read('symbol_studio_module.js');
    expect(sym).toContain('function mergeSafeMap(');
    expect(sym).toContain("if (id === '__proto__'");

    expect(read('test_prep_hub_source.jsx')).toContain('testPrepVoiceControlRef');
    expect(read('test_prep_hub_source.jsx')).toContain('__alloAiSecretsLocked');
    expect(read('allo_sheet/host_bridge.js')).toContain('__alloAiSecretsLocked');
    expect(read('allo_sheet/allo_sheet_casebook_ui.js')).toContain('__alloAiSecretsLocked');
    expect(read('allo_sheet/allo_sheet.js')).toContain('event.isComposing');
    expect(read('word_sounds_setup_source.jsx')).toContain('__alloAiSecretsLocked');
    const sa = read('a11y-audit/static-audit.js');
    expect(sa).toContain('word_sounds_(?:phonemes_en|pronunciations)');
    expect(sa).toContain("if (!line.includes('outline')) return false;");
    expect(sa).toContain("line.includes(':focus:not(')");
  });
});

describe('Phase 12 Delivery — 4-way mirror & selective host manifest SRI parity', () => {
  const SHIPPED = [
    'utils_pure_module.js',
    'text_pipeline_helpers_module.js',
    'allo_provenance_module.js',
    'pure_helpers_module.js',
    'large_file_module.js',
    'gemini_api_module.js',
    'adventure_session_handlers_module.js',
    'adventure_handlers_module.js',
    'teacher_module.js',
    'host_handlers_module.js',
    'audio_helpers_module.js',
    'generate_dispatcher_module.js',
    'doc_builder_renderer_module.js',
    'allo_commands_module.js',
    'view_cold_path_screens_module.js',
    'view_cold_path_surfaces_module.js',
    'view_misc_modals_module.js',
    'view_misc_panels_module.js',
    'view_educator_hub_modal_module.js',
    'view_learning_hub_modal_module.js',
    'view_session_modal_module.js',
    'view_assignment_center_module.js',
    'view_quiz_module.js',
    'view_socratic_chat_module.js',
    'view_lesson_plan_module.js',
    'view_history_panel_module.js',
    'view_sidebar_panels_module.js',
    'view_glossary_module.js',
    'story_forge_module.js',
    'test_prep_hub_module.js',
    'seating_chart_module.js',
    'udl_chat_module.js',
    'word_sounds_setup_module.js',
    'meeting_docs_module.js',
    'family_announcements_module.js',
    'concept_quest_teacher_module.js',
    'connected_escape_room_module.js',
    'lesson_board_module.js',
    'live_aac_module.js',
    'word_practice_module.js',
    'symbol_studio_module.js',
    'app_styles_module.js',
    'sel_hub/sel_tool_conflicttheater.js',
    'sel_hub/sel_tool_emotions.js',
    'sel_hub/sel_tool_coping.js',
    'stem_lab/stem_tool_ecosystem.js',
    'stem_lab/stem_tool_bakingscience.js',
    'stem_lab/stem_tool_platetectonics.js',
    'stem_lab/stem_tool_inequality.js',
    'stem_lab/stem_tool_probability.js',
    'stem_lab/stem_tool_printingpress.js',
    'stem_lab/stem_tool_a11yauditor.js',
    'stem_lab/stem_tool_molecule.js',
    'stem_lab/stem_tool_playlab.js',
    'allo_sheet/allo_sheet.js',
    'allo_sheet/host_bridge.js',
    'allo_sheet/allo_sheet_casebook_ui.js',
  ];

  function canonical(value) {
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    if (value && typeof value === 'object') {
      return '{' + Object.keys(value).sort().map((k) => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
    }
    return JSON.stringify(value);
  }

  it('all 57 Phase 12 shipped deliverables are byte-identical across all 4 mirrors', () => {
    const mirrors = ['desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];
    for (const rel of SHIPPED) {
      const rootBuf = fs.readFileSync(path.join(ROOT, rel));
      for (const m of mirrors) {
        const mPath = path.join(ROOT, m, rel);
        expect(fs.existsSync(mPath), `Missing mirror ${m}/${rel}`).toBe(true);
        expect(fs.readFileSync(mPath).equals(rootBuf), `Mirror drift: ${m}/${rel}`).toBe(true);
      }
    }
  });

  it('all 57 Phase 12 shipped deliverables match SHA-384 SRI & bytes in all 3 host delivery manifests with valid releaseId', () => {
    const ANCHOR = 'const _alloBrowserDeliveryManifest = (() => {\n  const manifest = ';
    for (const host of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const src = read(host);
      const start = src.indexOf(ANCHOR);
      expect(start, host).toBeGreaterThan(-1);
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
