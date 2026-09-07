import { afterEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import React from '../desktop/web-app/node_modules/react/index.js';
import { createRoot } from '../desktop/web-app/node_modules/react-dom/client.js';
import { act } from '../desktop/web-app/node_modules/react-dom/test-utils.js';

// Field report 2026-09-06 (Gemini Canvas, one-click "Make Accessible"): the audit finished but
// the modal stayed on "Checking your document…" and never advanced. Reproduced in Chromium
// against the real pipeline: the AI audit publishes a scored result, then the deterministic
// baseline awaits an axe-core <script> that never loads and never errors, so
// runPdfAccessibilityAudit never resolves and pdfAuditLoading is never cleared. Two guards:
// the pipeline bounds that window, and the modal releases its own flag when its run returns.
const pipeline = readFileSync(resolve(process.cwd(), 'doc_pipeline_module.js'), 'utf8');
const pipelineSource = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_module.js'), 'utf8');
const viewSource = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

function between(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  expect(from, 'start anchor: ' + start).toBeGreaterThanOrEqual(0);
  expect(to, 'end anchor: ' + end).toBeGreaterThan(from);
  return source.slice(from, to);
}

describe('PDF audit pipeline: a stalled engine cannot strand the loading modal', () => {
  it('bounds the whole baseline window between the first publish and _finishAuditUi', () => {
    for (const src of [pipeline, pipelineSource]) {
      const window = between(
        src,
        '_publishAuditUi(() => setPdfAuditResult(triangulated));',
        '_publishAuditUi(() => setPdfAuditResult({ ...triangulated }));',
      );
      expect(window).toContain('await _withTimeout((async () => {');
      expect(window).toContain("_AUDIT_BASELINE_BUDGET_MS, 'deterministic baseline audit')");
      // A baseline that finishes after the budget must not touch the object the caller
      // already holds — it may be mid-remediation by then.
      expect(window.match(/if \(_baselineAbandoned\) return;/g)).toHaveLength(2);
      expect(window).toContain('_baselineAbandoned = true;');
      // The budget is generous (large documents extract slowly) but finite.
      const budget = Number((window.match(/_AUDIT_BASELINE_BUDGET_MS = (\d+);/) || [])[1]);
      expect(budget).toBeGreaterThanOrEqual(60000);
      expect(budget).toBeLessThanOrEqual(300000);
    }
  });

  it('gives both axe-core script loads the deadline the "tag already present" branch always had', () => {
    for (const src of [pipeline, pipelineSource]) {
      const loader = between(src, 'const runAxeAudit = async (htmlContent) => {', '// Shorter settle delay when inlined');
      expect(loader).toContain('axe-core load timeout after 20s');
      expect(loader).toContain('axe-core iframe injection timeout after 20s');
      // Every onload clears its deadline. A bare resolve() is the shape that hung.
      expect(loader).not.toMatch(/onload = \(\) => resolve\(\);/);
      // A tag left behind by a timed-out load would make the next call wait on the corpse.
      expect(loader).toContain('if (_pendingScript) _pendingScript.remove();');
    }
  });

  it('remembers a CDN chain that just failed instead of re-polling every mirror on every call', () => {
    for (const src of [pipeline, pipelineSource]) {
      const loader = between(src, 'const _loadCdnScript = (label, urls, isReady, opts) => {', 'const ensurePdfLibLoaded = async () => {');
      expect(loader).toContain('window.__alloflowCdnDown[label] = Date.now();');
      expect(loader).toContain('Date.now() - _downAt < 45000) return Promise.resolve(false);');
      expect(loader).not.toContain('__alloflowCdnDown[label] = true');
    }
  });
});

describe('PDF audit modal releases its own loading flag when its run returns', () => {
  it('settles after every visible run: Make Accessible, Run Audit, Retry Audit', () => {
    for (const src of [view, viewSource]) {
      expect(src.match(/const _visibleRun = _beginVisibleAuditRun\(/g)).toHaveLength(3);
      expect(src).toMatch(/_settleVisibleAuditRun\(_visibleRun, _audit, ["']ONE-CLICK["']\)/);
      expect(src).toMatch(/_settleVisibleAuditRun\(_visibleRun, _result, ["']START["']\)/);
      expect(src).toMatch(/_settleVisibleAuditRun\(_visibleRun, _result, ["']RETRY["']\)/);
      // One-click settles only for a still-current document, and before the remediation gate
      // so a failed audit renders "Audit Unavailable" instead of a spinner.
      const oneClick = between(src, 'ONE-CLICK started', '_viewAuditCanStartRemediation(_audit)');
      expect(oneClick).toMatch(/if \(_oneClickDropped\(["']audit result["']\)\) return;\s*_settleVisibleAuditRun\(_visibleRun, _audit/);
    }
  });

  it('behaves: a superseded run leaves the flag alone; a current run clears it and never clobbers a published audit', () => {
    const helper = between(view, 'const _visibleAuditRunSeqRef = useRef(0);', 'const _remediationDependencies =');
    const make = (initialResult = null) => {
      const calls = [];
      const state = { loading: false, result: initialResult };
      const factory = new Function(
        'useRef', 'setPdfAuditLoading', 'setPdfAuditResult', '_auditGateLog', '_viewAuditFallbackResult', 'pendingPdfFile',
        helper + '\nreturn { begin: _beginVisibleAuditRun, settle: _settleVisibleAuditRun };',
      );
      const api = factory(
        (v) => ({ current: v }),
        (v) => { calls.push(['loading', v]); state.loading = v; },
        (v) => { const next = typeof v === 'function' ? v(state.result) : v; calls.push(['result', next]); state.result = next; },
        () => {},
        (snapshot, file) => snapshot || { _choosing: true, fileName: file && file.name },
        { name: 'x.pdf' },
      );
      return { api, state, calls };
    };

    // The pipeline's publish never reached this host (the field case): the modal installs the
    // audit it was handed and releases the flag itself.
    {
      const { api, state } = make();
      const seq = api.begin('start', {});
      expect(state.loading).toBe(true);
      expect(state.result._choosing).toBe(true);
      const audit = { score: 62, documentDigest: 'd1', _auditFinalized: true };
      expect(api.settle(seq, audit, 'START')).toBe(true);
      expect(state.loading).toBe(false);
      expect(state.result).toBe(audit);
    }
    // The pipeline already published (its copy carries the baseline engines): kept as-is.
    {
      const { api, state } = make();
      const seq = api.begin('start', {});
      const published = { score: 62, documentDigest: 'd1', _auditFinalized: true, _baselineAxeAudit: {} };
      state.result = published;
      expect(api.settle(seq, { score: 62, documentDigest: 'd1', _auditFinalized: true }, 'START')).toBe(true);
      expect(state.result).toBe(published);
      expect(state.loading).toBe(false);
    }
    // A newer visible run began after this one: the flag belongs to that run now.
    {
      const { api, state, calls } = make();
      const first = api.begin('start', {});
      api.begin('start again', {});
      const before = calls.length;
      expect(api.settle(first, { score: 10 }, 'START')).toBe(false);
      expect(calls.length).toBe(before);
      expect(state.loading).toBe(true);
    }
    // Retry after a failed audit: the failure stays on screen through the run (it is the
    // fallback owner), and the good result replaces it even if the pipeline could not publish.
    {
      const { api, state } = make({ score: -1, summary: 'failed' });
      const seq = api.begin('retry', {});
      expect(state.result.score).toBe(-1);
      const good = { score: 80 };
      api.settle(seq, good, 'RETRY');
      expect(state.result).toBe(good);
      expect(state.loading).toBe(false);
    }
    // A failed audit is installed too, so "Audit Unavailable" can render with the spinner gone.
    {
      const { api, state } = make();
      const seq = api.begin('start', {});
      const failed = { score: -1 };
      api.settle(seq, failed, 'START');
      expect(state.loading).toBe(false);
      expect(state.result).toBe(failed);
    }
  });
});

describe('PDF audit names its current step while the spinner is up', () => {
  it('publishes a stage at every step of the run and clears it on finish', () => {
    for (const src of [pipeline, pipelineSource]) {
      const run = between(src, 'const runPdfAccessibilityAudit = async (base64Data, options) => {', '// ── PDF Batch Remediation Pipeline ──');
      expect(run).toContain("window.dispatchEvent(new CustomEvent('alloflow:audit-progress', { detail }));");
      // prepare, structure, slices, auditors, retry, escalate, baseline-text, baseline, finalize.
      expect(run.match(/_publishAuditStage\(/g).length).toBeGreaterThanOrEqual(9);
      for (const stage of ['prepare', 'structure', 'slices', 'auditors', 'retry', 'escalate', 'baseline-text', 'baseline', 'finalize']) {
        expect(run, stage).toContain("_publishAuditStage('" + stage + "'");
      }
      // Only a run that still owns the UI may publish, and the finished run leaves nothing behind
      // for the next modal to hydrate from.
      expect(run).toContain('const _publishAuditStage = (stage, label, extra) => _publishAuditUi(() => {');
      const finish = between(run, 'const _finishAuditUi = () => {', 'const _auditCancelled = () => ');
      expect(finish).toContain('window.__alloAuditStage = null;');
    }
  });

  it('fails a blocked CDN mirror over on its error event instead of polling out the timeout', () => {
    for (const src of [pipeline, pipelineSource]) {
      const loader = between(src, 'const _loadCdnScript = (label, urls, isReady, opts) => {', 'const ensurePdfLibLoaded = async () => {');
      expect(loader).toContain('s.onerror = () => resolve(false);');
      expect(loader).toContain('await Promise.race([_waitForGlobal(isReady, timeout), _scriptFailed])');
    }
  });

  it('renders the stage under the spinner, keyed for translators, with the ticking clock hidden from the live region', () => {
    for (const src of [view, viewSource]) {
      const stageBlock = between(src, 'const [auditStage, setAuditStage] = useState(null);', 'const _auditStageLine = () => {');
      expect(stageBlock).toMatch(/window\.addEventListener\(["']alloflow:audit-progress["'], onStage\)/);
      expect(stageBlock).toMatch(/window\.removeEventListener\(["']alloflow:audit-progress["'], onStage\)/);
      expect(stageBlock).toContain('setAuditStage(null)');
      for (const key of ['stage_prepare', 'stage_structure', 'stage_slices', 'stage_retry', 'stage_escalate', 'stage_baseline_text', 'stage_baseline', 'stage_finalize']) {
        expect(stageBlock, key).toMatch(new RegExp("t\\(['\"]pdf_audit\\.loading\\." + key + "['\"]\\)"));
      }
      const line = between(src, 'const _auditStageLine = () => {', 'if (!pdfAuditResult || !pdfAuditResult._choosing || pdfAuditResult.pageCount > 0) return;');
      expect(line).toContain('data-audit-stage');
      expect(line).toMatch(/aria-hidden/);
      // Wired into the loading branch, right under the elapsed counter (the progressbar follows).
      const loadingBranch = between(src, 'pdf_audit.loading.safe_to_wait', 'pdf_audit.loading.progress_aria');
      expect(loadingBranch).toContain('_auditStageLine()');
      // "nothing is stuck" is now conditional on progress, and a stalled step names the way out.
      expect(loadingBranch).toContain('data-audit-stalled');
      expect(src).toMatch(/_stall \? (null|'') : /);
      expect(src).toContain('const _AUDIT_STALL_AFTER_SEC = 180;');
    }
  });

  it('logs every one-click drop instead of returning silently, like Run Audit always did', () => {
    for (const src of [view, viewSource]) {
      expect(src.match(/_oneClickDropped\(['"]/g).length).toBeGreaterThanOrEqual(6);
      expect(src).toMatch(/one-click ['"] \+ where \+ ['"] DROPPED/);
      const auditPhase = between(src, 'ONE-CLICK started', 'const _HANDSOFF_MAX');
      expect(auditPhase).not.toContain('if (!_oneClickDocumentIsCurrent()) return;');
    }
  });

  describe('behaves', () => {
    const roots = [];
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    afterEach(() => {
      for (const root of roots.splice(0)) act(() => root.unmount());
      document.body.innerHTML = '';
      delete window.__alloAuditStage;
    });
    const stageSlice = (() => {
      const start = view.indexOf('const [auditStage, setAuditStage] = useState(null);');
      const end = view.indexOf('if (!pdfAuditResult || !pdfAuditResult._choosing || pdfAuditResult.pageCount > 0) return;', start);
      let slice = view.slice(start, end);
      slice = slice.slice(0, slice.lastIndexOf('useEffect(() => {'));
      return slice;
    })();
    const body = new Function('React', 'useState', 'useEffect', 't', 'pdfAuditLoading', 'pdfDocumentEpoch', stageSlice + '\nreturn _auditStageLine();');
    const t = () => '';
    function Probe(props) { return body(React, React.useState, React.useEffect, t, props.pdfAuditLoading, props.pdfDocumentEpoch); }
    const mount = (props) => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);
      roots.push(root);
      act(() => root.render(React.createElement(Probe, props)));
      return { container, root };
    };
    const emit = (detail) => act(() => { window.dispatchEvent(new CustomEvent('alloflow:audit-progress', { detail })); });
    const line = (c) => c.querySelector('[data-audit-stage]');

    it('shows the pipeline label for this document and ignores another document\'s events', () => {
      const { container } = mount({ pdfAuditLoading: true, pdfDocumentEpoch: 3 });
      expect(line(container)).toBeNull();
      emit({ stage: 'structure', label: 'Reading the PDF structure…', documentEpoch: 3, at: Date.now() });
      expect(line(container).getAttribute('data-audit-stage')).toBe('structure');
      expect(line(container).textContent).toContain('Reading the PDF structure');
      emit({ stage: 'finalize', label: 'Someone else', documentEpoch: 4, at: Date.now() });
      expect(line(container).getAttribute('data-audit-stage')).toBe('structure');
      // An older pipeline that stamps no epoch is still accepted.
      emit({ stage: 'baseline', label: 'Running the automated rule scans…', at: Date.now() });
      expect(line(container).getAttribute('data-audit-stage')).toBe('baseline');
    });

    it('counts the review passes as they return and hides the per-step clock from screen readers', () => {
      const { container } = mount({ pdfAuditLoading: true, pdfDocumentEpoch: 1 });
      emit({ stage: 'auditors', label: 'x', documentEpoch: 1, done: 2, total: 3, at: Date.now() - 12000 });
      const el = line(container);
      expect(el.textContent).toContain('AI review passes: 2 of 3 back');
      const clock = el.querySelector('[aria-hidden="true"]');
      expect(clock).not.toBeNull();
      expect(clock.textContent).toMatch(/1[12]s on this step/);
    });

    it('calls a step stalled after three minutes without progress, or ten minutes with no step at all', () => {
      const stallBody = new Function('React', 'useState', 'useEffect', 't', 'pdfAuditLoading', 'pdfDocumentEpoch', 'auditElapsedSec', stageSlice + '\nreturn _auditStall();');
      function StallProbe(props) {
        const r = stallBody(React, React.useState, React.useEffect, t, props.pdfAuditLoading, props.pdfDocumentEpoch, props.auditElapsedSec || 0);
        return React.createElement('span', { 'data-stall': r ? String(r.minutes) : 'none' });
      }
      const container = document.createElement('div');
      document.body.appendChild(container);
      const root = createRoot(container);
      roots.push(root);
      const read = () => container.querySelector('[data-stall]').getAttribute('data-stall');
      act(() => root.render(React.createElement(StallProbe, { pdfAuditLoading: true, pdfDocumentEpoch: 1, auditElapsedSec: 30 })));
      expect(read()).toBe('none');
      emit({ stage: 'auditors', label: 'x', documentEpoch: 1, done: 0, total: 3, at: Date.now() - 200000 });
      expect(read()).toBe('3');
      emit({ stage: 'auditors', label: 'x', documentEpoch: 1, done: 1, total: 3, at: Date.now() });
      expect(read()).toBe('none');
      // An older pipeline publishes no stages: fall back to the plain elapsed clock.
      act(() => root.render(React.createElement(StallProbe, { pdfAuditLoading: true, pdfDocumentEpoch: 2, auditElapsedSec: 700 })));
      expect(read()).toBe('11');
      act(() => root.render(React.createElement(StallProbe, { pdfAuditLoading: false, pdfDocumentEpoch: 2, auditElapsedSec: 700 })));
      expect(read()).toBe('none');
    });

    it('hydrates from the last published stage on mount and clears when loading ends', () => {
      window.__alloAuditStage = { stage: 'prepare', label: 'Preparing the document…', documentEpoch: 7, at: Date.now() };
      const { container, root } = mount({ pdfAuditLoading: true, pdfDocumentEpoch: 7 });
      expect(line(container).getAttribute('data-audit-stage')).toBe('prepare');
      act(() => root.render(React.createElement(Probe, { pdfAuditLoading: false, pdfDocumentEpoch: 7 })));
      expect(line(container)).toBeNull();
    });
  });
});
