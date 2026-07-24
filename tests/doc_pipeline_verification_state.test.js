import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const policySource = readFileSync(resolve(process.cwd(), 'verification_policy_source.jsx'), 'utf8');
const policyStart = policySource.indexOf('function _alloDeriveVerificationState(input) {');
const policyEnd = policySource.indexOf('\nfunction _alloUnavailableVerificationState', policyStart);
const bindingStart = source.indexOf('var _ALLO_VERIFICATION_HTML_BINDING_REASON');
const helperEnd = source.indexOf('\nvar ALLO_INTERACTIVE_OBJECT_PROFILE_VERSION', bindingStart);
if (policyStart < 0 || policyEnd < 0 || bindingStart < 0 || helperEnd < 0) throw new Error('verification helper extraction markers not found');
const verificationHelpers = new Function(`${policySource.slice(policyStart, policyEnd)}\n${source.slice(bindingStart, helperEnd)}\nreturn { derive: _alloDeriveVerificationState, normalize: _alloNormalizeStoredVerification, createBinding: _alloCreateVerificationHtmlBinding, verifyBinding: _alloVerifyVerificationHtmlBinding, isLiveBound: _alloIsLiveVerificationHtmlBound, applyBinding: _alloApplyVerificationHtmlBinding, enforceBinding: _alloEnforceVerificationHtmlBinding, rehydrateBinding: _alloRehydrateVerificationHtmlBinding };`)();
const deriveVerificationState = verificationHelpers.derive;
const normalizeStoredVerification = verificationHelpers.normalize;
const createVerificationHtmlBinding = verificationHelpers.createBinding;
const verifyVerificationHtmlBinding = verificationHelpers.verifyBinding;
const isLiveVerificationHtmlBound = verificationHelpers.isLiveBound;
const applyVerificationHtmlBinding = verificationHelpers.applyBinding;
const enforceVerificationHtmlBinding = verificationHelpers.enforceBinding;
const rehydrateVerificationHtmlBinding = verificationHelpers.rehydrateBinding;

const completeEvidence = () => ({
  ai: { score: 96 },
  axe: { score: 100, totalIncomplete: 0 },
  equalAccess: { score: 98, potentialViolations: 0, manualViolations: 0, reviewFindingCount: 0 },
});

describe('canonical remediation verification-state matrix', () => {
  it('marks all three clean WCAG engines complete while ignoring PDF/UA not-run', () => {
    const result = deriveVerificationState(completeEvidence());
    expect(result.verificationState).toBe('complete');
    expect(result.afterScoreVerified).toBe(true);
    expect(result.requiresManualReview).toBe(false);
    expect(result.reviewCount).toBe(0);
    expect(result.verificationCoverage).toEqual({
      standard: 'WCAG 2.2 AA',
      ai: 'complete',
      axe: 'complete',
      equalAccess: 'complete',
      pdfUaSelfCheck: 'not-run',
    });
  });

  it('keeps a high AI score with an unclassified/manual issue out of complete and target-met state', () => {
    const input = completeEvidence();
    input.ai = {
      score: 95,
      issues: [{ ruleId: 'other', issue: 'Unclassified barrier.', requiresManualReview: true }],
    };
    const result = deriveVerificationState(input);
    expect(result.verificationState).toBe('review-required');
    expect(result.verificationCoverage.ai).toBe('complete-with-review');
    expect(result.afterScoreVerified).toBe(false);
    expect(result.requiresManualReview).toBe(true);
    expect(result.reviewCount).toBe(1);
    expect(result.reasons).toContain('ai-manual-review:1');
  });

  it('requires review for axe incomplete rules without counting them as confirmed failures', () => {
    const input = completeEvidence();
    input.axe.totalIncomplete = 3;
    const result = deriveVerificationState(input);
    expect(result.verificationState).toBe('review-required');
    expect(result.verificationCoverage.axe).toBe('complete-with-review');
    expect(result.reviewCount).toBe(3);
    expect(result.reasons).toContain('axe-incomplete:3');
    expect(result.afterScoreVerified).toBe(false);
  });

  it('counts Equal Access potential and manual rule findings', () => {
    const input = completeEvidence();
    input.equalAccess = { score: 92, potentialViolations: 2, manualViolations: 1, reviewFindingCount: 3 };
    const result = deriveVerificationState(input);
    expect(result.verificationState).toBe('review-required');
    expect(result.verificationCoverage.equalAccess).toBe('complete-with-review');
    expect(result.reviewCount).toBe(3);
    expect(result.reasons).toEqual(expect.arrayContaining(['equal-access-potential:2', 'equal-access-manual:1']));
  });

  it.each([
    ['partial audit', { _partialAudit: true }, 'ai-partial-audit'],
    ['degraded score', { _scoreDegraded: true }, 'ai-score-degraded'],
    ['synthesized score', { synthesized: true }, 'ai-synthesized'],
  ])('treats a numeric AI %s as partial evidence', (_label, flag, reason) => {
    const input = completeEvidence();
    input.ai = { score: 90, ...flag };
    const result = deriveVerificationState(input);
    expect(result.verificationState).toBe('partial');
    expect(result.verificationCoverage.ai).toBe('partial');
    expect(result.requiresManualReview).toBe(true);
    expect(result.reasons).toContain(reason);
  });

  it('lets the authoritative final-audit-incomplete flag override retained numeric AI evidence', () => {
    const result = deriveVerificationState({ ...completeEvidence(), aiVerificationIncomplete: true });
    expect(result.verificationState).toBe('partial');
    expect(result.verificationCoverage.ai).toBe('partial');
    expect(result.afterScoreVerified).toBe(false);
    expect(result.reasons).toContain('ai-verification-incomplete');
  });

  it('distinguishes a partly unavailable run from a wholly unavailable run', () => {
    const partial = completeEvidence();
    partial.equalAccess = null;
    expect(deriveVerificationState(partial).verificationState).toBe('partial');
    const unavailable = deriveVerificationState({});
    expect(unavailable.verificationState).toBe('unavailable');
    expect(unavailable.requiresManualReview).toBe(true);
    expect(unavailable.afterScoreVerified).toBe(false);
  });

  it('treats unknown automated review counts as partial evidence', () => {
    const axeUnknown = completeEvidence();
    axeUnknown.axe = { score: 99 };
    expect(deriveVerificationState(axeUnknown).verificationCoverage.axe).toBe('partial');
    const eaUnknown = completeEvidence();
    eaUnknown.equalAccess = { score: 99 };
    expect(deriveVerificationState(eaUnknown).verificationCoverage.equalAccess).toBe('partial');
  });

  it('keeps static-source context visible WITHOUT forcing review; language still gates (B3, 2026-07-13)', () => {
    // B3: extraReasons are CONTEXT — counting them as review findings made
    // 'complete' unreachable for every web audit and left the success branches
    // dead. The caveat still renders (reasons), it just no longer gates.
    const extra = deriveVerificationState({ ...completeEvidence(), extraReasons: ['static-source-audit'] });
    expect(extra.verificationState).toBe('complete');
    expect(extra.reviewCount).toBe(0);
    expect(extra.reasons).toContain('static-source-audit');
    expect(extra.verificationCoverage.ai).toBe('complete');

    const language = deriveVerificationState({ ...completeEvidence(), languageReviewRequired: true });
    expect(language.verificationState).toBe('review-required');
    expect(language.reasons).toContain('document-language-needs-review');
  });
  it('fails closed when aggregate Equal Access counts under-report explicit manual findings', () => {
    const input = completeEvidence();
    input.equalAccess = { score: 94, potentialViolations: 1, manualViolations: 2, reviewFindingCount: 1 };
    const result = deriveVerificationState(input);
    expect(result.verificationState).toBe('review-required');
    expect(result.reviewCount).toBe(3);
    expect(result.reasons).toEqual(expect.arrayContaining(['equal-access-potential:1', 'equal-access-manual:2']));
  });

  it('rejects non-finite engine scores as unavailable evidence', () => {
    const input = completeEvidence();
    input.ai.score = Number.NaN;
    input.axe.score = Number.POSITIVE_INFINITY;
    const result = deriveVerificationState(input);
    expect(result.verificationCoverage.ai).toBe('unavailable');
    expect(result.verificationCoverage.axe).toBe('unavailable');
    expect(result.afterScoreVerified).toBe(false);
  });

  it('preserves derived partial/unavailable states when stored manual-review is their canonical boolean', () => {
    const partial = deriveVerificationState({ ...completeEvidence(), axe: null });
    const unavailable = deriveVerificationState({});
    expect(normalizeStoredVerification({ verificationState: 'partial', requiresManualReview: true }, partial).verificationState).toBe('partial');
    expect(normalizeStoredVerification({ verificationState: 'unavailable', requiresManualReview: true }, unavailable).verificationState).toBe('unavailable');
    const complete = deriveVerificationState(completeEvidence());
    expect(normalizeStoredVerification({ requiresManualReview: true }, complete).verificationState).toBe('review-required');
  });
});

describe('exact-HTML verification binding', () => {
  it('creates the versioned SHA-256 record and verifies only exact UTF-8 HTML', async () => {
    const html = '<main lang="en">Café 🌍</main>';
    const binding = await createVerificationHtmlBinding(html);
    expect(binding).toEqual({
      version: 1,
      algorithm: 'SHA-256',
      digest: expect.stringMatching(/^[0-9a-f]{64}$/),
      utf8ByteLength: new TextEncoder().encode(html).byteLength,
    });
    expect(await verifyVerificationHtmlBinding(html, binding)).toBe(true);
    expect(await verifyVerificationHtmlBinding(html + ' ', binding)).toBe(false);
    expect(await verifyVerificationHtmlBinding(html, { ...binding, algorithm: 'sha256' })).toBe(false);
  });

  it('rehydrates matching persisted evidence with a non-serializable live snapshot', async () => {
    expect(await rehydrateVerificationHtmlBinding(null)).toBeNull();
    expect(await rehydrateVerificationHtmlBinding(undefined)).toBeUndefined();
    const accessibleHtml = '<main><h1>Verified</h1></main>';
    const verificationHtmlBinding = await createVerificationHtmlBinding(accessibleHtml);
    const restored = await rehydrateVerificationHtmlBinding({
      accessibleHtml,
      verificationHtmlBinding,
      verificationState: 'complete',
      afterScoreVerified: true,
      requiresManualReview: false,
      verificationCoverage: { ...deriveVerificationState(completeEvidence()).coverage, pdfUaSelfCheck: 'pass' },
      verificationReviewCount: 0,
      verificationReasons: [],
      afterScore: 97,
      _verificationHtmlSnapshot: '<main>serialized spoof</main>',
    });

    expect(isLiveVerificationHtmlBound(restored)).toBe(true);
    expect(restored.verificationState).toBe('complete');
    expect(restored.afterScoreVerified).toBe(true);
    expect(normalizeStoredVerification(restored, deriveVerificationState(completeEvidence())).verificationState).toBe('complete');
    expect(restored.afterScore).toBe(97);
    expect(Object.getOwnPropertyDescriptor(restored, '_verificationHtmlSnapshot')?.enumerable).toBe(false);
    expect(Object.getOwnPropertyDescriptor(restored, '_verificationHtmlBindingDigest')).toMatchObject({
      enumerable: false,
      value: verificationHtmlBinding.digest,
    });
    expect(JSON.parse(JSON.stringify(restored))).not.toHaveProperty('_verificationHtmlSnapshot');
    expect(JSON.parse(JSON.stringify(restored))).not.toHaveProperty('_verificationHtmlBindingDigest');
    expect(JSON.parse(JSON.stringify(restored))).toHaveProperty('verificationHtmlBinding', verificationHtmlBinding);
  });

  it('rejects a same-length binding swap even while the original runtime snapshot remains', async () => {
    const originalHtml = '<main><p>alpha</p></main>';
    const otherHtml = '<main><p>bravo</p></main>';
    expect(new TextEncoder().encode(otherHtml).byteLength).toBe(new TextEncoder().encode(originalHtml).byteLength);
    const originalBinding = await createVerificationHtmlBinding(originalHtml);
    const otherBinding = await createVerificationHtmlBinding(otherHtml);
    const restored = await rehydrateVerificationHtmlBinding({
      accessibleHtml: originalHtml,
      verificationHtmlBinding: originalBinding,
      verificationState: 'complete',
      afterScoreVerified: true,
      requiresManualReview: false,
      verificationCoverage: deriveVerificationState(completeEvidence()).coverage,
      verificationReviewCount: 0,
      verificationReasons: [],
    });
    expect(isLiveVerificationHtmlBound(restored)).toBe(true);
    restored.verificationHtmlBinding = otherBinding;
    expect(isLiveVerificationHtmlBound(restored)).toBe(false);
    expect(enforceVerificationHtmlBinding(restored)).toMatchObject({
      verificationState: 'partial',
      afterScoreVerified: false,
      requiresManualReview: true,
    });
  });

  it('fails closed on changed or spoofed HTML while preserving finite partial scores', async () => {
    const verifiedHtml = '<main><h1>Original</h1></main>';
    const changedHtml = '<main><h1>Changed</h1></main>';
    const verificationHtmlBinding = await createVerificationHtmlBinding(verifiedHtml);
    const saved = {
      accessibleHtml: changedHtml,
      verificationHtmlBinding,
      verificationState: 'complete',
      afterScoreVerified: true,
      requiresManualReview: false,
      verificationCoverage: { ...deriveVerificationState(completeEvidence()).coverage, pdfUaSelfCheck: 'pass' },
      verificationReviewCount: 0,
      verificationReasons: [],
      afterScore: 93,
      _verificationHtmlSnapshot: changedHtml,
    };
    expect(isLiveVerificationHtmlBound(saved)).toBe(false);

    const restored = await rehydrateVerificationHtmlBinding(saved);
    expect(restored.verificationState).toBe('partial');
    expect(restored.afterScoreVerified).toBe(false);
    expect(restored.requiresManualReview).toBe(true);
    expect(restored.afterScore).toBe(93);
    expect(restored.verificationCoverage.pdfUaSelfCheck).toBe('not-run');
    expect(restored.verificationReasons).toContain('verification-html-binding-missing-or-stale');
    expect(restored).not.toHaveProperty('_verificationHtmlSnapshot');
  });

  it.each(['review-required', 'partial', 'unavailable'])('does not rewrite an existing %s state when binding is stale', (state) => {
    const applied = applyVerificationHtmlBinding({
      verificationState: state,
      afterScoreVerified: false,
      requiresManualReview: true,
      coverage: { standard: 'WCAG 2.2 AA', ai: 'partial', axe: 'complete', equalAccess: 'complete', pdfUaSelfCheck: 'pass' },
      reviewCount: 2,
      reasons: ['existing-reason'],
      afterScore: 88,
    }, false);
    expect(applied.verificationState).toBe(state);
    expect(applied.afterScore).toBe(88);
    expect(applied.coverage.pdfUaSelfCheck).toBe('not-run');
  });

  it('enforces missing live proof during normalization and direct result enforcement', () => {
    expect(enforceVerificationHtmlBinding(null)).toBeNull();
    expect(enforceVerificationHtmlBinding(undefined)).toBeUndefined();
    const derived = deriveVerificationState(completeEvidence());
    const legacy = {
      accessibleHtml: '<main>legacy</main>',
      verificationState: 'complete',
      afterScoreVerified: true,
      requiresManualReview: false,
      verificationCoverage: derived.coverage,
      verificationReviewCount: 0,
      verificationReasons: [],
      afterScore: 91,
    };
    expect(normalizeStoredVerification(legacy, derived).verificationState).toBe('partial');
    const enforced = enforceVerificationHtmlBinding(legacy);
    expect(enforced.verificationState).toBe('partial');
    expect(enforced.afterScoreVerified).toBe(false);
    expect(enforced.afterScore).toBe(91);
  });
});
describe('verification policy source wiring', () => {
  it('exports one helper through factory instances and the factory static', () => {
    expect(source).toContain('deriveVerificationState: _alloDeriveVerificationState');
    expect(source).toContain('createDocPipeline.deriveVerificationState = _alloDeriveVerificationState');
  });

  it('exports all exact-HTML binding helpers through factory instances and statics', () => {
    for (const [publicName, internalName] of [
      ['createVerificationHtmlBinding', '_alloCreateVerificationHtmlBinding'],
      ['verifyVerificationHtmlBinding', '_alloVerifyVerificationHtmlBinding'],
      ['isLiveVerificationHtmlBound', '_alloIsLiveVerificationHtmlBound'],
      ['applyVerificationHtmlBinding', '_alloApplyVerificationHtmlBinding'],
      ['enforceVerificationHtmlBinding', '_alloEnforceVerificationHtmlBinding'],
      ['rehydrateVerificationHtmlBinding', '_alloRehydrateVerificationHtmlBinding'],
    ]) {
      expect(source).toContain(`${publicName}: ${internalName}`);
      expect(source).toContain(`createDocPipeline.${publicName} = ${internalName}`);
    }
  });

  it('binds final verification after HTML mutations and strips runtime snapshots at persistence boundaries', () => {
    const bindAt = source.indexOf('const _verificationHtmlBinding = await _alloCreateVerificationHtmlBinding(accessibleHtml)');
    expect(bindAt).toBeGreaterThan(source.indexOf("const _imageRecoveryInjected = accessibleHtml.indexOf('data-image-recovery=\"true\"')"));
    expect(source).toContain('verificationHtmlBinding: _verificationHtmlBinding');
    expect(source).toContain('_alloAttachVerificationHtmlSnapshot(_result, accessibleHtml)');
    expect(source).toContain('result: _alloStripVerificationHtmlSnapshot(result)');
    expect(source).toContain('JSON.stringify(_alloStripVerificationHtmlSnapshot(f.result))');
    expect(source).toContain('resultStored: !!f._checkpointResultKey');
    expect(source).toContain('let _batchStatusWriteTail = Promise.resolve();');
    expect(source).toContain('await _batchStatusWriteTail.catch(() => {});');
    expect(source).toContain('await _alloRehydrateVerificationHtmlBinding(cached.result)');
    expect(source).toContain('await _alloRehydrateVerificationHtmlBinding(JSON.parse(rec.serialized))');

    const telemetryStart = source.indexOf('const telemetry = {');
    const telemetryEnd = source.indexOf("zip.file('telemetry.json'", telemetryStart);
    expect(telemetryStart).toBeGreaterThan(-1);
    expect(telemetryEnd).toBeGreaterThan(telemetryStart);
    expect(source.slice(telemetryStart, telemetryEnd)).not.toContain('_verificationHtmlSnapshot');
  });

  it('retains actionable IBM POTENTIAL and every MANUAL outcome at rule level', () => {
    expect(source).toContain("const potentials = byRule((v) => v[1] === 'POTENTIAL')");
    expect(source).toContain("const manuals = byRule((v) => v[1] === 'MANUAL')");
    expect(source).toContain('potentialFindings: potentials.slice(0, 30)');
    expect(source).toContain('manualFindings: manuals.slice(0, 30)');
    expect(source).toContain('reviewFindingCount');
    expect(source).toContain('snippet: r.snippet == null');
  });

  it('uses canonical state for final claims and separate remediation reliability outcome', () => {
    expect(source).toContain('verificationCoverage: _verificationState.verificationCoverage');
    expect(source).toContain('afterScoreVerified: _verificationState.afterScoreVerified');
    expect(source).toContain('outcome: _remediationOutcome.state');
    expect(source).toContain('remediationOutcome: _remediationOutcome');
    expect(source).toContain('verificationState: _verificationState.verificationState');
  });

  it('invalidates stale deterministic evidence and normalizes stored claims conservatively', () => {
    expect(source).toContain('axeResults = _cleanAxeOk ? _cleanAxe : null');
    expect(source).toContain('axeResults = _reAxeOk ? _reAxe : null');
    expect(source).toContain(': (_reEaOk ? _reEa.score : null)');
    expect(source).toContain('|| !Number.isFinite(verification.score)');
    expect(source).toContain('|| _finalAuditScoreMissing;');
    expect(source).toContain('_alloNormalizeStoredVerification(stored, derived)');
    expect(source).toContain('const _eaConfirmedFailures = eaResults');
    expect(source).toContain('const _reEaConfirmedFailures = eaResults');
  });
  it('threads canonical coverage into reports and honest batch artifacts', () => {
    expect(source).toContain('WCAG verification status:');
    expect(source).toContain('Equal Access review findings:');
    expect(source).toContain('processed: done.length');
    expect(source).toContain('fullyVerified: fullyVerifiedItems.length');
    expect(source).toContain('above90Verified:');
    expect(source).toContain('Verification State,Fully Verified,Manual Review,Review Finding Count');
    expect(source).toContain('verificationReasons: v.reasons');
    expect(source).not.toContain('${done.length} Succeeded');
  });
});
