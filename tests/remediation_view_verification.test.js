import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webcrypto } from 'node:crypto';

const source = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const pipelineSource = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const policySource = readFileSync(resolve(process.cwd(), 'verification_policy_source.jsx'), 'utf8');

function extractFunctionFrom(text, name) {
  let start = text.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('Function not found: ' + name);
  if (text.slice(Math.max(0, start - 6), start) === 'async ') start -= 6;
  const brace = text.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < text.length; i++) {
    if (text[i] === '{') depth++;
    else if (text[i] === '}' && --depth === 0) return text.slice(start, i + 1);
  }
  throw new Error('Unclosed function: ' + name);
}
const extractFunction = (name) => extractFunctionFrom(source, name);

const helpers = new Function('crypto', 'TextEncoder',
  extractFunction('_htmlHasExplicitLanguage') + '\n' +
  extractFunction('_viewVerificationBindingHelper') + '\n' +
  extractFunction('_viewValidVerificationHtmlBinding') + '\n' +
  extractFunction('_viewAttachRuntimeBindingProof') + '\n' +
  extractFunction('_viewCreateVerificationHtmlBinding') + '\n' +
  extractFunction('_viewVerifyVerificationHtmlBinding') + '\n' +
  extractFunction('_viewIsLiveVerificationHtmlBound') + '\n' +
  extractFunction('_viewEnforceVerificationHtmlBinding') + '\n' +
  extractFunction('_viewRehydrateVerificationHtmlBinding') + '\n' +
  extractFunction('_viewBindFreshVerificationResult') + '\n' +
  extractFunction('_viewBindValidationToHtml') + '\n' +
  "const _viewUtf8LenMemo = typeof WeakMap !== 'undefined' ? new WeakMap() : null;\n" +
  extractFunction('_viewValidationMatchesHtml') + '\n' +
  extractFunction('_viewAttachTaggedArtifactProof') + '\n' +
  extractFunction('_viewTaggedArtifactProofMatches') + '\n' +
  extractFunction('_viewPatchBoundValidation') + '\n' +
  extractFunction('_viewDeriveVerificationState') + '\n' +
  extractFunction('_viewVerificationForExport') + '\n' +
  `return {
    hasLang: _htmlHasExplicitLanguage,
    derive: _viewDeriveVerificationState,
    forExport: _viewVerificationForExport,
    createBinding: _viewCreateVerificationHtmlBinding,
    verifyBinding: _viewVerifyVerificationHtmlBinding,
    isLiveBound: _viewIsLiveVerificationHtmlBound,
    enforceBinding: _viewEnforceVerificationHtmlBinding,
    rehydrateBinding: _viewRehydrateVerificationHtmlBinding,
    bindFresh: _viewBindFreshVerificationResult,
    bindValidation: _viewBindValidationToHtml,
    validationMatches: _viewValidationMatchesHtml,
    attachArtifactProof: _viewAttachTaggedArtifactProof,
    artifactProofMatches: _viewTaggedArtifactProofMatches,
    patchValidation: _viewPatchBoundValidation,
  };`
)(webcrypto, TextEncoder);

const fetchHelpers = new Function(
  extractFunction('_websiteFetchError') + '\n' +
  extractFunction('_readWebsiteResponseBounded') + '\n' +
  extractFunction('_fetchWebsiteSourceOnce') + '\n' +
  'return { readBounded: _readWebsiteResponseBounded, fetchOnce: _fetchWebsiteSourceOnce };'
)();

const canonicalStart = policySource.indexOf('function _alloDeriveVerificationState(');
const canonicalEnd = policySource.indexOf(String.fromCharCode(10) + 'function _alloUnavailableVerificationState', canonicalStart);
if (canonicalStart < 0 || canonicalEnd < 0) throw new Error('Canonical verification helper markers not found');
const canonicalDerive = new Function(
  policySource.slice(canonicalStart, canonicalEnd) + String.fromCharCode(10) + 'return _alloDeriveVerificationState;'
)();
globalThis.window.AlloModules = globalThis.window.AlloModules || {};
globalThis.window.AlloModules.VerificationPolicy = { deriveVerificationState: canonicalDerive };
const completeInput = () => ({
  ai: { score: 91 },
  axe: { score: 94, totalIncomplete: 0 },
  equalAccess: { score: 89, potentialViolations: 0, manualViolations: 0, reviewFindingCount: 0 },
  pdfUaSelfCheck: 'not-run',
});

describe('remediation view verification state', () => {
  it('keeps fallback policy in parity with the canonical verification matrix', () => {
    const cases = [
      completeInput(),
      {},
      { ...completeInput(), aiVerificationIncomplete: true },
      { ...completeInput(), ai: { score: Number.NaN }, axe: { score: Number.POSITIVE_INFINITY, totalIncomplete: 0 } },
      { ...completeInput(), axe: { score: 88 } },
      { ...completeInput(), axe: { score: 88, totalIncomplete: -4 } },
      { ...completeInput(), equalAccess: { score: 90, potentialViolations: 2, manualViolations: 1, reviewFindingCount: 1 } },
      { ...completeInput(), equalAccess: { score: 90, reviewFindingCount: 4 } },
      { ...completeInput(), languageReviewRequired: true, extraReasons: 'static-source-scope' },
    ];
    for (const input of cases) expect(helpers.derive(input, null)).toEqual(canonicalDerive(input));
  });

  it('marks complete evidence verified only when all three engines and review counts complete', () => {
    const result = helpers.derive(completeInput(), null);
    expect(result.verificationState).toBe('complete');
    expect(result.afterScoreVerified).toBe(true);
    expect(result.requiresManualReview).toBe(false);
    expect(result.coverage.equalAccess).toBe('complete');
    expect(result.verificationCoverage).toBe(result.coverage);
  });

  it('marks missing engines and unknown review counts partial rather than verified', () => {
    const missing = completeInput();
    missing.equalAccess = null;
    expect(helpers.derive(missing, null)).toMatchObject({
      verificationState: 'partial',
      afterScoreVerified: false,
      requiresManualReview: true,
    });

    const unknownAxe = completeInput();
    delete unknownAxe.axe.totalIncomplete;
    const axeResult = helpers.derive(unknownAxe, null);
    expect(axeResult.verificationState).toBe('partial');
    expect(axeResult.coverage.axe).toBe('partial');
    expect(axeResult.reasons).toContain('axe-review-count-unknown');

    const unknownEa = completeInput();
    delete unknownEa.equalAccess.potentialViolations;
    delete unknownEa.equalAccess.manualViolations;
    delete unknownEa.equalAccess.reviewFindingCount;
    const eaResult = helpers.derive(unknownEa, null);
    expect(eaResult.verificationState).toBe('partial');
    expect(eaResult.coverage.equalAccess).toBe('partial');
    expect(eaResult.reasons).toContain('equal-access-review-count-unknown');
  });

  it('retains language + indeterminate-rule gates; static-scope context rides reasons without counting (B3)', () => {
    const input = completeInput();
    input.axe.totalIncomplete = 2;
    input.languageReviewRequired = true;
    input.extraReasons = 'Static source excludes interaction behavior.';
    const result = helpers.derive(input, null);
    expect(result.verificationState).toBe('review-required');
    // B3 (2026-07-13): 2 axe incompletes + 1 language gate; the static-scope
    // caveat is context and no longer counts (was 4).
    expect(result.reviewCount).toBe(3);
    expect(result.reasons).toContain('document-language-needs-review');
    expect(result.reasons).toContain('Static source excludes interaction behavior.');
  });

  it('does not let an IBM aggregate under-report explicit review findings', () => {
    const input = completeInput();
    input.equalAccess = { score: 92, potentialViolations: 2, manualViolations: 1, reviewFindingCount: 1 };
    const result = helpers.derive(input, null);
    expect(result.verificationState).toBe('review-required');
    expect(result.reviewCount).toBe(3);
    expect(result.reasons).toEqual(expect.arrayContaining(['equal-access-potential:2', 'equal-access-manual:1']));
  });

  it('treats legacy export results as unverified even when raw scores exist', () => {
    const input = completeInput();
    const result = helpers.forExport({
      verificationAudit: input.ai,
      axeAudit: input.axe,
      secondEngineAudit: input.equalAccess,
    }, null);
    expect(result.afterScoreVerified).toBe(false);
    expect(result.verificationState).toBe('partial');
    expect(result.reasons[0]).toMatch(/predates canonical verification/i);

    const retainedAi = helpers.forExport({
      verificationCoverage: { standard: 'WCAG 2.2 AA' },
      verificationState: 'complete',
      verificationAudit: input.ai,
      axeAudit: input.axe,
      secondEngineAudit: input.equalAccess,
      _aiVerificationIncomplete: true,
    }, null);
    expect(retainedAi.afterScoreVerified).toBe(false);
    expect(retainedAi.verificationState).toBe('partial');
  });
});

function completeStoredResult(html) {
  const verification = helpers.derive(completeInput(), null);
  return {
    accessibleHtml: html,
    verificationAudit: completeInput().ai,
    axeAudit: completeInput().axe,
    secondEngineAudit: completeInput().equalAccess,
    verificationCoverage: verification.coverage,
    verificationState: verification.verificationState,
    verificationReasons: verification.reasons,
    verificationReviewCount: verification.reviewCount,
    afterScoreVerified: verification.afterScoreVerified,
    requiresManualReview: verification.requiresManualReview,
  };
}

describe('exact-HTML verification binding', () => {
  it('preserves null resets when enforcing a binding', () => {
    expect(helpers.enforceBinding(null, null, null)).toBeNull();
    expect(helpers.enforceBinding(undefined, null, null)).toBeUndefined();
  });

  it('keeps exact audited HTML verified and rejects same-length and Unicode-only changes', async () => {
    const html = '<main><p>cat café</p></main>';
    const bound = await helpers.bindFresh(completeStoredResult(html), html, null);
    expect(bound.verificationHtmlBinding).toMatchObject({ version: 1, algorithm: 'SHA-256' });
    expect(bound.verificationHtmlBinding.digest).toMatch(/^[a-f0-9]{64}$/);
    expect(helpers.isLiveBound(bound, html, null)).toBe(true);
    expect(helpers.forExport(bound, null).afterScoreVerified).toBe(true);
    const serializedProof = { ...bound, _verificationHtmlSnapshot: html };
    expect(helpers.isLiveBound(serializedProof, html, null)).toBe(false);
    expect(helpers.forExport(serializedProof, null).afterScoreVerified).toBe(false);

    const sameLength = '<main><p>dog café</p></main>';
    expect(sameLength.length).toBe(html.length);
    const originalBinding = bound.verificationHtmlBinding;
    bound.verificationHtmlBinding = await helpers.createBinding(sameLength, null);
    expect(helpers.isLiveBound(bound, html, null)).toBe(false);
    bound.verificationHtmlBinding = originalBinding;
    expect(helpers.isLiveBound(bound, html, null)).toBe(true);
    const sameLengthResult = { ...bound, accessibleHtml: sameLength };
    Object.defineProperty(sameLengthResult, '_verificationHtmlSnapshot', { value: html, enumerable: false });
    const sameLengthExport = helpers.forExport(sameLengthResult, null);
    expect(sameLengthExport.afterScoreVerified).toBe(false);
    expect(sameLengthExport.verificationState).toBe('partial');
    expect(sameLengthExport.reasons).toContain('verification-html-binding-missing-or-stale');

    const unicodeChange = '<main><p>cat cafö</p></main>';
    expect(unicodeChange.length).toBe(html.length);
    expect(new TextEncoder().encode(unicodeChange).byteLength).toBe(new TextEncoder().encode(html).byteLength);
    expect(await helpers.verifyBinding(unicodeChange, bound.verificationHtmlBinding, null)).toBe(false);
  });

  it('exports the persisted digest but never serializes the runtime snapshot', async () => {
    const html = '<main><h1>Bound report</h1></main>';
    const bound = await helpers.bindFresh(completeStoredResult(html), html, null);
    expect(Object.prototype.propertyIsEnumerable.call(bound, '_verificationHtmlSnapshot')).toBe(false);
    expect(Object.getOwnPropertyDescriptor(bound, '_verificationHtmlBindingDigest')).toMatchObject({
      enumerable: false,
      value: bound.verificationHtmlBinding.digest,
    });
    const serialized = JSON.stringify(bound);
    expect(serialized).toContain('verificationHtmlBinding');
    expect(serialized).not.toContain('_verificationHtmlSnapshot');
    expect(serialized).not.toContain('_verificationHtmlBindingDigest');
    const exported = helpers.forExport(bound, null);
    expect(exported.verificationHtmlBinding).toEqual(bound.verificationHtmlBinding);
    expect(exported).not.toHaveProperty('_verificationHtmlSnapshot');
  });

  it('rehydrates only a verified digest and ignores a forged serialized snapshot', async () => {
    const html = '<main><p>original</p></main>';
    const bound = await helpers.bindFresh(completeStoredResult(html), html, null);
    const saved = JSON.parse(JSON.stringify(bound));
    saved._verificationHtmlSnapshot = 'forged serialized value';
    const rehydrated = await helpers.rehydrateBinding(saved, null);
    expect(rehydrated._verificationHtmlSnapshot).toBe(html);
    expect(Object.prototype.propertyIsEnumerable.call(rehydrated, '_verificationHtmlSnapshot')).toBe(false);
    expect(helpers.isLiveBound(rehydrated, html, null)).toBe(true);

    const tamperedHtml = '<main><p>tampered</p></main>';
    const forged = { ...saved, accessibleHtml: tamperedHtml, _verificationHtmlSnapshot: tamperedHtml };
    const rejected = await helpers.rehydrateBinding(forged, null);
    expect(rejected._verificationHtmlSnapshot).toBeUndefined();
    expect(rejected.afterScoreVerified).toBe(false);
    expect(rejected.verificationState).toBe('partial');
    expect(rejected.verificationCoverage.pdfUaSelfCheck).toBe('not-run');
    expect(rejected.verificationReasons).toContain('verification-html-binding-missing-or-stale');
  });

  it('binds cached PDF/UA and veraPDF evidence to exact source HTML', async () => {
    const html = '<main><p>PDF source α</p></main>';
    const cached = await helpers.bindValidation({ pdfUa1Checks: { summary: { passed: true } }, veraPdf: { compliant: true } }, html, null);
    expect(helpers.validationMatches(cached, html)).toBe(true);
    const serializedCache = { ...cached, _sourceHtmlSnapshot: html };
    expect(helpers.validationMatches(serializedCache, html)).toBe(false);
    expect(helpers.validationMatches(helpers.patchValidation(serializedCache, { veraPdfAt: 'forged' }), html)).toBe(false);
    expect(helpers.validationMatches(cached, '<main><p>PDF source β</p></main>')).toBe(false);
    const patched = helpers.patchValidation(cached, { veraPdfAt: '2026-07-12T00:00:00.000Z' });
    expect(helpers.validationMatches(patched, html)).toBe(true);
    expect(JSON.stringify(patched)).toContain('sourceHtmlBinding');
    expect(JSON.stringify(patched)).not.toContain('_sourceHtmlSnapshot');
    expect(JSON.stringify(patched)).not.toContain('_sourceHtmlBindingDigest');
  });

  it('binds live validation evidence to one exact runtime artifact generation', async () => {
    const html = '<main><p>artifact bound</p></main>';
    const bytes = new Uint8Array([37, 80, 68, 70, 45, 49]);
    const ticket = { bytes, generation: 7 };
    const validation = await helpers.bindValidation({ veraPdf: { compliant: true } }, html, null);
    helpers.attachArtifactProof(validation, ticket);
    expect(helpers.artifactProofMatches(validation, ticket)).toBe(true);
    expect(helpers.artifactProofMatches(validation, { bytes: new Uint8Array(bytes), generation: 7 })).toBe(false);
    expect(helpers.artifactProofMatches(validation, { bytes, generation: 8 })).toBe(false);
    expect(Object.prototype.propertyIsEnumerable.call(validation, '_taggedArtifactBytes')).toBe(false);
    expect(JSON.stringify(validation)).not.toContain('_taggedArtifact');
    const patched = helpers.patchValidation(validation, { veraPdfAt: '2026-07-12T00:00:00.000Z' });
    expect(helpers.artifactProofMatches(patched, ticket)).toBe(true);
    expect(helpers.artifactProofMatches({ ...validation }, ticket)).toBe(false);
  });

  it('wires fresh binding, async project rehydration, gated exports, and stale PDF cache clearing', () => {
    expect(source).toContain('const _freshBinding = await _viewCreateVerificationHtmlBinding(newHtml, _docPipeline);');
    expect(source).toContain('const _boundWebResult = await _viewBindFreshVerificationResult({');
    expect((source.match(/reader\.onload = async \(ev\) => \{/g) || []).length).toBeGreaterThanOrEqual(2);
    expect((source.match(/const sanitizedImport = _viewSanitizeProjectImport\(parsedProject, _docPipeline\);/g) || []).length).toBe(2);
    expect((source.match(/await _viewRehydrateVerificationHtmlBinding\(sanitizedImport\.project, _docPipeline\)/g) || []).length).toBe(2);
    expect(source).not.toMatch(/if \(file\.size > _VIEW_MAX_PROJECT_FILE_BYTES\)[\s\S]{0,180}const file = e\.target\.files/);
    expect((source.match(/const _projectLoadToken = \+\+_projectLoadSelectionRef\.current;/g) || []).length).toBe(2);
    expect((source.match(/let _projectDocumentEpoch = typeof capturePdfDocumentIntakeEpoch/g) || []).length).toBe(2);
    expect((source.match(/const _projectLoadIsCurrent = \(\) =>/g) || []).length).toBe(2);
    expect((source.match(/if \(!_projectLoadIsCurrent\(\)\) return;/g) || []).length).toBeGreaterThanOrEqual(6);
    expect((source.match(/if \(typeof startNewPdfAudit === 'function'\) _projectDocumentEpoch = startNewPdfAudit\(\);/g) || []).length).toBe(2);
    expect((source.match(/setPendingPdfBase64\(project\.pdfBase64 \|\| null\)/g) || []).length).toBe(2);
    expect((source.match(/catch\(err\) \{ if \(_projectLoadIsCurrent\(\)\) addToast/g) || []).length).toBe(2);
    expect(source).toMatch(/setPdfAuditResult\(\{[\s\S]{0,260}?summary: 'Loaded from saved project'/);
    expect(source).toContain('verificationHtmlBinding: _jsonVerification.verificationHtmlBinding');
    expect(source).toContain('verificationResult: pdfFixResult');
    expect(source).toContain('const _currentTaggedValidation = (_viewValidationMatchesHtml(');
    expect(source).toContain('&& _viewTaggedArtifactProofMatches(lastTaggedValidation, _renderTaggedArtifactTicket)');
    expect(source).toContain('if (_veraPdfValidationIsCurrent(_veraRun))');
    expect(source).toContain('if (!_veraPdfValidationIsCurrent(_manualRun)) return;');
    expect(source).toContain('if (!_veraPdfValidationIsCurrent(_repairRun)) return;');
    expect(source).toContain('_newTaggedHash === _priorValidation.veraPdfBytesHash');
    expect((source.match(/_lastTaggedBytesRef\.current\s*=/g) || []).length).toBe(1);
    expect(source).toContain('const shippedFingerprint = _currentTaggedValidation ? await _sha256OfBytes');
    expect(source).toContain('setLastTaggedValidation(null);');
  });
});
describe('bounded website source fetching', () => {
  it('aborts a streaming response as soon as its byte ceiling is crossed', async () => {
    const cancel = vi.fn();
    const releaseLock = vi.fn();
    let call = 0;
    const response = {
      headers: { get: () => null },
      body: {
        getReader: () => ({
          read: async () => (++call === 1
            ? { done: false, value: new Uint8Array([65, 66, 67]) }
            : { done: false, value: new Uint8Array([68, 69]) }),
          cancel,
          releaseLock,
        }),
      },
    };
    const controller = { abort: vi.fn() };
    await expect(fetchHelpers.readBounded(response, 4, controller)).rejects.toThrow(/5 MB audit limit/);
    expect(cancel).toHaveBeenCalled();
    expect(controller.abort).toHaveBeenCalled();
    expect(releaseLock).toHaveBeenCalled();
  });

  it('uses streaming bytes, an abort signal, final response URL, and typed proxy causes', () => {
    expect(source).toContain('total += part.value.byteLength;');
    expect(source).toContain('controller.abort()');
    expect(source).toContain('signal: controller.signal');
    expect(source).toContain('directError.allowProxyFallback !== true');
    expect(source).toContain('const finalSourceUrl = (!usedProxyFallback && fetched.response && fetched.response.url)');
    expect(source).toContain('const baseHref = new URL(finalSourceUrl).href');
    expect(source).not.toContain("new URL('.', parsedUrl.href)");
    expect(source).not.toContain("_withTimeout(resp.text(), 20000, 'website response body')");
    expect(source).toContain('AllOrigins proxy fallback was used because');
  });
});

describe('web and workbench integration guards', () => {
  it('runs standalone static-source audit through AI, axe-core, and Equal Access without zero fallback', () => {
    const webStart = source.indexOf('data-help-key="pdf_audit_view_web_audit_btn"');
    const webBlock = source.slice(source.lastIndexOf('<button', webStart), webStart + 1000);
    expect(webBlock).toContain('auditOutputAccessibility(html)');
    expect(webBlock).toContain('runAxeAudit(html)');
    expect(webBlock).toContain('_docPipeline.runEqualAccessAudit(html)');
    expect(source).not.toContain('axeScore ?? aiScore ?? 0');
    expect(source).toContain('No 0/100 score was fabricated.');
  });

  it('does not guess English and uses the honest non-legacy web copy key', () => {
    expect(source).not.toContain("if (!fixed.includes('lang=')) fixed = fixed.replace(/<html/, '<html lang=\"en\"')");
    expect(source).toContain('const _sourceLanguageReviewRequired = !_htmlHasExplicitLanguage(html);');
    expect(source).toContain("t('pdf_audit.web.static_scope_subheading')");
    expect(source).not.toContain("t('pdf_audit.web.subheading')");
    expect(helpers.hasLang('<html lang=en><body></body></html>')).toBe(true);
    expect(helpers.hasLang('<html lang=""><body></body></html>')).toBe(false);
  });

  it('routes both section re-fix paths through the canonical three-engine audit', () => {
    expect((source.match(/await _commitRefixedSection\(result,/g) || []).length).toBe(2);
    const start = source.indexOf('const _commitRefixedSection');
    const end = source.indexOf('// Pure single-occurrence block splice', start);
    const block = source.slice(start, end);
    expect(block).toContain('verificationAudit: null');
    expect(block).toContain('axeAudit: null');
    expect(block).toContain('secondEngineAudit: null');
    expect(block).toContain("verificationReasons: ['content-modified-pending-reverification']");
    expect(block).toContain('const recheck = await _reauditAndScore(newHtml, null)');
    expect(source).not.toContain('const [reAi, reAxe] = await Promise.all');

    expect(source).not.toContain('axeAudit: reAxe || prev');
  });

  it('renders degraded web engines independently and exposes actionable review findings', () => {
    expect(source).not.toContain('pdfAuditResult._aiOnlyScore ?? pdfAuditResult.score');
    expect(source).toContain("AI: unavailable");
    expect(source).toContain("axe-core: unavailable");
    expect(source).toContain("Equal Access: unavailable");
    expect(source).toContain('Static source engine evidence');
    expect(source).toContain('axe-core rules needing manual review');
    expect(source).toContain('IBM Equal Access findings needing review');
    expect(source).toContain('axeAudit.incomplete');
    expect(source).toContain('eaAudit.potentialFindings');
    expect(source).toContain('eaAudit.manualFindings');
  });

  it('uses dark WCAG-safe status and action gradients for small white text', () => {
    expect(source).toContain('from-amber-800 to-orange-800');
    expect(source).toContain('from-green-700 to-emerald-800');
    expect(source).not.toContain('from-amber-600 to-orange-600');
    expect(source).not.toContain('from-green-600 to-emerald-600');
    expect(source).not.toContain('from-green-500 to-emerald-600');
  });

  it('exports canonical verification state and discloses static-source limits', () => {
    expect(source).toContain('afterScoreVerified: _jsonVerification.afterScoreVerified');
    expect(source).toContain('verificationReasons: _jsonVerification.reasons');
    expect(source).toContain('const _trailVerification = _verificationForExport(pdfFixResult)');
    expect(source).toContain('live scripts, external CSS, responsive states, and interaction behavior are not evaluated');
    expect(source).toContain('AI + axe-core + IBM Equal Access');
  });
});
describe('PDF verification recovery and referral separation', () => {
  it('renders the canonical state, engine coverage, reasons, and a verification-only retry', () => {
    expect(source).toContain('data-help-key="pdf_audit_verification_status"');
    expect(source).toContain('WCAG verification: {label}');
    expect(source).toContain('<strong>Equal Access:</strong> {engineLabel(coverage.equalAccess)}');
    expect(source).toContain("const reasons = Array.isArray(pdfFixResult.verificationReasons)");
    expect(source).toContain("_reauditAndScore(pdfFixResult.accessibleHtml, null)");
    const panel = source.slice(source.indexOf('data-help-key="pdf_audit_verification_status"'), source.indexOf('Results dashboard bar'));
    expect(panel).not.toContain('runAutoFixLoop');
  });

  it('does not turn verification-only partial/unavailable evidence into an expert referral', () => {
    expect(pipelineSource).not.toContain('if (_verificationState.requiresManualReview) {');
    expect(source).not.toContain('needsExpertReview: _verification.requiresManualReview');
    expect(source).toContain('Number.isFinite(_wscore) && _wscore < 50');
  });
});
