// Post-save delivery policy: content coverage can downgrade roundTrip.ok, and
// every automatic/normal delivery path must require affirmative saved-byte
// verification. Missing, null, thrown, or failed validators route to an
// explicitly marked unverified choice instead of silently shipping as verified.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const viewSrc = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

const covStatus = (coverage) => (coverage < 0.95 ? 'fail' : (coverage < 0.99 ? 'warn' : 'pass'));
const roundTripOk = (structuralOk, coverage) => {
  let ok = structuralOk;
  if (covStatus(coverage) === 'fail') ok = false;
  return ok;
};

function extractPolicyHelpers(src, endMarker) {
  const start = src.indexOf('function _alloTaggedPdfDeliveryVerdict(result)');
  const end = src.indexOf(endMarker, start);
  if (start < 0 || end < 0) throw new Error('delivery policy helpers not found');
  return new Function(src.slice(start, end) + '\nreturn { verdict: _alloTaggedPdfDeliveryVerdict, executable: _alloExecutableActiveContentFindings };')();
}

const pipePolicy = extractPolicyHelpers(pipeSrc, 'function _alloDeriveVerificationState');
const viewPolicy = extractPolicyHelpers(viewSrc, 'function _ensureDocxLib');
const policies = [pipePolicy, viewPolicy];

const passingResult = () => ({
  roundTrip: { ok: true, checks: [], warnings: [] },
  postExportValidator: { summary: { overall: 'PASS', pass: 17, fail: 0 }, checks: [] },
});

describe('round-trip text coverage feeds the gate', () => {
  it('a >5% word-loss downgrades ok to false', () => {
    expect(roundTripOk(true, 0.90)).toBe(false);
    expect(roundTripOk(true, 0.80)).toBe(false);
  });
  it('a 95-99% coverage remains a warning', () => {
    expect(roundTripOk(true, 0.97)).toBe(true);
    expect(roundTripOk(true, 0.95)).toBe(true);
  });
  it('full coverage and clean structure stays ok', () => {
    expect(roundTripOk(true, 1.0)).toBe(true);
  });
  it('a prior structural failure is never resurrected by good coverage', () => {
    expect(roundTripOk(false, 1.0)).toBe(false);
  });
  it('keeps the coverage failure coupled to roundTrip.ok', () => {
    expect(pipeSrc).toContain("const _covStatus = _coverage < 0.95 ? 'fail' : 'warn';");
    expect(pipeSrc).toContain("if (_covStatus === 'fail') _roundTrip.ok = false;");
  });
});

describe('tagged-PDF verified-delivery policy', () => {
  it('requires an affirmative round-trip result', () => {
    for (const policy of policies) {
      expect(policy.verdict(null)).toMatchObject({ ok: false, code: 'roundtrip-unavailable' });
      expect(policy.verdict({ roundTrip: { ok: null, checks: [], warnings: [] } })).toMatchObject({ ok: false, code: 'roundtrip-unavailable' });
      expect(policy.verdict({ roundTrip: { ok: false, checks: [{ status: 'fail', rule: 'StructTreeRoot survived save' }] } })).toMatchObject({ ok: false, code: 'roundtrip-failed' });
    }
  });

  it('requires the byte-level validator to run and pass', () => {
    for (const policy of policies) {
      expect(policy.verdict({ roundTrip: { ok: true } })).toMatchObject({ ok: false, code: 'validator-unavailable' });
      expect(policy.verdict({ roundTrip: { ok: true }, postExportValidator: { error: 'module threw' } })).toMatchObject({ ok: false, code: 'validator-error' });
      const failed = policy.verdict({ roundTrip: { ok: true }, postExportValidator: { summary: { overall: 'FAIL' }, checks: [{ status: 'fail', rule: 'Every Figure has /Alt' }] } });
      expect(failed).toMatchObject({ ok: false, code: 'validator-failed' });
      expect(failed.reason).toContain('Every Figure has /Alt');
    }
  });

  it('passes only when both saved-byte checks affirmatively pass', () => {
    for (const policy of policies) expect(policy.verdict(passingResult())).toEqual({ ok: true, code: 'verified', reason: '' });
  });

  it('classifies executable actions separately from attachments and links', () => {
    const input = { activeContent: { findings: [
      { type: 'javascript' }, { type: 'open-action' }, { type: 'launch' }, { type: 'additional-actions' },
      { type: 'embedded-files' }, { type: 'external-links' },
    ] } };
    for (const policy of policies) {
      expect(policy.executable(input).map((f) => f.type)).toEqual(['javascript', 'open-action', 'launch', 'additional-actions']);
    }
  });

  it('anti-drift: batch and view consumers call the canonical verdict', () => {
    expect(pipeSrc).toContain('const _tsVerdict = _alloTaggedPdfDeliveryVerdict(_ts);');
    expect(pipeSrc).toContain('const _taggedVerdict = _alloTaggedPdfDeliveryVerdict(tagged);');
    expect(viewSrc).toContain('const _typesetVerdict = _alloTaggedPdfDeliveryVerdict(_result);');
    expect(viewSrc).toContain('const _deliveryVerdict = _alloTaggedPdfDeliveryVerdict(_result);');
    expect(pipeSrc).not.toContain('if (rt && rt.ok === false)');
    expect(viewSrc).not.toContain('if (roundTrip && roundTrip.ok === false)');
  });

  it('anti-drift: executable sources default to a clean rebuild with an advanced override', () => {
    expect(pipeSrc).toContain('const _execFindings = _alloExecutableActiveContentFindings(f.result);');
    expect(pipeSrc).toContain('executable source actions removed');
    expect(viewSrc).toContain('Clean tagged PDF (recommended)');
    expect(viewSrc).toContain('Preserve source actions (advanced)');
    expect(viewSrc).toContain("await _runTypesetExport({ sanitized: true });");
  });
});