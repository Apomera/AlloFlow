// @vitest-environment jsdom
// #6-full (2026-07-16): the FINALIZATION REDUCER — finalizeRemediationRound is now the ONE
// canonical "round evidence → next result" assembly, extracted from the host auto-continue
// round-commit (AlloFlowANTI runAutoFixLoop). These tests prove the extraction is FAITHFUL:
// a frozen transcription of the pre-refactor ANTI block (the reference implementation below)
// must produce the same result as the live reducer for every evidence scenario. If the reducer
// ever drifts from what the host used to compute, the parity block fails.
import { describe, it, expect, vi } from 'vitest';
vi.setConfig({ testTimeout: 30000 }); // live-module import exceeds the 5s default under parallel-suite load
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const antiSrc = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8') /* extracted-sources appended 2026-07-20 */ + ['misc_handlers_source.jsx','view_export_preview_source.jsx','udl_chat_source.jsx'].map(f => readFileSync(resolve(process.cwd(), f), 'utf8')).join('\n');
const pipeSrc = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');

let _pipeline = null;
async function livePipeline() {
  if (_pipeline) return _pipeline;
  globalThis.window = globalThis.window || globalThis;
  await import(resolve(process.cwd(), 'verification_policy_module.js'));
  await import(resolve(process.cwd(), 'doc_builder_renderer_module.js'));
  await import(resolve(process.cwd(), 'doc_pipeline_module.js'));
  _pipeline = window.AlloModules.createDocPipeline({
    callGemini: async () => '{}', callGeminiVision: async () => '', callImagen: async () => null,
    addToast: () => {}, t: (k) => k, isRtlLang: () => false,
    updateExportPreview: () => {}, getDefaultTitle: () => 'Doc', state: {},
  });
  return _pipeline;
}

// ── REFERENCE IMPLEMENTATION ──────────────────────────────────────────────────
// Frozen transcription of the pre-#6-full ANTI round-commit (runAutoFixLoop), byte-faithful in
// its logic: evidence validity gating + audit-only inheritance (C6), weakest-layer score,
// #6-incremental/-ext fidelity merge, verification snapshot + binding, expert-base separation,
// and the exact Object.assign field set. DO NOT "improve" this function — its job is to stay
// what the host used to do.
async function referenceMerge(P, cur, { html, reVerify, rawAxe, rawEa, auditOnly, roundIR, newPlain, passes, chunkState, chunkWeightedScore }) {
  const result = { html, axe: rawAxe, _auditOnly: auditOnly, passes, chunkState, chunkWeightedScore };
  const _freshAxeRaw = (result.axe && typeof result.axe.score === 'number' && Number.isFinite(result.axe.score)) ? result.axe : null;
  const _freshEaRaw = (rawEa && typeof rawEa.score === 'number' && Number.isFinite(rawEa.score)) ? rawEa : null;
  const _freshAxe = _freshAxeRaw || ((result._auditOnly && cur.axeAudit && typeof cur.axeAudit.score === 'number' && Number.isFinite(cur.axeAudit.score)) ? cur.axeAudit : null);
  const _freshEa = _freshEaRaw || ((result._auditOnly && cur.secondEngineAudit && typeof cur.secondEngineAudit.score === 'number' && Number.isFinite(cur.secondEngineAudit.score)) ? cur.secondEngineAudit : null);
  let _det = _freshAxe ? _freshAxe.score : null;
  if (_freshEa) _det = _det !== null ? Math.min(_det, _freshEa.score) : _freshEa.score;
  const newScore = (_det !== null) ? P.computeHeadline(reVerify.score, _det) : reVerify.score;

  let _roundFid = null;
  try { _roundFid = (!result._auditOnly && cur.sourceText) ? P.recomputeContentFidelity(cur.sourceText, result.html) : null; } catch (_) {}
  const _recompKinds = P.recomputableFidelityKinds;
  const _roundNotes = _roundFid
    ? (cur.fidelityNotes || []).filter((n) => !(n && _recompKinds[n.kind])).concat(_roundFid.fidelityNotes || [])
    : (cur.fidelityNotes || []);
  const _nextIntegrityCoverage = _roundFid ? _roundFid.integrityCoverage : cur.integrityCoverage;
  const _nextIntegrityWarning = _roundFid
    ? ([_roundFid.coverageWarning, _roundFid.placementWarn, _roundFid.numericWarn].filter(Boolean).join(' ') || null)
    : cur.integrityWarning;
  const _nextFidelityLimited = _roundFid
    ? ((_roundFid.integrityCoverage != null && _roundFid.integrityCoverage < 90) || _roundNotes.length > 0)
    : !!cur.fidelityLimited;

  const _sameRoundHtml = result.html === cur.accessibleHtml && P.isLiveVerificationHtmlBound(cur, cur.accessibleHtml);
  const _roundPdfUaSelfCheck = _sameRoundHtml
    ? ((cur.verificationCoverage && cur.verificationCoverage.pdfUaSelfCheck) || 'not-run')
    : 'not-run';
  let _verification = P.deriveVerificationState({
    ai: reVerify, axe: _freshAxe, equalAccess: _freshEa, pdfUaSelfCheck: _roundPdfUaSelfCheck,
  }) || {};
  const _verificationHtmlBinding = await P.createVerificationHtmlBinding(result.html);
  _verification = P.applyVerificationHtmlBinding(_verification, !!_verificationHtmlBinding, 'verification-html-binding-unavailable') || _verification;
  const _verificationCoverage = _verification.coverage || _verification.verificationCoverage || {
    standard: 'WCAG 2.2 AA', ai: 'unavailable', axe: 'unavailable', equalAccess: 'unavailable',
    pdfUaSelfCheck: _roundPdfUaSelfCheck,
  };
  const _verificationState = _verification.verificationState || 'partial';
  const _afterScoreVerified = _verification.afterScoreVerified === true && _verificationState === 'complete' && !_verification.requiresManualReview;
  const _requiresManualReview = !_afterScoreVerified || !!_verification.requiresManualReview;
  const _verificationReasons = Array.isArray(_verification.reasons) ? _verification.reasons.slice() : [];
  const _verificationReviewCount = Number.isFinite(_verification.reviewCount) ? Math.max(0, _verification.reviewCount) : 0;
  const _aiVerificationIncomplete = _verificationCoverage.ai !== 'complete';
  const _scoreSource = _aiVerificationIncomplete
    ? (_det !== null ? 'deterministic-only' : 'unverified')
    : (_det !== null ? 'min' : 'content-only');

  const _storedExpertBase = (cur._expertReviewBeforeVerification && typeof cur._expertReviewBeforeVerification === 'object')
    ? cur._expertReviewBeforeVerification : null;
  const _hadVerificationContribution = !!cur._verificationExpertReview;
  const _rawExpertBase = _storedExpertBase || (_hadVerificationContribution
    ? { needed: false, reason: null }
    : { needed: !!cur.needsExpertReview, reason: cur.expertReviewReason || null });
  const _baseAccessibilityReview = !!(_rawExpertBase.needed && (_rawExpertBase.reason === 'accessibility' || _rawExpertBase.reason === 'both' || !_rawExpertBase.reason));
  const _freshContentFidelityReview = !!_nextFidelityLimited;
  const _expertBaseReason = _baseAccessibilityReview
    ? (_freshContentFidelityReview ? 'both' : 'accessibility')
    : (_freshContentFidelityReview ? 'content-fidelity' : null);

  return Object.assign({}, cur, {
    accessibleHtml: result.html,
    axeAudit: _freshAxe,
    _detScore: _det,
    verificationAudit: reVerify,
    verificationHtmlBinding: _verificationHtmlBinding,
    verificationCoverage: _verificationCoverage,
    verificationState: _verificationState,
    afterScoreVerified: _afterScoreVerified,
    requiresManualReview: _requiresManualReview,
    verificationReviewCount: _verificationReviewCount,
    verificationReasons: _verificationReasons,
    issueResolution: roundIR,
    integrityCoverage: _nextIntegrityCoverage,
    integrityWarning: _nextIntegrityWarning,
    fidelityNotes: _roundNotes,
    fidelityLimited: _nextFidelityLimited,
    afterScore: newScore,
    _scoreIsBlended: _det !== null && !_aiVerificationIncomplete,
    _aiVerificationIncomplete,
    _scoreSource,
    axeScore: _freshAxe ? _freshAxe.score : null,
    axeViolations: _freshAxe && typeof _freshAxe.totalViolations === 'number' ? _freshAxe.totalViolations : null,
    secondEngineAudit: _freshEa,
    needsExpertReview: !!_expertBaseReason,
    expertReviewReason: _expertBaseReason,
    _verificationExpertReview: false,
    _expertReviewBeforeVerification: null,
    finalText: newPlain || cur.finalText,
    autoFixPasses: (cur.autoFixPasses || 0) + (passes || 0),
    htmlChars: result.html.length,
    chunkState: chunkState || cur.chunkState,
    chunkWeightedScore: chunkWeightedScore || cur.chunkWeightedScore,
  });
}

// The binding is created independently by each implementation — normalize it to presence +
// any stable digest field so a nonce/timestamp inside the witness can't fail the comparison.
function normalized(result) {
  const c = JSON.parse(JSON.stringify(Object.assign({}, result, { verificationHtmlBinding: undefined })));
  c._bindingPresent = !!result.verificationHtmlBinding;
  return c;
}

const AI = (score, issues = []) => ({ score, issues, summary: 'ai' });
const AXE = (score, v = 0) => ({ score, totalViolations: v });

const baseCur = () => ({
  accessibleHtml: '<main><h1>Old</h1><p>Water evaporates at 100 degrees.</p></main>',
  sourceText: 'Water evaporates at 100 degrees.',
  axeAudit: AXE(90, 1),
  secondEngineAudit: AXE(88),
  fidelityNotes: [
    { kind: 'pageEdge', msg: 'run-scoped: removed running head' },
    { kind: 'numeric', msg: 'stale numeric warning from the primary pass' },
  ],
  integrityCoverage: 84,
  integrityWarning: 'stale warning',
  fidelityLimited: true,
  needsExpertReview: true,
  expertReviewReason: 'accessibility',
  _verificationExpertReview: false,
  _expertReviewBeforeVerification: null,
  issueResolution: { resolved: [], persisted: [] },
  finalText: 'old text',
  autoFixPasses: 1,
  verificationCoverage: { standard: 'WCAG 2.2 AA', ai: 'complete', axe: 'complete', equalAccess: 'complete', pdfUaSelfCheck: 'passed' },
  chunkState: null,
  chunkWeightedScore: null,
});

const ROUND_HTML = '<main><h1>New</h1><p>Water evaporates at 100 degrees.</p></main>';

async function bothWays(curMut, roundMut) {
  const P = await livePipeline();
  const cur = Object.assign(baseCur(), curMut || {});
  const round = Object.assign({
    html: ROUND_HTML, reVerify: AI(93), rawAxe: AXE(95, 0), rawEa: AXE(92),
    auditOnly: false, roundIR: { resolved: [{ issue: 'x' }], persisted: [] },
    newPlain: 'New Water evaporates at 100 degrees.', passes: 1,
    chunkState: null, chunkWeightedScore: null,
  }, roundMut || {});
  const ref = await referenceMerge(P, cur, round);
  const live = await P.finalizeRemediationRound(cur, {
    html: round.html, aiAudit: round.reVerify, axeAudit: round.rawAxe, eaAudit: round.rawEa,
    auditOnly: round.auditOnly, sourceText: cur.sourceText, issueResolution: round.roundIR,
    plainText: round.newPlain, passes: round.passes,
    chunkState: round.chunkState, chunkWeightedScore: round.chunkWeightedScore,
  });
  return { ref, live };
}

describe('finalizeRemediationRound — PARITY with the frozen pre-refactor host merge', () => {
  it('A: fresh axe + EA, changed html, fidelity recompute (the standard round)', async () => {
    const { ref, live } = await bothWays();
    expect(normalized(live)).toEqual(normalized(ref));
    expect(live._detScore).toBe(92);          // min(axe 95, ea 92)
    expect(live.afterScore).toBe(Math.min(93, 92)); // weakest layer governs
  });

  it('B: EA-only evidence (axe returned garbage)', async () => {
    const { ref, live } = await bothWays({}, { rawAxe: { error: 'boom' }, rawEa: AXE(85) });
    expect(normalized(live)).toEqual(normalized(ref));
    expect(live._detScore).toBe(85);
    expect(live.axeAudit).toBeNull();
  });

  it('C: no deterministic evidence at all → content-only/unverified score source', async () => {
    const { ref, live } = await bothWays({}, { rawAxe: null, rawEa: null });
    expect(normalized(live)).toEqual(normalized(ref));
    expect(live._detScore).toBeNull();
    expect(live.afterScore).toBe(93); // AI content score stands alone
  });

  it('D: audit-only refresh INHERITS prior scored evidence (C6) instead of nulling it', async () => {
    const { ref, live } = await bothWays({}, { auditOnly: true, rawAxe: null, rawEa: null, passes: 0 });
    expect(normalized(live)).toEqual(normalized(ref));
    expect(live.axeAudit).toEqual(AXE(90, 1));       // inherited from cur
    expect(live._detScore).toBe(88);                  // min(inherited axe 90, inherited ea 88)
    // audit-only rounds never re-measure fidelity — prior fields carry
    expect(live.integrityCoverage).toBe(84);
    expect(live.integrityWarning).toBe('stale warning');
  });

  it('E: expert-review base separation — stored sentinel base + fresh fidelity → both', async () => {
    const { ref, live } = await bothWays(
      { _expertReviewBeforeVerification: { needed: true, reason: 'accessibility' } },
      {}
    );
    expect(normalized(live)).toEqual(normalized(ref));
    expect(live._expertReviewBeforeVerification).toBeNull(); // consumed, reset every round
  });

  it('F: verification-only contribution with no stored base → base clears to not-needed', async () => {
    const { ref, live } = await bothWays(
      { _verificationExpertReview: true, fidelityNotes: [], integrityWarning: null, fidelityLimited: false, sourceText: '' },
      {}
    );
    expect(normalized(live)).toEqual(normalized(ref));
  });

  it('recomputable-kind replacement: the stale numeric note is replaced, run-scoped pageEdge carries', async () => {
    const { live } = await bothWays();
    const kinds = (live.fidelityNotes || []).map((n) => n.kind);
    expect(kinds).toContain('pageEdge');                       // run-scoped: carried forward
    expect(live.fidelityNotes.some((n) => n.msg === 'stale numeric warning from the primary pass')).toBe(false); // recomputable: replaced
  });

  it('throws on a missing/unscored aiAudit (callers bail on null re-verification instead of merging)', async () => {
    const P = await livePipeline();
    await expect(P.finalizeRemediationRound(baseCur(), { html: ROUND_HTML, aiAudit: null })).rejects.toThrow(/aiAudit/);
  });
});

// ── Host delegation state ─────────────────────────────────────────────────────
// The ANTI half (runAutoFixLoop delegates to the reducer, hand-rolled merge deleted) was
// re-landed OVER twice on 2026-07-16 by a concurrent session force-re-landing its own ANTI
// hunks from a stale base — racing it risks corrupting both edits, so the delegation waits
// for a quiet window (dev-tools/reland_finalize_round_delegation.py applies it in one shot).
// Until then the host keeps its old inline merge (functionally identical — the parity block
// above proves the reducer computes exactly that) and the engine half ships unused.
// These pins are STATE-AWARE: they activate the moment the delegation lands, and from then
// on they hard-ban the old inline block from ever coming back.
const hostDelegates = antiSrc.includes('_mergedRound = await _finalizeRound(cur, {');

describe('anti-drift: host delegation (pins arm when the ANTI half lands)', () => {
  it(hostDelegates
    ? 'runAutoFixLoop calls _docPipeline.finalizeRemediationRound and commits its result'
    : 'PENDING RE-LAND: host still carries the pre-#6-full inline merge (see dev-tools/reland_finalize_round_delegation.py)', () => {
    if (!hostDelegates) {
      // The old inline block must then still be INTACT (a half-removed merge would be worse
      // than either full state).
      expect(antiSrc).toContain("const _freshAxeRaw = (result.axe && typeof result.axe.score === 'number'");
      expect(antiSrc).toContain('const _storedExpertBase = (cur._expertReviewBeforeVerification');
      return;
    }
    expect(antiSrc).toContain('const _finalizeRound = _docPipeline && _docPipeline.finalizeRemediationRound;');
    expect(antiSrc).toContain('cur = _mergedRound;');
    // module-older-than-host fallback: stop improving, never hand-merge with drift risk
    expect(antiSrc).toContain('finalizeRemediationRound unavailable (engine module predates this host)');
    // and the old inline assembly is gone for good (the final-branch sentinel PERSIST
    // `_expertReviewBeforeVerification: (...) ? ... : null` legitimately remains)
    expect(antiSrc).not.toContain('_nextExpertReviewReason');
    expect(antiSrc).not.toContain("const _recompKinds = (_docPipeline && _docPipeline.recomputableFidelityKinds)");
    expect(antiSrc).not.toContain('const _storedExpertBase = (cur._expertReviewBeforeVerification');
  });

  it('the reducer ships in the pipeline source with the revert contract documented', () => {
    expect(pipeSrc).toContain('const _finalizeRemediationRound = async (prev, round) => {');
    expect(pipeSrc).toContain('finalizeRemediationRound: _wrap(_finalizeRemediationRound),');
    // the caller-side revert check depends on the merged result carrying the deterministic score
    expect(pipeSrc).toContain('_detScore: _det,');
  });
});
