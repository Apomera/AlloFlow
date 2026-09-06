import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

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
      expect(oneClick).toMatch(/if \(!_oneClickDocumentIsCurrent\(\)\) return;\s*_settleVisibleAuditRun\(_visibleRun, _audit/);
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
