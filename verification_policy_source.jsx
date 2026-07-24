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
  var extraReasons = Array.isArray(input.extraReasons)
    ? input.extraReasons
    : (input.extraReasons == null || input.extraReasons === '' ? [] : [input.extraReasons]);
  var _reasonText = extraReasons.map(function (reason) {
    return String(reason == null ? '' : reason).trim();
  }).filter(Boolean);
  // Static source checks can completely execute while still excluding runtime
  // scripts, external CSS, responsive states, and interaction behavior. Accept
  // an explicit scope for new callers and recognize the existing caveat text so
  // older callers fail closed without a lock-step deployment.
  var staticSourceScope = input.staticSourceScope === true
    || input.verificationScope === 'static-source'
    || input.scope === 'static-source'
    || _reasonText.some(function (reason) {
      return /static(?:[\s-]+html\/?)?[\s-]*source(?:[\s-]+audit)?|excludes live scripts|interaction behavior/i.test(reason);
    });

  var aiStatus = 'unavailable';
  var aiIssues = Array.isArray(ai && ai.issues)
    ? ai.issues.filter(function (issue) { return issue != null && issue !== ''; })
    : null;
  var aiFindingCount = aiIssues
    ? aiIssues.length
    : (_count(ai && ai.issueCount) !== null ? _count(ai && ai.issueCount) : _count(ai && ai.totalIssues));
  var aiReviewCount = aiIssues
    ? aiIssues.filter(function (issue) { return !!(issue && issue.requiresManualReview === true); }).length
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
    } else if (aiFindingCount === null) {
      aiStatus = 'partial';
      reasons.push('ai-finding-count-unknown');
    } else if (aiReviewCount > 0) {
      aiStatus = 'complete-with-review';
    } else {
      aiStatus = 'complete';
    }
  }

  var axeStatus = 'unavailable';
  var axeReviewCount = 0;
  var axeFindingCount = _count(axe && axe.totalViolations);
  if (!_finite(axe && axe.score)) {
    reasons.push('axe-unavailable');
  } else {
    var _axeIncomplete = _count(axe.totalIncomplete);
    if (axeFindingCount === null || _axeIncomplete === null) {
      axeStatus = 'partial';
      if (axeFindingCount === null) reasons.push('axe-violation-count-unknown');
      if (_axeIncomplete === null) reasons.push('axe-review-count-unknown');
      if ((_axeIncomplete || 0) > 0) {
        axeReviewCount = _axeIncomplete;
        reasons.push('axe-incomplete:' + _axeIncomplete);
      }
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
  var eaFindingCount = _count(ea && ea.failViolations);
  if (!_finite(ea && ea.score)) {
    reasons.push('equal-access-unavailable');
  } else {
    var _eaPotential = _count(ea.potentialViolations);
    var _eaManual = _count(ea.manualViolations);
    var _eaAggregate = _count(ea.reviewFindingCount);
    var _eaReviewKnown = !((_eaPotential === null || _eaManual === null) && _eaAggregate === null);
    if (_eaReviewKnown) {
      eaReviewCount = _eaAggregate !== null ? Math.max(_eaAggregate, (_eaPotential || 0) + (_eaManual || 0)) : ((_eaPotential || 0) + (_eaManual || 0));
      if ((_eaPotential || 0) > 0) reasons.push('equal-access-potential:' + _eaPotential);
      if ((_eaManual || 0) > 0) reasons.push('equal-access-manual:' + _eaManual);
      if ((_eaPotential === null || _eaManual === null) && _eaAggregate > 0) reasons.push('equal-access-review-findings:' + _eaAggregate);
    }
    if (eaFindingCount === null || !_eaReviewKnown) {
      eaStatus = 'partial';
      if (eaFindingCount === null) reasons.push('equal-access-failure-count-unknown');
      if (!_eaReviewKnown) reasons.push('equal-access-review-count-unknown');
    } else if (eaReviewCount > 0) {
      eaStatus = 'complete-with-review';
    } else {
      eaStatus = 'complete';
    }
  }

  if ((aiFindingCount || 0) > 0) reasons.push('ai-confirmed-issues:' + aiFindingCount);
  if ((axeFindingCount || 0) > 0) reasons.push('axe-confirmed-violations:' + axeFindingCount);
  if ((eaFindingCount || 0) > 0) reasons.push('equal-access-confirmed-failures:' + eaFindingCount);
  _reasonText.forEach(function (reason) {
    reasons.push(reason);
  });
  if (input.languageReviewRequired) reasons.push(String(input.languageReviewReason || 'document-language-needs-review'));

  // B3 (2026-07-13): extraReasons are CONTEXT (e.g. the static-web scope caveat) —
  // they ride in `reasons` so "Why this status?" names them, but they no longer
  // count as review findings. Counting them made 'complete' unreachable for every
  // web audit (the ==='complete' success branches were dead code) and let a
  // zero-engines-ran result claim 'review-required' over 'unavailable'.
  // languageReviewRequired stays a genuine gate (a human confirms the language).
  var reviewCount = aiReviewCount + axeReviewCount + eaReviewCount + (input.languageReviewRequired ? 1 : 0);
  var allUnavailable = aiStatus === 'unavailable' && axeStatus === 'unavailable' && eaStatus === 'unavailable';
  var engineExecutionComplete = [aiStatus, axeStatus, eaStatus].every(function (status) {
    return status === 'complete' || status === 'complete-with-review';
  });
  var executionState = allUnavailable ? 'unavailable' : (engineExecutionComplete ? 'complete' : 'partial');
  var knownFindingCount = (aiFindingCount || 0) + (axeFindingCount || 0) + (eaFindingCount || 0);
  var hasKnownFailures = knownFindingCount > 0;
  var hasReviewEvidence = reviewCount > 0 || aiStatus === 'complete-with-review' || axeStatus === 'complete-with-review' || eaStatus === 'complete-with-review';
  // Execution coverage and outcome are deliberately separate. An engine can
  // finish successfully and report barriers; that is a complete execution, not
  // a fully verified success.
  var outcomeState = hasKnownFailures
    ? 'fail'
    : (hasReviewEvidence ? 'review-required' : (engineExecutionComplete ? 'pass' : 'unknown'));
  var testedScopeComplete = engineExecutionComplete && !hasKnownFailures && !hasReviewEvidence;
  var verificationState = allUnavailable
    ? 'unavailable'
    : (!engineExecutionComplete
      ? 'partial'
      : (hasKnownFailures || hasReviewEvidence
        ? 'review-required'
        : (staticSourceScope ? 'complete-for-tested-scope' : 'complete')));
  var coverage = {
    standard: 'WCAG 2.2 AA',
    ai: aiStatus,
    axe: axeStatus,
    equalAccess: eaStatus,
    pdfUaSelfCheck: input.pdfUaSelfCheck || 'not-run'
  };
  var scoreEvidence = {
    ai: _finite(ai && ai.score) ? ai.score : null,
    axe: _finite(axe && axe.score) ? axe.score : null,
    equalAccess: _finite(ea && ea.score) ? ea.score : null
  };
  var knownFindings = {
    aiIssues: aiFindingCount,
    axeViolations: axeFindingCount,
    equalAccessFailures: eaFindingCount,
    total: knownFindingCount
  };
  var fullyVerifiedSuccess = verificationState === 'complete'
    && executionState === 'complete'
    && outcomeState === 'pass';
  // Build the result in a var (rather than a two-space `return {`) because the
  // pipeline-integrity checker locates the factory export through that token.
  var result = {
    verificationCoverage: coverage,
    coverage: coverage,
    verificationState: verificationState,
    executionState: executionState,
    outcomeState: outcomeState,
    verificationScope: staticSourceScope ? 'static-source' : 'full-output',
    testedScopeComplete: testedScopeComplete,
    engineExecutionComplete: engineExecutionComplete,
    fullyVerifiedSuccess: fullyVerifiedSuccess,
    success: fullyVerifiedSuccess,
    afterScoreVerified: fullyVerifiedSuccess,
    requiresManualReview: !fullyVerifiedSuccess,
    reviewCount: reviewCount,
    knownFindingCount: knownFindingCount,
    knownFindings: knownFindings,
    scoreEvidence: scoreEvidence,
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
    executionState: 'unavailable',
    outcomeState: 'unknown',
    verificationScope: 'full-output',
    testedScopeComplete: false,
    engineExecutionComplete: false,
    fullyVerifiedSuccess: false,
    success: false,
    afterScoreVerified: false,
    requiresManualReview: true,
    reviewCount: 1,
    knownFindingCount: 0,
    knownFindings: {
      aiIssues: null,
      axeViolations: null,
      equalAccessFailures: null,
      total: 0
    },
    scoreEvidence: { ai: null, axe: null, equalAccess: null },
    reasons: [why]
  };
}

window.AlloModules = window.AlloModules || {};
window.AlloModules.VerificationPolicy = {
  deriveVerificationState: _alloDeriveVerificationState,
  unavailableVerificationState: _alloUnavailableVerificationState,
};
window.AlloModules.VerificationPolicyModule = true;

