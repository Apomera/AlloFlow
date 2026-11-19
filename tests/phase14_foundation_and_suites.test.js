import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';

const ROOT = process.cwd();
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const PHASE14_DELIVERABLES = [
  'allo_device_storage_module.js',
  'allo_device_vault_module.js',
  'pyodide_runtime_module.js',
  'error_reporter_module.js',
  'export_module.js',
  'word_sounds_module.js',
  'escape_room_module.js',
  'studio_module.js',
  'behavior_lens_module.js',
  'fluency_module.js',
  'walkthrough_copilot_cdn_module.js',
  'school_rewards_module.js',
  'dynamic_assessment_module.js',
  'immersive_reader_module.js',
  'voice_module.js',
  'timeline_studio_module.js',
  'view_submission_inbox_module.js',
  'view_persona_chat_module.js',
  'view_export_preview_module.js',
  'view_header_module.js',
  'view_dbq_module.js',
  'view_sentence_frames_module.js',
  'view_info_modal_module.js',
  'view_fab_stack_module.js',
  'view_directions_composer_module.js',
  'view_persona_workspace_module.js',
  'view_project_settings_module.js',
  'view_canvas_recovery_dialog_module.js',
  'view_hints_modal_module.js',
  'view_study_timer_modal_module.js',
  'view_visual_supports_modal_module.js',
  'view_storybook_export_modal_module.js',
  'view_video_library_module.js',
  'view_video_ref_player_module.js',
  'app_styles_module.js',
];

describe('Phase 14 Wave 1 — Host shell & foundational runtime hardening', () => {
  it('_alloDeepMerge blocks prototype-polluting keys and _alloApplySessionPatchForSize clones nested objects without mutating base', () => {
    const host = read('AlloFlowANTI.txt');
    const dmMatch = host.match(/const _alloPlainObject = [\s\S]*?const _alloDeepMerge = [\s\S]*?return out;\r?\n\};/);
    const spMatch = host.match(/const _alloApplySessionPatchForSize = [\s\S]*?return merged;\r?\n\};/);
    expect(dmMatch).not.toBeNull();
    expect(spMatch).not.toBeNull();

    const sandbox = {};
    vm.runInNewContext(`${dmMatch[0]}\n${spMatch[0]}\nthis._alloDeepMerge = _alloDeepMerge; this._alloApplySessionPatchForSize = _alloApplySessionPatchForSize;`, sandbox);

    const malicious = JSON.parse('{"__proto__":{"polluted":true},"safe":{"ok":1}}');
    const merged = sandbox._alloDeepMerge({ existing: true }, malicious);
    expect(({}).polluted).toBeUndefined();
    expect(merged.polluted).toBeUndefined();
    expect(merged.safe).toEqual({ ok: 1 });

    const originalBase = { nested: { keep: 'live' } };
    const patched = sandbox._alloApplySessionPatchForSize(originalBase, {
      'nested.added': 'preflight',
      '__proto__.evil': 'nope',
      'nested.constructor.prototype.evil2': 'nope',
    });
    expect(originalBase.nested.added).toBeUndefined();
    expect(patched.nested).toEqual({ keep: 'live', added: 'preflight' });
    expect(({}).evil).toBeUndefined();
    expect(({}).evil2).toBeUndefined();
  });

  it('host shell enforces __alloAiSecretsLocked, bounded word shard cache, safe stored AI config JSON, and redacted crash reports across all 3 host files', () => {
    for (const hostPath of ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx']) {
      const host = read(hostPath);
      expect(host).toContain("try { raw = JSON.parse(localStorage.getItem('alloflow_ai_config') || 'null'); } catch (_) { return null; }");
      expect(host).toContain('w.__alloAiSecretsLocked === true');
      expect(host).toContain('window.__alloAiSecretsLocked === true');
      expect(host).toContain('const _CACHE_WORD_SHARD_CLIP_KEYS = [];');
      expect(host).toContain('_CACHE_WORD_SHARD_CLIP_KEYS.length > 128');
      expect(host).toContain('var clipCrash = function (v, max)');
      expect(host).toContain('Promise.resolve(navigator.clipboard.writeText(text)).then(');
      expect(host).toContain("if (codename === '__proto__' || codename === 'constructor' || codename === 'prototype') return;");
    }
  });

  it('allo_device_storage_module uses null-prototype memory buckets, recovers directDb on error, and traps focus in educator code modal', async () => {
    const src = read('allo_device_storage_module.js');
    expect(src).toContain('var _mem = Object.create(null);');
    expect(src).toContain('var by = Object.create(null);');
    expect(src).toContain('db.onversionchange = function ()');
    expect(src).toContain('req.onblocked = function ()');
    expect(src).toContain('z-index:2147483646');
    expect(src).toContain("overlay.setAttribute('data-allo-device-storage-confirm', '')");
    expect(src).toContain("overlay.setAttribute('aria-labelledby', heading.id)");

    const win = {
      AlloModules: {},
      console,
      location: { origin: 'null', href: 'about:blank' },
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    win.window = win;
    vm.runInNewContext(src, win, { filename: 'allo_device_storage_module.js' });
    const api = win.alloDeviceStorage;
    expect(api).toBeTruthy();
    api.useMemory();
    expect(await api.get('ns', 'toString')).toBeNull();
    await api.set('ns', '__proto__', 'harmless');
    expect(({}).toString).toBeTypeOf('function');
  });

  it('error_reporter_module prunes ignored messages during sessionStorage rehydration and blocks javascript: URLs in Search tab', () => {
    const src = read('error_reporter_module.js');
    expect(src.indexOf('var IGNORE_MESSAGE_PATTERNS =')).toBeLessThan(src.indexOf('var buffer = (function ()'));
    expect(src).toContain("if (parsedUrl.protocol === 'https:' || parsedUrl.protocol === 'http:') safeHref = parsedUrl.href;");
    expect(src).toContain("['pointerup', 'pointercancel', 'keyup'].forEach(function (type) { document.removeEventListener(type, releasePanelPress, true); });");
    expect(src).toContain("window.speechSynthesis.removeEventListener('voiceschanged', finish)");
    expect(src).toContain('if (ev.isComposing || ev.keyCode === 229 || descriptionComposing) return;');

    const nowIso = new Date().toISOString();
    const seeded = JSON.stringify([
      { ts: nowIso, lastTs: nowIso, level: 'error', message: 'ResizeObserver loop completed with undelivered notifications.' },
      { ts: nowIso, lastTs: nowIso, level: 'error', message: 'Real actionable failure' },
    ]);
    const makeStore = (init = []) => {
      const m = new Map(init);
      return {
        getItem: (k) => (m.has(k) ? m.get(k) : null),
        setItem: (k, v) => m.set(k, String(v)),
        removeItem: (k) => m.delete(k),
      };
    };
    const win = {
      AlloModules: {},
      console: { log: () => {}, warn: () => {}, error: () => {} },
      location: { href: 'https://example.test/' },
      navigator: { userAgent: 'Vitest' },
      sessionStorage: makeStore([['alloflow_error_log', seeded]]),
      localStorage: makeStore(),
      addEventListener: () => {},
      removeEventListener: () => {},
      document: { body: null, addEventListener: () => {}, getElementById: () => null },
      URL,
    };
    win.window = win;
    vm.runInNewContext(src, win, { filename: 'error_reporter_module.js' });
    const entries = win.AlloModules.ErrorReporter.getBuffer();
    expect(entries.map((e) => e.message)).toEqual(['Real actionable failure']);
  });

  it('hardens allo_device_vault, pyodide_runtime, export_source, word_sounds, and escape_room', () => {
    const vault = read('allo_device_vault_module.js');
    expect(vault).toContain("if (!normalizedId || normalizedId === '__proto__' || normalizedId === 'constructor' || normalizedId === 'prototype') return;");
    expect(vault).toContain('if (!committed) this._destroyDek(built.dek);');
    expect(vault).toContain('if (ownsDek && dek && dek !== this._dek) this._destroyDek(dek);');
    expect(vault).toContain('if (!importedCommitted) this._destroyDek(dek);');

    const pyo = read('pyodide_runtime_module.js');
    expect(pyo).toContain('if (_initPromise === pending) _initPromise = null;');
    expect(pyo).toContain('if (_poetryPromise === pending) _poetryPromise = null;');
    expect(pyo).toContain('Timed out loading pyodide.js from ');

    const exp = read('export_source.jsx');
    expect(exp).toContain('window.__alloAiSecretsLocked === true');
    expect(exp).toContain('<UNTRUSTED_TOPIC>');
    expect(exp).toContain('<UNTRUSTED_JOURNEY_LOG>');
    expect(exp).toContain('setTimeout(() => { try { URL.revokeObjectURL(url); } catch (_) {} }, 1000);');

    const ws = read('word_sounds_module.js');
    expect(ws).toContain('audioCtxRef.current.close()');
    expect(ws).toContain('const fetchTimed = async (u) => {');
    expect(ws).toContain('if (event.isComposing || event.keyCode === 229) return null;');

    const er = read('escape_room_module.js');
    expect(er).toContain('byId: Object.create(null)');
    expect(er).toContain('var objects = [], objectIds = Object.create(null);');
    expect(er).toContain("window.__alloAiSecretsLocked === true");
    expect(er).toContain("'aria-label': t('escape_room.enter_answer_label') || 'Enter your answer'");
  });
});

describe('Phase 14 Wave 2 — Specialized suites resilience & AI gating', () => {
  it('hardens studio, behavior_lens, fluency, walkthrough_copilot, school_rewards, dynamic_assessment, immersive_reader, voice, and timeline_studio', () => {
    const studio = read('studio_module.js');
    expect(studio).toContain("if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue;");
    expect(studio).toContain("Object.prototype.hasOwnProperty.call(out, op.actor) && typeof out[op.actor] === 'number'");
    expect(studio).toContain("JSON.parse(e.target.result, function (k, v) { return (k === '__proto__' || k === 'constructor' || k === 'prototype') ? undefined : v; })");

    const bl = read('behavior_lens_module.js');
    expect(bl).toContain('const CONSENT_LOCKED_SECTIONS = Object.assign(Object.create(null), { rights: true });');
    expect(bl).toContain('osc.onended = () => { try { Promise.resolve(ctx.close?.()).catch(() => {}); } catch (_) {} };');
    expect(bl).toContain("if (typeof r !== 'string' || !r.trim()) return;");
    expect(bl).not.toContain('Math.max(...dates)');
    expect(bl).not.toContain('Math.max(...times)');

    const fl = read('fluency_module.js');
    expect(fl).toContain('window.__alloAiSecretsLocked === true');
    expect(fl).toContain('Promise.resolve(tmpCtx.close()).catch(function () {})');
    expect(fl).toContain('if (!response || !response.ok) return null;');
    expect(fl).toContain('var finiteRates = familyAggregateAllowed ?');

    expect(read('walkthrough_copilot_source.jsx')).toContain("if (!response || !response.ok) throw new Error('HTTP ' + (response ? response.status : 'error'));");
    expect(read('school_rewards_source.jsx')).toContain('setTimeout(() => ctrl.abort(), 12000)');
    expect(read('dynamic_assessment_module.js')).toContain('window.__alloAiSecretsLocked === true');
    expect(read('immersive_reader_source.jsx')).toContain('window.__alloAiSecretsLocked === true');
    expect(read('voice_module.js')).toContain('window.__alloAiSecretsLocked === true');
    expect(read('timeline_studio_module.js')).toContain("window.__alloAiUsable('text', callGemini)");
  });
});

describe('Phase 14 Wave 3 — Remaining views a11y, contrast, IME & ancestor visibility focus traps', () => {
  it('fixes contrast, aria-label, aria-pressed/current, table scopes, and IME Escape guards across core views', () => {
    const inbox = read('view_submission_inbox_source.jsx');
    expect(inbox).toContain("pendingAnchor.mode === 'manual' ? '#0369a1' : '#b45309'");
    expect(inbox).not.toContain("const existing = JSON.parse(localStorage.getItem('alloflow_offline_grades') || '{}');");

    const pchat = read('view_persona_chat_source.jsx');
    expect(pchat).not.toContain('text-indigo-400">/100');
    expect(pchat).not.toContain('text-yellow-600">+{reflectionFeedbackXp}');

    const ep = read('view_export_preview_source.jsx');
    expect(ep).toContain('placeholder-slate-300');
    expect(ep).not.toContain('placeholder-slate-500');

    const hdr = read('view_header_source.jsx');
    expect(hdr).toContain("aria-label={t('header.translate_button')}");
    expect(hdr).toContain('aria-label={headerAnalyticsLabel}');
    expect(hdr).toContain("aria-pressed={colorOverlay !== 'none'}");
    expect(hdr).toContain("aria-current={activeView === 'dashboard' ? 'page' : undefined}");

    const dbq = read('view_dbq_source.jsx');
    expect(dbq).toContain('<th scope="col"');
    expect(dbq).toContain('<th scope="row"');
    expect(dbq).toContain('aria-pressed={dbqActiveDoc === doc.id}');
    expect(dbq).toContain('aria-pressed={speakingDocId === activeDoc.id}');

    expect(read('view_sentence_frames_source.jsx')).toContain('aria-pressed={isEditingScaffolds}');
    expect(read('view_fab_stack_source.jsx')).toContain("if (event.isComposing || event.nativeEvent?.isComposing || event.keyCode === 229) return;");
  });

  it('upgrades modal focus traps across all 11 remaining modal views to walk ancestors for display:none/visibility:hidden', () => {
    const modalSources = [
      'view_info_modal_source.jsx',
      'view_directions_composer_source.jsx',
      'view_persona_workspace_source.jsx',
      'view_project_settings_source.jsx',
      'view_canvas_recovery_dialog_source.jsx',
      'view_hints_modal_source.jsx',
      'view_study_timer_modal_source.jsx',
      'view_visual_supports_modal_source.jsx',
      'view_storybook_export_modal_source.jsx',
      'view_video_library_source.jsx',
      'view_video_ref_player_source.jsx',
    ];
    for (const rel of modalSources) {
      const src = read(rel);
      expect(src, `${rel} should check ancestor computed style`).toMatch(/getComputedStyle\((?:cur|ancestor)\)/);
    }
  });

  it('keeps all 35 Phase 14 deliverables byte-identical across 4-way mirrors and SRI-matched across all 3 host manifests', () => {
    const bdm = require(path.join(ROOT, 'dev-tools/build_browser_delivery_manifest.cjs'));
    const hostManifests = [
      'AlloFlowANTI.txt',
      'desktop/web-app/src/AlloFlowANTI.txt',
      'desktop/web-app/src/App.jsx',
    ].map((p) => bdm.readEmbeddedManifest(read(p)));

    for (const rel of PHASE14_DELIVERABLES) {
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
