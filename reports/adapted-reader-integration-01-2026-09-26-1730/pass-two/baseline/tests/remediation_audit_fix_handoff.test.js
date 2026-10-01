import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

const sliceBetween = (startMarker, endMarker, from = 0) => {
  const start = source.indexOf(startMarker, from);
  const end = source.indexOf(endMarker, start);
  if (start < 0 || end <= start) throw new Error(`Could not extract ${startMarker}`);
  return source.slice(start, end);
};

const makeBatchOwnershipHarness = (windowLike) => {
  const epochHelpers = sliceBetween('var _normalizeDocumentEpoch =', 'var _makeRunCtx =');
  const ownershipHelpers = sliceBetween('const _batchHostGeneration =', 'const _batchPublish =');
  return new Function('window', `
    ${epochHelpers}
    let _activeBatchRun = null;
    ${ownershipHelpers}
    return {
      capture: _captureBatchDocumentOwnership,
      activate: (owner) => { _activeBatchRun = owner; },
      isCurrent: _batchOwnerIsCurrent,
      normalize: _normalizeDocumentEpoch,
    };
  `)(windowLike);
};

describe('batch audit-to-remediation ownership handoff', () => {
  it('gives focused remediation a valid batch-owned stamp when the host epoch is not published yet', async () => {
    const windowLike = { __alloPdfBatchGen: 4 };
    const harness = makeBatchOwnershipHarness(windowLike);
    const ownership = harness.capture(1);
    const owner = {
      generation: 1,
      hostGeneration: 4,
      ...ownership,
      invalidated: false,
    };
    harness.activate(owner);

    const phases = [];
    const auditResult = await Promise.resolve().then(() => {
      phases.push('audit');
      return { score: 100, summary: 'Audit completed' };
    });
    const remediationResult = await Promise.resolve().then(() => {
      if (harness.normalize(owner.documentEpoch) === null) {
        const error = new Error('Refusing to start an unstamped remediation run.');
        error.code = 'ALLO_DOCUMENT_EPOCH_REQUIRED';
        throw error;
      }
      phases.push('remediation');
      return { auditResult, started: true };
    });

    expect(ownership).toEqual({ documentEpoch: 1, documentEpochSource: 'batch' });
    expect(harness.isCurrent(owner)).toBe(true);
    expect(remediationResult.started).toBe(true);
    expect(phases).toEqual(['audit', 'remediation']);
  });

  it('keeps a published host epoch authoritative and invalidates it when the document changes', () => {
    const windowLike = { __alloPdfBatchGen: 7, __alloPdfDocumentEpoch: 23 };
    const harness = makeBatchOwnershipHarness(windowLike);
    const ownership = harness.capture(2);
    const owner = {
      generation: 2,
      hostGeneration: 7,
      ...ownership,
      invalidated: false,
    };
    harness.activate(owner);

    expect(ownership).toEqual({ documentEpoch: 23, documentEpochSource: 'host' });
    expect(harness.isCurrent(owner)).toBe(true);
    windowLike.__alloPdfDocumentEpoch = 24;
    expect(harness.isCurrent(owner)).toBe(false);
  });

  it('passes the captured stamp only after a successful audit and classifies a missing stamp as non-retryable', () => {
    const processStart = source.indexOf('const _processOne = async');
    const auditStart = source.indexOf('const auditResult = await _withTimeout(', processStart);
    const fixStart = source.indexOf('const _fixPromise = fixAndVerifyPdf({', auditStart);
    const fixHandoff = source.slice(fixStart, fixStart + 500);
    expect(auditStart).toBeGreaterThan(processStart);
    expect(fixStart).toBeGreaterThan(auditStart);
    expect(fixHandoff).toContain('documentEpoch: owner.documentEpoch');

    const guard = sliceBetween('if (_runDocumentEpoch === null) {', '// Passing an options object', fixStart);
    const runGuard = new Function('_runDocumentEpoch', 'warnLog', `${guard}\nreturn 'remediation-started';`);
    const warnings = [];
    expect(runGuard(3, (message) => warnings.push(message))).toBe('remediation-started');
    expect(() => runGuard(null, (message) => warnings.push(message))).toThrowError(expect.objectContaining({
      name: 'DocumentOwnershipError',
      code: 'ALLO_DOCUMENT_EPOCH_REQUIRED',
      isConfig: true,
      isNonRetryable: true,
    }));
    expect(warnings).toContain('[PDF Fix] Refusing to start an unstamped remediation run.');
  });

  it('publishes the finalized audit object after deterministic baseline updates', () => {
    const auditStart = source.indexOf('const runPdfAccessibilityAudit = async');
    const stamp = source.indexOf('triangulated._auditFinalized = true;', auditStart);
    const finalPublish = source.indexOf('setPdfAuditResult({ ...triangulated })', stamp);
    const finish = source.indexOf('_finishAuditUi();', finalPublish);
    expect(stamp).toBeGreaterThan(auditStart);
    expect(finalPublish).toBeGreaterThan(stamp);
    expect(finish).toBeGreaterThan(finalPublish);
  });
});
