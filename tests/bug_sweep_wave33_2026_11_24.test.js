import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import crypto from 'crypto';

const ROOT = path.resolve(__dirname, '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const sha256 = (rel) => crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT, rel))).digest('hex');
const sha384Sri = (rel) => 'sha384-' + crypto.createHash('sha384').update(fs.readFileSync(path.join(ROOT, rel))).digest('base64');

const WAVE33_DELIVERABLES = [
  // Pass 1 (6)
  'teacher_module.js',
  'games_module.js',
  'allo_commands_module.js',
  'allobot_module.js',
  'research_lane_humanities_module.js',
  'research_lane_engineering_module.js',
  // Pass 2 (6)
  'view_pdf_audit_module.js',
  'view_export_preview_module.js',
  'view_renderers_module.js',
  'view_sidebar_panels_module.js',
  'view_guided_mode_banner_module.js',
  'view_misc_panels_module.js',
  // Pass 3 (6)
  'view_info_modal_module.js',
  'view_live_session_dock_module.js',
  'view_full_pack_run_module.js',
  'view_fab_stack_module.js',
  'view_canvas_recovery_dialog_module.js',
  'printable_model_module.js',
];

const MIRROR_DIRS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];

const HOST_FILES = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

function loadPrintableModel(extraWin = {}) {
  const win = Object.assign({ AlloModules: {}, console }, extraWin);
  const ctx = {
    window: win,
    console: { log() {}, warn() {}, error() {} },
    TextDecoder,
    TextEncoder,
    Uint8Array,
    Float32Array,
    ArrayBuffer,
    DataView,
    Promise,
    Set,
    Number,
    Math,
    Date,
    Object,
    Array,
    String,
    JSON,
    Error,
    RangeError,
    isFinite,
  };
  vm.runInNewContext(read('printable_model_module.js'), ctx);
  return win.AlloModules.PrintableModel;
}

function makeGlbBuffer(jsonObj) {
  const jsonBytes = Buffer.from(JSON.stringify(jsonObj), 'utf8');
  const pad = (4 - (jsonBytes.length % 4)) % 4;
  const paddedJson = Buffer.concat([jsonBytes, Buffer.alloc(pad, 0x20)]);
  const totalLen = 12 + 8 + paddedJson.length;
  const buf = Buffer.alloc(totalLen);
  buf.writeUInt32LE(0x46546c67, 0); // glTF
  buf.writeUInt32LE(2, 4);          // version 2
  buf.writeUInt32LE(totalLen, 8);
  buf.writeUInt32LE(paddedJson.length, 12);
  buf.writeUInt32LE(0x4e4f534a, 16); // JSON
  paddedJson.copy(buf, 20);
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

describe('Wave 33 bug sweep (2026-11-24) - SSR, 4-Way Mirror Parity & 3-Host SRI Parity', () => {
  it('loads all 18 Wave 33 deliverables cleanly in bare Node VM SSR (no window/document)', () => {
    for (const rel of WAVE33_DELIVERABLES) {
      expect(() => {
        vm.runInNewContext(read(rel), { console: { log() {}, warn() {}, error() {} } });
      }, `SSR failed for ${rel}`).not.toThrow();
    }
  });

  it('maintains 4-way SHA-256 byte parity across root, public, build, and app-build for all 18 Wave 33 deliverables', () => {
    for (const rel of WAVE33_DELIVERABLES) {
      const rootHash = sha256(rel);
      for (const dir of MIRROR_DIRS) {
        const target = path.join(dir, rel);
        expect(fs.existsSync(path.join(ROOT, target)), `Missing mirror ${target}`).toBe(true);
        expect(sha256(target), `Mirror hash drift for ${target}`).toBe(rootHash);
      }
    }
  });

  it('maintains 3-host SRI hash parity and 8-char ?v= pin parity across AlloFlowANTI.txt, desktop AlloFlowANTI.txt, and App.jsx', () => {
    const hosts = HOST_FILES.map((h) => ({ file: h, content: read(h) }));
    for (const rel of WAVE33_DELIVERABLES) {
      const expectedSri = sha384Sri(rel);
      const escapedRel = rel.replace(/\./g, '\\.');
      const escapedSri = expectedSri.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`"${escapedRel}"\\s*:\\s*\\{"bytes"\\s*:\\s*\\d+\\s*,\\s*"integrity"\\s*:\\s*"${escapedSri}"\\}`);
      for (const { file, content } of hosts) {
        expect(content, `${file} missing SRI for ${rel}`).toMatch(re);
      }
    }
    for (const pinned of ['view_full_pack_run_module.js', 'view_canvas_recovery_dialog_module.js']) {
      const expectedPin = sha256(pinned).slice(0, 8);
      for (const { file, content } of hosts) {
        expect(content, `${file} stale ?v= pin for ${pinned}`).toContain(`${pinned}?v=${expectedPin}`);
      }
    }
  });
});

describe('Wave 33 Pass 3 - printable_model_module.js runtime security & math hardening', () => {
  it('rejects Infinity, NaN, and negative bounding dimensions with NON_FINITE_BOUNDS and BED_FIT', () => {
    const pm = loadPrintableModel();
    const infReport = pm.finalizeMetrics({ triangleCount: 12, byteSize: 100, dimensionsMm: { width: Infinity, depth: 10, height: 10 } });
    expect(infReport.status).toBe('FAIL');
    expect(infReport.issues.map((i) => i.code)).toContain('NON_FINITE_BOUNDS');
    expect(infReport.issues.map((i) => i.code)).toContain('BED_FIT');

    const negReport = pm.finalizeMetrics({ triangleCount: 12, byteSize: 100, dimensionsMm: { width: -5, depth: 10, height: 10 } });
    expect(negReport.status).toBe('FAIL');
    expect(negReport.issues.map((i) => i.code)).toContain('NON_FINITE_BOUNDS');
    expect(negReport.issues.map((i) => i.code)).toContain('BED_FIT');

    // Overflowing recipe box must NOT collapse round(Infinity) -> 0 and pass BED_FIT
    const hugeRecipe = pm.inspectRecipe({
      parts: [{ shape: 'box', size: [1e308, 10, 10], position: [0, 0, 0] }],
    }, 20);
    expect(hugeRecipe.status).toBe('FAIL');
    expect(hugeRecipe.issues.map((i) => i.code)).toContain('NON_FINITE_BOUNDS');
    expect(hugeRecipe.issues.map((i) => i.code)).toContain('BED_FIT');
  });

  it('flags inverted GLB accessor bounds (min > max) instead of passing BED_FIT with negative dims', () => {
    const pm = loadPrintableModel();
    const glb = makeGlbBuffer({
      asset: { version: '2.0' },
      accessors: [{ count: 3, min: [10, 0, 0], max: [2, 1, 1] }],
      meshes: [{ primitives: [{ mode: 4, attributes: { POSITION: 0 } }] }],
    });
    const report = pm.inspectGlb(glb, 1000);
    expect(report.status).toBe('FAIL');
    expect(report.issues.map((i) => i.code)).toContain('NON_FINITE_BOUNDS');
    expect(report.issues.map((i) => i.code)).toContain('BED_FIT');
  });

  it('flags ASCII STL literal NaN/Infinity vertices as NON_FINITE_VERTEX and reports INDETERMINATE winding on overflow', () => {
    const pm = loadPrintableModel();
    const nanStl = [
      'solid bad',
      'facet normal 0 0 1',
      '  outer loop',
      '    vertex NaN 0 0',
      '    vertex 1 0 0',
      '    vertex 0 1 0',
      '  endloop',
      'endfacet',
      'endsolid bad',
    ].join('\n');
    const nanReport = pm.inspectStl(new TextEncoder().encode(nanStl), 1);
    expect(nanReport.status).toBe('FAIL');
    expect(nanReport.issues.map((i) => i.code)).toContain('NON_FINITE_VERTEX');

    const overflowStl = [
      'solid huge',
      'facet normal 0 0 1',
      '  outer loop',
      '    vertex 1e150 0 0',
      '    vertex 0 1e150 0',
      '    vertex 0 0 1e150',
      '  endloop',
      'endfacet',
      'endsolid huge',
    ].join('\n');
    const overflowReport = pm.inspectStl(new TextEncoder().encode(overflowStl), 1);
    expect(overflowReport.windingOrientation).toBe('INDETERMINATE');
    expect(overflowReport.signedVolumeMm3).toBeNull();
  });

  it('clamps negative material volume/grams, rejects arrays/blocked keys, and guards exportBinaryStl before toNonIndexed()', async () => {
    const pm = loadPrintableModel();
    const mat = pm.estimateMaterial({ volumeMm3UpperBound: -50000 });
    expect(mat.estimatedGrams).toBe(0);
    const quote = pm.estimatePointQuote({ estimatedGrams: -999 }, { basePoints: 50, pointsPerGram: 2, minimumPoints: 10 });
    expect(quote.inputs.estimatedGrams).toBe(0);
    expect(quote.totalPoints).toBe(50);

    // Array / non-object rejection in parseSubmission and telemetry
    expect(pm.parseSubmission('[]').ok).toBe(false);
    expect(pm.parseSubmission('null').ok).toBe(false);
    expect(pm.parseSubmission('42').ok).toBe(false);
    const tState = pm.reducePrinterTelemetry({ jobs: ['bad'], printers: ['bad'], lastEvent: ['bad'] }, { type: 'PRINTER_REGISTERED', printerKey: 'p1', atMinute: 0 });
    expect(Array.isArray(tState.jobs)).toBe(false);
    expect(Array.isArray(tState.printers)).toBe(false);

    // Blocked printer key sanitized in planPrintSchedule & simulator
    const sched = pm.planPrintSchedule([], [{ key: '__proto__' }, { key: 'constructor' }]);
    expect(sched.printerAvailability.map((p) => p.printerKey)).toEqual(['simulator-1', 'simulator-2']);

    // OOM pre-check before toNonIndexed()
    let toNonIndexedCalled = false;
    const hugeIndexedMesh = {
      isMesh: true,
      geometry: {
        index: { count: 9_000_000 },
        toNonIndexed() {
          toNonIndexedCalled = true;
          return { attributes: { position: { count: 9_000_000 } } };
        },
      },
    };
    const mockObj = { traverse(fn) { fn(hugeIndexedMesh); } };
    expect(() => pm.exportBinaryStl({ Vector3: function () {} }, mockObj)).toThrow(/2,000,000-triangle/);
    expect(toNonIndexedCalled).toBe(false);

    // sha256Hex returns '' cleanly when subtle.digest rejects or is absent
    const pmReject = loadPrintableModel({
      crypto: { subtle: { digest: () => Promise.reject(new Error('denied')) } },
    });
    expect(await pmReject.sha256Hex('abc')).toBe('');
  });
});

describe('Wave 33 Pass 3 - FullPackRunView, FabStack, CanvasRecoveryDialog, InfoModal & LiveSessionDock', () => {
  it('view_full_pack_run_source.jsx remains hook-free, gates student AI fail-closed, and blocks prohibited adapted text', () => {
    const src = read('view_full_pack_run_source.jsx');
    expect(src).not.toMatch(/React\.use(State|Effect|Ref|Memo|Callback|Context)\b/);
    expect(src).toContain('const studentAiBlocked = typeof window !== \'undefined\'');
    expect(src).toContain('disabled={!hasSourceOrAnalysis || isProcessing || isRunActive || !aiCapability.text || studentAiBlocked}');
    expect(src).toContain("disabled={!fullPackAddType || (fullPackAddType === 'alignment-report' && !sectionHasStandards) || (fullPackAddType === 'simplified' && sectionAdaptedTextPolicy === 'prohibited')}");
    expect(src).toContain("const _generationHelpersModule = typeof window !== 'undefined' && window.AlloModules ? window.AlloModules.GenerationHelpers : null;");
    expect(src).toContain("const helpers = typeof window !== 'undefined' ? window.AlloModules?.TextPipelineHelpers : null;");
    expect(src).toContain('Object.prototype.hasOwnProperty.call(obj, key)');
  });

  it('view_fab_stack_source.jsx normalizes SVG tags for XSS drop, pauses when hidden, guards finite layout, and unifies studentAiFeaturesHidden', () => {
    const src = read('view_fab_stack_source.jsx');
    expect(src).toContain("const tag = String(o.tagName || '').toUpperCase();");
    expect(src).toContain('Object.prototype.hasOwnProperty.call(MAGNIFIER_DROP, tag)');
    expect(src).toContain("name === 'srcdoc' || name === 'formaction'");
    expect(src).toContain('if (destroyed || doc.hidden) return;');
    expect(src).toContain("doc.addEventListener('visibilitychange', onVisibilityChange);");
    expect(src).toContain('!from.videoWidth || !from.videoHeight');
    expect(src).toContain('studentAiFeaturesHidden: studentAiFeaturesHiddenProp');
    expect(src).toContain('window.__alloAiSecretsLocked === true');
    expect(src).toContain('{!explainModeHidden && <button type="button"');
    expect(src).toContain('Object.prototype.hasOwnProperty.call(moves, event.key)');
    expect(src).toContain('closeFocusTimerRef');

    // Runtime check on magnifierLayout with NaN/Infinity inputs
    const win = { AlloModules: {}, React: { useRef: () => ({}), useState: () => [null, () => {}], useEffect: () => {} } };
    vm.runInNewContext(read('view_fab_stack_module.js'), { window: win, console: { log() {}, warn() {}, error() {} } });
    const layout = win.AlloModules.FabStack.FabStack.magnifierLayout({ x: NaN, y: Infinity, zoom: 2, size: NaN, touch: true, vw: NaN, vh: NaN });
    expect(Number.isFinite(layout.left)).toBe(true);
    expect(Number.isFinite(layout.top)).toBe(true);
    expect(Number.isFinite(layout.tx)).toBe(true);
    expect(Number.isFinite(layout.ty)).toBe(true);
  });

  it('view_canvas_recovery_dialog_source.jsx preserves contracts, concurrent dictionary cache UI, and hardens dates/optional props/Escape', () => {
    const src = read('view_canvas_recovery_dialog_source.jsx');
    // Template-string contract for main_resources_wave20_2026_11_20.test.js
    expect(src).toContain('className={`shrink-0 min-h-11 rounded-md border border-indigo-300');
    // Exact 3 needsStorageApproval occurrences in error branch
    const errStart = src.indexOf("canvasRecoveryDialogMode === 'error'");
    const choiceStart = src.indexOf("canvasRecoveryDialogMode === 'choice'");
    const errSlice = src.slice(errStart, choiceStart);
    expect((errSlice.match(/needsStorageApproval/g) || []).length).toBe(3);
    expect(errSlice).not.toContain("canvasRecoveryErrorCode === 'allo/approval-required'");
    // Hardening checks
    expect(src).toContain('const _formatSavedDate =');
    expect(src).toContain('Number.isNaN(d.getTime())');
    expect(src).toContain('event.altKey || event.ctrlKey || event.metaKey');
    // Concurrent session dictionary cache preserved
    expect(src).toContain('data-storage-dictionary-row="true"');
  });

  it('view_info_modal_source.jsx and view_live_session_dock_source.jsx keep SSR, date, timer, and prototype hardening intact', () => {
    const info = read('view_info_modal_source.jsx');
    expect(info).toContain('Object.create(null)');
    expect(info).toContain('isMountedRef');
    expect(info).toContain('Object.prototype.hasOwnProperty.call');

    const dock = read('view_live_session_dock_source.jsx');
    expect(dock).toContain('Number.isNaN');
    expect(dock).toContain("typeof window !== 'undefined'");
    expect(dock).toContain('Object.create(null)');
  });
});

describe('Wave 33 Pass 2 - Flagship Views hardening regression locks', () => {
  it('retains XML fencing, crisis screening, fail-closed AI gating, and prototype-safe JSON across Pass 2 sources', () => {
    const pdf = read('view_pdf_audit_source.jsx');
    expect(pdf).toContain('_viewSafeJsonReviver');
    expect(pdf).toContain('_pdfCheckCrisisText');
    expect(pdf).toContain('UNTRUSTED_DOCUMENT_TITLES');

    const ep = read('view_export_preview_source.jsx');
    expect(ep).toContain('_epSafeJsonReviver');
    expect(ep).toContain('_epCheckCrisisText');

    const vr = read('view_renderers_source.jsx');
    expect(vr).toContain('_vrSafeJsonReviver');
    expect(vr).toContain('_alloAiUsableKind');

    const sp = read('view_sidebar_panels_source.jsx');
    expect(sp).toContain('_spSafeJsonReviver');
    expect(sp).toContain('_spCheckCrisisText');

    const gb = read('view_guided_mode_banner_source.jsx');
    expect(gb).toContain('_gbSafeJsonReviver');
    expect(gb).toContain('alloflow-mute-changed');

    const mp = read('view_misc_panels_source.jsx');
    expect(mp).toContain('_mpSafeJsonReviver');
    expect(mp).toContain('_mpCheckCrisisText');
    expect(mp).toContain('visibilitychange');
  });
});
