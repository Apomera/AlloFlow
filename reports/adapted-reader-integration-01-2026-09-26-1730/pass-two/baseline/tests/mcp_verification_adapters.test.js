import { describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import Module from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { sanitizeRemediationReport as sanitize } from '../services/alloflow-remote-mcp/src/remediation-report.ts';
const require = createRequire(import.meta.url);
const V = require('../desktop/mcp/remediation_verification.cjs');
const E = require('../desktop/mcp/remediation_epub_validation.cjs');

const counts = { failedRules: 0, failedChecks: 0, passedRules: 106, passedChecks: 800 };
const cli = (changes = {}) => ({ report: { jobs: [{ validationResult: [{ compliant: true, details: { ...counts }, ...changes }] }] } });
describe('independent validator report boundaries', () => {
  it('accepts an executed pass and preserves a completed noncompliant exit 1', () => {
    expect(V.parsePdfUaCliReport(cli(), 0).counts).toEqual(counts);
    expect(V.parsePdfUaCliReport(cli({ compliant: false, details: { ...counts, failedRules: 2, failedChecks: 3 } }), 1).counts.failedChecks).toBe(3);
  });
  it.each([
    ['missing counts', { details: {} }, 0],
    ['unknown count', { details: { ...counts, failedChecks: null } }, 0],
    ['negative count', { details: { ...counts, failedChecks: -1 } }, 0],
    ['fractional count', { details: { ...counts, passedChecks: 0.2 } }, 0],
    ['no rules executed', { details: { ...counts, passedRules: 0 } }, 0],
    ['no checks executed', { details: { ...counts, passedChecks: 0 } }, 0],
    ['contradictory compliance', { details: { ...counts, failedRules: 1, failedChecks: 1 } }, 0],
    ['contradictory failure', { compliant: false }, 0],
    ['failed process claiming pass', {}, 1],
    ['abnormal job', { jobEndStatus: 'exception' }, 0],
    ['wrong profile', { profileName: 'PDF/A-1B validation profile' }, 0],
    ['failure hidden in summaries', { details: { ...counts, ruleSummaries: [{ ruleStatus: 'FAILED' }] } }, 0],
  ])('rejects %s', (_label, changes, exit) => expect(() => V.parsePdfUaCliReport(cli(changes), exit)).toThrow());
  it('the CLI driver rejects malformed evidence before it reaches final delivery', async () => {
    const { EventEmitter } = require('node:events');
    const driver = require('../desktop/mcp/remediation_headless_driver.cjs').createDriver({
      log() {},
      spawnProcess() {
        const child = new EventEmitter(); child.stdout = new EventEmitter(); child.kill = () => true;
        process.nextTick(() => {
          child.stdout.emit('data', JSON.stringify(cli({ details: {} })));
          child.emit('close', 0);
        });
        return child;
      },
    });
    try {
      await expect(driver.validatePdfUaCli({ filePath: resolve('test-assets/multi-column-sample.pdf'), timeoutMs: 1000 })).rejects.toThrow(/incomplete or contradictory/i);
    } finally { await driver.close(); }
  });
  it('rejects extra jobs or validation profiles', () => {
    const extra = cli(); extra.report.jobs.push(extra.report.jobs[0]);
    expect(() => V.parsePdfUaCliReport(extra, 0)).toThrow();
    const profiles = cli(); profiles.report.jobs[0].validationResult.push(profiles.report.jobs[0].validationResult[0]);
    expect(() => V.parsePdfUaCliReport(profiles, 0)).toThrow();
  });
  const ace = assertions => ({ '@type': 'earl:report', 'earl:result': { 'earl:outcome': 'pass' }, assertions });
  it.each([[{}], [null], [{ '@type': 'earl:assertion', assertions: {} }]])('rejects empty or malformed Ace execution %j', assertions => {
    expect(() => E.parseAce(ace(assertions))).toThrow();
  });
  it('keeps nested Ace findings and rejects contradictory EPUBCheck severity counts', () => {
    const assertion = outcome => ({ '@type': 'earl:assertion', 'earl:result': { 'earl:outcome': outcome } });
    expect(E.parseAce(ace([{ '@type': 'earl:assertion', assertions: [assertion('pass'), assertion('fail')] }]))).toMatchObject({ status: 'failed', assertions: 2, failures: 1 });
    expect(() => E.parseEpubcheck({ checker: { nError: 0, nFatal: 0, nWarning: 0 }, messages: [{ severity: 'ERROR' }] })).toThrow();
    expect(E.parseEpubcheck({ checker: { nError: 1, nFatal: 0, nWarning: 0 }, messages: [{ severity: 'ERROR' }] }).status).toBe('failed');
  });
});

function compile(file, source) {
  const m = new Module(file);
  m.filename = file; m.paths = Module._nodeModulePaths(dirname(file));
  m._compile(source, file); return m.exports;
}
const runnerFile = resolve('services/alloflow-remote-mcp/runner/server.cjs');
const runner = compile(runnerFile, readFileSync(runnerFile, 'utf8') + '\nmodule.exports.review = { buildReport, remediationQuality };').review;

const artifact = { size: 1024, sha256: 'a'.repeat(64) };
const options = { targetScore: 95, fixPasses: 2, effortProfile: 'standard', ocrLanguage: '', polishPasses: 0, taggedPdf: true, autoContinue: false, autoContinueRounds: 0, validateUa: false, maxRunMinutes: 20 };
const source = { activeContentScanVerified: true, activeContentDetected: false, verdict: { level: 'ready' }, verificationState: 'complete', verificationHtmlBound: true, taggedPdfDelivery: { ok: true, code: 'verified' }, taggedPdfExportMode: 'original_layout', remainingAxeViolations: 0, remainingEqualAccessFailures: 0, auditCoverage: { configuredAuditorCap: 5, requestedAuditors: 3, completedAuditors: 3, sliced: false }, beforeScore: 40, afterScore: 100, integrityCoverage: 100 };
const expected = { jobId: 'test-report', resultSizeBytes: artifact.size, resultSha256: artifact.sha256, ...options, autoContinueRoundsRun: 0, beforeScore: 40, afterScore: 100 };
const good = changes => ({ status: 'compliant', validator: 'veraPDF', profile: 'ua1', validatorVersion: '1.30.2', ...counts, inputSha256: artifact.sha256, inputBytes: artifact.size, validatedAt: '2026-09-07T00:00:00.000Z', validationDurationMs: 100, ...changes });
const reportFor = (evidence, result = source) => runner.buildReport({ jobId: expected.jobId, options }, { size: 500 }, result, artifact, runner.remediationQuality(result), evidence);

describe('remote report producer to public consumer', () => {
  it('retains exact-byte provenance and ready status for an executed PDF/UA pass', () => {
    const result = sanitize(reportFor(good()), expected);
    expect(result.pdfUaValidation).toEqual(good());
    expect(result.summary).toMatchObject({ taggedPdfDelivery: 'verified', reviewRequired: false, distributionLevel: 'ready', deliveryStatus: 'complete-for-tested-scope', htmlVerificationState: 'complete' });
  });
  it.each([
    good({ status: 'noncompliant', failedRules: 2, failedChecks: 3 }),
    { status: 'unavailable', reason: 'validator_timeout' },
    { status: 'unavailable', reason: 'attempt_finalization_reserve' },
    { status: 'not_run', reason: 'independent_validator_not_packaged' },
  ])('keeps artifacts review-required for $status $reason', evidence => {
    const result = sanitize(reportFor(evidence), expected);
    expect(result.pdfUaValidation).toEqual(evidence);
    expect(result.summary).toMatchObject({ taggedPdfDelivery: 'review-required', reviewRequired: true, distributionLevel: 'review', verificationState: 'review-required', htmlVerificationState: 'complete' });
  });
  it.each([
    { inputSha256: 'b'.repeat(64) }, { inputBytes: 1025 }, { profile: 'ua2' },
    { validatedAt: undefined }, { validationDurationMs: -1 }, { failedChecks: 1 },
    { passedRules: 0, passedChecks: 0 }, { failedRules: undefined },
  ])('withholds a remote pass for malformed or stale validation %j', changes => {
    const report = reportFor(good(changes));
    expect(report.pdfUaValidation).toEqual({ status: 'unavailable', reason: 'validator_error' });
    expect(sanitize(report, expected).summary.reviewRequired).toBe(true);
    expect(() => sanitize({ ...report, pdfUaValidation: good(changes) }, expected)).toThrow();
  });
  it.each(['compliant', 'noncompliant'])('keeps historical unbound %s reports readable without trusting the verdict', status => {
    const evidence = good(status === 'noncompliant' ? { status, failedRules: 2, failedChecks: 3 } : {});
    for (const key of ['inputSha256', 'inputBytes', 'validatedAt', 'validationDurationMs']) delete evidence[key];
    const report = reportFor(good());
    report.pdfUaValidation = evidence;
    const result = sanitize(report, expected);
    expect(result.pdfUaValidation).toEqual({ status: 'unavailable', reason: 'validator_evidence_unbound' });
    expect(result.summary).toMatchObject({ reviewRequired: true, taggedPdfDelivery: 'review-required', htmlVerificationState: 'complete' });
    expect(reportFor(evidence).pdfUaValidation).toEqual({ status: 'unavailable', reason: 'validator_error' });
  });
  it('downgrades legacy headlines independently at the public boundary', () => {
    const report = reportFor({ status: 'not_run', reason: 'disabled_for_institution_pilot' });
    report.summary.distributionLevel = 'ready'; report.summary.verificationState = 'complete'; report.summary.taggedPdfDelivery = 'verified';
    expect(sanitize(report, expected).summary).toMatchObject({ distributionLevel: 'review', taggedPdfDelivery: 'review-required', reviewRequired: true });
  });
});

describe('bounded rejection evidence across report publication', () => {
  const event = { pass: 2, chunkId: '1.0', phase: 'half', reason: 'text-shrink' };
  const canary = 'PRIVATE-DOCUMENT-TEXT';
  it('preserves aggregate counts and safe records through remote producer and public retrieval', () => {
    const input = { ...source, candidateRejectionCount: 175, candidateRejections: Array.from({ length: 175 }, () => ({ ...event, sourceText: canary, candidateHtml: canary })) };
    const report = reportFor(good(), input);
    const publicReport = sanitize(report, expected);
    expect(publicReport.summary.candidateRejectionCount).toBe(175);
    expect(publicReport.summary.candidateRejections).toEqual(Array.from({ length: 100 }, () => event));
    expect(publicReport.summary.candidateRejections).toEqual(report.summary.candidateRejections);
    expect(JSON.stringify(publicReport)).not.toContain(canary);
    expect(sanitize(publicReport, expected)).toEqual(publicReport);
  });
  it('bounds malformed telemetry independently at the public boundary without carrying text', () => {
    const report = reportFor(good());
    report.summary.candidateRejectionCount = Number.MAX_SAFE_INTEGER;
    report.summary.candidateRejections = [
      null, { ...event, chunkId: canary }, { ...event, phase: canary }, { ...event, reason: canary },
      { ...event, pass: -1, candidateHtml: canary },
      ...Array.from({ length: 200 }, () => ({ ...event, details: { source: canary } })),
    ];
    const result = sanitize(report, expected);
    expect(result.summary.candidateRejectionCount).toBe(1000000);
    expect(result.summary.candidateRejections.length).toBe(96);
    expect(result.summary.candidateRejections[0]).toEqual({ chunkId: event.chunkId, phase: event.phase, reason: event.reason });
    expect(JSON.stringify(result)).not.toContain(canary);
    expect(JSON.stringify(result.summary.candidateRejections).length).toBeLessThan(12000);
  });
  it('defaults historical telemetry and never reports fewer rejections than retained records', () => {
    expect(V.normalizeCandidateRejectionEvidence({})).toEqual({ candidateRejectionCount: 0, candidateRejections: [] });
    expect(V.normalizeCandidateRejectionEvidence({ candidateRejectionCount: NaN, candidateRejections: [event] })).toEqual({ candidateRejectionCount: 1, candidateRejections: [event] });
    const report = reportFor(good());
    delete report.summary.candidateRejectionCount; delete report.summary.candidateRejections;
    expect(sanitize(report, expected).summary).toMatchObject({ candidateRejectionCount: 0, candidateRejections: [] });
  });
});
