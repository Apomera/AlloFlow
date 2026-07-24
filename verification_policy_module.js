(function(){"use strict";
if(window.AlloModules&&window.AlloModules.VerificationPolicyModule){console.log("[CDN] VerificationPolicyModule already loaded, skipping"); return;}
// verification_policy_source.jsx — canonical remediation verification policy.
// This is intentionally independent of React and the PDF pipeline so every
// surface interprets AI, axe-core, and Equal Access evidence identically.

function _alloDeriveVerificationState(input) {
  input = input || {};
  var ai = input.ai || input.verificationAudit || null;
  var axe = input.axe || input.axeAudit || null;
  var ea = input.equalAccess || input.secondEngineAudit || null;
  var reasons = [];
  var _finite = function (v) { return typeof v === 'number' && Number.isFinite(v); };
  var _count = function (v) { return _finite(v) ? Math.max(0, Math.floor(v)) : null; };

  var aiStatus = 'unavailable';
  var aiReviewCount = Array.isArray(ai && ai.issues)
    ? ai.issues.filter(function (issue) { return !!(issue && issue.requiresManualReview === true); }).length
    : 0;
  if (aiReviewCount > 0) reasons.push('ai-manual-review:' + aiReviewCount);
  if (!_finite(ai && ai.score)) {
    reasons.push('ai-unavailable');
  } else {
    var _aiPartial = !!(input.aiIncomplete || input.aiVerificationIncomplete || ai._partialAudit || ai.partial || ai._scoreDegraded || ai.scoreDegraded || ai.synthesized);
    if (_aiPartial) {
      aiStatus = 'partial';
      if (input.aiIncomplete || input.aiVerificationIncomplete) reasons.push('ai-verification-incomplete');
      if (ai._partialAudit || ai.partial) reasons.push('ai-partial-audit');
      if (ai._scoreDegraded || ai.scoreDegraded) reasons.push('ai-score-degraded');
      if (ai.synthesized) reasons.push('ai-synthesized');
    } else if (aiReviewCount > 0) {
      aiStatus = 'complete-with-review';
    } else {
      aiStatus = 'complete';
    }
  }

  var axeStatus = 'unavailable';
  var axeReviewCount = 0;
  if (!_finite(axe && axe.score)) {
    reasons.push('axe-unavailable');
  } else {
    var _axeIncomplete = _count(axe.totalIncomplete);
    if (_axeIncomplete === null) {
      axeStatus = 'partial';
      reasons.push('axe-review-count-unknown');
    } else if (_axeIncomplete > 0) {
      axeStatus = 'complete-with-review';
      axeReviewCount = _axeIncomplete;
      reasons.push('axe-incomplete:' + _axeIncomplete);
    } else {
      axeStatus = 'complete';
    }
  }

  var eaStatus = 'unavailable';
  var eaReviewCount = 0;
  if (!_finite(ea && ea.score)) {
    reasons.push('equal-access-unavailable');
  } else {
    var _eaPotential = _count(ea.potentialViolations);
    var _eaManual = _count(ea.manualViolations);
    var _eaAggregate = _count(ea.reviewFindingCount);
    if ((_eaPotential === null || _eaManual === null) && _eaAggregate === null) {
      eaStatus = 'partial';
      reasons.push('equal-access-review-count-unknown');
    } else {
      eaReviewCount = _eaAggregate !== null ? Math.max(_eaAggregate, (_eaPotential || 0) + (_eaManual || 0)) : ((_eaPotential || 0) + (_eaManual || 0));
      if (eaReviewCount > 0) {
        eaStatus = 'complete-with-review';
        if ((_eaPotential || 0) > 0) reasons.push('equal-access-potential:' + _eaPotential);
        if ((_eaManual || 0) > 0) reasons.push('equal-access-manual:' + _eaManual);
        if ((_eaPotential === null || _eaManual === null) && _eaAggregate > 0) reasons.push('equal-access-review-findings:' + _eaAggregate);
      } else {
        eaStatus = 'complete';
      }
    }
  }

  var extraReasons = Array.isArray(input.extraReasons)
    ? input.extraReasons
    : (input.extraReasons == null || input.extraReasons === '' ? [] : [input.extraReasons]);
  extraReasons.forEach(function (reason) {
    var text = String(reason == null ? '' : reason).trim();
    if (text) reasons.push(text);
  });
  if (input.languageReviewRequired) reasons.push(String(input.languageReviewReason || 'document-language-needs-review'));

  // B3 (2026-07-13): extraReasons are CONTEXT (e.g. the static-web scope caveat) —
  // they ride in `reasons` so "Why this status?" names them, but they no longer
  // count as review findings. Counting them made 'complete' unreachable for every
  // web audit (the ==='complete' success branches were dead code) and let a
  // zero-engines-ran result claim 'review-required' over 'unavailable'.
  // languageReviewRequired stays a genuine gate (a human confirms the language).
  var reviewCount = aiReviewCount + axeReviewCount + eaReviewCount + (input.languageReviewRequired ? 1 : 0);
  var allComplete = aiStatus === 'complete' && axeStatus === 'complete' && eaStatus === 'complete';
  var allUnavailable = aiStatus === 'unavailable' && axeStatus === 'unavailable' && eaStatus === 'unavailable';
  var hasReviewEvidence = reviewCount > 0 || aiStatus === 'complete-with-review' || axeStatus === 'complete-with-review' || eaStatus === 'complete-with-review';
  var verificationState = allUnavailable ? 'unavailable' : (hasReviewEvidence ? 'review-required' : (allComplete ? 'complete' : 'partial'));
  var coverage = {
    standard: 'WCAG 2.2 AA',
    ai: aiStatus,
    axe: axeStatus,
    equalAccess: eaStatus,
    pdfUaSelfCheck: input.pdfUaSelfCheck || 'not-run'
  };
  // Build the result in a var (rather than a two-space `return {`) because the
  // pipeline-integrity checker locates the factory export through that token.
  var result = {
    verificationCoverage: coverage,
    coverage: coverage,
    verificationState: verificationState,
    afterScoreVerified: verificationState === 'complete',
    requiresManualReview: verificationState !== 'complete',
    reviewCount: reviewCount,
    reasons: reasons
  };
  return result;
}

function _alloUnavailableVerificationState(reason) {
  var why = String(reason || 'verification-policy-module-unavailable');
  var coverage = {
    standard: 'WCAG 2.2 AA',
    ai: 'unavailable',
    axe: 'unavailable',
    equalAccess: 'unavailable',
    pdfUaSelfCheck: 'not-run'
  };
  return {
    verificationCoverage: coverage,
    coverage: coverage,
    verificationState: 'unavailable',
    afterScoreVerified: false,
    requiresManualReview: true,
    reviewCount: 1,
    reasons: [why]
  };
}

window.AlloModules = window.AlloModules || {};
window.AlloModules.VerificationPolicy = {
  deriveVerificationState: _alloDeriveVerificationState,
  unavailableVerificationState: _alloUnavailableVerificationState,
};
window.AlloModules.VerificationPolicyModule = true;
})();
