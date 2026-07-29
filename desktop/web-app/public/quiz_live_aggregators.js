/**
 * AlloFlow Quiz Live Aggregators
 *
 * Plan T Slice Tb: pure aggregation functions that read from
 * `quizState.allResponses` (the new field populated in Slice Ta) plus the
 * quiz item shape, and emit mode-specific aggregations for the teacher
 * dashboard. Three live aggregators + one stub:
 *
 *   gradebook        → exit-ticket: per-student score table
 *   preLessonGap     → pre-check: which prereqs the class is missing
 *   liveHeatmap      → formative: real-time per-question correct %
 *   retentionCurve   → review (v3): cross-session retention; falls back to liveHeatmap for v2
 *
 * Plus a shared per-item-type grader that infers correctness from the
 * student's submitted response payload. For freeform types where the
 * student didn't compute a status locally (text-only responses), the
 * grader does cheap fuzzy match for fill-blank or marks 'submitted' for
 * short-answer/self-explanation (those need teacher judgment).
 *
 * Module export: window.AlloModules.QuizLiveAggregators
 */
(function () {
  'use strict';
  if (window.AlloModules && window.AlloModules.QuizLiveAggregators) {
    console.log('[CDN] QuizLiveAggregators already loaded, skipping');
    return;
  }

  // ─── Helper: normalize a concept label into a stable identifier ───────
  // Plan T v3+ Chunk 5: cross-session retention tracking treats two labels
  // as the same concept when their normalized form matches. Without this,
  // "Photosynthesis", "the photosynthesis process", and "photosynthesis."
  // would each be a separate concept and fragment retention data.
  //
  // Rules (in order):
  //   1. trim whitespace, lowercase
  //   2. strip surrounding quote / paren chars
  //   3. strip leading articles (the / a / an), repeatedly
  //   4. collapse internal whitespace runs to single space
  //   5. strip trailing punctuation (. , ; : ! ?)
  //
  // Empty / missing input → ''. Used both by handleSubmitLiveAnswer (write
  // path) and aggregateRetentionCurve (read path) so they always agree on
  // which concept a label refers to.
  function normalizeConceptId(label) {
    if (label == null) return '';
    var s = String(label).trim().toLowerCase();
    if (!s) return '';
    s = s.replace(/^["'`(\[]+|["'`)\]]+$/g, '');
    while (/^(the |a |an )/.test(s)) {
      s = s.replace(/^(the |a |an )/, '');
    }
    s = s.replace(/\s+/g, ' ');
    s = s.replace(/[.,;:!?]+$/, '');
    return s.trim();
  }

  // ─── Helper: resolve correct option index for an MCQ ──────────────────
  // Mirrors the export pipeline's _resolveCorrectIdx (doc_pipeline:13235).
  function resolveCorrectIdx(q) {
    if (!q || !Array.isArray(q.options)) return -1;
    var ca = q.correctAnswer;
    if (typeof ca === 'number' && ca >= 0 && ca < q.options.length) return ca;
    if (typeof ca === 'string') {
      var trimmed = ca.trim();
      if (/^[A-Za-z]$/.test(trimmed)) {
        var letterIdx = trimmed.toUpperCase().charCodeAt(0) - 65;
        if (letterIdx >= 0 && letterIdx < q.options.length) return letterIdx;
      }
      if (/^\d+$/.test(trimmed)) {
        var numIdx = parseInt(trimmed, 10);
        if (numIdx >= 0 && numIdx < q.options.length) return numIdx;
      }
      var norm = function (s) { return String(s == null ? '' : s).trim().toLowerCase(); };
      var target = norm(trimmed);
      var found = q.options.findIndex(function (opt) { return norm(opt) === target; });
      if (found !== -1) return found;
    }
    return -1;
  }


  // ─── Presentation-response normalization and aggregation ────────────────
  // The presentation runner historically sent a numeric option index. The
  // generalized runner reuses the assessment envelope:
  //   { questionIdx, itemType, answer: { ... }, timestamp }
  // Accept both, plus a bare answer object, so in-flight sessions survive an
  // app update without introducing another response store or grading engine.
  function normalizeItemType(question, response) {
    var raw = question && (question.itemType || question.type);
    if (!raw && response && typeof response === 'object' && !Array.isArray(response)) raw = response.itemType;
    var type = String(raw || 'mcq').trim().toLowerCase();
    if (type === 'multiple-choice' || type === 'true-false' || type === 'tf') return 'mcq';
    if (type === 'fill-in-blank' || type === 'text') return 'fill-blank';
    if (type === 'numeric') return 'numeric-response';
    if (type === 'sequence' || type === 'order') return 'order';
    if (type === 'match') return 'matching';
    return type;
  }

  function isUnscoredPollQuestion(question, response) {
    var type = normalizeItemType(question, response);
    return type === 'likert' || type === 'opinion-mcq';
  }

  function normalizeLiveScoringPolicy(policy) {
    var source = policy && typeof policy === 'object' && !Array.isArray(policy) ? policy : {};
    var nested = source.liveScoring && typeof source.liveScoring === 'object' && !Array.isArray(source.liveScoring)
      ? source.liveScoring
      : {};
    var liveMode = typeof policy === 'string'
      ? policy
      : source.liveMode || source.mode || nested.mode;
    var confidence = source.confidence === true
      || nested.confidence === true
      || String(liveMode || '').trim().toLowerCase() === 'confidence';
    return {
      accuracy: source.accuracy === false ? false : true,
      confidence: confidence,
      partialCredit: source.partialCredit === false ? false : true,
    };
  }

  function normalizePresentationConfidence(response) {
    if (!response || typeof response !== 'object' || Array.isArray(response)) return '';
    var confidence = String(response.confidence || '').trim().toLowerCase();
    return confidence === 'knew' || confidence === 'guessed' || confidence === 'no-idea'
      ? confidence
      : '';
  }


  function unwrapPresentationAnswer(response) {
    if (response && typeof response === 'object' && !Array.isArray(response)
      && Object.prototype.hasOwnProperty.call(response, 'answer')) {
      return { envelope: response, answer: response.answer };
    }
    return { envelope: null, answer: response };
  }

  function normalizeGradeStatus(value) {
    var status = String(value || '').trim().toLowerCase();
    return ['correct', 'incorrect', 'partially-correct', 'idk', 'submitted'].indexOf(status) !== -1 ? status : '';
  }

  function explicitPresentationStatus(unwrapped) {
    var answer = unwrapped && unwrapped.answer;
    var envelope = unwrapped && unwrapped.envelope;
    if (answer && typeof answer === 'object' && !Array.isArray(answer)) {
      if (answer.idk === true) return 'idk';
      var answerStatus = normalizeGradeStatus(answer.status);
      if (answerStatus) return answerStatus;
    }
    return normalizeGradeStatus(envelope && envelope.status);
  }

  function extractOptionIndex(question, response) {
    var answer = unwrapPresentationAnswer(response).answer;
    if (Number.isInteger(answer)) return answer;
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return -1;
    var candidates = [answer.optionIdx, answer.optionIndex, answer.selectedIndex, answer.index];
    for (var i = 0; i < candidates.length; i++) {
      if (Number.isInteger(candidates[i])) return candidates[i];
    }
    var text = answer.optionText;
    if (text == null && typeof answer.value === 'string') text = answer.value;
    if (text != null && question && Array.isArray(question.options)) {
      var target = String(text).trim().toLowerCase();
      return question.options.findIndex(function (option) {
        return String(option == null ? '' : option).trim().toLowerCase() === target;
      });
    }
    return -1;
  }

  function extractSelectedIndices(question, response) {
    var answer = unwrapPresentationAnswer(response).answer;
    var source = Array.isArray(answer) ? answer : null;
    if (!source && answer && typeof answer === 'object') {
      source = answer.selectedIndices || answer.selectedOptionIndices || answer.optionIndices || answer.indices || answer.selected;
      if (!Array.isArray(source) && Array.isArray(answer.selectedTexts)) source = answer.selectedTexts;
    }
    if (!Array.isArray(source)) return [];
    var options = question && Array.isArray(question.options) ? question.options : [];
    var out = [];
    source.forEach(function (value) {
      var idx = Number.isInteger(value) ? value : options.findIndex(function (option) {
        return String(option == null ? '' : option).trim().toLowerCase() === String(value == null ? '' : value).trim().toLowerCase();
      });
      if (idx >= 0 && idx < options.length && out.indexOf(idx) === -1) out.push(idx);
    });
    return out.sort(function (a, b) { return a - b; });
  }

  function extractTextAnswer(response) {
    var answer = unwrapPresentationAnswer(response).answer;
    if (typeof answer === 'string') return answer.trim();
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return '';
    var value = typeof answer.text === 'string' ? answer.text
      : typeof answer.response === 'string' ? answer.response
      : typeof answer.value === 'string' ? answer.value
      : typeof answer.fill === 'string' ? answer.fill : '';
    return value.trim();
  }

  function extractNumericAnswer(response) {
    var answer = unwrapPresentationAnswer(response).answer;
    if (typeof answer === 'number' && Number.isFinite(answer)) return answer;
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
      var primitive = typeof answer === 'string' && answer.trim() !== '' ? Number(answer.trim()) : NaN;
      return Number.isFinite(primitive) ? primitive : null;
    }
    var candidates = [answer.numericValue, answer.value, answer.number];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] == null || String(candidates[i]).trim() === '') continue;
      var numeric = typeof candidates[i] === 'number' ? candidates[i] : Number(String(candidates[i]).trim());
      if (Number.isFinite(numeric)) return numeric;
    }
    if (typeof answer.text === 'string' && answer.text.trim() !== '') {
      var parsed = Number(answer.text.trim());
      if (Number.isFinite(parsed)) return parsed;
    }
    return null;
  }

  function extractOrderAnswer(response) {
    var answer = unwrapPresentationAnswer(response).answer;
    var source = Array.isArray(answer) ? answer : null;
    if (!source && answer && typeof answer === 'object') {
      source = answer.order || answer.orderedIndices || answer.selectedOrder || answer.sequence;
    }
    return Array.isArray(source) ? source.slice(0, 100) : [];
  }

  function samePrimitiveArray(left, right) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    for (var i = 0; i < left.length; i++) {
      if (String(left[i]) !== String(right[i])) return false;
    }
    return true;
  }

  function normalizePresentationComparable(value) {
    return String(value == null ? '' : value).trim().toLowerCase();
  }

  function normalizePresentationUnit(value) {
    return normalizePresentationComparable(value).replace(/\./g, '').replace(/\s+/g, ' ');
  }

  function extractNumericUnit(response) {
    var answer = unwrapPresentationAnswer(response).answer;
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return '';
    return String(answer.unit == null ? '' : answer.unit).trim().slice(0, 80);
  }

  function resolvePresentationCorrectIndices(question) {
    var options = question && Array.isArray(question.options) ? question.options : [];
    var correctAnswers = question && Array.isArray(question.correctAnswers) ? question.correctAnswers : [];
    if (!options.length || !correctAnswers.length) return [];
    var indices = [];
    for (var i = 0; i < correctAnswers.length; i++) {
      var value = correctAnswers[i];
      var idx = Number.isInteger(value) ? value : options.findIndex(function (option) {
        return normalizePresentationComparable(option) === normalizePresentationComparable(value);
      });
      if (idx < 0 || idx >= options.length || indices.indexOf(idx) >= 0) return [];
      indices.push(idx);
    }
    return indices.sort(function (a, b) { return a - b; });
  }

  function expectedPresentationOrder(question) {
    var items = question && Array.isArray(question.items) ? question.items : [];
    var explicit = question && Array.isArray(question.correctOrder) ? question.correctOrder
      : question && Array.isArray(question.correctSequence) ? question.correctSequence
      : null;
    var expected = explicit ? explicit.slice(0, 100) : items.map(function (_, idx) { return idx; });
    if (expected.length < 2 || (items.length > 0 && expected.length !== items.length)) return [];
    if (expected.some(function (value) {
      return value == null || (typeof value !== 'string' && typeof value !== 'number');
    })) return [];
    var unique = new Set(expected.map(function (value) { return typeof value + ':' + String(value); }));
    return unique.size === expected.length ? expected : [];
  }

  function presentationQuestionIsGameScorable(question) {
    var type = normalizeItemType(question, null);
    if (isUnscoredPollQuestion(question, null)) return false;
    if (type === 'mcq') return resolveCorrectIdx(question) >= 0;
    if (type === 'multi-select') {
      var multiKeys = question && Array.isArray(question.correctAnswers) ? question.correctAnswers : [];
      return multiKeys.length > 0 && resolvePresentationCorrectIndices(question).length === multiKeys.length;
    }
    if (type === 'fill-blank') return !!(question && (question.expectedFill || (Array.isArray(question.acceptableAlternatives) && question.acceptableAlternatives.length)));
    if (type === 'numeric-response') return !!(question && Number.isFinite(Number(question.correctValue)));
    if (type === 'order') return expectedPresentationOrder(question).length > 0;
    if (type === 'sequence-sense') {
      var sequenceItems = question && Array.isArray(question.items) ? question.items : [];
      var wrongIndex = question && question.intentionallyWrongIndex;
      var wrongIndexValid = wrongIndex == null
        || (Number.isInteger(wrongIndex) && wrongIndex >= 0 && wrongIndex < sequenceItems.length);
      var presentedOrder = question && question.presentedOrder;
      var presentedOrderValid = !Array.isArray(presentedOrder)
        || (presentedOrder.length === sequenceItems.length
          && presentedOrder.every(function (value) {
            return Number.isInteger(value) && value >= 0 && value < sequenceItems.length;
          })
          && new Set(presentedOrder).size === sequenceItems.length);
      return sequenceItems.length >= 3 && wrongIndexValid && presentedOrderValid
        && !!String(question && question.orderingPrinciple || '').trim();
    }
    if (type === 'relation-mismatch') {
      var pairs = question && Array.isArray(question.pairs) ? question.pairs : [];
      var mismatchIndex = question && question.wrongPairIndex;
      return pairs.length >= 2
        && pairs.every(function (pair) {
          return pair && !!String(pair.left || '').trim() && !!String(pair.right || '').trim();
        })
        && Number.isInteger(mismatchIndex)
        && mismatchIndex >= 0
        && mismatchIndex < pairs.length
        && !!String(question && question.correctPartnerForWrong || '').trim();
    }
    if (type === 'answer-evidence') {
      var answers = question && Array.isArray(question.answerOptions) ? question.answerOptions : [];
      var evidence = question && Array.isArray(question.evidenceOptions) ? question.evidenceOptions : [];
      var correctAnswer = normalizePresentationComparable(question && question.correctAnswer);
      var correctEvidence = normalizePresentationComparable(question && question.correctEvidence);
      return !!correctAnswer && !!correctEvidence
        && answers.some(function (value) { return normalizePresentationComparable(value) === correctAnswer; })
        && evidence.some(function (value) { return normalizePresentationComparable(value) === correctEvidence; });
    }
    // No live response owner currently supplies a canonical key for generic
    // matching. Keep it review-only instead of trusting a client status flag.
    return false;
  }

  function gradePresentationResponse(response, question, scoringPolicy) {
    var type = normalizeItemType(question, response);
    var policy = normalizeLiveScoringPolicy(scoringPolicy);
    var unwrapped = unwrapPresentationAnswer(response);
    var answer = unwrapped.answer;
    var answerObject = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
    var result = function (status, evaluable, score, details) {
      return Object.assign({
        status: status,
        isCorrect: evaluable === true ? status === 'correct' : null,
        evaluable: evaluable === true,
        unscored: false,
      }, score == null ? {} : { score: score }, details || {});
    };
    var normalizeComparable = normalizePresentationComparable;

    if (isUnscoredPollQuestion(question, response)) {
      return { status: 'submitted', isCorrect: null, evaluable: false, unscored: true };
    }
    // "I don't know" is explicit student intent. A generic client status
    // string is never authoritative, including status: "idk".
    if (answerObject.idk === true) return result('idk', true, null);

    if (type === 'mcq') {
      var optionIdx = extractOptionIndex(question, response);
      var correctIdx = resolveCorrectIdx(question);
      if (optionIdx < 0 || correctIdx < 0) return result('submitted', false, null);
      return result(optionIdx === correctIdx ? 'correct' : 'incorrect', true, optionIdx === correctIdx ? 100 : 0);
    }
    if (type === 'multi-select') {
      var selected = extractSelectedIndices(question, response);
      var options = question && Array.isArray(question.options) ? question.options : [];
      var correct = resolvePresentationCorrectIndices(question);
      if (!selected.length || !correct.length || !presentationQuestionIsGameScorable(question)) {
        return result('submitted', false, null);
      }
      var selectedCorrect = selected.filter(function (idx) { return correct.indexOf(idx) >= 0; }).length;
      var selectedWrong = selected.length - selectedCorrect;
      var multiPartialScore = Math.round(100 * Math.max(0, selectedCorrect - selectedWrong) / Math.max(1, correct.length));
      var multiExact = selectedWrong === 0 && selectedCorrect === correct.length;
      var multiScore = policy.partialCredit ? multiPartialScore : (multiExact ? 100 : 0);
      var multiStatus = selectedWrong === 0 && selectedCorrect === correct.length
        ? 'correct'
        : multiScore > 0 ? 'partially-correct' : 'incorrect';
      return result(multiStatus, true, multiScore, { scoreFraction: multiScore / 100 });
    }
    if (type === 'fill-blank') {
      var text = normalizeComparable(extractTextAnswer(response));
      var targets = [question && question.expectedFill || ''].concat(question && Array.isArray(question.acceptableAlternatives) ? question.acceptableAlternatives : [])
        .map(normalizeComparable).filter(Boolean);
      if (!text || !targets.length) return result('submitted', false, null);
      return result(targets.indexOf(text) !== -1 ? 'correct' : 'incorrect', true, targets.indexOf(text) !== -1 ? 100 : 0);
    }
    if (type === 'numeric-response') {
      var value = extractNumericAnswer(response);
      var expected = question ? Number(question.correctValue) : NaN;
      if (value == null || !Number.isFinite(expected)) return result('submitted', false, null);
      var tolerance = question && Number.isFinite(Number(question.tolerance)) ? Math.abs(Number(question.tolerance)) : 0;
      var valueCorrect = Math.abs(value - expected) <= tolerance + 1e-9;
      var acceptedUnits = [question && question.unit || '']
        .concat(question && Array.isArray(question.acceptableUnits) ? question.acceptableUnits : [])
        .map(normalizePresentationUnit)
        .filter(Boolean);
      var submittedUnit = normalizePresentationUnit(extractNumericUnit(response));
      var unitCorrect = acceptedUnits.length === 0 || acceptedUnits.indexOf(submittedUnit) >= 0;
      var numericPartialScore = valueCorrect && unitCorrect
        ? 100
        : valueCorrect || (unitCorrect && acceptedUnits.length > 0) ? 50 : 0;
      var numericScore = policy.partialCredit ? numericPartialScore : (numericPartialScore === 100 ? 100 : 0);
      return result(numericScore === 100 ? 'correct' : numericScore > 0 ? 'partially-correct' : 'incorrect', true, numericScore, {
        valueCorrect: valueCorrect,
        unitCorrect: unitCorrect,
        scoreFraction: numericScore / 100,
      });
    }
    if (type === 'order') {
      var submittedOrder = extractOrderAnswer(response);
      var expectedOrder = expectedPresentationOrder(question);
      if (!submittedOrder.length || !expectedOrder.length || submittedOrder.length !== expectedOrder.length) {
        return result('submitted', false, null);
      }
      var orderCorrect = samePrimitiveArray(submittedOrder, expectedOrder);
      return result(orderCorrect ? 'correct' : 'incorrect', true, orderCorrect ? 100 : 0);
    }
    if (type === 'sequence-sense') {
      if (!presentationQuestionIsGameScorable(question)) return result('submitted', false, null);
      var verifyAnswer = normalizeComparable(answerObject.verifyAnswer);
      var principleAnswer = normalizeComparable(answerObject.principleAnswer);
      if ((verifyAnswer !== 'yes' && verifyAnswer !== 'no') || !principleAnswer) return result('submitted', false, null);
      var rawWrongIndex = question.intentionallyWrongIndex;
      var intentionallyWrongIndex = Number.isInteger(rawWrongIndex) ? rawWrongIndex : null;
      var actualOrderIsCorrect = intentionallyWrongIndex === null;
      var step1Correct = verifyAnswer === 'yes' ? actualOrderIsCorrect : !actualOrderIsCorrect;
      var step2Correct = verifyAnswer === 'yes'
        ? step1Correct
        : intentionallyWrongIndex !== null && answerObject.clickedIdx === intentionallyWrongIndex;
      var step3Correct = principleAnswer === normalizeComparable(question.orderingPrinciple);
      var sequenceRawScore = (step1Correct ? 1 : 0) + (step2Correct ? 1 : 0) + (step3Correct ? 1 : 0);
      var sequenceScore = policy.partialCredit ? sequenceRawScore : (sequenceRawScore === 3 ? 3 : 0);
      return result(sequenceScore === 3 ? 'correct' : sequenceScore > 0 ? 'partially-correct' : 'incorrect', true, sequenceScore, {
        step1Correct: step1Correct,
        step2Correct: step2Correct,
        step3Correct: step3Correct,
        scoreFraction: sequenceScore / 3,
      });
    }
    if (type === 'relation-mismatch') {
      if (!presentationQuestionIsGameScorable(question)) return result('submitted', false, null);
      if (!Number.isInteger(answerObject.clickedPairIdx) || !normalizeComparable(answerObject.partnerAnswer)) {
        return result('submitted', false, null);
      }
      var pairCorrect = answerObject.clickedPairIdx === question.wrongPairIndex;
      var partnerCorrect = normalizeComparable(answerObject.partnerAnswer) === normalizeComparable(question.correctPartnerForWrong);
      var relationRawScore = (pairCorrect ? 1 : 0) + (partnerCorrect ? 1 : 0);
      var relationScore = policy.partialCredit ? relationRawScore : (relationRawScore === 2 ? 2 : 0);
      return result(relationScore === 2 ? 'correct' : relationScore > 0 ? 'partially-correct' : 'incorrect', true, relationScore, {
        step1Correct: pairCorrect,
        step2Correct: partnerCorrect,
        scoreFraction: relationScore / 2,
      });
    }
    if (type === 'answer-evidence') {
      if (!presentationQuestionIsGameScorable(question)) return result('submitted', false, null);
      var answerOptions = question.answerOptions;
      var evidenceOptions = question.evidenceOptions;
      var answerIdx = Number.isInteger(answerObject.answerIdx)
        ? answerObject.answerIdx
        : answerOptions.findIndex(function (option) { return normalizeComparable(option) === normalizeComparable(answerObject.answerText); });
      var evidenceIdx = Number.isInteger(answerObject.evidenceIdx)
        ? answerObject.evidenceIdx
        : evidenceOptions.findIndex(function (option) { return normalizeComparable(option) === normalizeComparable(answerObject.evidenceText); });
      if (answerIdx < 0 || answerIdx >= answerOptions.length || evidenceIdx < 0 || evidenceIdx >= evidenceOptions.length) {
        return result('submitted', false, null);
      }
      var answerCorrect = normalizeComparable(answerOptions[answerIdx]) === normalizeComparable(question.correctAnswer);
      var evidenceCorrect = normalizeComparable(evidenceOptions[evidenceIdx]) === normalizeComparable(question.correctEvidence);
      var evidenceRawScore = (answerCorrect ? 1 : 0) + (evidenceCorrect ? 1 : 0);
      var evidenceScore = policy.partialCredit ? evidenceRawScore : (evidenceRawScore === 2 ? 2 : 0);
      return result(evidenceScore === 2 ? 'correct' : evidenceScore > 0 ? 'partially-correct' : 'incorrect', true, evidenceScore, {
        answerCorrect: answerCorrect,
        evidenceCorrect: evidenceCorrect,
        scoreFraction: evidenceScore / 2,
      });
    }

    // Client-provided "correct" / "incorrect" flags are display hints only.
    // Unknown and teacher-judgment formats stay submitted for review.
    return result('submitted', false, null);
  }


  function presentationAccuracyWeight(responseOrGrade, question, scoringPolicy) {
    var policy = normalizeLiveScoringPolicy(scoringPolicy);
    if (!policy.accuracy) return null;
    var grade = question ? gradePresentationResponse(responseOrGrade, question, policy) : responseOrGrade;
    if (!grade || grade.evaluable !== true || grade.unscored === true) return null;
    if (typeof grade.scoreFraction === 'number' && Number.isFinite(grade.scoreFraction)) {
      return Math.max(0, Math.min(1, grade.scoreFraction));
    }
    if (grade.status === 'correct') return 1;
    if (grade.status === 'partially-correct' && typeof grade.score === 'number' && Number.isFinite(grade.score)) {
      return Math.max(0, Math.min(1, grade.score > 2 ? grade.score / 100 : grade.score / 2));
    }
    return 0;
  }

  function classifyPresentationConfidence(response, question, scoringPolicy) {
    var confidence = normalizePresentationConfidence(response);
    if (!confidence || isUnscoredPollQuestion(question, response)) return '';
    var grade = gradePresentationResponse(response, question, scoringPolicy);
    if (!grade.evaluable) return 'awaiting-review';
    if (grade.isCorrect === true) return confidence === 'knew' ? 'calibrated' : 'fragile';
    return confidence === 'knew' ? 'confident-wrong' : 'uncertain';
  }

  function extractLikertNumericValue(question, response) {
    if (normalizeItemType(question, response) !== 'likert') return null;
    var options = question && Array.isArray(question.options) ? question.options : [];
    var optionIdx = extractOptionIndex(question, response);
    if (optionIdx >= 0 && optionIdx < options.length) {
      var optionValue = Number.parseFloat(String(options[optionIdx]).trim());
      return Number.isFinite(optionValue) ? optionValue : null;
    }
    var answer = unwrapPresentationAnswer(response).answer;
    var primitive = typeof answer === 'number' || typeof answer === 'string' ? Number.parseFloat(String(answer).trim()) : NaN;
    return Number.isFinite(primitive) ? primitive : null;
  }

  // Keep the presenter reveal on the same canonical item schema as grading.
  // Returning an empty string means the item is unscored or needs teacher
  // judgment, so the UI must not present a misleading "correct answer".
  function describePresentationCorrectAnswer(question) {
    var type = normalizeItemType(question, null);
    if (!question || isUnscoredPollQuestion(question, null)) return '';
    var options = Array.isArray(question.options) ? question.options : [];
    if (type === 'mcq') {
      var correctIdx = resolveCorrectIdx(question);
      return correctIdx >= 0
        ? String.fromCharCode(65 + correctIdx) + '. ' + String(options[correctIdx])
        : '';
    }
    if (type === 'multi-select') {
      var correctIndices = resolvePresentationCorrectIndices(question);
      return correctIndices.length
        ? correctIndices.map(function (idx) {
            return String.fromCharCode(65 + idx) + '. ' + String(options[idx]);
          }).join(' · ')
        : '';
    }
    if (type === 'fill-blank') {
      var fillAnswers = [question.expectedFill || '']
        .concat(Array.isArray(question.acceptableAlternatives) ? question.acceptableAlternatives : [])
        .map(function (value) { return String(value == null ? '' : value).trim(); })
        .filter(Boolean);
      return fillAnswers.join(' · ');
    }
    if (type === 'numeric-response' && Number.isFinite(Number(question.correctValue))) {
      var numericGuide = String(question.correctValue);
      if (String(question.unit || '').trim()) numericGuide += ' ' + String(question.unit).trim();
      if (Number.isFinite(Number(question.tolerance)) && Math.abs(Number(question.tolerance)) > 0) {
        numericGuide += ' (±' + Math.abs(Number(question.tolerance)) + ')';
      }
      return numericGuide;
    }
    if (type === 'order') {
      var expectedOrder = expectedPresentationOrder(question);
      var items = Array.isArray(question.items) ? question.items : [];
      if (!expectedOrder.length) return '';
      return expectedOrder.map(function (value) {
        return Number.isInteger(value) && value >= 0 && value < items.length
          ? String(items[value])
          : String(value);
      }).join(' → ');
    }
    if (type === 'sequence-sense') {
      if (!presentationQuestionIsGameScorable(question)) return '';
      var principle = String(question.orderingPrinciple || '').trim();
      if (question.intentionallyWrongIndex == null) return 'Sequence is valid · Principle: ' + principle;
      var step = Array.isArray(question.items) ? question.items[question.intentionallyWrongIndex] : '';
      return 'Step ' + (question.intentionallyWrongIndex + 1)
        + (step ? ' (' + String(step) + ')' : '')
        + ' is misplaced · Principle: ' + principle;
    }
    if (type === 'relation-mismatch' && presentationQuestionIsGameScorable(question)) {
      var pair = question.pairs[question.wrongPairIndex] || {};
      return String(pair.left || 'Mismatched item') + ' → ' + String(question.correctPartnerForWrong);
    }
    if (type === 'answer-evidence' && presentationQuestionIsGameScorable(question)) {
      return 'Answer: ' + String(question.correctAnswer) + ' · Evidence: ' + String(question.correctEvidence);
    }
    var reference = question.referenceAnswer || question.modelAnswer || question.expectedAnswer;
    if ((type === 'short-answer' || type === 'self-explanation') && String(reference || '').trim()) {
      return String(reference).trim();
    }
    return question.correctAnswer == null ? '' : String(question.correctAnswer).trim();
  }

  function aggregatePresentationResponses(question, responses, scoringPolicy) {
    var policy = normalizeLiveScoringPolicy(scoringPolicy);
    var responseMap = responses && typeof responses === 'object' && !Array.isArray(responses) ? responses : {};
    var entries = Object.keys(responseMap).slice(0, 500).map(function (uid) {
      return { uid: uid, response: responseMap[uid], grade: gradePresentationResponse(responseMap[uid], question, policy) };
    });
    var type = normalizeItemType(question, entries[0] && entries[0].response);
    var unscored = isUnscoredPollQuestion(question, entries[0] && entries[0].response);
    var rows = [];
    var kind = 'outcomes';
    var respondentCount = entries.length;
    var evaluable = entries.filter(function (entry) { return entry.grade.evaluable; });
    var correctCount = evaluable.filter(function (entry) { return entry.grade.isCorrect === true; }).length;
    var partialCount = evaluable.filter(function (entry) { return entry.grade.status === 'partially-correct'; }).length;
    var incorrectCount = evaluable.length - correctCount;
    var accuracyWeightTotal = evaluable.reduce(function (sum, entry) {
      var weight = presentationAccuracyWeight(entry.grade);
      return sum + (weight == null ? 0 : weight);
    }, 0);
    var confidenceBuckets = {
      calibrated: 0,
      fragile: 0,
      confidentWrong: 0,
      uncertain: 0,
    };
    var confidenceReportedCount = 0;
    var confidenceMissingCount = 0;
    var confidenceAwaitingReviewCount = 0;
    if (policy.confidence && !unscored) {
      entries.forEach(function (entry) {
        var confidence = normalizePresentationConfidence(entry.response);
        if (!confidence) {
          confidenceMissingCount++;
          return;
        }
        confidenceReportedCount++;
        var classification = classifyPresentationConfidence(entry.response, question, policy);
        if (classification === 'awaiting-review') confidenceAwaitingReviewCount++;
        else if (classification === 'calibrated') confidenceBuckets.calibrated++;
        else if (classification === 'fragile') confidenceBuckets.fragile++;
        else if (classification === 'confident-wrong') confidenceBuckets.confidentWrong++;
        else if (classification === 'uncertain') confidenceBuckets.uncertain++;
      });
    }
    var options = question && Array.isArray(question.options) ? question.options : [];
    if (type === 'mcq' || type === 'likert' || type === 'opinion-mcq') {
      kind = 'options';
      var correctIdx = unscored ? -1 : resolveCorrectIdx(question);
      rows = options.map(function (option, idx) {
        var count = entries.filter(function (entry) { return extractOptionIndex(question, entry.response) === idx; }).length;
        return {
          label: String.fromCharCode(65 + idx),
          text: String(option == null ? '' : option),
          value: count,
          percent: respondentCount > 0 ? Math.round(count / respondentCount * 100) : 0,
          imageUrl: question && Array.isArray(question.optionImageUrls) ? question.optionImageUrls[idx] : null,
          isCorrect: !unscored && idx === correctIdx
        };
      });
    } else if (type === 'multi-select') {
      kind = 'multi-select';
      var correctTexts = question && Array.isArray(question.correctAnswers) ? question.correctAnswers : [];
      rows = options.map(function (option, idx) {
        var count = entries.filter(function (entry) { return extractSelectedIndices(question, entry.response).indexOf(idx) !== -1; }).length;
        var correct = correctTexts.some(function (value) {
          return Number.isInteger(value) ? value === idx : String(value == null ? '' : value).trim().toLowerCase() === String(option == null ? '' : option).trim().toLowerCase();
        });
        return {
          label: String.fromCharCode(65 + idx),
          text: String(option == null ? '' : option),
          value: count,
          percent: respondentCount > 0 ? Math.round(count / respondentCount * 100) : 0,
          imageUrl: question && Array.isArray(question.optionImageUrls) ? question.optionImageUrls[idx] : null,
          isCorrect: correct
        };
      });
    } else if (type === 'fill-blank' || type === 'short-answer' || type === 'self-explanation') {
      kind = 'text';
      var textBuckets = {};
      entries.forEach(function (entry) {
        var text = extractTextAnswer(entry.response);
        if (!text) return;
        var display = text.slice(0, 160);
        var key = display.toLowerCase();
        if (!textBuckets[key]) textBuckets[key] = { text: display, count: 0 };
        textBuckets[key].count++;
      });
      rows = Object.keys(textBuckets).map(function (key) { return textBuckets[key]; })
        .sort(function (a, b) { return b.count - a.count || a.text.localeCompare(b.text); })
        .slice(0, 12)
        .map(function (bucket, idx) {
          var matchingEntry = entries.find(function (entry) { return extractTextAnswer(entry.response).slice(0, 160).toLowerCase() === bucket.text.toLowerCase(); });
          return {
            label: String(idx + 1),
            text: bucket.text,
            value: bucket.count,
            percent: respondentCount > 0 ? Math.round(bucket.count / respondentCount * 100) : 0,
            imageUrl: null,
            isCorrect: !!(matchingEntry && matchingEntry.grade.isCorrect === true)
          };
        });
    } else if (type === 'numeric-response') {
      kind = 'numeric';
      var numericBuckets = {};
      var unitRequired = !!normalizePresentationUnit(question && question.unit);
      entries.forEach(function (entry) {
        var value = extractNumericAnswer(entry.response);
        var submittedUnit = extractNumericUnit(entry.response);
        var normalizedUnit = normalizePresentationUnit(submittedUnit);
        var key = value == null ? 'unparseable' : String(value) + '\u0000' + normalizedUnit;
        var label = value == null
          ? 'Unparseable response'
          : String(value) + (submittedUnit ? ' ' + submittedUnit : unitRequired ? ' (no unit)' : '');
        if (!numericBuckets[key]) {
          numericBuckets[key] = { text: label, count: 0, value: value, normalizedUnit: normalizedUnit };
        }
        numericBuckets[key].count++;
      });
      rows = Object.keys(numericBuckets).map(function (key) { return numericBuckets[key]; })
        .sort(function (a, b) {
          if (a.value == null) return 1;
          if (b.value == null) return -1;
          return a.value - b.value || a.normalizedUnit.localeCompare(b.normalizedUnit);
        })
        .slice(0, 12)
        .map(function (bucket, idx) {
          var sample = entries.find(function (entry) {
            return extractNumericAnswer(entry.response) === bucket.value
              && normalizePresentationUnit(extractNumericUnit(entry.response)) === bucket.normalizedUnit;
          });
          return {
            label: String(idx + 1),
            text: bucket.text,
            value: bucket.count,
            percent: respondentCount > 0 ? Math.round(bucket.count / respondentCount * 100) : 0,
            imageUrl: null,
            isCorrect: !!(sample && sample.grade.isCorrect === true)
          };
        });
    } else {
      var statuses = [
        { status: 'correct', text: 'Correct' },
        { status: 'partially-correct', text: 'Partially correct' },
        { status: 'incorrect', text: 'Needs review' },
        { status: 'idk', text: 'I don’t know' },
        { status: 'submitted', text: 'Submitted — teacher review' }
      ];
      rows = statuses.map(function (definition, idx) {
        var count = entries.filter(function (entry) { return entry.grade.status === definition.status; }).length;
        return {
          label: String(idx + 1),
          text: definition.text,
          value: count,
          percent: respondentCount > 0 ? Math.round(count / respondentCount * 100) : 0,
          imageUrl: null,
          isCorrect: definition.status === 'correct'
        };
      }).filter(function (row) { return row.value > 0; });
    }
    var gameScorable = presentationQuestionIsGameScorable(question);
    return {
      itemType: type,
      kind: kind,
      rows: rows,
      respondentCount: respondentCount,
      evaluableResponseCount: evaluable.length,
      correctCount: correctCount,
      incorrectCount: incorrectCount,
      partialCount: partialCount,
      correctRate: evaluable.length > 0 ? Math.round(correctCount / evaluable.length * 100) : null,
      unscored: unscored,
      accuracyRate: evaluable.length > 0 ? Math.round(accuracyWeightTotal / evaluable.length * 100) : null,
      scoringPolicy: policy,
      confidenceReportedCount: confidenceReportedCount,
      confidenceMissingCount: confidenceMissingCount,
      confidenceAwaitingReviewCount: confidenceAwaitingReviewCount,
      confidenceBuckets: confidenceBuckets,
      evaluative: !unscored && gameScorable,
      gameScorable: gameScorable,
      note: unscored ? 'Unscored poll — response distribution only.'
        : evaluable.length === 0 && respondentCount > 0 ? 'Responses received — teacher review is required before scoring.'
        : ''
    };
  }

  // ─── Per-item grader: infers correctness from student's submitted answer ──
  // Returns { status, ... extra fields per type }.
  // status ∈ { 'correct' | 'incorrect' | 'partially-correct' | 'idk' | 'submitted' | 'no-response' }
  function gradeResponseForItem(response, question) {
    if (!response || typeof response !== 'object') return { status: 'no-response' };
    var itemType = normalizeItemType(question, response);

    // Opinion polls are participation evidence only. Check this before IDK,
    // AI grading, or teacher overrides so even a numeric zero response cannot
    // become evaluative or disappear behind a falsy-value check.
    if (isUnscoredPollQuestion(question, response)) {
      return { status: 'submitted', unscored: true, evaluative: false };
    }
    if (!Object.prototype.hasOwnProperty.call(response, 'answer') || response.answer == null) return { status: 'no-response' };
    if (response.answer && typeof response.answer === 'object' && response.answer.idk === true) return { status: 'idk' };

    if (itemType === 'mcq') {
      var mcqGrade = gradePresentationResponse(response, question);
      return { status: mcqGrade.status };
    }

    if (itemType === 'fill-blank' && question) {
      var text = String(response.answer.text || '').trim().toLowerCase();
      if (!text) return { status: 'no-response' };
      var targets = [question.expectedFill || ''].concat(Array.isArray(question.acceptableAlternatives) ? question.acceptableAlternatives : []);
      var targetsNorm = targets.map(function (t) { return String(t).trim().toLowerCase(); }).filter(Boolean);
      return { status: targetsNorm.indexOf(text) !== -1 ? 'correct' : 'incorrect', rawText: response.answer.text };
    }

    if (itemType === 'short-answer' || itemType === 'self-explanation') {
      // Teacher uses judgment — we just surface the raw text
      return { status: 'submitted', rawText: response.answer.text || '' };
    }

    if (itemType === 'sequence-sense' || itemType === 'relation-mismatch' || itemType === 'multi-select'
        || itemType === 'answer-evidence' || itemType === 'numeric-response' || itemType === 'order'
        || itemType === 'matching') {
      // Recompute from the canonical question. Client status/score fields are
      // never authoritative for gradebook or game scoring.
      var structuredGrade = gradePresentationResponse(response, question);
      return {
        status: structuredGrade.status,
        score: structuredGrade.score,
      };
    }

    return { status: 'submitted' };
  }

  // ─── Helper: walk all responses and pair with their question ──────────
  // Returns: [{ uid, questionIdx, response, question, grade }]
  // Optional aiGradedCache: { '<uid>:<qIdx>': { status, feedback } } overrides
  // the deterministic 'submitted' status for short-answer / self-explanation
  // responses with the LLM-graded result. Other types unaffected.
  // Optional teacherOverrides: nested { [uid]: { [qIdx]: { status, ts } } }
  // — beats AI override and deterministic. Highest authority on grade.
  function collectAllGradedResponses(allResponses, questions, aiGradedCache, teacherOverrides) {
    var out = [];
    if (!allResponses || typeof allResponses !== 'object') return out;
    if (!Array.isArray(questions)) return out;
    Object.keys(allResponses).forEach(function (uid) {
      var perStudent = allResponses[uid];
      if (!perStudent || typeof perStudent !== 'object') return;
      Object.keys(perStudent).forEach(function (qIdxKey) {
        var qIdx = parseInt(qIdxKey, 10);
        if (isNaN(qIdx) || qIdx < 0 || qIdx >= questions.length) return;
        var response = perStudent[qIdxKey];
        var question = questions[qIdx];
        var grade = gradeResponseForItem(response, question);
        // AI grading override: only swap when the AI returned a graded status
        // and the deterministic status is 'submitted' (i.e., we asked for help
        // because we couldn't grade locally). Don't overwrite IDK or no-response.
        if (aiGradedCache && grade.status === 'submitted' && !grade.unscored) {
          var cached = aiGradedCache[uid + ':' + qIdx];
          if (cached && cached.status && cached.status !== 'error' && cached.status !== 'unclear') {
            grade = {
              status: cached.status === 'partially-correct' ? 'correct' : cached.status,
              rawText: grade.rawText,
              aiGraded: true,
              aiStatus: cached.status,
              aiFeedback: cached.feedback || '',
            };
          }
        }
        // Plan T v3+ Chunk 1B: preserve confidence rating if student set one.
        // Surfaced in dashboard drill-downs as a diagnostic chip.
        if (response && (response.confidence === 'knew' || response.confidence === 'guessed' || response.confidence === 'no-idea')) {
          grade.confidence = response.confidence;
        }
        // Plan T v3+ Chunk 6: teacher override beats everything else. Only
        // when the override status is one of the recognized values; an empty
        // or 'undo' status clears any override (handled at write time, not
        // here — a missing entry means no override).
        if (!grade.unscored && teacherOverrides && teacherOverrides[uid] && teacherOverrides[uid][qIdxKey]) {
          var ov = teacherOverrides[uid][qIdxKey];
          if (ov && ov.status && (ov.status === 'correct' || ov.status === 'incorrect' || ov.status === 'partially-correct' || ov.status === 'idk')) {
            grade = Object.assign({}, grade, {
              status: ov.status,
              teacherOverridden: true,
              teacherOverrideTs: ov.ts || 0,
              priorStatus: grade.status,
            });
          }
        }
        out.push({ uid: uid, questionIdx: qIdx, response: response, question: question, grade: grade });
      });
    });
    return out;
  }

  // ─── Aggregator: gradebook (exit-ticket) ──────────────────────────────
  // Per-student row: { uid, displayName, totalAnswered, totalCorrect, byQuestion }
  function aggregateGradebook(quizState, generatedContent, roster, aiGradedCache, teacherOverrides) {
    var allResponses = (quizState && quizState.allResponses) || {};
    var questions = (generatedContent && generatedContent.data && generatedContent.data.questions) || [];
    var graded = collectAllGradedResponses(allResponses, questions, aiGradedCache, teacherOverrides);
    var rosterObj = roster && typeof roster === 'object' ? roster : {};
    // Build per-student aggregation
    var studentMap = {};
    graded.forEach(function (g) {
      if (!studentMap[g.uid]) {
        var rEntry = rosterObj[g.uid] || {};
        studentMap[g.uid] = {
          uid: g.uid,
          displayName: rEntry.displayName || rEntry.name || rEntry.nickname || ('Student ' + g.uid.slice(0, 4)),
          totalAnswered: 0,
          totalCorrect: 0,
          totalEvaluated: 0,
          totalUnscored: 0,
          totalIdk: 0,
          byQuestion: new Array(questions.length).fill(null),
        };
      }
      var row = studentMap[g.uid];
      row.totalAnswered++;
      if (g.grade.unscored) row.totalUnscored++;
      else if (g.grade.status === 'correct' || g.grade.status === 'incorrect' || g.grade.status === 'partially-correct' || g.grade.status === 'idk') row.totalEvaluated++;
      if (g.grade.status === 'correct') row.totalCorrect++;
      if (g.grade.status === 'idk') row.totalIdk++;
      // Extended cell: grade fields + question/answer snippets so the dashboard
      // can render drill-down detail without re-walking allResponses.
      var qText = (g.question && (g.question.question || g.question.contextSentence || g.question.expectedFill)) || '';
      var qType = (g.response && g.response.itemType) || (g.question && (g.question.itemType || g.question.type)) || 'mcq';
      var answerSummary = '';
      if (g.response && g.response.answer) {
        var a = g.response.answer;
        if (a.idk) answerSummary = '🤔 I don\'t know';
        else if (typeof a.optionIdx === 'number' && g.question && Array.isArray(g.question.options))
          answerSummary = String.fromCharCode(65 + a.optionIdx) + '. ' + (g.question.options[a.optionIdx] || '');
        else if (typeof a.text === 'string') answerSummary = a.text;
        else if (qType === 'sequence-sense') answerSummary = (a.principleAnswer ? 'Principle: ' + a.principleAnswer : '') + (a.verifyAnswer ? ' · Verify: ' + a.verifyAnswer : '');
        else if (qType === 'relation-mismatch') answerSummary = (typeof a.clickedPairIdx === 'number' ? 'Clicked pair ' + (a.clickedPairIdx + 1) : '') + (a.partnerAnswer ? ' · Partner: ' + a.partnerAnswer : '');
        else if (qType === 'multi-select') answerSummary = Array.isArray(a.selectedTexts) ? a.selectedTexts.join('; ') : '';
        else if (qType === 'answer-evidence') answerSummary = (a.answerText ? 'Answer: ' + a.answerText : '') + (a.evidenceText ? ' · Evidence: ' + a.evidenceText : '');
        else if (qType === 'numeric-response') answerSummary = typeof a.text === 'string' ? a.text : (typeof a.numericValue === 'number' ? String(a.numericValue) + (a.unit ? ' ' + a.unit : '') : '');
        else { try { answerSummary = JSON.stringify(a); } catch (e) { answerSummary = ''; } }
      }
      row.byQuestion[g.questionIdx] = Object.assign({}, g.grade, {
        questionText: qText,
        questionType: qType,
        answerSummary: answerSummary,
      });
    });
    // Include roster students who haven't responded yet
    Object.keys(rosterObj).forEach(function (uid) {
      if (!studentMap[uid]) {
        var rEntry = rosterObj[uid] || {};
        studentMap[uid] = {
          uid: uid,
          displayName: rEntry.displayName || rEntry.name || rEntry.nickname || ('Student ' + uid.slice(0, 4)),
          totalAnswered: 0,
          totalCorrect: 0,
          totalEvaluated: 0,
          totalUnscored: 0,
          totalIdk: 0,
          byQuestion: new Array(questions.length).fill(null),
        };
      }
    });
    var studentRows = Object.values(studentMap).sort(function (a, b) { return a.displayName.localeCompare(b.displayName); });
    studentRows.forEach(function (row) {
      var responseMap = allResponses[row.uid] || {};
      var completion = responseMap[questions.length];
      row.attemptStatus = completion && completion.itemType === 'assessment-complete' ? 'submitted' : row.totalAnswered > 0 ? 'in-progress' : 'not-started';
      row.submittedAt = row.attemptStatus === 'submitted' ? completion.timestamp || completion.answer && completion.answer.submittedAt || 0 : 0;
    });
    return {
      studentRows: studentRows,
      totalQuestions: questions.length,
      totalStudents: studentRows.length,
    };
  }

  // ─── Aggregator: pre-lesson dashboard (pre-check) ─────────────────────
  // Per-question card: { questionIdx, questionText, totalAnswered, correctCount,
  //   percentCorrect, idkCount, conceptText (best-effort label) }
  function aggregatePreLessonGap(quizState, generatedContent, roster, aiGradedCache, teacherOverrides) {
    var allResponses = (quizState && quizState.allResponses) || {};
    var questions = (generatedContent && generatedContent.data && generatedContent.data.questions) || [];
    var graded = collectAllGradedResponses(allResponses, questions, aiGradedCache, teacherOverrides);
    var rosterCount = roster ? Object.keys(roster).length : 0;
    var perQuestion = questions.map(function (q, idx) {
      // Best-effort concept label: first 80 chars of question text or expectedFill
      var conceptText = q.question || q.expectedFill || ('Question ' + (idx + 1));
      if (conceptText.length > 80) conceptText = conceptText.slice(0, 77) + '...';
      return {
        questionIdx: idx,
        questionText: q.question || '',
        conceptText: conceptText,
        itemType: q.itemType || q.type || 'mcq',
        unscored: isUnscoredPollQuestion(q, null),
        totalAnswered: 0,
        correctCount: 0,
        incorrectCount: 0,
        idkCount: 0,
        percentCorrect: 0,
      };
    });
    graded.forEach(function (g) {
      var card = perQuestion[g.questionIdx];
      if (!card) return;
      card.totalAnswered++;
      if (g.grade.status === 'correct') card.correctCount++;
      else if (g.grade.status === 'incorrect') card.incorrectCount++;
      else if (g.grade.status === 'idk') card.idkCount++;
    });
    perQuestion.forEach(function (card) {
      if (card.unscored) {
        card.percentCorrect = null;
      } else if (card.totalAnswered > 0) {
        card.percentCorrect = Math.round((card.correctCount / card.totalAnswered) * 100);
      }
    });
    // Sort by lowest percentCorrect first (most urgent gaps surface)
    var sorted = perQuestion.slice().sort(function (a, b) {
      // Unanswered last; unscored polls do not compete with evaluative gaps.
      if (a.unscored !== b.unscored) return a.unscored ? 1 : -1;
      if (a.totalAnswered === 0 && b.totalAnswered > 0) return 1;
      if (b.totalAnswered === 0 && a.totalAnswered > 0) return -1;
      return a.percentCorrect - b.percentCorrect;
    });
    return {
      conceptCards: sorted,
      totalQuestions: questions.length,
      totalStudents: rosterCount,
    };
  }

  // ─── Aggregator: reflections (Chunk 1A) ───────────────────────────────
  // Walks allResponses for keys matching /^r\d+$/ (the convention QuizView
  // uses for reflection submissions). Groups by reflection prompt index,
  // returns per-prompt list of { uid, displayName, text, timestamp }.
  // Returns null when there are no reflections in the quiz so the dashboard
  // can hide the section entirely.
  function aggregateReflections(quizState, generatedContent, roster) {
    var reflections = (generatedContent && generatedContent.data && generatedContent.data.reflections);
    if (!Array.isArray(reflections) || reflections.length === 0) return null;
    var allResponses = (quizState && quizState.allResponses) || {};
    var rosterObj = roster && typeof roster === 'object' ? roster : {};
    // Build per-reflection-index buckets
    var buckets = reflections.map(function (ref, idx) {
      var promptText = (typeof ref === 'string') ? ref : (ref && ref.text) || ('Reflection ' + (idx + 1));
      return { reflectionIdx: idx, promptText: promptText, responses: [] };
    });
    var anyResponses = false;
    Object.keys(allResponses).forEach(function (uid) {
      var perStudent = allResponses[uid];
      if (!perStudent || typeof perStudent !== 'object') return;
      Object.keys(perStudent).forEach(function (key) {
        var m = /^r(\d+)$/.exec(key);
        if (!m) return;
        var rIdx = parseInt(m[1], 10);
        if (isNaN(rIdx) || rIdx < 0 || rIdx >= buckets.length) return;
        var resp = perStudent[key];
        var text = (resp && resp.answer && typeof resp.answer.text === 'string') ? resp.answer.text : '';
        if (!text) return;
        var rEntry = rosterObj[uid] || {};
        buckets[rIdx].responses.push({
          uid: uid,
          displayName: rEntry.displayName || rEntry.name || rEntry.nickname || ('Student ' + uid.slice(0, 4)),
          text: text,
          timestamp: (resp && resp.timestamp) || 0,
        });
        anyResponses = true;
      });
    });
    if (!anyResponses) return null;
    // Sort each bucket's responses by displayName for stable display
    buckets.forEach(function (b) {
      b.responses.sort(function (a, c) { return a.displayName.localeCompare(c.displayName); });
    });
    return {
      buckets: buckets,
      totalReflections: buckets.length,
      totalStudents: Object.keys(rosterObj).length,
    };
  }

  // ─── Aggregator: live heatmap (formative; review fallback) ────────────
  // Per-question bar: { questionIdx, questionText, correct, incorrect, idk, total, percentCorrect }
  function aggregateLiveHeatmap(quizState, generatedContent, roster, aiGradedCache, teacherOverrides) {
    var allResponses = (quizState && quizState.allResponses) || {};
    var questions = (generatedContent && generatedContent.data && generatedContent.data.questions) || [];
    var graded = collectAllGradedResponses(allResponses, questions, aiGradedCache, teacherOverrides);
    var rosterCount = roster ? Object.keys(roster).length : 0;
    var rosterObj = roster && typeof roster === 'object' ? roster : {};
    var bars = questions.map(function (q, idx) {
      return {
        questionIdx: idx,
        questionText: q.question || '',
        itemType: q.itemType || q.type || 'mcq',
        unscored: isUnscoredPollQuestion(q, null),
        correct: 0,
        incorrect: 0,
        idk: 0,
        submitted: 0,
        total: 0,
        percentCorrect: 0,
        byStudent: [],
      };
    });
    graded.forEach(function (g) {
      var bar = bars[g.questionIdx];
      if (!bar) return;
      bar.total++;
      if (g.grade.status === 'correct') bar.correct++;
      else if (g.grade.status === 'incorrect') bar.incorrect++;
      else if (g.grade.status === 'idk') bar.idk++;
      else bar.submitted++;
      // Per-student entry for drill-down
      var rEntry = rosterObj[g.uid] || {};
      var displayName = rEntry.displayName || rEntry.name || rEntry.nickname || ('Student ' + g.uid.slice(0, 4));
      var qText = (g.question && (g.question.question || g.question.contextSentence || g.question.expectedFill)) || '';
      var qType = (g.response && g.response.itemType) || (g.question && (g.question.itemType || g.question.type)) || 'mcq';
      var answerSummary = '';
      if (g.response && g.response.answer) {
        var a = g.response.answer;
        if (a.idk) answerSummary = '🤔 I don\'t know';
        else if (typeof a.optionIdx === 'number' && g.question && Array.isArray(g.question.options))
          answerSummary = String.fromCharCode(65 + a.optionIdx) + '. ' + (g.question.options[a.optionIdx] || '');
        else if (typeof a.text === 'string') answerSummary = a.text;
        else if (qType === 'sequence-sense') answerSummary = (a.principleAnswer ? 'Principle: ' + a.principleAnswer : '') + (a.verifyAnswer ? ' · Verify: ' + a.verifyAnswer : '');
        else if (qType === 'relation-mismatch') answerSummary = (typeof a.clickedPairIdx === 'number' ? 'Clicked pair ' + (a.clickedPairIdx + 1) : '') + (a.partnerAnswer ? ' · Partner: ' + a.partnerAnswer : '');
        else if (qType === 'multi-select') answerSummary = Array.isArray(a.selectedTexts) ? a.selectedTexts.join('; ') : '';
        else if (qType === 'answer-evidence') answerSummary = (a.answerText ? 'Answer: ' + a.answerText : '') + (a.evidenceText ? ' · Evidence: ' + a.evidenceText : '');
        else if (qType === 'numeric-response') answerSummary = typeof a.text === 'string' ? a.text : (typeof a.numericValue === 'number' ? String(a.numericValue) + (a.unit ? ' ' + a.unit : '') : '');
        else { try { answerSummary = JSON.stringify(a); } catch (e) { answerSummary = ''; } }
      }
      bar.byStudent.push({
        uid: g.uid,
        displayName: displayName,
        status: g.grade.status,
        aiGraded: !!g.grade.aiGraded,
        aiFeedback: g.grade.aiFeedback || '',
        answerSummary: answerSummary,
        questionType: qType,
        questionText: qText,
        confidence: g.grade.confidence || null,
      });
    });
    // Sort each bar's byStudent by displayName for stable display
    bars.forEach(function (bar) {
      bar.byStudent.sort(function (a, b) { return a.displayName.localeCompare(b.displayName); });
    });
    bars.forEach(function (bar) {
      if (bar.unscored) {
        bar.percentCorrect = null;
      } else if (bar.total > 0) {
        bar.percentCorrect = Math.round((bar.correct / bar.total) * 100);
      }
    });
    return {
      bars: bars,
      totalQuestions: questions.length,
      totalStudents: rosterCount,
    };
  }

  // ─── Aggregator: retention curve (review v3 — real implementation) ────
  // Reads cross-session concept mastery (pre-fetched by the dashboard from
  // artifacts/{appId}/public/data/conceptMastery/{uid}). For each concept
  // probed in the current review quiz, surfaces per-student retention info:
  // days-since-last-attempt, recent attempt statuses, success rate.
  //
  // Falls back to live-heatmap shape if conceptMasteryByUid is missing or
  // empty (e.g., dashboard hasn't fetched yet, or this is the very first
  // session capturing concept data).
  function aggregateRetentionCurve(quizState, generatedContent, roster, conceptMasteryByUid, aiGradedCache, teacherOverrides) {
    if (!conceptMasteryByUid || typeof conceptMasteryByUid !== 'object' || Object.keys(conceptMasteryByUid).length === 0) {
      // No mastery data yet — return live-heatmap shape so dashboard renders
      // something useful instead of empty state. Dashboard recognizes this
      // via aggResult.variant.
      return aggregateLiveHeatmap(quizState, generatedContent, roster, aiGradedCache, teacherOverrides);
    }
    var questions = (generatedContent && generatedContent.data && generatedContent.data.questions) || [];
    var rosterObj = roster && typeof roster === 'object' ? roster : {};
    var nowMs = Date.now();
    var DAY_MS = 24 * 60 * 60 * 1000;

    // For each question with a conceptLabel, build a row
    var conceptRows = [];
    var seenConcepts = {};
    questions.forEach(function (q, idx) {
      var label = (q && q.conceptLabel) || '';
      if (!label) return;
      var conceptId = normalizeConceptId(label);
      if (!conceptId || seenConcepts[conceptId]) return; // dedupe per concept
      seenConcepts[conceptId] = true;

      // Per-student mastery lookup
      var students = [];
      Object.keys(rosterObj).forEach(function (uid) {
        var rEntry = rosterObj[uid] || {};
        var displayName = rEntry.displayName || rEntry.name || rEntry.nickname || ('Student ' + uid.slice(0, 4));
        var mastery = conceptMasteryByUid[uid] && conceptMasteryByUid[uid].attempts && conceptMasteryByUid[uid].attempts[conceptId];
        if (!mastery) {
          students.push({
            uid: uid,
            displayName: displayName,
            seen: false,
            daysSinceLast: null,
            recent: [],
            totalAttempts: 0,
            correctAttempts: 0,
            successRate: null,
          });
          return;
        }
        var lastTs = mastery.lastAttemptTs || 0;
        var days = lastTs > 0 ? Math.round((nowMs - lastTs) / DAY_MS) : null;
        var total = mastery.totalAttempts || 0;
        var correct = mastery.correctAttempts || 0;
        var rate = total > 0 ? Math.round((correct / total) * 100) : null;
        students.push({
          uid: uid,
          displayName: displayName,
          seen: true,
          daysSinceLast: days,
          recent: Array.isArray(mastery.recent) ? mastery.recent.slice(-10) : [],
          totalAttempts: total,
          correctAttempts: correct,
          successRate: rate,
          lastResult: mastery.lastResult || null,
        });
      });

      // Compute concept-level priority: max daysSinceLast (oldest forgotten = most urgent)
      // Concepts where some students have never seen = also urgent (high priority)
      var maxDays = 0;
      var unseenCount = 0;
      students.forEach(function (s) {
        if (!s.seen) unseenCount++;
        else if (typeof s.daysSinceLast === 'number' && s.daysSinceLast > maxDays) maxDays = s.daysSinceLast;
      });

      conceptRows.push({
        conceptId: conceptId,
        label: label,
        questionIdx: idx,
        questionText: q.question || '',
        students: students,
        maxDaysSinceLast: maxDays,
        unseenCount: unseenCount,
        priority: unseenCount * 100 + maxDays, // unseen weights heavier than days
      });
    });

    // Sort by priority desc (most urgent first)
    conceptRows.sort(function (a, b) { return b.priority - a.priority; });

    return {
      conceptRows: conceptRows,
      totalConcepts: conceptRows.length,
      totalStudents: Object.keys(rosterObj).length,
      hasCrossSessionData: true,
    };
  }

  // ─── Aggregator: privacy-safe item analysis ───────────────────────────
  // Descriptive counts appear immediately. Interpretive flags require at
  // least five respondents so a single learner never becomes the "signal."
  function aggregateItemAnalysis(quizState, generatedContent, roster, aiGradedCache, teacherOverrides) {
    var allResponses = (quizState && quizState.allResponses) || {};
    var questions = (generatedContent && generatedContent.data && generatedContent.data.questions) || [];
    var rosterObj = roster && typeof roster === 'object' ? roster : {};
    var graded = collectAllGradedResponses(allResponses, questions, aiGradedCache, teacherOverrides);
    var responseUids = {};
    graded.forEach(function (entry) { responseUids[entry.uid] = true; });
    var rosterCount = Object.keys(rosterObj).length;
    var totalStudents = rosterCount > 0 ? rosterCount : Object.keys(responseUids).length;
    var items = questions.map(function (question, questionIdx) {
      var itemRows = graded.filter(function (entry) { return entry.questionIdx === questionIdx; });
      var respondentMap = {};
      itemRows.forEach(function (entry) { respondentMap[entry.uid] = true; });
      var respondents = Object.keys(respondentMap).length;
      var correctCount = 0;
      var incorrectCount = 0;
      var partialCount = 0;
      var idkCount = 0;
      var highConfidenceIncorrect = 0;
      itemRows.forEach(function (entry) {
        var status = entry.grade && entry.grade.status;
        if (status === 'correct') correctCount++;
        else if (status === 'incorrect') incorrectCount++;
        else if (status === 'partially-correct') partialCount++;
        else if (status === 'idk') idkCount++;
        if ((status === 'incorrect' || status === 'partially-correct') && entry.grade && entry.grade.confidence === 'knew') highConfidenceIncorrect++;
      });
      var gradableCount = correctCount + incorrectCount + partialCount;
      var correctRate = gradableCount > 0 ? Math.round((correctCount + partialCount * 0.5) / gradableCount * 100) : null;
      var omittedCount = Math.max(0, totalStudents - respondents);
      var smallSample = respondents < 5;
      var type = normalizeItemType(question, null);
      var unscored = isUnscoredPollQuestion(question, null);
      var options = [];
      if ((type === 'mcq' || unscored) && question && Array.isArray(question.options)) {
        var correctIdx = unscored ? -1 : resolveCorrectIdx(question);
        options = question.options.map(function (label, optionIdx) {
          var count = itemRows.reduce(function (sum, entry) {
            return sum + (extractOptionIndex(question, entry.response) === optionIdx ? 1 : 0);
          }, 0);
          return { optionIdx: optionIdx, label: label, count: count, correct: optionIdx === correctIdx };
        });
      }
      var flags = [];
      if (!smallSample && !unscored) {
        if (correctRate != null && correctRate <= 35) flags.push('Many learners found this item challenging; review wording, instruction, and the answer key.');
        if (correctRate != null && correctRate >= 90) flags.push('This item may be too easy for the intended decision; consider a deeper follow-up.');
        if (totalStudents > 0 && omittedCount / totalStudents >= 0.25) flags.push('At least one quarter of the class omitted this item; check clarity and placement.');
        if (gradableCount > 0 && highConfidenceIncorrect / gradableCount >= 0.2) flags.push('Several confident responses were incorrect; review the underlying misconception.');
        if (options.length >= 3 && respondents >= 10 && options.some(function (option) { return !option.correct && option.count === 0; })) flags.push('One or more distractors were never selected; consider strengthening them.');
      }
      var signalLabel = unscored ? 'Unscored distribution' : smallSample ? 'Early signal (' + respondents + '/5)' : correctRate == null ? 'Teacher review needed' : correctRate <= 35 ? 'Challenging' : correctRate >= 90 ? 'Very easy' : 'Useful range';
      return {
        questionIdx: questionIdx,
        questionText: question && (question.question || question.contextSentence || question.expectedFill) || ('Question ' + (questionIdx + 1)),
        type: type,
        unscored: unscored,
        evaluative: !unscored,
        respondents: respondents,
        omittedCount: omittedCount,
        idkCount: idkCount,
        correctCount: correctCount,
        incorrectCount: incorrectCount,
        partialCount: partialCount,
        gradableCount: gradableCount,
        correctRate: correctRate,
        highConfidenceIncorrect: highConfidenceIncorrect,
        smallSample: smallSample,
        signalLabel: signalLabel,
        flags: flags,
        options: options
      };
    });
    return { items: items, totalStudents: totalStudents, minimumFlagSample: 5 };
  }
  // ─── Mode → aggregator router ─────────────────────────────────────────
  // For review mode, requires conceptMasteryByUid argument; falls back to
  // liveHeatmap if not provided.
  function aggregateForMode(mode, quizState, generatedContent, roster, conceptMasteryByUid, aiGradedCache, teacherOverrides) {
    if (mode === 'pre-check') return { variant: 'preLessonGap', data: aggregatePreLessonGap(quizState, generatedContent, roster, aiGradedCache, teacherOverrides) };
    if (mode === 'formative') return { variant: 'liveHeatmap', data: aggregateLiveHeatmap(quizState, generatedContent, roster, aiGradedCache, teacherOverrides) };
    if (mode === 'poll') return { variant: 'liveHeatmap', data: aggregateLiveHeatmap(quizState, generatedContent, roster, aiGradedCache, teacherOverrides) };
    if (mode === 'review') {
      var retData = aggregateRetentionCurve(quizState, generatedContent, roster, conceptMasteryByUid, aiGradedCache, teacherOverrides);
      // If retention data has cross-session info, render as retentionCurve;
      // otherwise it returned heatmap shape, render as liveHeatmap.
      var variant = retData.hasCrossSessionData ? 'retentionCurve' : 'liveHeatmap';
      return { variant: variant, data: retData };
    }
    // exit-ticket default
    return { variant: 'gradebook', data: aggregateGradebook(quizState, generatedContent, roster, aiGradedCache, teacherOverrides) };
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.QuizLiveAggregators = {
    aggregateGradebook: aggregateGradebook,
    aggregatePreLessonGap: aggregatePreLessonGap,
    aggregateLiveHeatmap: aggregateLiveHeatmap,
    aggregateRetentionCurve: aggregateRetentionCurve,
    aggregateReflections: aggregateReflections,
    aggregateItemAnalysis: aggregateItemAnalysis,
    aggregateForMode: aggregateForMode,
    gradeResponseForItem: gradeResponseForItem,
    gradePresentationResponse: gradePresentationResponse,
    aggregatePresentationResponses: aggregatePresentationResponses,
    isUnscoredPollQuestion: isUnscoredPollQuestion,
    normalizeItemType: normalizeItemType,
    normalizeLiveScoringPolicy: normalizeLiveScoringPolicy,
    normalizePresentationConfidence: normalizePresentationConfidence,
    presentationAccuracyWeight: presentationAccuracyWeight,
    classifyPresentationConfidence: classifyPresentationConfidence,
    extractLikertNumericValue: extractLikertNumericValue,
    describePresentationCorrectAnswer: describePresentationCorrectAnswer,
    normalizeConceptId: normalizeConceptId,
  };
  console.log('[CDN] QuizLiveAggregators loaded');
})();
