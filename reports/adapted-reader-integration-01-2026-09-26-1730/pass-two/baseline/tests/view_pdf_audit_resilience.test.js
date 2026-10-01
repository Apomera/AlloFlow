// Cross-cutting audit fixes (2026-06-28): resilience + memory leaks in the PDF-audit view.
//  B2: a malformed .alloflow.json (a multiSession range missing its `pages` array) crashed the project
//      load ("Cannot read property of undefined") and stranded the teacher — now guarded + degrades with a toast.
//  C1: the Compare render-fail fallback link created a blob URL (the whole PDF) that was never revoked,
//      leaking one per failed render until page close — now revoked shortly after a click + a backstop timeout.
//  C2: single-item SR-announcement playback revoked the TTS blob only on 'ended'/'error'; an autoplay-blocked
//      play() rejection fired neither, leaking the URL + listeners — now revoked on the rejection + a timeout.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');

describe('B2: multiSession range load guards a malformed pages array', () => {
  it('the sort + lastEnd access no longer dereference range.pages unguarded', () => {
    expect(view).toContain('((a.pages && a.pages[0]) || 0) - ((b.pages && b.pages[0]) || 0)');
    expect(view).toContain('Array.isArray(_lastRange.pages)');
    expect(view).not.toContain('const lastEnd = sortedR[sortedR.length - 1].pages[1];'); // the unguarded access is gone
  });
});

describe('C1 + C2: blob URLs are revoked (no leak)', () => {
  it('C1: the Compare render-fail fallback link revokes its blob URL (click + backstop timeout)', () => {
    expect(view).toContain('var _revokeFailUrl = function () { try { URL.revokeObjectURL(u); } catch (_) {} };');
    expect(view).toContain('setTimeout(_revokeFailUrl, 300000);');
  });
  it('C2: single-item SR playback revokes on a play() rejection + a timeout backstop', () => {
    expect(view).toContain('audio.play().catch(() => { revoke(); });');
    expect(view).toContain('setTimeout(revoke, 120000);');
  });
});

describe('A1: FERPA egress disclosure shows above the audit CTA (audit, 2026-06-28)', () => {
  it('the Make-Accessible box discloses that document content is sent to Google Gemini', () => {
    expect(view).toContain("t('pdf_audit.gemini_disclosure')");
    expect(view).toMatch(/sent to Google Gemini/);
    // it sits inside the gradient CTA box, before the Make-Accessible button (so it's seen first)
    const discIdx = view.indexOf("t('pdf_audit.gemini_disclosure')");
    // The lazy tour catalog also names this help key near the top of the module;
    // the final occurrence is the rendered Make Accessible control.
    const btnIdx = view.lastIndexOf('pdf_audit_view_make_accessible_btn');
    expect(discIdx).toBeGreaterThan(-1);
    expect(discIdx).toBeLessThan(btnIdx);
  });
});

// 2026-08-10: PdfAuditView crashed the whole app with
// "TypeError: Cannot read properties of null (reading 'passes')" (build 6d46cbbda).
//
// On 2026-07-27 the verification block's gate was deliberately widened from
// `verificationAudit &&` to `(verificationAudit || _aiVerificationIncomplete) &&`, so the
// "Complete final audit" recovery control survives a throttled audit-only retry — which
// sets verificationAudit: null alongside _aiVerificationIncomplete: true. That comment
// promises "the inner reads are null-safe below"; the issues list got its `?.`, the
// passes list did not. So in precisely the state the widening exists to support, the
// block rendered and dereferenced null, throwing out to the error boundary.
describe('the widened verification gate survives a null audit', () => {
  it('every inner read under the widened gate is null-safe', () => {
    // The gate itself admits a null audit — that is deliberate, do not "fix" it.
    expect(view).toContain('{(pdfFixResult.verificationAudit || pdfFixResult._aiVerificationIncomplete) && (');
    // ...so both list gates inside it must be optional-chained.
    expect(view).toContain('{(pdfFixResult.verificationAudit?.issues || []).length > 0 && (');
    expect(view).toContain('{(pdfFixResult.verificationAudit?.passes || []).length > 0 && (');
    expect(view).not.toContain('(pdfFixResult.verificationAudit.passes || [])');
    expect(view).not.toContain('(pdfFixResult.verificationAudit.issues || [])');
  });

  it('the shipped module carries the same guard as the source', () => {
    // view_pdf_audit is not an enrolled build.js --compile pair, so the module is
    // hand-mirrored and can drift from the source it is supposed to be built from.
    const mod = readFileSync(resolve(process.cwd(), 'view_pdf_audit_module.js'), 'utf8');
    expect(mod).toContain('(pdfFixResult.verificationAudit?.passes || []).length > 0');
    expect(mod).not.toContain('(pdfFixResult.verificationAudit.passes || []).length > 0');
  });
});

describe('a provider throttle is a resumable UI state, not an authentication failure', () => {
  it('shows the preserved-checkpoint banner and exposes the existing continuation loop', () => {
    expect(view).toContain('pdfFixResult._remediationThrottlePaused');
    expect(view).toContain('AI remediation paused safely');
    expect(view).toContain('Resume AI remediation');
    expect(view).toContain('await runAutoFixLoop(3)');
  });

  it('rehydrates the pause marker and its provenance from saved projects', () => {
    expect((view.match(/_remediationThrottlePaused: !!project\._remediationThrottlePaused/g) || []).length).toBe(2);
    expect((view.match(/_finalAuditThrottleDeferred: !!project\._finalAuditThrottleDeferred/g) || []).length).toBe(2);
  });
});
