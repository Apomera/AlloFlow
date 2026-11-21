import { describe, it, expect, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { JSDOM, VirtualConsole } from 'jsdom';

const require = createRequire(import.meta.url);
const manifestTool = require('../dev-tools/build_browser_delivery_manifest.cjs');

const PHASE38_FILES = [
  'item_correction_module.js',
  'quiz_mode_strategies.js',
  'agent_core_pack_media_module.js',
  'agent_core_pack_native_module.js',
  'agent_core_contracts_module.js',
];
const MIRROR_DIRS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build',
];
const HOSTS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

const windows = [];
afterEach(() => {
  windows.splice(0).forEach((w) => w.close());
  vi.restoreAllMocks();
});

function bootBrowserModule(file, setupFn) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    url: 'https://alloflow.example/',
    runScripts: 'outside-only',
    virtualConsole: new VirtualConsole(),
  });
  const w = dom.window;
  windows.push(w);
  if (typeof setupFn === 'function') setupFn(w);
  w.eval(readFileSync(file, 'utf8'));
  return w;
}

describe('Phase 38 mirror & 3-host SRI manifest integrity', () => {
  it('keeps all 5 Phase 38 modules byte-identical across root and all 3 desktop mirrors', () => {
    for (const file of PHASE38_FILES) {
      const rootBuf = readFileSync(file);
      const rootHash = createHash('sha256').update(rootBuf).digest('hex');
      for (const dir of MIRROR_DIRS) {
        const copyHash = createHash('sha256').update(readFileSync(`${dir}/${file}`)).digest('hex');
        expect(copyHash, `${dir}/${file} drifted from root`).toBe(rootHash);
      }
    }
  });

  it('keeps all 3 host SRI manifests in sync with current Phase 38 asset bytes, sha384, and releaseId', () => {
    const releaseIds = new Set();
    for (const host of HOSTS) {
      const embedded = manifestTool.readEmbeddedManifest(readFileSync(host, 'utf8'));
      expect(embedded.releaseId).toMatch(/^[a-f0-9]{64}$/);
      releaseIds.add(embedded.releaseId);
      for (const file of PHASE38_FILES) {
        const buf = readFileSync(file);
        const sri = 'sha384-' + createHash('sha384').update(buf).digest('base64');
        expect(embedded.assets[file]?.bytes, `${host} bytes for ${file}`).toBe(buf.length);
        expect(embedded.assets[file]?.integrity, `${host} integrity for ${file}`).toBe(sri);
      }
    }
    expect(releaseIds.size).toBe(1);
  });
});

describe('Phase 38: item_correction_module.js hardening', () => {
  it.each([
    '__alloQrStudentMode',
    '_alloQrBlocked',
    '__alloStudentView',
    '__alloOfflineOnly',
  ])('blocks community feedback POSTs when %s is true', async (flag) => {
    const fetchMock = vi.fn();
    const w = bootBrowserModule('item_correction_module.js', (win) => {
      win[flag] = true;
      win.fetch = fetchMock;
    });
    w.AlloModules.ItemCorrection.openFor({ packId: 'p1', itemId: 'i1', prompt: 'Q?' });
    const btn = w.document.getElementById('allo-ic-send');
    expect(btn.disabled).toBe(true);
    w.document.getElementById('allo-ic-suggest').value = 'Suggested fix';
    btn.onclick();
    await new Promise((r) => setTimeout(r, 0));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('normalizes direct openModal calls, bounds inputs, validates kind against frozen KINDS, and guards double-submit & AbortController cleanup', async () => {
    let aborted = false;
    let resolveFetch;
    const fetchMock = vi.fn((_url, opts) => {
      if (opts.signal) opts.signal.addEventListener('abort', () => { aborted = true; });
      return new Promise((res) => { resolveFetch = res; });
    });
    const w = bootBrowserModule('item_correction_module.js', (win) => {
      win.fetch = fetchMock;
    });
    const IC = w.AlloModules.ItemCorrection;
    expect(Object.isFrozen(IC.KINDS)).toBe(true);
    expect(Object.isFrozen(IC.KINDS[0])).toBe(true);

    // Direct openModal call normalizes oversized & control-char context
    IC.openModal({ packId: 'p\x00' + 'x'.repeat(200), prompt: 'q\x07'.repeat(2000) });
    const suggest = w.document.getElementById('allo-ic-suggest');
    const note = w.document.getElementById('allo-ic-note');
    const kind = w.document.getElementById('allo-ic-kind');
    const send = w.document.getElementById('allo-ic-send');
    suggest.value = 'Fix\x00' + 'a'.repeat(4000);
    note.value = 'Note\x07' + 'b'.repeat(3000);
    // Tamper select value to an unknown option
    const bogus = w.document.createElement('option');
    bogus.value = 'injected-kind';
    kind.appendChild(bogus);
    kind.value = 'injected-kind';

    // IME composing Escape must not close the modal
    const overlay = w.document.getElementById('allo-ic-overlay');
    const imeEvent = new w.KeyboardEvent('keydown', { key: 'Escape', isComposing: true });
    overlay.dispatchEvent(imeEvent);
    expect(w.document.getElementById('allo-ic-overlay')).toBeTruthy();

    // First click starts request; second immediate onclick is ignored while in-flight
    send.onclick();
    send.onclick();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(payload.packId.length).toBeLessThanOrEqual(120);
    expect(payload.packId).not.toContain('\x00');
    expect(payload.suggested.length).toBe(3000);
    expect(payload.suggested).not.toContain('\x00');
    expect(payload.note.length).toBe(2000);
    expect(payload.note).not.toContain('\x07');
    expect(payload.kind).toMatch(/^other \(/);

    // Closing modal mid-flight aborts controller and ignores late resolution
    w.document.getElementById('allo-ic-cancel').click();
    expect(aborted).toBe(true);
    expect(w.document.getElementById('allo-ic-overlay')).toBeNull();
    resolveFetch({ ok: true, json: () => Promise.resolve({ ok: true, storage: 'private' }) });
    await new Promise((r) => setTimeout(r, 0));
    expect(w.document.getElementById('allo-ic-overlay')).toBeNull();
  });
});

describe('Phase 38: quiz_mode_strategies.js hardening', () => {
  it('blocks prototype-key lookups, handles circular questions & Infinity counts, and deep-freezes STRATEGIES', () => {
    const w = bootBrowserModule('quiz_mode_strategies.js');
    const Q = w.AlloModules.QuizModeStrategies;

    expect(Q.getStrategy('toString').key).toBe('exit-ticket');
    expect(Q.getStrategy('constructor').key).toBe('exit-ticket');
    expect(Object.isFrozen(Q.STRATEGIES)).toBe(true);
    expect(Object.isFrozen(Q.STRATEGIES['exit-ticket'].generation.allowedItemTypes)).toBe(true);

    // Circular question must not crash contentReviewSignature
    const circular = { type: 'mcq', question: 'Test?' };
    circular.options = [circular];
    expect(Q.contentReviewSignature(circular)).toMatch(/^content-[0-9a-f]+$/);

    // Prototype key in question.type must not crash localContentReview
    const local = Q.localContentReview([{ type: 'toString', question: 'Q', sourceEvidence: 'abc\x00defghij' }], 'abcdefghij');
    expect(local.items).toHaveLength(1);
    expect(Array.isArray(local.items[0].checklist)).toBe(true);
    expect(local.items[0].evidenceQuote).toBe('abcdefghij');

    // Non-finite count / negative offset handling
    const cov = Q.resolveCriteriaCoverage([{ id: 'c1', statement: 'S1' }], null, Infinity, []);
    expect(cov.selectedIds).toEqual([]);
    const norm = Q.normalizeContentReview({ items: [{ questionIdx: 0, status: 'review', reason: 'ok\x00!' }] }, [{ type: 'mcq' }], '', -5);
    expect(norm[0].questionIdx).toBe(0);
    expect(norm[0].reason).toBe('ok!');
  });
});

describe('Phase 38: agent_core_pack_media_module.js hardening', () => {
  const media = require('../agent_core_pack_media_module.js');

  it('rejects truncated GIF extensions cleanly without out-of-bounds reads', () => {
    // Minimal 14-byte GIF89a header (1x1, no global color table) + extension introducer 0x21 (33) at EOF
    const truncExt = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0, 0x21,
    ]);
    const r1 = media.inspectDataImage('data:image/gif;base64,' + truncExt.toString('base64'), { profile: 'native' });
    expect(r1.ok).toBe(false);
    expect(r1.errors[0].code).toBe('invalid-raster-image');

    // Extension introducer + app ext 0xFF with no length byte
    const truncApp = Buffer.from([
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 1, 0, 1, 0, 0, 0, 0, 0x21, 0xff,
    ]);
    const r2 = media.inspectDataImage('data:image/gif;base64,' + truncApp.toString('base64'), { profile: 'native' });
    expect(r2.ok).toBe(false);
    expect(r2.errors[0].code).toBe('invalid-raster-image');
  });

  it('keeps validatePackMedia errors strictly bounded to MAX_DIAGNOSTICS (100) and strips unsafe keys on override clones', () => {
    const badPanels = Array.from({ length: 120 }, () => ({ imageUrl: 'not-a-data-url', frames: 'bad' }));
    const pack = {
      history: [{
        id: 'img-1',
        type: 'image',
        data: {
          visualPlan: { panels: badPanels },
          annotations: { unknownExtra: 1 },
        },
      }],
    };
    const report = media.validatePackMedia(pack, { profile: 'native' });
    expect(report.ok).toBe(false);
    expect(report.errors.length).toBeLessThanOrEqual(100);

    const row = JSON.parse('{"imageUrl":"data:image/png;base64,AA==","__proto__":{"polluted":true}}');
    const slots = media.getImageSlots({
      history: [{
        id: 'img-2',
        type: 'image',
        data: {
          visualPlan: { panels: [row] },
          annotations: { imageOverrides: { 0: 'data:image/png;base64,BB==' } },
        },
      }],
    }, { profile: 'native' });
    const overrideSlot = slots.find((s) => s.kind === 'override');
    expect(overrideSlot).toBeTruthy();
    expect(Object.prototype.hasOwnProperty.call(overrideSlot.owner, '__proto__')).toBe(false);
    expect(({}).polluted).toBeUndefined();
  });
});

describe('Phase 38: agent_core_pack_native_module.js hardening', () => {
  const native = require('../agent_core_pack_native_module.js');

  it('rejects javascript:/data:/file: URLs in analysis citations and DBQ sourceUrl', () => {
    const errors1 = [];
    native.validateResource({
      type: 'analysis',
      data: {
        originalText: 'Sample text.',
        readingLevel: 'Grade 5',
        concepts: ['Water'],
        accuracy: {
          rating: 'High',
          reason: 'Checked',
          citations: [{ uri: 'javascript:alert(1)', title: 'Bad' }],
        },
      },
    }, 'pack.history[0]', errors1, []);
    expect(errors1.some((e) => e.code === 'unsafe-url')).toBe(true);

    const errors2 = [];
    native.validateResource({
      type: 'dbq',
      data: {
        title: 'DBQ',
        historicalContext: 'Context',
        synthesisPrompt: 'Synthesize',
        documents: [{
          id: 'A',
          title: 'Doc A',
          source: 'Archive',
          excerpt: 'Quote',
          excerptKind: 'verbatim',
          sourceUrl: '  data:text/html,<script>alert(1)</script>',
        }],
      },
    }, 'pack.history[0]', errors2, []);
    expect(errors2.some((e) => e.code === 'unsafe-url')).toBe(true);
  });

  it('bounds exponential DAG traversal and rejects prototype-polluting keys in alignment-report', () => {
    // 20-level diamond DAG (2^20 = 1,048,576 paths without node budget)
    let node = { leaf: 'ok' };
    for (let i = 0; i < 20; i++) node = { left: node, right: node };
    const errors = [];
    const start = Date.now();
    native.validateResource({
      type: 'alignment-report',
      data: {
        comprehensive: {
          standards: { score: 80, dag: node },
        },
      },
    }, 'pack.history[0]', errors, []);
    expect(Date.now() - start).toBeLessThan(2000);
    expect(errors.some((e) => e.code === 'payload-too-large')).toBe(true);

    const protoObj = JSON.parse('{"comprehensive":{"standards":{"constructor":{"bad":1}}}}');
    const protoErrors = [];
    native.validateResource({ type: 'alignment-report', data: protoObj }, 'pack.history[0]', protoErrors, []);
    expect(protoErrors.some((e) => e.code === 'unsafe-key')).toBe(true);
    expect(Object.isFrozen(native.TYPES)).toBe(true);
  });
});

describe('Phase 38: agent_core_contracts_module.js hardening', () => {
  const C = require('../agent_core_contracts_module.js');

  it('freezes contract allowlists, detects cyclic payloads, and bounds DAG scans', () => {
    expect(Object.isFrozen(C.DEPLOYMENT_MODES)).toBe(true);
    expect(Object.isFrozen(C.FALLBACK_TOOL_IDS)).toBe(true);
    expect(Object.isFrozen(C.PERMISSIONS)).toBe(true);
    expect(Object.isFrozen(C.TOOL_CLASSIFICATION)).toBe(true);
    expect(Object.isFrozen(C.TOOL_CLASSIFICATION[0])).toBe(true);

    const cyc = { a: 1 };
    cyc.self = cyc;
    const cycRes = C.validateArtifact({ schemaVersion: '1.0', artifactId: 'a1', type: 'quiz', data: cyc });
    expect(cycRes.ok).toBe(false);
    expect(cycRes.errors.some((e) => e.code === 'cyclic-payload')).toBe(true);
    expect(cycRes.errors.some((e) => e.code === 'unserializable-data')).toBe(true);

    // 10-level wide DAG (within MAX_SCAN_DEPTH=10, 4^9 = 262,144 paths)
    let dag = { v: 1 };
    for (let i = 0; i < 8; i++) dag = { a: dag, b: dag, c: dag, d: dag };
    const t0 = Date.now();
    const dagRes = C.validateBlueprint({
      schemaVersion: '1.0',
      blueprintId: 'bp-dag',
      plan: [{ tool: 'quiz', directive: '' }],
      configs: dag,
    });
    expect(Date.now() - t0).toBeLessThan(2000);
    expect(dagRes.ok).toBe(false);
    expect(dagRes.errors.some((e) => e.code === 'payload-too-large')).toBe(true);
  });

  it('blocks prototype-key collisions, unsafe URL schemes, NaN job fields, and circular fromLegacyConfig inputs', () => {
    // Prototype-key safety in plan normalization & capability derivation
    const items = C.normalizePlanItems(['toString'], {});
    expect(items[0].directive).toBe('');
    expect(C.requiredCapabilitiesForPlan([{ tool: 'toString' }])).toEqual(['text']);

    // CommandWorkflow allows lowercase Object.prototype stepId "constructor" without false duplicate collision
    const wf = C.validateCommandWorkflow({
      schemaVersion: '1.0',
      workflowId: 'wf-proto',
      kind: 'command-workflow',
      audience: 'teacher',
      steps: [{ stepId: 'constructor', commandId: 'generate_quiz', params: {} }],
    }, { knownCommandIds: ['generate_quiz'] });
    expect(wf.ok).toBe(true);

    // Unsafe URL schemes stripped from standardsContext
    const ctx = C.normalizeInstructionalContext({
      standardsContext: {
        sourceUrls: ['javascript:alert(1)', 'https://example.edu/std'],
        standards: [{ code: 'S1', sourceUrl: 'data:text/html,boom' }],
      },
    });
    expect(ctx.standardsContext.sourceUrls).toEqual(['https://example.edu/std']);
    expect(ctx.standardsContext.standards[0].sourceUrl).toBe('');

    // NaN / negative job metrics clamped safely
    const job = C.validateJob({
      schemaVersion: '1.0',
      jobId: 'j1',
      blueprintId: 'b1',
      status: 'running',
      currentStep: -3,
      progress: NaN,
    });
    expect(job.ok).toBe(true);
    expect(job.value.currentStep).toBe(0);
    expect(job.value.progress).toBe(0);

    // Circular object in fromLegacyConfig does not throw
    const circCfg = { a: 1 };
    circCfg.self = circCfg;
    const bp = C.fromLegacyConfig({ resourcePlan: [{ tool: 'quiz', generationConfig: circCfg }] });
    expect(bp.blueprintId).toMatch(/^bp-\d+$/);
  });
});
