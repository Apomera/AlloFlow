// @vitest-environment jsdom
// Open-items batch (2026-07-13 late): B3 (context reasons stop gating 'complete'),
// B7 (ANTI fallback derive parity with the canonical policy), C7 leftovers
// (counted-reason dedupe, dead finalScore read, BOM, eager-updater, load-token race),
// M20 (live alt-quality feedback in the image review card), M11 (abort-slot handback).
import { describe, it, expect, vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 });
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (name) => readFileSync(resolve(process.cwd(), name), 'utf8');
const pipe = read('doc_pipeline_source.jsx');
const view = read('view_pdf_audit_source.jsx');
const host = read('AlloFlowANTI.txt') + read('misc_handlers_source.jsx'); // 2026-07-20: runAutoFixLoop lives in MiscHandlers
const hostMirror = read('desktop/web-app/src/AlloFlowANTI.txt') + read('misc_handlers_source.jsx'); // 2026-07-20: runAutoFixLoop lives in MiscHandlers
const policy = read('verification_policy_source.jsx');

async function livePolicy() {
  globalThis.window = globalThis.window || globalThis;
  await import(resolve(process.cwd(), 'verification_policy_module.js'));
  return window.AlloModules && window.AlloModules.VerificationPolicy && window.AlloModules.VerificationPolicy.deriveVerificationState;
}
const engines = {
  ai: { score: 96, issues: [] },
  axe: { score: 98, totalViolations: 0, totalIncomplete: 0 },
  // failViolations is what makes the Equal Access finding count KNOWN; without
  // it the policy correctly refuses to call the run complete.
  equalAccess: { score: 97, failViolations: 0, potentialViolations: 0, manualViolations: 0, reviewFindingCount: 0 },
};

describe('B3 — context reasons no longer make complete unreachable (live policy module)', () => {
  it('a clean static-web audit reaches complete WITH the scope caveat still listed', async () => {
    const derive = await livePolicy();
    const r = derive({ ...engines, extraReasons: ['Static HTML/source audit excludes live scripts.'] });
    // The policy now reads this caveat and narrows the claim to the tested
    // scope instead of saying plain 'complete' — static checks can run to
    // completion while still skipping runtime scripts and interaction. B3's
    // point stands: it is NOT review-required, so the success branch is live.
    expect(r.verificationState).toBe('complete-for-tested-scope');
    expect(r.reasons.join(' ')).toContain('Static HTML/source audit');
    expect(r.reviewCount).toBe(0);
  });
  it('zero engines ran claims unavailable, never review-required', async () => {
    const derive = await livePolicy();
    const r = derive({ extraReasons: ['Static HTML/source audit excludes live scripts.'] });
    expect(r.verificationState).toBe('unavailable');
  });
  it('genuine review evidence still gates (EA potential findings)', async () => {
    const derive = await livePolicy();
    const r = derive({ ...engines, equalAccess: { score: 90, failViolations: 0, potentialViolations: 2, manualViolations: 0, reviewFindingCount: 2 } });
    expect(r.verificationState).toBe('review-required');
  });
  it('languageReviewRequired remains a genuine gate', async () => {
    const derive = await livePolicy();
    const r = derive({ ...engines, languageReviewRequired: true });
    expect(r.verificationState).toBe('review-required');
  });
});

describe('B7 — ANTI fallback derive matches the canonical policy', () => {
  // B7's concern was DRIFT between the host's re-implemented fallback and the
  // canonical policy. The 2026-08 answer removed the duplicate outright: the
  // host DELEGATES (pipeline export first, then the policy module) and, with
  // neither loaded, returns an honest all-unavailable/review-required stub —
  // it can no longer disagree with the policy about precedence.
  it('the host delegates the derive instead of re-implementing the policy', () => {
    for (const src of [host, hostMirror]) {
      expect(src).toContain('return _docPipeline.deriveVerificationState(input || {});');
      expect(src).toContain('return policy.deriveVerificationState(input || {});');
      expect(src).not.toContain('Math.max(_eaAggregate, (_eaPotential || 0) + (_eaManual || 0))');
    }
  });
  it('with no policy loaded the stub fails honest: unavailable + manual review', () => {
    for (const src of [host, hostMirror]) {
      expect(src).toContain("verificationState: 'unavailable',");
      expect(src).toContain('requiresManualReview: true,');
      expect(src).toContain("reasons: ['verification-policy-module-unavailable'],");
    }
  });
  it('fallback extraReasons are context, not review findings (mirrors the policy)', () => {
    for (const src of [host, hostMirror]) {
      expect(src).not.toContain("_extraReasons.filter((reason) => String(reason == null ? '' : reason).trim()).length");
    }
    expect(policy).not.toContain("extraReasons.filter(function (r) { return String(r == null ? '' : r).trim(); }).length");
  });
});

describe('C7 — counted-reason dedupe (behavioral, eval-slice)', () => {
  const start = pipe.indexOf('function _alloNormalizeStoredVerification');
  const end = pipe.indexOf('\n}', start) + 2;
  const normalize = new Function(
    '_alloDeriveVerificationState', '_alloApplyVerificationHtmlBinding', '_alloIsLiveVerificationHtmlBound', '_ALLO_VERIFICATION_HTML_BINDING_REASON',
    pipe.slice(start, end) + '\nreturn _alloNormalizeStoredVerification;'
  )((x) => x || {}, (v) => v, () => true, 'binding-reason');
  it('a fresh axe-incomplete:5 supersedes a stored axe-incomplete:3 instead of rendering both', () => {
    const out = normalize(
      { verificationState: 'partial', verificationReasons: ['axe-incomplete:3', 'equal-access-unavailable'] },
      { verificationState: 'partial', reasons: ['axe-incomplete:5'], reviewCount: 0 }
    );
    expect(out.reasons).toContain('axe-incomplete:5');
    expect(out.reasons).not.toContain('axe-incomplete:3');
    expect(out.reasons).toContain('equal-access-unavailable'); // non-counted stored reasons survive
  });
});

describe('C7 — remaining leftovers', () => {
  it('multi-session range scores read afterScore (the field ranges actually store)', () => {
    expect(view).toContain('r.afterScore ?? r.finalScore');
    expect(view).not.toContain('typeof r.finalScore === \'number\' && <span');
  });
  it('the view source no longer starts with a UTF-8 BOM', () => {
    const buf = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'));
    expect(buf[0]).not.toBe(0xEF);
  });
  it('the re-audit decision is computed BEFORE setPdfFixResult (no eager-updater reliance)', () => {
    expect(view).toContain('const _curFix = pdfFixResultRef.current;');
    // Now `let`, and gated on _reauditIsCurrent() so a superseded re-audit
    // cannot mark itself applied. Same invariant — applied only when the
    // current fix's HTML is the one we just wrote — plus a staleness guard.
    expect(view).toContain("let _applied = !!(_reauditIsCurrent() && _curFix && _curFix.accessibleHtml === newHtml);");
    // The bare setter is now routed through _commitAsyncHtmlIfCurrent with an
    // html token, so a superseded async re-audit cannot commit at all. The CAS
    // guard inside is unchanged — still only swaps when prev is the html we
    // audited — which is what C7 is really asserting.
    expect(view).toContain('_commitAsyncHtmlIfCurrent(_reauditHtmlToken, (prev) => (prev && prev.accessibleHtml === newHtml) ? _bound : prev);');
    expect(view).not.toContain('_applied = true;');
  });
  it('a fresh upload invalidates in-flight project loads', () => {
    expect(view).toContain('React.useEffect(() => { _projectLoadSelectionRef.current++; }, [pendingPdfBase64]);');
  });
});

describe('M20 — live alt-quality feedback in the image review card', () => {
  it('the draft is scored by the shared heuristics with severity-tiered copy', () => {
    expect(view).toContain('window.AlloModules.createDocPipeline.altQuality) || null;');
    expect(view).toContain("_aqFn(imgReviewDraft, {})");
    expect(view).toContain('This description may not help a screen-reader user');
  });
});

describe('M11 — abort-slot save/restore at every publisher', () => {
  it('auto-continue saves and hands back the previous occupant (both ANTI copies)', () => {
    for (const src of [host, hostMirror]) {
      expect(src).toContain("const _prevAbortSlot = (typeof window !== 'undefined') ? window.__alloPdfAbortSignal : null;");
      expect(src).toContain('window.__alloPdfAbortSignal = _prevAbortSlot || null; // M11');
    }
  });
  it('the batch publisher saves and hands back too', () => {
    expect(pipe).toContain('const _prevBatchAbortSlot = ');
    // The restore now filters through _alloLiveAbortSignalOrNull, so an
    // already-aborted previous signal is handed back as null instead of
    // poisoning whatever runs next. Strictly safer than the old `|| null`.
    expect(pipe).toContain('window.__alloPdfAbortSignal = _alloLiveAbortSignalOrNull(_prevBatchAbortSlot); // M11');
  });
});
