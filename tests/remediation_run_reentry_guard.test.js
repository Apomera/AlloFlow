import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();
const viewSource = readFileSync(resolve(root, 'view_pdf_audit_source.jsx'), 'utf8');
const pipelineSource = readFileSync(resolve(root, 'doc_pipeline_source.jsx'), 'utf8');

function extractPipelineGuardFactory() {
  const start = pipelineSource.indexOf('var _activeSingleFixPromise = null;');
  const end = pipelineSource.indexOf('  return {', start);
  if (start < 0 || end < 0) throw new Error('Could not locate the remediation guard wrapper');
  const body = pipelineSource.slice(start, end);
  return new Function('window', 'warnLog', 'addToast', '_bindState', `${body}\nreturn _wrapFixAndVerify;`);
}

function createGuardHarness(run) {
  const windowLike = { __alloPdfRunGen: 0 };
  const warnings = [];
  const toasts = [];
  const factory = extractPipelineGuardFactory();
  const wrap = factory(
    windowLike,
    (message) => warnings.push(String(message)),
    (message, kind) => toasts.push({ message, kind }),
    () => {},
  );
  return {
    guarded: wrap(run.bind(null, windowLike)),
    windowLike,
    warnings,
    toasts,
  };
}

describe('one-click remediation re-entry guard', () => {
  it('locks the whole UI operation before its first await and always releases in finally', () => {
    const stateIndex = viewSource.indexOf('const _oneClickRemediationBusyRef = useRef(false);');
    const handlerIndex = viewSource.indexOf('data-help-key="pdf_audit_view_make_accessible_btn"');
    const claimIndex = viewSource.indexOf('_oneClickRemediationBusyRef.current = true;', handlerIndex);
    const firstAwaitIndex = viewSource.indexOf('await runPdfAccessibilityAudit(', handlerIndex);
    const releaseIndex = viewSource.indexOf('_oneClickRemediationBusyRef.current = false;', handlerIndex);

    expect(stateIndex).toBeGreaterThan(0);
    expect(viewSource).toContain('disabled={_oneClickOperationBusy || remediationReady === false}');
    expect(viewSource).toContain("aria-busy={_oneClickOperationBusy ? 'true' : undefined}");
    expect(claimIndex).toBeGreaterThan(handlerIndex);
    expect(claimIndex).toBeLessThan(firstAwaitIndex);
    expect(releaseIndex).toBeGreaterThan(firstAwaitIndex);
    expect(viewSource.slice(handlerIndex, releaseIndex)).toContain('try {');
    expect(viewSource).toContain('Keep this window open — duplicate starts are disabled');
  });

  it('rejects a concurrent single-file start without launching its worker', async () => {
    let starts = 0;
    let finishFirst;
    const harness = createGuardHarness((windowLike) => {
      starts += 1;
      windowLike.__alloPdfRunGen += 1;
      return new Promise((resolvePromise) => { finishFirst = resolvePromise; });
    });

    const first = harness.guarded({ base64: 'pdf', auditResult: { score: 0 } });
    await expect(harness.guarded({ base64: 'pdf', auditResult: { score: 0 } })).rejects.toMatchObject({
      name: 'RemediationAlreadyRunningError',
      isAlreadyRunning: true,
    });
    expect(starts).toBe(1);
    expect(harness.warnings.some((line) => line.includes('Duplicate single-file start ignored'))).toBe(true);
    expect(harness.toasts).toHaveLength(1);

    finishFirst('first-result');
    await expect(first).resolves.toBe('first-result');
  });

  it('releases a stale lock after watchdog/new-document generation invalidation', async () => {
    let starts = 0;
    const finishes = [];
    const harness = createGuardHarness((windowLike) => {
      starts += 1;
      windowLike.__alloPdfRunGen += 1;
      return new Promise((resolvePromise) => finishes.push(resolvePromise));
    });

    const first = harness.guarded({ base64: 'old', auditResult: { score: 0 } });
    harness.windowLike.__alloPdfRunGen += 1;
    const replacement = harness.guarded({ base64: 'new', auditResult: { score: 0 } });
    expect(starts).toBe(2);
    expect(harness.warnings.some((line) => line.includes('Releasing stale single-file run lock'))).toBe(true);

    finishes[0]('stale-result');
    finishes[1]('replacement-result');
    await expect(first).resolves.toBe('stale-result');
    await expect(replacement).resolves.toBe('replacement-result');
  });

  it('uses explicit progress ownership for batch classification and bypasses the single-file lock', async () => {
    let starts = 0;
    const harness = createGuardHarness((windowLike) => {
      starts += 1;
      return Promise.resolve(`batch-${starts}`);
    });

    await expect(Promise.all([
      harness.guarded({ onProgress: () => {}, batchMode: true }),
      harness.guarded({ onProgress: () => {}, batchMode: true }),
    ])).resolves.toEqual(['batch-1', 'batch-2']);
    expect(pipelineSource).toContain('const _isBatch = _silentMode || !!(batchOverrides && batchOverrides.batchMode === true);');
    expect(pipelineSource).not.toContain('const _isBatch = !!batchOverrides;');
  });

  it('claims the generation before awaiting the document digest and ships the guard in every module copy', () => {
    const fixStart = pipelineSource.indexOf('const fixAndVerifyPdf = async');
    const auditEvidence = pipelineSource.indexOf('const _auditEvidenceFailed = !_auditResult', fixStart);
    const auditGuard = pipelineSource.indexOf('if (_auditEvidenceFailed)', auditEvidence);
    const generationClaim = pipelineSource.indexOf('window.__alloPdfRunGen =', fixStart);
    const digestAwait = pipelineSource.indexOf('await _documentDigest(_base64)', fixStart);

    expect(auditEvidence).toBeGreaterThan(fixStart);
    expect(auditGuard).toBeGreaterThan(fixStart);
    expect(pipelineSource.slice(auditEvidence, auditGuard)).toContain('Number(_auditResult.score) < 0');
    expect(pipelineSource.slice(auditGuard, generationClaim)).toContain('BaselineAuditRequiredError');
    expect(auditGuard).toBeLessThan(generationClaim);
    expect(generationClaim).toBeLessThan(digestAwait);
    expect(pipelineSource).toContain('fixAndVerifyPdf: _wrapFixAndVerify(fixAndVerifyPdf)');

    for (const path of [
      'doc_pipeline_module.js',
      'prismflow-deploy/public/doc_pipeline_module.js',
    ]) {
      const generated = readFileSync(resolve(root, path), 'utf8');
      expect(generated).toContain('RemediationAlreadyRunningError');
      expect(generated).toContain('Duplicate single-file start ignored');
    }
    for (const path of [
      'view_pdf_audit_module.js',
      'prismflow-deploy/public/view_pdf_audit_module.js',
    ]) {
      const generated = readFileSync(resolve(root, path), 'utf8');
      expect(generated).toContain('duplicate starts are disabled');
      expect(generated).toContain('Remediation is already running. This click was ignored');
    }
  });
});
