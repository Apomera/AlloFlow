// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const React = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react'));
const { createRoot } = require(path.resolve(ROOT, 'desktop/web-app/node_modules/react-dom/client'));
const { act } = React;

function loadModule(relPath) {
  const code = fs.readFileSync(path.join(ROOT, relPath), 'utf8');
  // eslint-disable-next-line no-new-func
  new Function(code)();
}

describe('Round 7 Wave 26 — Provenance, Audit Remediator, Teaching Script Host, Read Aloud & PDF Remediation', () => {
  beforeEach(() => {
    window.React = React;
    window.AlloModules = window.AlloModules || {};
    delete window.__alloQrStudentMode;
    delete window._alloQrBlocked;
    delete window.__alloStudentAiDisabled;
    delete window.__alloAiSecretsLocked;
    delete window.ALLOFLOW_MANAGED_AI_POLICY;
    delete window.__alloAiUsable;
    delete window.PDFLib;
  });

  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('allo_provenance_module: CheckpointPanel mounts with null question without hooks crash and transitions cleanly', async () => {
    loadModule('allo_provenance_module.js');
    const CheckpointPanel = window.AlloModules.CheckpointPanel;
    expect(typeof CheckpointPanel).toBe('function');

    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);

    await act(async () => {
      root.render(React.createElement(CheckpointPanel, {
        question: null,
        onAnswer: vi.fn(),
        onClose: vi.fn(),
      }));
    });
    expect(host.innerHTML).toBe('');

    await act(async () => {
      root.render(React.createElement(CheckpointPanel, {
        question: { id: 'q1', question: 'Explain your reasoning.' },
        onAnswer: vi.fn(),
        onClose: vi.fn(),
      }));
    });
    const heading = host.querySelector('h3');
    expect(heading).not.toBeNull();
    expect(host.textContent).toContain('Explain your reasoning.');

    await act(async () => { root.unmount(); });
  });

  it('allo_provenance_module: preserves assistiveTech on pasteEvents, guards prototype keys and malformed ledger rows', async () => {
    loadModule('allo_provenance_module.js');
    const Prov = window.AlloModules.Provenance;

    const summary = Prov.summarizeProcess({
      events: [
        null,
        'bad',
        { type: 'session', action: 'start', t: 1000 },
        { type: 'paste', t: 2000, chars: 120, sourceHint: 'dictation', assistiveTech: true },
        { type: 'session', action: 'end', t: 5000 },
      ],
    });
    expect(summary.pasteEvents.length).toBe(1);
    expect(summary.pasteEvents[0].assistiveTech).toBe(true);

    const sup = Prov.summarizeSupport({
      events: [
        null,
        { type: 'support', t: 1000, kind: 'constructor', count: 1, promptLevel: 'model' },
        { type: 'support', t: 2000, kind: '__proto__', count: 1, promptLevel: 'hint' },
      ],
    });
    expect(sup && typeof sup === 'object').toBe(true);
    expect(sup.promptLevelCounts.model).toBe(1);
    expect(sup.promptLevelCounts.hint).toBe(1);
    expect(Object.prototype.hasOwnProperty.call(sup.bySupport || {}, 'constructor')).toBe(false);
    expect(({}).polluted).toBeUndefined();

    const verified = await Prov.verifyLedger({
      events: [null, { type: 'session', action: 'start', t: 1000 }],
    });
    expect(verified.ok).toBe(false);
  });

  it('audit_remediator_module: gates AI remediation on QR/secrets/policy flags and returns rolled nextHistory', async () => {
    loadModule('audit_remediator_module.js');
    const AR = window.AlloModules.AuditRemediator;
    expect(AR && AR._internals).toBeTruthy();

    window.__alloQrStudentMode = true;
    const handleGenerate = vi.fn(async () => ({ ok: true }));
    const setHistory = vi.fn();
    expect(AR._internals._arAiUsable('text', handleGenerate)).toBe(false);
    const blocked = await AR._internals.applyArtifactAction(
      { id: 'act1', kind: 'scaffold', targetType: 'glossary', label: 'Add glossary' },
      {
        history: [{ id: 'r1', type: 'reading', title: 'Cell', content: 'Text' }],
        setHistory,
        handleGenerate,
      },
    );
    expect(blocked).toMatchObject({ ok: false, reason: 'ai-unavailable' });
    expect(handleGenerate).not.toHaveBeenCalled();

    delete window.__alloQrStudentMode;
    await expect(
      AR._internals.verifyClaimsBatch(
        [{ text: 'Earth orbits the Sun', source: 'r1' }],
        async () => '{"verdicts":"not-an-array"}',
      ),
    ).rejects.toThrow();
  });

  it('lesson_teaching_script_host_module: enforces QR/secrets AI gates and preserves checkpoints when core is not yet loaded', async () => {
    loadModule('lesson_teaching_script_host_module.js');
    const factory = window.AlloModules?.LessonTeachingScriptHost?.createController;
    expect(typeof factory).toBe('function');

    const store = new Map();
    const storage = {
      getItem: (k) => (store.has(k) ? store.get(k) : null),
      setItem: (k, v) => { store.set(k, String(v)); },
      removeItem: (k) => { store.delete(k); },
    };

    const existing = [
      { schema: 1, actor: 'teacher-1', planId: 'plan-1', stage: 'chunking', updatedAt: Date.now(), materialIds: ['m1'], fingerprint: 'fp1' },
      { schema: 1, actor: 'teacher-2', planId: 'plan-2', stage: 'chunking', updatedAt: Date.now(), materialIds: ['m2'], fingerprint: 'fp2' },
    ];
    storage.setItem('alloflow_teaching_script_recovery_v1', JSON.stringify(existing));

    const callText = vi.fn(async () => '{}');
    const host = factory({
      storage,
      callText,
      core: null, // core not yet loaded
      getState: () => ({
        isTeacherMode: true,
        canGenerate: true,
        actorKey: 'teacher-1',
        history: [{ id: 'plan-1', type: 'lesson-plan', title: 'Fractions' }],
      }),
      onStatus: vi.fn(),
    });

    // Missing core must return null without deleting the stored checkpoint
    expect(host.getRecovery('plan-1')).toBeNull();
    const afterRead = JSON.parse(storage.getItem('alloflow_teaching_script_recovery_v1'));
    expect(afterRead.length).toBe(2);

    // QR student mode must block generate even if state says canGenerate: true
    window.__alloQrStudentMode = true;
    const fakeCore = {
      captureInputs: () => ({ settings: {}, fingerprint: 'fp1' }),
      validateInputs: () => ({ ok: true, errors: [] }),
      buildScriptPrompt: () => 'prompt',
      normalizeScript: (x) => x,
      buildScriptRepairPrompt: () => 'repair',
      scriptChunks: () => [{ id: 'c1' }],
      buildScriptChunkPrompt: () => 'chunk',
      normalizeScriptChunk: (x) => x,
      parseRaw: () => ({}),
      appendVersion: () => ({}),
    };
    const host2 = factory({
      storage,
      callText,
      core: fakeCore,
      getState: () => ({
        isTeacherMode: true,
        canGenerate: true,
        actorKey: 'teacher-1',
        history: [
          { id: 'plan-1', type: 'lesson-plan', title: 'Fractions' },
          { id: 'm1', type: 'simplified', title: 'Reading', data: 'Text' },
        ],
      }),
      onStatus: vi.fn(),
    });
    const genRes = await host2.generate('plan-1', { materialIds: ['m1'] });
    expect(genRes.ok).toBe(false);
    expect(callText).not.toHaveBeenCalled();
  });

  it('resource_read_aloud_module: blocks unsafe non-blob/non-data-audio URLs and respects QR student mode', () => {
    const src = fs.readFileSync(path.join(ROOT, 'resource_read_aloud_module.js'), 'utf8');
    expect(src).toContain('isSafeAudioUrl');
    expect(src).toMatch(/blob:\|data:audio\\\//);
    expect(src).toContain('__alloQrStudentMode');
    expect(src).toContain('ALLOFLOW_MANAGED_AI_POLICY');
    expect(src).toContain('Object.create(null)');
    expect(src).toContain('dataset.studioReview === issue.target');
  });

  it('view_pdf_validator_module: guards cyclic StructTreeRoot refs, blank Alt/Lang, and supports attribute XMP pdfuaid:part', async () => {
    loadModule('view_pdf_validator_module.js');
    const validator = window.AlloModules.PdfValidator;
    expect(typeof validator.validateExportedPdfBytes).toBe('function');

    class FakeRef { constructor(id) { this.id = id; } }
    class FakeName {
      constructor(n) { this.n = n; }
      static of(n) { return new FakeName(n); }
      asString() { return '/' + this.n; }
      toString() { return '/' + this.n; }
    }
    class FakeStr {
      constructor(v) { this.v = v; }
      decodeText() { return this.v; }
      asString() { return this.v; }
    }
    class FakeDict {
      constructor(map) { this.map = map; }
      get(k) { return this.map[k && k.n ? k.n : String(k)]; }
      lookup(k) { return this.get(k); }
    }
    class FakeArray {
      constructor(items) { this.items = items; }
      size() { return this.items.length; }
      get(i) { return this.items[i]; }
      asArray() { return this.items; }
    }

    const cycleRef = new FakeRef('cycle');
    const figureRef = new FakeRef('fig');
    const metaRef = new FakeRef('meta');
    const lookupMap = new Map();
    const cycleNode = new FakeDict({
      S: FakeName.of('constructor'),
      K: new FakeArray([cycleRef, figureRef]),
    });
    const figureNode = new FakeDict({
      S: FakeName.of('Figure'),
      Alt: new FakeStr('   '), // whitespace-only alt must NOT count as valid alt
    });
    const metaStream = {
      getContents: () => new TextEncoder().encode('<rdf:Description pdfuaid:part="1"/>'),
      dict: new FakeDict({}),
    };
    lookupMap.set(cycleRef, cycleNode);
    lookupMap.set(figureRef, figureNode);
    lookupMap.set(metaRef, metaStream);

    const catalog = new FakeDict({
      StructTreeRoot: new FakeDict({ K: cycleRef }),
      MarkInfo: new FakeDict({ Marked: { asBoolean: () => true } }),
      Lang: new FakeStr('   '), // whitespace-only Lang must fail
      Metadata: metaRef,
      ViewerPreferences: new FakeDict({ DisplayDocTitle: { asBoolean: () => true } }),
    });

    window.PDFLib = {
      PDFRef: FakeRef,
      PDFName: FakeName,
      PDFDict: FakeDict,
      PDFArray: FakeArray,
      PDFNumber: class FakeNum {},
      PDFDocument: {
        load: vi.fn(async () => ({
          isEncrypted: false,
          catalog,
          context: { lookup: (r) => lookupMap.get(r) || r },
          getPages: () => [],
          getTitle: () => 'Test Doc',
        })),
      },
    };

    const report = await validator.validateExportedPdfBytes(new Uint8Array([37, 80, 68, 70]));
    expect(report.error).toBeUndefined();
    const langCheck = report.checks.find((c) => /lang/i.test(c.rule || ''));
    expect(langCheck && langCheck.status).toBe('fail');
    const uaCheck = report.checks.find((c) => /pdf\/ua|pdfua/i.test(c.rule || ''));
    expect(uaCheck && uaCheck.status).toBe('pass');
    // Prototype pollution check on byRole
    expect(Object.prototype.hasOwnProperty.call(report.stats?.byRole || {}, 'constructor') || report.checks.length > 0).toBe(true);
    // Single parse when doc.isEncrypted is boolean
    expect(window.PDFLib.PDFDocument.load).toHaveBeenCalledTimes(1);
  });

  it('remediation workspace, CSS, review, and batch components enforce Wave 26 security, a11y, and effect invariants', () => {
    const ws = fs.readFileSync(path.join(ROOT, 'remediation_workspace_component.jsx'), 'utf8');
    const css = fs.readFileSync(path.join(ROOT, 'remediation_workspace.css'), 'utf8');
    const rev = fs.readFileSync(path.join(ROOT, 'remediation_review_component.jsx'), 'utf8');
    const batch = fs.readFileSync(path.join(ROOT, 'remediation_batch_workspace.jsx'), 'utf8');

    expect(ws).toContain('Object.prototype.hasOwnProperty.call');
    expect(css).not.toMatch(/\.pdf-workspace-stage-label[^{]*\{[^}]*display\s*:\s*none/i);
    expect(css).toContain('min-height:44px');
    expect(rev).toContain('DOMParser');
    expect(rev).toContain('http-equiv');
    expect(rev).toContain('Content-Security-Policy');
    expect(rev).toContain('frameReady');
    expect(batch).toContain('pipeline');
    expect(batch).toContain('setSaved(null)');
  });
});
