import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const src = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');

const loopStart = src.indexOf('const runAutoFixLoop = React.useCallback');
const loopEnd = src.indexOf('const saveProjectToFile = React.useCallback', loopStart);
const loop = src.slice(loopStart, loopEnd);
const saveStart = loopEnd;
const saveEnd = src.indexOf('// pdfFixResult effect', saveStart);
const saveBlock = src.slice(saveStart, saveEnd);
const loaderStart = src.indexOf('const _savedProject = JSON.parse(ev.target.result);');
const loaderEnd = src.indexOf("reader.readAsText(file); e.target.value = '';", loaderStart);
const loaderBlock = src.slice(loaderStart, loaderEnd);

const readyForSuccess = (state) => !!(
  state &&
  state.verificationState === 'complete' &&
  state.afterScoreVerified === true &&
  !state.requiresManualReview &&
  !state.needsExpertReview &&
  !state.fidelityLimited &&
  state.htmlBound === true
);

describe('auto-continue canonical verification', () => {
  it('contains the complete reconstructed loop, including all baseline safety stages', () => {
    expect(loopStart).toBeGreaterThan(-1);
    expect(loopEnd).toBeGreaterThan(loopStart);
    for (const landmark of [
      'waitForGeminiCalm({',
      'autoFixAxeViolations(',
      'aiFixChunked(',
      'const reVerify = await auditOutputAccessibility(result.html);',
      'const _detRegressed =',
      'recomputeContentFidelity(cur.sourceText, result.html)',
      'setPdfFixResult(snapshot);',
      'if (!_genStale()) {',
    ]) {
      expect(loop).toContain(landmark);
    }
    expect(loop).not.toContain('} else {    } finally');
  });

  it('requires canonical completion and no expert/fidelity concern before celebration', () => {
    expect(readyForSuccess({ verificationState: 'complete', afterScoreVerified: true, requiresManualReview: false, needsExpertReview: false, fidelityLimited: false, htmlBound: true })).toBe(true);
    expect(readyForSuccess({ verificationState: 'complete', afterScoreVerified: true, requiresManualReview: false, needsExpertReview: false, fidelityLimited: false, htmlBound: false })).toBe(false);
    expect(readyForSuccess({ verificationState: 'review-required', afterScoreVerified: false, requiresManualReview: true })).toBe(false);
    expect(readyForSuccess({ verificationState: 'complete', afterScoreVerified: true, requiresManualReview: false, needsExpertReview: true })).toBe(false);
    expect(readyForSuccess({ verificationState: 'complete', afterScoreVerified: true, requiresManualReview: false, fidelityLimited: true })).toBe(false);
  });

  it('derives each accepted round from all three fresh engines through the shared policy helper', () => {
    expect(src).toContain("typeof _docPipeline.deriveVerificationState === 'function'");
    expect(loop).toMatch(/deriveVerificationState\(\{\s*ai: reVerify,\s*axe: _freshAxe,\s*equalAccess: _freshEa,/);
    expect(loop).toContain("const _freshAxe = (result.axe && typeof result.axe.score === 'number' && Number.isFinite(result.axe.score)) ? result.axe : null;");
    expect(loop).toContain("const _freshEa = (_ea && typeof _ea.score === 'number' && Number.isFinite(_ea.score)) ? _ea : null;");
  });

  it('never carries prior axe or Equal Access objects through a failed fresh audit', () => {
    expect(loop).toContain('axeAudit: _freshAxe,');
    expect(loop).toContain('secondEngineAudit: _freshEa,');
    expect(loop).toContain('axeScore: _freshAxe ? _freshAxe.score : null,');
    expect(loop).not.toContain('secondEngineAudit: _ea || cur.secondEngineAudit');
    expect(loop).not.toContain('axeViolations: result.axe ? result.axe.totalViolations : cur.axeViolations');
  });

  it('uses one audit-only refresh for clean incomplete evidence and never performs an empty rewrite', () => {
    expect(loop).toContain('const _auditOnlyRefresh = _vio === 0 && _aiIssues.length === 0 && _eaFails === 0 && !_isCanonicalComplete(cur);');
    expect(loop).toContain('} else if (_auditOnlyRefresh) {');
    expect(loop).toContain('result = { html: cur.accessibleHtml, axe: _refreshAxe, passes: 0, _auditOnly: true };');
    expect(loop).toContain('if (!result._auditOnly && (_detRegressed || _moreIssues)) {');
    expect(loop).toContain('if (result._auditOnly) break;');
  });

  it('syncs canonical verification, score provenance, and expert-review state to rendered and saved-ref snapshots', () => {
    for (const field of [
      'verificationCoverage',
      'verificationState',
      'afterScoreVerified',
      'requiresManualReview',
      'verificationReviewCount',
      'verificationReasons',
      '_aiVerificationIncomplete',
      '_scoreSource',
      'needsExpertReview',
      'expertReviewReason',
    ]) {
      expect(loop).toContain(field);
    }
    expect(loop).toContain('setPdfFixResult(snapshot);');
    expect(loop).toContain('const _expertBase = { needed: !!_expertBaseReason, reason: _expertBaseReason };');
    expect(loop).toContain('_verificationExpertReview: false');
    expect(loop).toContain('_expertReviewBeforeVerification: null');
  });

  it('centrally enforces exact-HTML binding before every raw React state write', () => {
    expect(src).toContain('const [pdfFixResult, _setPdfFixResultRaw] = useState(null);');
    expect(src).toContain("const enforced = verificationBindingHelpersRef.current.enforce(candidate, 'verification-html-binding-missing-or-stale');");
    expect(src).toContain('candidate.accessibleHtml === previous.accessibleHtml');
    expect(src).toContain('verificationBindingHelpersRef.current.isLive(previous, previous.accessibleHtml)');
    expect(src).toContain('attachVerificationHtmlProof(candidate, previous.accessibleHtml);');
    expect(src).toContain('if (candidateHtml !== previousHtml) pdfHtmlRevisionRef.current += 1;');
    expect(src.indexOf('pdfFixResultRef.current = enforced;')).toBeLessThan(src.indexOf('_setPdfFixResultRaw(enforced);'));
    expect(src.match(/_setPdfFixResultRaw\(/g)).toHaveLength(1);
  });

  it('creates a fresh SHA binding and non-enumerable snapshot for each accepted round', () => {
    expect(loop).toContain('const _verificationHtmlBinding = await createVerificationHtmlBinding(result.html);');
    expect(loop).toContain('verificationHtmlBinding: _verificationHtmlBinding');
    expect(loop).toContain('!attachVerificationHtmlProof(cur, result.html)');
    expect(src).toContain("Object.defineProperty(result, '_verificationHtmlBindingDigest'");
    expect(loop).toContain('isLiveVerificationHtmlBound(c, c.accessibleHtml)');
    expect(loop).toContain("cur = enforceVerificationHtmlBinding(cur, 'verification-html-binding-unavailable');");
  });

  it('drops artifact-specific evidence after rewrites and cancels late rounds after manual edits', () => {
    expect(loop).toContain('const _roundHtmlRevision = pdfHtmlRevisionRef.current;');
    expect(loop.match(/pdfHtmlRevisionRef.current !== _roundHtmlRevision/g)?.length).toBeGreaterThanOrEqual(3);
    expect(loop).toContain('const _sameRoundHtml = result.html === cur.accessibleHtml');
    expect(loop).toContain('const _roundPdfUaSelfCheck = _sameRoundHtml');
    expect(loop.match(/pdfUaSelfCheck: _roundPdfUaSelfCheck/g)).toHaveLength(2);
    expect(loop).toContain('cur = pdfFixResultRef.current;');
  });

  it('detects same-length HTML edits in autosave identity and persists no runtime snapshot', () => {
    const fnMatch = src.match(/  function _autosaveHtmlFingerprint\(html\) \{[\s\S]*?\n  \}/);
    expect(fnMatch).not.toBeNull();
    const fingerprint = Function(`${fnMatch[0]}; return _autosaveHtmlFingerprint;`)();
    expect(fingerprint('<p>alpha</p>')).not.toBe(fingerprint('<p>bravo</p>'));
    expect(saveBlock).toContain("? ('sha256:' + _liveSaveBinding.digest)");
    expect(saveBlock).toContain("('local:' + _autosaveHtmlFingerprint(cur.accessibleHtml))");
    expect(saveBlock).toContain('verificationBindingHelpersRef.current.isLive(cur, cur.accessibleHtml)');
    expect(saveBlock).toContain('verificationHtmlBinding: _liveSaveBinding ? {');
    expect(saveBlock).not.toMatch(/_verificationHtmlSnapshot\s*:/);
    expect(saveBlock).not.toMatch(/_verificationHtmlBindingDigest\s*:/);
  });

  it('rehydrates loaded projects asynchronously and never trusts a serialized snapshot', () => {
    expect(src).toContain('reader.onload = async (ev) => {');
    expect(loaderBlock).toContain('const _sanitizedImport = _projectSanitizer(_savedProject);');
    expect(loaderBlock).toContain('const project = await rehydrateVerificationHtmlBinding(_sanitizedImport.project);');
    expect(loaderBlock).toContain('const _loadedHtmlBound = isLiveVerificationHtmlBound(project, project.accessibleHtml);');
    expect(loaderBlock).toContain('|| !_loadedHtmlBound');
    expect(loaderBlock).toContain('attachVerificationHtmlProof(_loadedPdfFixResult, project.accessibleHtml);');
    expect(loaderBlock).not.toContain('_savedProject._verificationHtmlSnapshot');
    expect(src).toContain('try { delete restored._verificationHtmlSnapshot; } catch (_) {}');
    expect(src).toContain('try { delete restored._verificationHtmlBindingDigest; } catch (_) {}');
    expect(src).toContain('const restored = await rehydrateVerificationHtmlBinding(parsed.pdfFixResult);');
  });

  it('lets only the most recently selected project publish asynchronously loaded state', () => {
    const projectLoader = src.slice(
      src.lastIndexOf('const file = e.target.files?.[0]; if (!file) return;', loaderStart),
      loaderEnd,
    );
    expect(src).toContain('const pdfProjectLoadEpochRef = useRef(0);');
    expect(projectLoader).toContain('const _projectLoadEpoch = ++pdfProjectLoadEpochRef.current;');
    expect(projectLoader.match(/_projectLoadEpoch !== pdfProjectLoadEpochRef\.current/g)).toHaveLength(2);
    expect(projectLoader.indexOf('const project = await rehydrateVerificationHtmlBinding(_sanitizedImport.project);')).toBeLessThan(
      projectLoader.lastIndexOf('if (_projectLoadEpoch !== pdfProjectLoadEpochRef.current) return;'),
    );
    expect(projectLoader).toContain('if (_projectLoadEpoch === pdfProjectLoadEpochRef.current) addToast');
  });

  it('explains stale, mismatched, and unavailable bindings in readable language', () => {
    expect(src).toContain("value === 'verification-html-binding-missing-or-stale'");
    expect(src).toContain("value === 'verification-html-binding-unavailable'");
    expect(src).toContain("value === 'verification-html-binding-mismatch'");
    expect(src).toContain('The document changed after verification');
  });
  it('fails closed when the HTML changes but its length stays identical', () => {
    const extract = (name) => {
      const match = src.match(new RegExp(`  (?:async )?function ${name}\\([^\\n]*\\) \\{[\\s\\S]*?\\n  \\}`));
      expect(match, `missing ${name}`).not.toBeNull();
      return match[0];
    };
    const helperNames = [
      'attachVerificationHtmlProof',
      'isLiveVerificationHtmlBound',
      'applyVerificationHtmlBinding',
      'enforceVerificationHtmlBinding',
    ];
    const helpers = Function(
      `const _docPipeline = null;\n${helperNames.map(extract).join('\n')}\nreturn { ${helperNames.join(', ')} };`,
    )();
    const original = '<p>alpha</p>';
    const edited = '<p>bravo</p>';
    expect(edited).toHaveLength(original.length);
    const result = {
      accessibleHtml: original,
      verificationHtmlBinding: {
        version: 1,
        algorithm: 'SHA-256',
        digest: '0'.repeat(64),
        utf8ByteLength: new TextEncoder().encode(original).byteLength,
      },
      verificationState: 'complete',
      afterScoreVerified: true,
      requiresManualReview: false,
      verificationReasons: [],
    };
    expect(helpers.attachVerificationHtmlProof(result, original)).toBe(true);
    expect(helpers.isLiveVerificationHtmlBound(result, original)).toBe(true);
    const serializedProof = { ...result, _verificationHtmlSnapshot: original };
    expect(helpers.isLiveVerificationHtmlBound(serializedProof, original)).toBe(false);
    const wrongByteLength = { ...result, verificationHtmlBinding: { ...result.verificationHtmlBinding, utf8ByteLength: 1 } };
    expect(helpers.attachVerificationHtmlProof(wrongByteLength, original)).toBe(true);
    expect(helpers.isLiveVerificationHtmlBound(wrongByteLength, original)).toBe(false);
    const originalBinding = result.verificationHtmlBinding;
    result.verificationHtmlBinding = { ...originalBinding, digest: '1'.repeat(64) };
    expect(helpers.isLiveVerificationHtmlBound(result, original)).toBe(false);
    result.verificationHtmlBinding = originalBinding;
    expect(helpers.isLiveVerificationHtmlBound(result, edited)).toBe(false);
    const enforced = helpers.enforceVerificationHtmlBinding({ ...result, accessibleHtml: edited });
    expect(enforced.verificationState).toBe('partial');
    expect(enforced.afterScoreVerified).toBe(false);
    expect(enforced.requiresManualReview).toBe(true);
    expect(enforced.verificationReasons).toContain('verification-html-binding-missing-or-stale');
    expect(helpers.enforceVerificationHtmlBinding({ accessibleHtml: '', verificationState: 'complete', afterScoreVerified: true })).toMatchObject({
      verificationState: 'partial', afterScoreVerified: false, requiresManualReview: true,
    });
  });
  it('derives expert-review enum state from fresh fidelity and preserves a false base sentinel', () => {
    const freshFidelity = loop.indexOf('const _nextFidelityLimited = _roundFid');
    const expertDerivation = loop.indexOf('const _freshContentFidelityReview = !!_nextFidelityLimited;');
    expect(freshFidelity).toBeGreaterThan(-1);
    expect(expertDerivation).toBeGreaterThan(freshFidelity);
    expect(loop).toContain('const _expertBase = { needed: !!_expertBaseReason, reason: _expertBaseReason };');
    expect(loop).toContain('? { needed: false, reason: null }');
  });

  it('gates success stops/toasts and routes incomplete verification to a readable warning', () => {
    expect(loop).toContain('if ((cur.afterScore || 0) >= pdfTargetScore && _isCanonicalComplete(cur)) break;');
    expect(loop).toContain('if (_vio === 0 && _aiIssues.length === 0 && _eaFails === 0 && _isCanonicalComplete(cur)) break;');
    expect(loop).toContain('else if (cur && (cur.afterScore || 0) >= pdfTargetScore && _canonicalComplete && !_expertOrFidelityReview)');
    expect(loop).toContain('_reviewReasons.map(formatVerificationReason)');
    expect(loop).toContain("addToast('Human review required at score '");
    expect(loop).toMatch(/Human review required at score[\s\S]*?'warning'/);
  });

  it('keeps the cached-module fallback in parity with unknown/manual verification states', () => {
    expect(src).toContain("const _finite = (value) => typeof value === 'number' && Number.isFinite(value);");
    expect(src).toContain("_reasons.push('axe-review-count-unknown')");
    expect(src).toContain('const _eaAggregate = _count(_ea.reviewFindingCount);');
    expect(src).toContain("(_allUnavailable ? 'unavailable' : 'partial')");
  });

  it('persists canonical verification in the autosave hash/project and derives it for legacy loads', () => {
    expect(src).toContain("String(cur.verificationState || '')");
    for (const field of [
      'verificationCoverage: cur.verificationCoverage || null',
      'verificationState: cur.verificationState || null',
      'afterScoreVerified: cur.afterScoreVerified === true',
      'requiresManualReview: !!cur.requiresManualReview',
      'verificationReviewCount: Number.isFinite(cur.verificationReviewCount)',
      'verificationReasons: Array.isArray(cur.verificationReasons)',
    ]) {
      expect(src).toContain(field);
    }
    expect(src).toContain('const _derivedProjectVerification = deriveVerificationState({');
    expect(src).toContain('verificationCoverage: _loadedVerificationCoverage');
    expect(src).toContain('verificationState: _loadedVerificationState');
  });
});