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
  if (typeof window === 'undefined') return;
  if (window.AlloModules && window.AlloModules.QuizLiveAggregators) {
    console.log('[CDN] QuizLiveAggregators already loaded, skipping');
    return;
  }

  function _hasOwn(obj, key) {
    return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
  }

  function _isPlainMap(obj) {
    return !!obj && typeof obj === 'object' && !Array.isArray(obj);
  }

  function _safeRosterDisplayName(rosterObj, uid) {
    var rEntry = (_isPlainMap(rosterObj) && _hasOwn(rosterObj, uid) && rosterObj[uid] && typeof rosterObj[uid] === 'object') ? rosterObj[uid] : null;
    if (rEntry) {
      if (typeof rEntry.displayName === 'string' && rEntry.displayName) return rEntry.displayName;
      if (typeof rEntry.name === 'string' && rEntry.name) return rEntry.name;
      if (typeof rEntry.nickname === 'string' && rEntry.nickname) return rEntry.nickname;
    }
    return 'Student ' + String(uid == null ? '' : uid).slice(0, 4);
  }

  function _optionLabel(idx) {
    return Number.isInteger(idx) && idx >= 0 && idx < 26 ? String.fromCharCode(65 + idx) : String((Number(idx) || 0) + 1);
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
    s = s.replace(/^(?:(?:the|a|an) )+/, '');
    s = s.replace(/\s+/g, ' ');
    s = s.replace(/[.,;:!?]+$/, '');
    return s.trim();
  }

  // ─── Helper: resolve correct option index for an MCQ ──────────────────
  // Mirrors the export pipeline's _resolveCorrectIdx (doc_pipeline:13235).
  // What a key check judged: the stem plus the option SET. Order-free, so the
  // position balancer does not invalidate a check; any wording edit does.
  function keyCheckShape(question) {
    var q = question && typeof question === 'object' ? question : {};
    var norm = function (value) { return String(value == null ? '' : value).replace(/\s+/g, ' ').trim().toLowerCase(); };
    var serialized = JSON.stringify([norm(q.question), (Array.isArray(q.options) ? q.options : []).map(norm).sort()]);
    var hash = 2166136261;
    for (var i = 0; i < serialized.length; i++) { hash ^= serialized.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return 'key-shape-v1:' + (hash >>> 0).toString(36);
  }

  function isAnswerKeyDisputed(question) {
    if (!question || !['mcq', 'multiple-choice', 'multiple-choice-question', 'single-select', 'true-false', 'tf'].includes(String(question.itemType || question.type || 'mcq').toLowerCase().replace(/_/g, '-'))) return false;
    var review = question.keyCheck;
    var key = question.correctAnswer != null ? String(question.correctAnswer) : Number.isInteger(question.correctIndex) && Array.isArray(question.options) && question.correctIndex >= 0 && question.correctIndex < question.options.length ? String(question.options[question.correctIndex]) : '';
    if (review && typeof review === 'object') {
      if (review.checkedKey != null && String(review.checkedKey) !== key) return false;
      if (review.checkedShape != null && String(review.checkedShape) !== keyCheckShape(question)) return false;
      if (['confirmed', 'disputed', 'unclear', 'stale'].indexOf(review.status) >= 0) return review.status === 'disputed';
    }
    return /\[\[\s*KEY\s*:\s*DISPUTED\b/i.test(String(question.factCheck || '')) || /correction\s*\/\s*warning/i.test(String(question.factCheck || '').replace(/\*/g, ''));
  }

  function resolveCorrectIdx(q) {
    if (!q || !Array.isArray(q.options) || isAnswerKeyDisputed(q)) return -1;
    var candidates = [q.correctAnswer, q.correctIndex, q.answer, q.correct];
    var ca;
    for (var i = 0; i < candidates.length; i++) {
      var cand = candidates[i];
      if (cand == null) continue;
      if (typeof cand === 'string' && !cand.trim()) continue;
      ca = cand;
      break;
    }
    if (ca === undefined) return -1;
    var norm = function (s) { return String(s == null ? '' : s).trim().toLowerCase(); };
    if (typeof ca === 'boolean') {
      var boolTargets = ca ? ['true', 't', 'yes'] : ['false', 'f', 'no'];
      for (var b = 0; b < boolTargets.length; b++) {
        var bIdx = q.options.findIndex(function (opt) { return norm(opt) === boolTargets[b]; });
        if (bIdx !== -1) return bIdx;
      }
      return -1;
    }
    if (typeof ca === 'number' && Number.isInteger(ca) && ca >= 0 && ca < q.options.length) return ca;
    if (typeof ca === 'string') {
      var trimmed = ca.trim();
      var exactFirst = q.options.findIndex(function (opt) { return norm(opt) === norm(trimmed); });
      if (/^[A-Za-z]$/.test(trimmed)) {
        if (exactFirst !== -1) return exactFirst;
        var letterIdx = trimmed.toUpperCase().charCodeAt(0) - 65;
        if (letterIdx >= 0 && letterIdx < q.options.length) return letterIdx;
      }
      if (/^\d+$/.test(trimmed)) {
        if (exactFirst !== -1) return exactFirst;
        var numIdx = parseInt(trimmed, 10);
        if (numIdx >= 0 && numIdx < q.options.length) return numIdx;
      }
      if (exactFirst !== -1) return exactFirst;
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
    var compact = type.replace(/[\s_-]+/g, '');
    if (compact === 'mcq' || compact === 'multiplechoice' || compact === 'truefalse' || compact === 'tf') return 'mcq';
    if (compact === 'shortanswer') return 'short-answer';
    if (compact === 'fillinblank' || compact === 'fillblank' || compact === 'fillintheblank' || type === 'text') return 'fill-blank';
    if (compact === 'numeric' || compact === 'numericresponse' || compact === 'number') return 'numeric-response';
    if (compact === 'multiselect' || compact === 'multipleselect' || compact === 'checkbox' || compact === 'checkboxes') return 'multi-select';
    if (compact === 'sequence' || compact === 'order' || compact === 'ordering' || compact === 'sequencing') return 'order';
    if (compact === 'sequencesense') return 'sequence-sense';
    if (compact === 'relationmismatch') return 'relation-mismatch';
    if (compact === 'answerevidence') return 'answer-evidence';
    if (compact === 'match' || compact === 'matching') return 'matching';
    return type;
  }

  // Fingerprint the public stimulus, never an answer key. Student copies with
  // withheld keys must match the teacher copy; translations and alt text do not
  // change the authored choice represented by a saved response.
  // Sequence Sense as the learner sees it: items in displayed order, identity
  // presentedOrder. Withheld copies ship this form (the canonical order is the
  // key), and item signatures hash it so teacher and learner copies agree.
  var SEQUENCE_ITEM_ARRAYS = ['items', 'items_en', 'itemImageUrls', 'itemImageAltTexts', 'itemImagePrompts'];
  function sequencePresentedPermutation(question) {
    var items = question && Array.isArray(question.items) ? question.items : null;
    var order = question && question.presentedOrder;
    if (!items || !Array.isArray(order) || order.length !== items.length || new Set(order).size !== items.length) return null;
    return order.every(function (value) { return Number.isInteger(value) && value >= 0 && value < items.length; }) ? order : null;
  }
  function sequenceDisplayForm(question) {
    if (!question || typeof question !== 'object' || String(question.type || question.itemType || '') !== 'sequence-sense') return question;
    var order = sequencePresentedPermutation(question);
    if (!order) return question;
    var out = Object.assign({}, question);
    SEQUENCE_ITEM_ARRAYS.forEach(function (field) {
      if (Array.isArray(question[field]) && question[field].length === order.length) out[field] = order.map(function (index) { return question[field][index]; });
    });
    out.presentedOrder = order.map(function (_, index) { return index; });
    return out;
  }
  // A learner on a display-form copy answers in displayed positions; grading
  // maps them back through the teacher copy's presentedOrder.
  function canonicalOrderAnswer(question, answer) {
    var order = answer && Array.isArray(answer.orderAnswer) ? answer.orderAnswer : null;
    var presented = sequencePresentedPermutation(question);
    if (!order) return order;
    var maxLen = Math.max(100, presented ? presented.length + 1 : 100);
    var bounded = order.length > maxLen ? order.slice(0, maxLen) : order;
    if (answer.orderBasis !== 'displayed' || !presented) return bounded;
    return bounded.map(function (value) { return Number.isInteger(value) && value >= 0 && value < presented.length ? presented[value] : value; });
  }

  function legacyAssessmentItemSignature(question) {
    return assessmentItemSignature(question, true);
  }

  // Self-contained (tests compare it with the view's offline copy). Sequence
  // Sense hashes its display form unless legacy === true (canonical order).
  function assessmentItemSignature(question, legacy) {
    var q = question && typeof question === 'object' ? question : {};
    var shown = q.presentedOrder, count = Array.isArray(q.items) ? q.items.length : -1;
    if (legacy !== true && String(q.type || q.itemType || '') === 'sequence-sense' && Array.isArray(shown) && shown.length === count && new Set(shown).size === count
      && shown.every(function (value) { return Number.isInteger(value) && value >= 0 && value < count; })) {
      q = Object.assign({}, q, { items: shown.map(function (index) { return q.items[index]; }), presentedOrder: shown.map(function (_, index) { return index; }) });
      if (Array.isArray(question.itemImageUrls) && question.itemImageUrls.length === count) q.itemImageUrls = shown.map(function (index) { return question.itemImageUrls[index]; });
    }
    var context = { type: String(q.type || q.itemType || 'mcq') };
    var textFields = ['question', 'contextSentence', 'prompt', 'instructions', 'evidencePrompt', 'unit', 'imageUrl'];
    var arrayFields = ['options', 'answerOptions', 'evidenceOptions', 'items', 'presentedOrder', 'pairs', 'candidatePartners', 'principleOptions', 'optionImageUrls', 'answerOptionImageUrls', 'answerImageUrls', 'evidenceOptionImageUrls', 'evidenceImageUrls', 'itemImageUrls', 'candidatePartnerImageUrls', 'principleOptionImageUrls', 'principleOptionsImageUrls'];
    function publicValue(value, depth) {
      var d = depth || 0;
      if (d > 8) return null;
      if (Array.isArray(value)) return value.slice(0, 500).map(function (item) { return publicValue(item, d + 1); });
      if (value && typeof value === 'object') {
        var result = {};
        ['id', 'text', 'label', 'left', 'right', 'imageUrl', 'leftImageUrl', 'rightImageUrl'].forEach(function (key) {
          if (value[key] != null) result[key] = publicValue(value[key], d + 1);
        });
        return result;
      }
      if (typeof value === 'bigint') return String(value);
      return value == null ? null : value;
    }
    textFields.forEach(function (field) { context[field] = String(q[field] == null ? '' : q[field]); });
    arrayFields.forEach(function (field) { context[field] = Array.isArray(q[field]) ? q[field].slice(0, 500).map(function (item) { return publicValue(item, 0); }) : []; });
    // Add authored task/scoring conditions only when present, so legacy items
    // retain their signatures while edits to new conditions invalidate drafts.
    ['fillBlankPolicy', 'sequenceMode', 'requireReasoning', 'explanationPrompt', 'studentCriteria'].forEach(function (field) {
      if (q[field] != null) context[field] = publicValue(q[field], 0);
    });
    if (q.numericSettings && typeof q.numericSettings === 'object') context.numericSettings = {
      allowEquivalentUnits: q.numericSettings.allowEquivalentUnits === true,
      valueWeight: q.numericSettings.valueWeight == null ? 0.5 : Number(q.numericSettings.valueWeight)
    };
    var serialized = JSON.stringify(context), hash = 2166136261;
    for (var i = 0; i < serialized.length; i++) { hash ^= serialized.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return 'assess-item-v1:' + (hash >>> 0).toString(36);
  }

  function isUnscoredPollQuestion(question, response) {
    var type = normalizeItemType(question, response);
    return type === 'likert' || type === 'opinion-mcq';
  }

  function assessmentResponseVersionIssue(question, response) {
    if (!response || typeof response !== 'object') return '';
    if (typeof response.questionSignature === 'string' && response.questionSignature) {
      return response.questionSignature === assessmentItemSignature(question) || response.questionSignature === legacyAssessmentItemSignature(question) ? '' : 'mismatch';
    }
    var type = normalizeItemType(question, response);
    return response.assessmentActivityId && (type === 'sequence-sense' || type === 'relation-mismatch') ? 'unverified' : '';
  }

  // Teacher judgments belong to a particular answer, attempt, and grading key.
  // Timestamps, confidence, and client-generated grading hints are not answers.
  function assessmentResponseFingerprint(question, response) {
    if (!question || typeof question !== 'object') return '';
    var envelope = response && typeof response === 'object' ? response : {};
    var answer = unwrapPresentationAnswer(response).answer;
    var a = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
    var type = normalizeItemType(question, response), reviewed;
    function choice(value, text, options) {
      if (Number.isInteger(value)) return value;
      return Array.isArray(options) && text != null ? options.findIndex(function (option) { return normalizePresentationComparable(option) === normalizePresentationComparable(text); }) : -1;
    }
    if (a.idk === true) reviewed = { idk: true };
    else if (type === 'mcq' || type === 'opinion-mcq' || type === 'likert') reviewed = { optionIdx: extractOptionIndex(question, response), optionText: extractOptionIndex(question, response) < 0 ? a.optionText || answer : null };
    else if (type === 'multi-select') reviewed = { selectedIndices: extractSelectedIndices(question, response) };
    else if (type === 'answer-evidence') reviewed = {
      answerIdx: choice(a.answerIdx, a.answerText, question.answerOptions || question.options),
      evidenceIdx: choice(a.evidenceIdx, a.evidenceText, question.evidenceOptions)
    };
    else if (type === 'numeric-response') reviewed = { numericValue: extractNumericAnswer(response), unit: normalizePresentationUnit(extractNumericUnit(response)), unparsedText: extractNumericAnswer(response) == null ? extractTextAnswer(response) : '' };
    else if (type === 'sequence-sense') reviewed = { verifyAnswer: a.verifyAnswer || '', clickedIdx: Number.isInteger(a.clickedIdx) ? a.clickedIdx : null, orderAnswer: canonicalOrderAnswer(question, a), principleAnswer: a.principleAnswer || '' };
    else if (type === 'relation-mismatch') reviewed = { clickedPairIdx: Number.isInteger(a.clickedPairIdx) ? a.clickedPairIdx : null, partnerAnswer: a.partnerAnswer || '' };
    else if (type === 'order') reviewed = { order: extractOrderAnswer(response) };
    else if (type === 'fill-blank' || type === 'short-answer' || type === 'self-explanation') reviewed = { text: extractTextAnswer(response) };
    else reviewed = (answer && typeof answer === 'object' && !Array.isArray(answer)) ? Object.assign({}, answer) : { value: answer };
    var reasoningText = typeof a.explanation === 'string' && a.explanation.trim()
      ? a.explanation
      : (typeof a.reasoning === 'string' && a.reasoning.trim() ? a.reasoning : (typeof a.explanation === 'string' ? a.explanation : ''));
    if (type === 'relation-mismatch' || type === 'answer-evidence') {
      if (typeof a.explanation === 'string' || typeof a.reasoning === 'string') reviewed.explanation = reasoningText;
    } else if (question && question.requireReasoning === true && (typeof a.explanation === 'string' || typeof a.reasoning === 'string')) {
      reviewed.explanation = reasoningText;
    }
    var keys = {};
    ['correctAnswer', 'correctIndex', 'correctAnswers', 'correctEvidence', 'correctValue', 'tolerance', 'acceptableUnits', 'expectedFill', 'acceptableAlternatives', 'intentionallyWrongIndex', 'orderingPrinciple', 'wrongPairIndex', 'correctPartnerForWrong', 'correctOrder', 'correctSequence', 'expectedAnswer', 'referenceAnswer', 'modelAnswer', 'sampleAnswer', 'rubric', 'fillBlankPolicy', 'numericSettings', 'sequenceMode', 'requireReasoning', 'explanationPrompt', 'studentCriteria'].forEach(function (key) {
      if (question[key] != null) keys[key] = question[key];
    });
    function stable(value, depth) {
      var d = depth || 0;
      if (d > 16) return null;
      if (Array.isArray(value)) return value.slice(0, 500).map(function (item) { return stable(item, d + 1); });
      if (value && typeof value === 'object') {
        var result = Object.create(null);
        Object.keys(value).sort().forEach(function (key) {
          if (value[key] !== undefined) result[key] = stable(value[key], d + 1);
        });
        return result;
      }
      if (typeof value === 'bigint') return String(value);
      return value == null ? null : value;
    }
    try {
      var serialized = JSON.stringify(stable({
        question: legacyAssessmentItemSignature(question), responseQuestion: envelope.questionSignature || legacyAssessmentItemSignature(question),
        activity: envelope.assessmentActivityId || '', attempt: envelope.assessmentAttemptId || '', attemptStartedAt: envelope.assessmentAttemptStartedAt || 0,
        answer: reviewed, keys: keys, keyUnderReview: isAnswerKeyDisputed(question)
      }, 0));
      var first = 2166136261, second = 5381;
      for (var i = 0; i < serialized.length; i++) { first = Math.imul(first ^ serialized.charCodeAt(i), 16777619); second = Math.imul(second, 33) ^ serialized.charCodeAt(i); }
      return 'assess-response-v1:' + (first >>> 0).toString(36) + ':' + (second >>> 0).toString(36);
    } catch (e) { return ''; }
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
      if (!Array.isArray(source) && Array.isArray(answer.selectedOptions)) source = answer.selectedOptions;
    }
    if (!Array.isArray(source)) return [];
    var options = question && Array.isArray(question.options) ? question.options : [];
    var boundedSource = source.length > Math.max(200, Math.min(1000, options.length * 2))
      ? source.slice(0, Math.max(200, Math.min(1000, options.length * 2)))
      : source;
    var out = [];
    boundedSource.forEach(function (value) {
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

  function parseFlexibleNumericInput(raw) {
    if (typeof raw === 'number') {
      return Number.isFinite(raw) ? { value: raw === 0 ? 0 : raw, unit: '' } : { value: null, unit: '' };
    }
    if (typeof raw !== 'string' || raw.length > 4096) return { value: null, unit: '' };
    var normalized = raw.replace(/[\u2212\u2013\u2014]/g, '-').replace(/\u2044/g, '/').trim();
    if (!normalized) return { value: null, unit: '' };
    function stripThousands(s) {
      if (/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s)) return s.replace(/,/g, '');
      if (/^[+-]?\d+,\d+$/.test(s)) return s.replace(',', '.');
      return s;
    }
    function validTrailingUnit(rem) {
      var u = String(rem || '').trim();
      if (!u) return '';
      if (/^[0-9.,/+\-]/.test(u)) return null;
      // Text after the number is its unit, unless it is a second number or a
      // hedge ("3 or 4", "3 to 5", "3 and up") or a letter written straight on
      // ("3x", an algebra term). Those are not one number: left for the teacher.
      if (/\d/.test(u)) return null;
      if (/^(?:or|to|and|through|thru|till|until|between|plus|minus|times)\b/i.test(u)) return null;
      if (/^[xyzn]$/i.test(String(rem || ''))) return null;
      return u.slice(0, 80);
    }
    // Mixed fraction e.g. "-1 1/2 kg" or "2 3/4"
    var mixed = normalized.match(/^([+-]?(?:\d{1,3}(?:,\d{3})+|\d+))\s+(\d+)\s*\/\s*(\d+)(.*)$/);
    if (mixed) {
      var uMixed = validTrailingUnit(mixed[4]);
      if (uMixed === null) return { value: null, unit: '' };
      var wholeNum = Number(stripThousands(mixed[1]));
      var fracNum = Number(mixed[2]);
      var fracDen = Number(mixed[3]);
      if (!Number.isFinite(wholeNum) || !Number.isFinite(fracNum) || !Number.isFinite(fracDen) || fracDen === 0) {
        return { value: null, unit: '' };
      }
      var sign = mixed[1].trim().charAt(0) === '-' ? -1 : 1;
      var combined = sign * (Math.abs(wholeNum) + (fracNum / fracDen));
      return Number.isFinite(combined) ? { value: combined === 0 ? 0 : combined, unit: uMixed } : { value: null, unit: '' };
    }
    // Simple fraction e.g. "-3/4" or "1/2 cup"
    var frac = normalized.match(/^([+-]?(?:\d{1,3}(?:,\d{3})+|\d+))\s*\/\s*([+-]?\d+)(.*)$/);
    if (frac) {
      var uFrac = validTrailingUnit(frac[3]);
      if (uFrac === null) return { value: null, unit: '' };
      var n = Number(stripThousands(frac[1]));
      var d = Number(frac[2]);
      if (!Number.isFinite(n) || !Number.isFinite(d) || d === 0) return { value: null, unit: '' };
      var q = n / d;
      return Number.isFinite(q) ? { value: q === 0 ? 0 : q, unit: uFrac } : { value: null, unit: '' };
    }
    // Plain number with optional commas, decimals, scientific notation, and optional unit
    var plain = normalized.match(/^([+-]?(?:\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?|\.\d+)(?:[eE][+-]?\d+)?)(.*)$/);
    if (plain) {
      var uPlain = validTrailingUnit(plain[2]);
      if (uPlain === null) return { value: null, unit: '' };
      var num = Number(stripThousands(plain[1]));
      return Number.isFinite(num) ? { value: num === 0 ? 0 : num, unit: uPlain } : { value: null, unit: '' };
    }
    return { value: null, unit: '' };
  }

  function extractNumericAnswer(response) {
    var answer = unwrapPresentationAnswer(response).answer;
    if (typeof answer === 'number' && Number.isFinite(answer)) return answer;
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) {
      return parseFlexibleNumericInput(answer).value;
    }
    var candidates = [answer.numericValue, answer.value, answer.number, answer.text];
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] == null || String(candidates[i]).trim() === '') continue;
      var parsed = parseFlexibleNumericInput(candidates[i]);
      if (parsed.value != null && Number.isFinite(parsed.value)) return parsed.value;
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

  // Fill-blank keys tolerate case, width/composition, whitespace runs, and
  // wrapping quotes, brackets, or sentence punctuation. Signs, %, and inner
  // punctuation stay significant ("-5" is not "5").
  function normalizeFillBlankComparable(value) {
    var s = String(value == null ? '' : value);
    if (typeof s.normalize === 'function') s = s.normalize('NFKC');
    s = s.toLowerCase().replace(/\s+/g, ' ').trim();
    s = s.replace(/^[\s"'`‘’“”«»¿¡([{]+/, '').replace(/[\s"'`‘’“”«»)\]}.,;:!?…]+$/, '').trim();
    return s;
  }

  // Pure fill-blank verdict. A miss the learner's AI check called correct
  // (a typo, a synonym, or a different real word such as affect/effect) goes
  // to teacher review instead of contradicting what the learner was shown.
  function gradeFillBlankAnswer(text, question, studentAiVerdict) {
    var policy = question && (question.fillBlankPolicy || (question.spellingPolicy === 'exact' ? 'exact' : 'normalized')) || 'normalized';
    var normalize = policy === 'exact' ? function (value) { return String(value == null ? '' : value).trim(); } : normalizeFillBlankComparable;
    var answer = normalize(text);
    var targets = [question && question.expectedFill || ''].concat(question && Array.isArray(question.acceptableAlternatives) ? question.acceptableAlternatives : [])
      .map(normalize).filter(Boolean);
    if (!answer || !targets.length) return { status: 'submitted', evaluable: false };
    if (targets.indexOf(answer) !== -1) return { status: 'correct', evaluable: true };
    if (policy === 'exact') return { status: 'incorrect', evaluable: true };
    if (policy === 'review-variants') return { status: 'submitted', evaluable: false, needsReview: true };
    if (String(studentAiVerdict || '').trim().toLowerCase() === 'correct') return { status: 'submitted', evaluable: false, needsReview: true, studentAiVerdict: 'correct' };
    return { status: 'incorrect', evaluable: true };
  }

  function normalizePresentationUnit(value) {
    return normalizePresentationComparable(value).replace(/\./g, '').replace(/\s+/g, ' ');
  }

  // Small, explicit unit table. Never infer conversions for unknown units,
  // dimensions, ambiguous abbreviations, temperature offsets, or currencies.
  function numericUnitDefinition(raw) {
    var unit = normalizePresentationUnit(raw);
    var groups = [
      ['length', 0.001, ['mm', 'millimeter', 'millimeters', 'millimetre', 'millimetres']],
      ['length', 0.01, ['cm', 'centimeter', 'centimeters', 'centimetre', 'centimetres']],
      ['length', 1, ['m', 'meter', 'meters', 'metre', 'metres']],
      ['length', 1000, ['km', 'kilometer', 'kilometers', 'kilometre', 'kilometres']],
      ['length', 0.0254, ['in', 'inch', 'inches']],
      ['length', 0.3048, ['ft', 'foot', 'feet']],
      ['length', 0.9144, ['yd', 'yard', 'yards']],
      ['length', 1609.344, ['mi', 'mile', 'miles']],
      ['mass', 0.001, ['mg', 'milligram', 'milligrams']],
      ['mass', 1, ['g', 'gram', 'grams']],
      ['mass', 1000, ['kg', 'kilogram', 'kilograms']],
      ['mass', 453.59237, ['lb', 'lbs', 'pound', 'pounds']],
      ['mass', 28.349523125, ['oz', 'ounce', 'ounces']],
      ['volume', 0.001, ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres']],
      ['volume', 1, ['l', 'liter', 'liters', 'litre', 'litres']],
      ['time', 1, ['s', 'sec', 'second', 'seconds']],
      ['time', 60, ['min', 'minute', 'minutes']],
      ['time', 3600, ['h', 'hr', 'hour', 'hours']],
      ['time', 86400, ['d', 'day', 'days']]
    ];
    for (var i = 0; i < groups.length; i++) {
      if (groups[i][2].indexOf(unit) >= 0) return { dimension: groups[i][0], factor: groups[i][1] };
    }
    return null;
  }

  function gradeNumericAnswer(parsed, question, scoringPolicy) {
    var q = question || {}, policy = normalizeLiveScoringPolicy(scoringPolicy);
    if (!parsed || typeof parsed.value !== 'number' || !Number.isFinite(parsed.value)) return { status: 'invalid', evaluable: false, score: 0 };
    if (!hasNumericAnswerKey(q)) return { status: 'invalid', evaluable: false, invalidKey: true, score: 0 };
    var settings = q.numericSettings && typeof q.numericSettings === 'object' ? q.numericSettings : {};
    var expected = parseFlexibleNumericInput(q.correctValue).value;
    var rawTolerance = q.tolerance;
    var parsedTolerance = (rawTolerance !== null && rawTolerance !== undefined && rawTolerance !== '' && typeof rawTolerance !== 'boolean') ? Number(rawTolerance) : 0;
    var tolerance = Number.isFinite(parsedTolerance) && parsedTolerance > 0 ? parsedTolerance : 0;
    if (expected == null) return { status: 'invalid', evaluable: false, invalidKey: true, score: 0 };
    var expectedUnits = [q.unit || ''].concat(Array.isArray(q.acceptableUnits) ? q.acceptableUnits : []).map(normalizePresentationUnit).filter(Boolean);
    var submittedUnit = normalizePresentationUnit(parsed.unit);
    var comparableValue = parsed.value;
    var unitCorrect = expectedUnits.length === 0 || expectedUnits.indexOf(submittedUnit) >= 0;
    var converted = false;
    var conversionOverflow = false;
    if (settings.allowEquivalentUnits === true && expectedUnits.length && submittedUnit) {
      var source = numericUnitDefinition(submittedUnit), target = numericUnitDefinition(q.unit);
      // Convert even when the alternate unit is also an accepted spelling;
      // numeric equivalence is always measured in the authored key's unit.
      if (source && target && source.dimension === target.dimension) {
        var convertedVal = parsed.value * source.factor / target.factor;
        unitCorrect = true;
        converted = source.factor !== target.factor;
        if (Number.isFinite(convertedVal)) {
          comparableValue = convertedVal;
        } else {
          conversionOverflow = true;
          comparableValue = null;
        }
      }
    }
    var valueCorrect = !conversionOverflow && typeof comparableValue === 'number' && Number.isFinite(comparableValue) && Math.abs(comparableValue - expected) <= tolerance + 1e-9;
    var configuredWeight = settings.valueWeight == null ? q.valueWeight : settings.valueWeight;
    var valueWeight = typeof configuredWeight === 'number' && Number.isFinite(configuredWeight) ? Math.max(0, Math.min(1, configuredWeight)) : 0.5;
    if (!expectedUnits.length) valueWeight = 1;
    var rawScore = Math.round(100 * ((valueCorrect ? valueWeight : 0) + (unitCorrect ? 1 - valueWeight : 0)));
    var exact = (valueWeight === 0 || valueCorrect) && (valueWeight === 1 || unitCorrect);
    var score = policy.partialCredit ? rawScore : exact ? 100 : 0;
    return { status: exact ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect', evaluable: true, score: score,
      scoreFraction: score / 100, valueCorrect: valueCorrect, unitCorrect: unitCorrect, convertedValue: comparableValue, converted: converted };
  }

  function hasNumericAnswerKey(question) {
    var value = question && question.correctValue;
    var parsed = parseFlexibleNumericInput(value).value;
    return parsed != null && Number.isFinite(parsed);
  }

  function extractNumericUnit(response) {
    var answer = unwrapPresentationAnswer(response).answer;
    if (typeof answer === 'string') return parseFlexibleNumericInput(answer).unit;
    if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return '';
    if (answer.unit != null && String(answer.unit).trim() !== '') {
      return String(answer.unit).trim().slice(0, 80);
    }
    var candidates = [answer.numericValue, answer.value, answer.number, answer.text];
    for (var i = 0; i < candidates.length; i++) {
      if (typeof candidates[i] !== 'string' || !candidates[i].trim()) continue;
      var parsed = parseFlexibleNumericInput(candidates[i]);
      if (parsed.value != null && parsed.unit) return parsed.unit;
    }
    return '';
  }

  function resolvePresentationCorrectIndices(question) {
    var options = question && Array.isArray(question.options) ? question.options : [];
    var correctAnswers = question && Array.isArray(question.correctAnswers) && question.correctAnswers.length
      ? question.correctAnswers
      : (question && Array.isArray(question.correctIndices) ? question.correctIndices : []);
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
      return value == null || (typeof value !== 'string' && typeof value !== 'number') || (typeof value === 'number' && !Number.isFinite(value));
    })) return [];
    var unique = new Set(expected.map(function (value) { return typeof value + ':' + String(value); }));
    return unique.size === expected.length ? expected : [];
  }

  // Sequence Sense answer key. The author supplies one "intentionallyWrongIndex",
  // but an adjacent swap leaves BOTH items out of place, so the accepted set is
  // derived from the displayed order itself: a displayed position counts as
  // misplaced when removing it leaves the remaining items in canonical order.
  // Canonical (or missing) order -> nothing is misplaced. A scramble no single
  // removal can repair falls back to the authored index, else every position
  // (all are out of place). Returns { orderIsCorrect, misplaced: [positions] }.
  function sequenceSenseTruth(presentedOrder, intentionallyWrongIndex, itemCount) {
    var n = Number(itemCount) || 0;
    var valid = n > 0 && Array.isArray(presentedOrder) && presentedOrder.length === n
      && presentedOrder.every(function (value) { return Number.isInteger(value) && value >= 0 && value < n; })
      && new Set(presentedOrder).size === n;
    if (!valid || presentedOrder.every(function (value, index) { return value === index; })) return { orderIsCorrect: true, misplaced: [] };
    var misplaced = [];
    // Removing a single element can sort a permutation only if there is exactly
    // one adjacent descent (d, d+1), and the candidate skip index must be d or d+1.
    var descents = [];
    for (var di = 0; di < n - 1; di++) {
      if (presentedOrder[di] > presentedOrder[di + 1]) {
        descents.push(di);
        if (descents.length > 1) break;
      }
    }
    if (descents.length === 1) {
      var candidates = [descents[0], descents[0] + 1];
      for (var ci = 0; ci < candidates.length; ci++) {
        var skip = candidates[ci];
        var previous = -1;
        var sorted = true;
        for (var j = 0; j < n && sorted; j++) {
          if (j === skip) continue;
          if (presentedOrder[j] < previous) sorted = false;
          previous = presentedOrder[j];
        }
        if (sorted) misplaced.push(skip);
      }
    }
    if (!misplaced.length) {
      misplaced = Number.isInteger(intentionallyWrongIndex) && intentionallyWrongIndex >= 0 && intentionallyWrongIndex < n
        ? [intentionallyWrongIndex]
        : presentedOrder.map(function (_, index) { return index; });
    }
    return { orderIsCorrect: false, misplaced: misplaced };
  }
  // "items 2 and 3 were swapped" / "item 3 was misplaced" / "items 1, 3 and 4 were out of place"
  function describeSequenceMisplaced(misplaced) {
    var numbers = (Array.isArray(misplaced) ? misplaced : []).map(function (index) { return index + 1; });
    if (!numbers.length) return 'the order was correct';
    if (numbers.length === 1) return 'item ' + numbers[0] + ' was misplaced';
    if (numbers.length === 2 && numbers[1] === numbers[0] + 1) return 'items ' + numbers[0] + ' and ' + numbers[1] + ' were swapped';
    return 'items ' + numbers.slice(0, -1).join(', ') + ' and ' + numbers[numbers.length - 1] + ' were out of place';
  }

  function resolveAnswerEvidenceKeys(question) {
    var answers = question && Array.isArray(question.answerOptions) ? question.answerOptions : [];
    var evidence = question && Array.isArray(question.evidenceOptions) ? question.evidenceOptions : [];
    var rawAnswer = question && question.correctAnswer != null && String(question.correctAnswer).trim() !== ''
      ? question.correctAnswer
      : (question ? question.expectedAnswer : null);
    var rawEvidence = question && question.correctEvidence != null && String(question.correctEvidence).trim() !== ''
      ? question.correctEvidence
      : (question ? question.expectedEvidence : null);
    if (typeof rawAnswer === 'number' && Number.isInteger(rawAnswer) && rawAnswer >= 0 && rawAnswer < answers.length) {
      rawAnswer = answers[rawAnswer];
    }
    if (typeof rawEvidence === 'number' && Number.isInteger(rawEvidence) && rawEvidence >= 0 && rawEvidence < evidence.length) {
      rawEvidence = evidence[rawEvidence];
    }
    var correctAnswer = normalizePresentationComparable(rawAnswer);
    var correctEvidence = normalizePresentationComparable(rawEvidence);
    var answerMatched = !!correctAnswer && answers.some(function (value) { return normalizePresentationComparable(value) === correctAnswer; });
    var evidenceMatched = !!correctEvidence && evidence.some(function (value) { return normalizePresentationComparable(value) === correctEvidence; });
    return {
      correctAnswer: answerMatched ? correctAnswer : '',
      correctEvidence: evidenceMatched ? correctEvidence : '',
    };
  }

  function hasRequiredReasoning(answerObject) {
    if (!answerObject || typeof answerObject !== 'object') return false;
    return !!(String(answerObject.explanation || '').trim() || String(answerObject.reasoning || '').trim());
  }

  function presentationQuestionIsGameScorable(question) {
    var type = normalizeItemType(question, null);
    if (isUnscoredPollQuestion(question, null)) return false;
    if (type === 'mcq') return resolveCorrectIdx(question) >= 0;
    if (type === 'multi-select') {
      var multiKeys = question && Array.isArray(question.correctAnswers) && question.correctAnswers.length
        ? question.correctAnswers
        : (question && Array.isArray(question.correctIndices) ? question.correctIndices : []);
      return multiKeys.length > 0 && resolvePresentationCorrectIndices(question).length === multiKeys.length;
    }
    if (type === 'fill-blank') return !!(question && (question.expectedFill || (Array.isArray(question.acceptableAlternatives) && question.acceptableAlternatives.length)));
    if (type === 'numeric-response') return hasNumericAnswerKey(question);
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
      var resolvedAE = resolveAnswerEvidenceKeys(question);
      return !!resolvedAE.correctAnswer && !!resolvedAE.correctEvidence;
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
    var versionIssue = assessmentResponseVersionIssue(question, response);
    if (versionIssue) return result('submitted', false, null, { versionMismatch: versionIssue === 'mismatch', versionUnverified: versionIssue === 'unverified' });
    if (isAnswerKeyDisputed(question)) return result('submitted', false, null, { keyUnderReview: true });
    // "I don't know" is explicit student intent. A generic client status
    // string is never authoritative, including status: "idk".
    if (answerObject.idk === true) return result('idk', true, null);
    var reasoningMissing = !!(question && question.requireReasoning === true && !hasRequiredReasoning(answerObject));

    if (type === 'mcq') {
      var optionIdx = extractOptionIndex(question, response);
      var correctIdx = resolveCorrectIdx(question);
      if (optionIdx < 0 || correctIdx < 0) return result('submitted', false, null);
      if (reasoningMissing) return result('submitted', false, null, { needsReasoning: true });
      return result(optionIdx === correctIdx ? 'correct' : 'incorrect', true, optionIdx === correctIdx ? 100 : 0);
    }
    if (type === 'multi-select') {
      var selected = extractSelectedIndices(question, response);
      var options = question && Array.isArray(question.options) ? question.options : [];
      var correct = resolvePresentationCorrectIndices(question);
      if (!selected.length || !correct.length || !presentationQuestionIsGameScorable(question)) {
        return result('submitted', false, null);
      }
      if (reasoningMissing) return result('submitted', false, null, { needsReasoning: true });
      var selectedCorrect = selected.filter(function (idx) { return correct.indexOf(idx) >= 0; }).length;
      var selectedWrong = selected.length - selectedCorrect;
      var multiPartialScore = Math.round(100 * Math.max(0, selectedCorrect - selectedWrong) / Math.max(1, correct.length));
      var multiExact = selectedWrong === 0 && selectedCorrect === correct.length;
      var multiScore = policy.partialCredit ? multiPartialScore : (multiExact ? 100 : 0);
      var multiStatus = selectedWrong === 0 && selectedCorrect === correct.length
        ? 'correct'
        : multiScore > 0 ? 'partially-correct' : 'incorrect';
      return result(multiStatus, true, multiScore, {
        scoreFraction: multiScore / 100,
        correctIndices: correct.slice(),
        selectedCorrect: selectedCorrect,
        selectedWrong: selectedWrong,
        totalCorrect: correct.length,
      });
    }
    if (type === 'fill-blank') {
      var fillText = extractTextAnswer(response);
      var fill = gradeFillBlankAnswer(fillText, question, answerObject.aiVerdict);
      if (String(fillText || '').trim() && reasoningMissing) return result('submitted', false, null, { needsReasoning: true });
      if (!fill.evaluable) return result('submitted', false, null, fill.needsReview ? { needsReview: true, studentAiVerdict: fill.studentAiVerdict } : null);
      if (reasoningMissing) return result('submitted', false, null, { needsReasoning: true });
      return result(fill.status, true, fill.status === 'correct' ? 100 : 0);
    }
    if (type === 'numeric-response') {
      var value = extractNumericAnswer(response);
      if (value == null || !hasNumericAnswerKey(question)) return result('submitted', false, null);
      if (reasoningMissing) return result('submitted', false, null, { needsReasoning: true });
      var numericGrade = gradeNumericAnswer({ value: value, unit: extractNumericUnit(response) }, question, policy);
      return result(numericGrade.status, numericGrade.evaluable, numericGrade.score, numericGrade);
    }
    if (type === 'order') {
      var submittedOrder = extractOrderAnswer(response);
      var expectedOrder = expectedPresentationOrder(question);
      if (!submittedOrder.length || !expectedOrder.length || submittedOrder.length !== expectedOrder.length) {
        return result('submitted', false, null);
      }
      if (reasoningMissing) return result('submitted', false, null, { needsReasoning: true });
      var orderCorrect = samePrimitiveArray(submittedOrder, expectedOrder);
      return result(orderCorrect ? 'correct' : 'incorrect', true, orderCorrect ? 100 : 0);
    }
    if (type === 'sequence-sense') {
      if (!presentationQuestionIsGameScorable(question)) return result('submitted', false, null);
      var verifyAnswer = normalizeComparable(answerObject.verifyAnswer);
      var principleAnswer = normalizeComparable(answerObject.principleAnswer);
      var compactSequence = question.sequenceMode === 'arrange-explain';
      if ((!compactSequence && verifyAnswer !== 'yes' && verifyAnswer !== 'no') || !principleAnswer) return result('submitted', false, null);
      var sequenceItemCount = Array.isArray(question.items) ? question.items.length : 0;
      if (!compactSequence && verifyAnswer === 'no' && (!Number.isInteger(answerObject.clickedIdx) || answerObject.clickedIdx < 0 || answerObject.clickedIdx >= sequenceItemCount)) {
        return result('submitted', false, null);
      }
      var truth = sequenceSenseTruth(question.presentedOrder, question.intentionallyWrongIndex, sequenceItemCount);
      var step1Correct = verifyAnswer === 'yes' ? truth.orderIsCorrect : !truth.orderIsCorrect;
      var step2Correct = verifyAnswer === 'yes'
        ? step1Correct
        : truth.misplaced.indexOf(answerObject.clickedIdx) >= 0;
      // Clients that ran the arrange step send orderAnswer (canonical indices in
      // the student's arrangement) and are scored out of 4; older payloads have
      // none and stay 3-step so their totals do not shift under them.
      var orderAnswer = canonicalOrderAnswer(question, answerObject);
      var arrangeCorrect = orderAnswer
        ? orderAnswer.length === sequenceItemCount && orderAnswer.every(function (value, index) { return value === index; })
        : null;
      var acceptedPrinciples = [question.orderingPrinciple]
        .concat(Array.isArray(question.acceptablePrinciples) ? question.acceptablePrinciples : [])
        .map(normalizeComparable)
        .filter(Boolean);
      var step3Correct = acceptedPrinciples.indexOf(principleAnswer) >= 0;
      if (compactSequence && (!orderAnswer || orderAnswer.length !== sequenceItemCount || new Set(orderAnswer).size !== sequenceItemCount
          || orderAnswer.some(function (value) { return !Number.isInteger(value) || value < 0 || value >= sequenceItemCount; }))) return result('submitted', false, null);
      if (reasoningMissing) return result('submitted', false, null, { needsReasoning: true });
      var sequenceMax = compactSequence ? 2 : orderAnswer ? 4 : 3;
      var sequenceRawScore = (compactSequence ? 0 : (step1Correct ? 1 : 0) + (step2Correct ? 1 : 0)) + (arrangeCorrect ? 1 : 0) + (step3Correct ? 1 : 0);
      var sequenceScore = policy.partialCredit ? sequenceRawScore : (sequenceRawScore === sequenceMax ? sequenceMax : 0);
      return result(sequenceScore === sequenceMax ? 'correct' : sequenceScore > 0 ? 'partially-correct' : 'incorrect', true, sequenceScore, {
        step1Correct: step1Correct,
        step2Correct: step2Correct,
        arrangeCorrect: arrangeCorrect,
        step3Correct: step3Correct,
        scoreFraction: sequenceScore / sequenceMax,
      });
    }
    if (type === 'relation-mismatch') {
      if (!presentationQuestionIsGameScorable(question)) return result('submitted', false, null);
      if (reasoningMissing) return result('submitted', false, null, { needsReasoning: true });
      if (!Number.isInteger(answerObject.clickedPairIdx) || answerObject.clickedPairIdx < 0 || answerObject.clickedPairIdx >= question.pairs.length || !normalizeComparable(answerObject.partnerAnswer)) {
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
      if (reasoningMissing) return result('submitted', false, null, { needsReasoning: true });
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
      var aeKeys = resolveAnswerEvidenceKeys(question);
      var answerCorrect = normalizeComparable(answerOptions[answerIdx]) === aeKeys.correctAnswer;
      var evidenceCorrect = normalizeComparable(evidenceOptions[evidenceIdx]) === aeKeys.correctEvidence;
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
        ? _optionLabel(correctIdx) + '. ' + String(options[correctIdx])
        : '';
    }
    if (type === 'multi-select') {
      var correctIndices = resolvePresentationCorrectIndices(question);
      return correctIndices.length
        ? correctIndices.map(function (idx) {
            return _optionLabel(idx) + '. ' + String(options[idx]);
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
    if (type === 'numeric-response' && hasNumericAnswerKey(question)) {
      var numericGuide = String(question.correctValue).trim();
      if (String(question.unit || '').trim()) numericGuide += ' ' + String(question.unit).trim();
      var rawTolerance = question.tolerance;
      var parsedTolerance = (rawTolerance !== null && rawTolerance !== undefined && rawTolerance !== '' && typeof rawTolerance !== 'boolean') ? Number(rawTolerance) : NaN;
      if (Number.isFinite(parsedTolerance) && Math.abs(parsedTolerance) > 0) {
        numericGuide += ' (±' + Math.abs(parsedTolerance) + ')';
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
      var sequenceTruth = sequenceSenseTruth(question.presentedOrder, question.intentionallyWrongIndex, question.items.length);
      if (sequenceTruth.orderIsCorrect) return 'Sequence is valid · Principle: ' + principle;
      var described = describeSequenceMisplaced(sequenceTruth.misplaced);
      return described.charAt(0).toUpperCase() + described.slice(1)
        + ' · Correct order: ' + question.items.map(function (value) { return String(value); }).join(' → ')
        + ' · Principle: ' + principle;
    }
    if (type === 'relation-mismatch' && presentationQuestionIsGameScorable(question)) {
      var pair = question.pairs[question.wrongPairIndex] || {};
      return String(pair.left || 'Mismatched item') + ' → ' + String(question.correctPartnerForWrong);
    }
    if (type === 'answer-evidence' && presentationQuestionIsGameScorable(question)) {
      var aeAnswers = Array.isArray(question.answerOptions) ? question.answerOptions : [];
      var aeEvidence = Array.isArray(question.evidenceOptions) ? question.evidenceOptions : [];
      var rawAeAnswer = question.correctAnswer != null && String(question.correctAnswer).trim() !== ''
        ? question.correctAnswer : question.expectedAnswer;
      var rawAeEvidence = question.correctEvidence != null && String(question.correctEvidence).trim() !== ''
        ? question.correctEvidence : question.expectedEvidence;
      if (typeof rawAeAnswer === 'number' && Number.isInteger(rawAeAnswer) && rawAeAnswer >= 0 && rawAeAnswer < aeAnswers.length) {
        rawAeAnswer = aeAnswers[rawAeAnswer];
      }
      if (typeof rawAeEvidence === 'number' && Number.isInteger(rawAeEvidence) && rawAeEvidence >= 0 && rawAeEvidence < aeEvidence.length) {
        rawAeEvidence = aeEvidence[rawAeEvidence];
      }
      return 'Answer: ' + String(rawAeAnswer) + ' · Evidence: ' + String(rawAeEvidence);
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
    var distributionEntries = entries.filter(function (entry) { return !assessmentResponseVersionIssue(question, entry.response); });
    var versionReviewCount = respondentCount - distributionEntries.length;
    var evaluable = entries.filter(function (entry) { return entry.grade.evaluable; });
    var correctCount = evaluable.filter(function (entry) { return entry.grade.isCorrect === true; }).length;
    var partialCount = evaluable.filter(function (entry) { return entry.grade.status === 'partially-correct'; }).length;
    var incorrectCount = evaluable.filter(function (entry) { return entry.grade.status === 'incorrect'; }).length;
    var accuracyWeightTotal = evaluable.reduce(function (sum, entry) {
      var weight = presentationAccuracyWeight(entry.grade, null, policy);
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
        var count = distributionEntries.filter(function (entry) { return extractOptionIndex(question, entry.response) === idx; }).length;
        return {
          label: _optionLabel(idx),
          text: String(option == null ? '' : option),
          value: count,
          percent: distributionEntries.length > 0 ? Math.round(count / distributionEntries.length * 100) : 0,
          imageUrl: question && Array.isArray(question.optionImageUrls) ? question.optionImageUrls[idx] : null,
          isCorrect: !unscored && idx === correctIdx
        };
      });
    } else if (type === 'multi-select') {
      kind = 'multi-select';
      var multiCorrectIndices = unscored ? [] : resolvePresentationCorrectIndices(question);
      rows = options.map(function (option, idx) {
        var count = distributionEntries.filter(function (entry) { return extractSelectedIndices(question, entry.response).indexOf(idx) !== -1; }).length;
        var correct = multiCorrectIndices.indexOf(idx) >= 0;
        return {
          label: _optionLabel(idx),
          text: String(option == null ? '' : option),
          value: count,
          percent: distributionEntries.length > 0 ? Math.round(count / distributionEntries.length * 100) : 0,
          imageUrl: question && Array.isArray(question.optionImageUrls) ? question.optionImageUrls[idx] : null,
          isCorrect: correct
        };
      });
    } else if (type === 'fill-blank' || type === 'short-answer' || type === 'self-explanation') {
      kind = 'text';
      var textBuckets = Object.create(null);
      distributionEntries.forEach(function (entry) {
        var text = extractTextAnswer(entry.response);
        if (!text) return;
        var display = text.slice(0, 160);
        var key = display.toLowerCase();
        if (!textBuckets[key]) textBuckets[key] = { text: display, count: 0, isCorrect: false };
        textBuckets[key].count++;
        if (entry.grade && entry.grade.isCorrect === true) textBuckets[key].isCorrect = true;
      });
      rows = Object.keys(textBuckets).map(function (key) { return textBuckets[key]; })
        .sort(function (a, b) { return b.count - a.count || a.text.localeCompare(b.text); })
        .slice(0, 12)
        .map(function (bucket, idx) {
          return {
            label: String(idx + 1),
            text: bucket.text,
            value: bucket.count,
            percent: distributionEntries.length > 0 ? Math.round(bucket.count / distributionEntries.length * 100) : 0,
            imageUrl: null,
            isCorrect: bucket.isCorrect === true
          };
        });
    } else if (type === 'numeric-response') {
      kind = 'numeric';
      var numericBuckets = Object.create(null);
      var unitRequired = !!normalizePresentationUnit(question && question.unit);
      distributionEntries.forEach(function (entry) {
        var value = extractNumericAnswer(entry.response);
        var submittedUnit = extractNumericUnit(entry.response);
        var normalizedUnit = normalizePresentationUnit(submittedUnit);
        var key = value == null ? 'unparseable' : String(value) + '\u0000' + normalizedUnit;
        var label = value == null
          ? 'Unparseable response'
          : String(value) + (submittedUnit ? ' ' + submittedUnit : unitRequired ? ' (no unit)' : '');
        if (!numericBuckets[key]) {
          numericBuckets[key] = { text: label, count: 0, value: value, normalizedUnit: normalizedUnit, isCorrect: false };
        }
        numericBuckets[key].count++;
        if (entry.grade && entry.grade.isCorrect === true) numericBuckets[key].isCorrect = true;
      });
      rows = Object.keys(numericBuckets).map(function (key) { return numericBuckets[key]; })
        .sort(function (a, b) {
          if (a.value == null) return 1;
          if (b.value == null) return -1;
          return a.value - b.value || a.normalizedUnit.localeCompare(b.normalizedUnit);
        })
        .slice(0, 12)
        .map(function (bucket, idx) {
          return {
            label: String(idx + 1),
            text: bucket.text,
            value: bucket.count,
            percent: distributionEntries.length > 0 ? Math.round(bucket.count / distributionEntries.length * 100) : 0,
            imageUrl: null,
            isCorrect: bucket.isCorrect === true
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
      distributionRespondentCount: distributionEntries.length,
      versionReviewCount: versionReviewCount,
      evaluableResponseCount: evaluable.length,
      correctCount: correctCount,
      incorrectCount: incorrectCount,
      partialCount: partialCount,
      correctRate: evaluable.length > 0 ? Math.round(correctCount / evaluable.length * 100) : null,
      unscored: unscored,
      accuracyRate: policy.accuracy && evaluable.length > 0 ? Math.round(accuracyWeightTotal / evaluable.length * 100) : null,
      scoringPolicy: policy,
      confidenceReportedCount: confidenceReportedCount,
      confidenceMissingCount: confidenceMissingCount,
      confidenceAwaitingReviewCount: confidenceAwaitingReviewCount,
      confidenceBuckets: confidenceBuckets,
      evaluative: !unscored && gameScorable,
      gameScorable: gameScorable,
      note: versionReviewCount > 0 ? versionReviewCount + ' response(s) from another question version need review and are excluded from current-choice distributions.'
        : isAnswerKeyDisputed(question) ? 'Answer key under review — responses are not scored.' : unscored ? 'Unscored poll — response distribution only.'
        : evaluable.length === 0 && respondentCount > 0 ? 'Responses received — teacher review is required before scoring.'
        : ''
    };
  }

  // ─── Per-item grader: infers correctness from student's submitted answer ──
  // Returns { status, ... extra fields per type }.
  // status ∈ { 'correct' | 'incorrect' | 'partially-correct' | 'idk' | 'submitted' | 'no-response' }
  function gradeResponseForItem(response, question, scoringPolicy) {
    if (!response || typeof response !== 'object') return { status: 'no-response' };
    var itemType = normalizeItemType(question, response);

    // Opinion polls are participation evidence only. Check this before IDK,
    // AI grading, or teacher overrides so even a numeric zero response cannot
    // become evaluative or disappear behind a falsy-value check.
    if (isUnscoredPollQuestion(question, response)) {
      return { status: 'submitted', unscored: true, evaluative: false };
    }
    if (assessmentResponseVersionIssue(question, response)) return gradePresentationResponse(response, question, scoringPolicy);
    if (!Object.prototype.hasOwnProperty.call(response, 'answer') || response.answer == null) return { status: 'no-response' };
    if (isAnswerKeyDisputed(question)) return gradePresentationResponse(response, question, scoringPolicy);
    if (response.answer && typeof response.answer === 'object' && response.answer.idk === true) return { status: 'idk' };

    if (itemType === 'mcq') {
      return gradePresentationResponse(response, question, scoringPolicy);
    }

    if (itemType === 'fill-blank' && question) {
      var fillRaw = response.answer && typeof response.answer === 'object' && typeof response.answer.text === 'string'
        ? response.answer.text : extractTextAnswer(response);
      return Object.assign({}, gradePresentationResponse(response, question, scoringPolicy), { rawText: fillRaw });
    }

    if (itemType === 'short-answer' || itemType === 'self-explanation') {
      // Teacher uses judgment — we just surface the raw text
      var saRaw = response.answer && typeof response.answer === 'object' && typeof response.answer.text === 'string'
        ? response.answer.text : extractTextAnswer(response);
      return { status: 'submitted', rawText: saRaw };
    }

    if (itemType === 'sequence-sense' || itemType === 'relation-mismatch' || itemType === 'multi-select'
        || itemType === 'answer-evidence' || itemType === 'numeric-response' || itemType === 'order'
        || itemType === 'matching') {
      // Recompute from the canonical question. Client status/score fields are
      // never authoritative for gradebook or game scoring.
      return gradePresentationResponse(response, question, scoringPolicy);
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
  function assessmentGradePoints(grade, scoringPolicy) {
    var graded = grade && !grade.unscored && ['correct', 'incorrect', 'partially-correct'].indexOf(grade.status) >= 0;
    if (!graded) return { scoreFraction: null, earnedPoints: 0, maxPoints: 0 };
    var partialCredit = normalizeLiveScoringPolicy(scoringPolicy).partialCredit;
    var fraction = grade.status === 'correct' ? 1 : grade.status === 'incorrect' || !partialCredit ? 0
      : typeof grade.scoreFraction === 'number' && Number.isFinite(grade.scoreFraction) ? grade.scoreFraction : 0.5;
    fraction = Math.max(0, Math.min(1, fraction));
    return { scoreFraction: fraction, earnedPoints: fraction, maxPoints: 1 };
  }

  function assessmentResponseState(response, question) {
    var answer = unwrapPresentationAnswer(response).answer;
    var a = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
    var type = normalizeItemType(question, response), hasResponse = false, answered = false;
    function text(value) { return typeof value === 'string' && !!value.trim(); }
    function index(value) { return Number.isInteger(value) && value >= 0; }
    if (a.idk === true) return { answered: true, hasResponse: true };
    if (type === 'mcq' || type === 'opinion-mcq' || type === 'likert') {
      hasResponse = answered = extractOptionIndex(question, response) >= 0 || text(a.optionText);
      if (type === 'likert' && extractLikertNumericValue(question, response) != null) hasResponse = answered = true;
    } else if (type === 'multi-select') {
      hasResponse = answered = extractSelectedIndices(question, response).length > 0;
    } else if (type === 'answer-evidence') {
      var hasAnswer = index(a.answerIdx) || text(a.answerText), hasEvidence = index(a.evidenceIdx) || text(a.evidenceText);
      hasResponse = hasAnswer || hasEvidence; answered = hasAnswer && hasEvidence;
    } else if (type === 'sequence-sense') {
      var verify = a.verifyAnswer === 'yes' || a.verifyAnswer === 'no';
      var canonOrd = canonicalOrderAnswer(question, a);
      var changedOrder = Array.isArray(canonOrd) && !samePrimitiveArray(canonOrd, Array.isArray(question && question.presentedOrder) ? question.presentedOrder : []);
      hasResponse = verify || index(a.clickedIdx) || text(a.principleAnswer) || changedOrder;
      answered = verify && text(a.principleAnswer) && (a.verifyAnswer === 'yes' || index(a.clickedIdx));
      if (question && question.sequenceMode === 'arrange-explain') {
        var arranged = canonicalOrderAnswer(question, a), count = Array.isArray(question.items) ? question.items.length : 0;
        answered = !!(arranged && count > 0 && arranged.length === count && new Set(arranged).size === count && arranged.every(function (value) { return Number.isInteger(value) && value >= 0 && value < count; }) && text(a.principleAnswer));
        hasResponse = hasResponse || text(a.principleAnswer) || answered;
      }
    } else if (type === 'relation-mismatch') {
      hasResponse = index(a.clickedPairIdx) || text(a.partnerAnswer);
      answered = index(a.clickedPairIdx) && text(a.partnerAnswer);
    } else if (type === 'numeric-response') {
      hasResponse = text(a.text) || text(a.value) || text(a.number) || typeof a.numericValue === 'number' && Number.isFinite(a.numericValue)
        || typeof a.value === 'number' && Number.isFinite(a.value) || typeof a.number === 'number' && Number.isFinite(a.number)
        || typeof answer === 'string' && text(answer) || typeof answer === 'number' && Number.isFinite(answer);
      answered = hasResponse && extractNumericAnswer(response) != null;
    } else if (type === 'order') {
      hasResponse = answered = extractOrderAnswer(response).length > 0;
    } else if (type === 'matching') {
      var matches = a.matches || a.pairs || a.mapping || answer;
      hasResponse = answered = Array.isArray(matches) ? matches.length > 0 : !!matches && typeof matches === 'object' && Object.keys(matches).some(function (key) {
        return ['status', 'score', 'feedback', 'confidence', 'idk'].indexOf(key) < 0 && matches[key] != null && matches[key] !== '';
      });
    } else {
      hasResponse = answered = text(extractTextAnswer(response)) || typeof answer === 'number' && Number.isFinite(answer);
    }
    var hasReasoning = text(a.explanation) || text(a.reasoning);
    if (type === 'relation-mismatch' || type === 'answer-evidence' || (question && question.requireReasoning === true)) {
      hasResponse = hasResponse || hasReasoning;
      if (question && question.requireReasoning === true) answered = answered && hasReasoning;
    }
    // Final packets carry the same completion decision as the learner review.
    // Preserve useful partial work without promoting it to a completed answer.
    if (response && typeof response.answered === 'boolean') answered = response.answered && hasResponse;
    else if (response && typeof response.submitted === 'boolean') answered = response.submitted && hasResponse;
    // A completion flag cannot replace the authored required explanation.
    if (question && question.requireReasoning === true && !hasReasoning) answered = false;
    return { answered: !!answered, hasResponse: !!hasResponse };
  }

  function assessmentCompletionIsCurrent(perStudent, response) {
    if (!response || response.itemType !== 'assessment-complete') return false;
    var attempt = perStudent && perStudent.__assessmentAttempt;
    return !attempt || !attempt.attemptId || response.assessmentAttemptId === attempt.attemptId
      && Number(response.assessmentAttemptStartedAt || 0) === Number(attempt.startedAt || 0);
  }

  function collectAllGradedResponses(allResponses, questions, aiGradedCache, teacherOverrides, scoringPolicy) {
    var out = [];
    if (!_isPlainMap(allResponses)) return out;
    if (!Array.isArray(questions)) return out;
    var hasAiCache = _isPlainMap(aiGradedCache);
    var hasOverrides = _isPlainMap(teacherOverrides);
    Object.keys(allResponses).forEach(function (uid) {
      var perStudent = allResponses[uid];
      if (!perStudent || typeof perStudent !== 'object') return;
      var completion = perStudent[questions.length];
      var submitted = assessmentCompletionIsCurrent(perStudent, completion);
      for (var qIdx = 0; qIdx < questions.length; qIdx++) {
        var qIdxKey = String(qIdx);
        if (!submitted && !_hasOwn(perStudent, qIdxKey)) continue;
        var response = _hasOwn(perStudent, qIdxKey) ? perStudent[qIdxKey] : undefined;
        var question = questions[qIdx];
        var grade = gradeResponseForItem(response, question, scoringPolicy);
        var responseState = assessmentResponseState(response, question);
        if (!responseState.hasResponse) grade = Object.assign({}, grade, { status: 'no-response' });
        else if (!responseState.answered && !grade.unscored && !grade.keyUnderReview) grade = Object.assign({}, grade, { status: 'submitted', evaluable: false, incomplete: true });
        // AI grading override: only swap when the AI returned a graded status
        // and the deterministic status is 'submitted' (i.e., we asked for help
        // because we couldn't grade locally). Don't overwrite IDK or no-response.
        if (hasAiCache && responseState.answered && grade.status === 'submitted' && !grade.unscored && !grade.keyUnderReview && !grade.versionMismatch && !grade.versionUnverified
            && (!scoringPolicy || scoringPolicy.writtenResponseMode !== 'teacher-review')) {
          var aiKey = uid + ':' + qIdx;
          var cached = _hasOwn(aiGradedCache, aiKey) ? aiGradedCache[aiKey] : null;
          if (cached && typeof cached === 'object' && (cached.status === 'correct' || cached.status === 'incorrect' || cached.status === 'partially-correct')) {
            grade = {
              status: cached.status,
              scoreFraction: cached.status === 'partially-correct'
                ? (typeof cached.score === 'number' && Number.isFinite(cached.score) ? Math.max(0, Math.min(1, cached.score / 100)) : 0.5)
                : cached.status === 'correct' ? 1 : 0,
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
        var studentOverrides = (hasOverrides && _hasOwn(teacherOverrides, uid) && _isPlainMap(teacherOverrides[uid])) ? teacherOverrides[uid] : null;
        if (!grade.unscored && !grade.versionMismatch && !grade.versionUnverified && studentOverrides && _hasOwn(studentOverrides, qIdxKey) && studentOverrides[qIdxKey] && typeof studentOverrides[qIdxKey] === 'object') {
          var ov = studentOverrides[qIdxKey];
          var overrideMatches = ov && ov.responseFingerprint && ov.responseFingerprint === assessmentResponseFingerprint(question, response);
          if (ov && ov.status && !overrideMatches) grade.teacherOverrideExpired = true;
          if (overrideMatches && (ov.status === 'correct' || ov.status === 'incorrect' || ov.status === 'partially-correct' || ov.status === 'idk')) {
            grade = Object.assign({}, grade, {
              status: ov.status,
              isCorrect: ov.status === 'correct',
              evaluable: ov.status !== 'idk',
              teacherOverridden: true,
              teacherOverrideTs: ov.ts || 0,
              priorStatus: grade.status,
              scoreFraction: ov.status === 'correct' ? 1 : ov.status === 'partially-correct'
                ? (typeof ov.score === 'number' && Number.isFinite(ov.score) ? Math.max(0, Math.min(1, ov.score / 100)) : 0.5) : 0,
            });
          }
        }
        grade = Object.assign({}, grade, assessmentGradePoints(grade, scoringPolicy));
        // A final blank objective answer earns zero. Draft blanks, deliberate
        // IDK, partial work, and questions awaiting judgment remain unscored.
        if (submitted && !responseState.hasResponse && !grade.teacherOverridden && !grade.unscored && !grade.keyUnderReview && !grade.versionMismatch && !grade.versionUnverified && presentationQuestionIsGameScorable(question)) {
          grade = Object.assign({}, grade, { omitted: true, scoreFraction: 0, earnedPoints: 0, maxPoints: 1 });
        }
        out.push({ uid: uid, questionIdx: qIdx, response: response, question: question, grade: grade, responseState: responseState });
      }
    });
    return out;
  }

  function assessmentAnswerSummary(question, response) {
    var answer = unwrapPresentationAnswer(response).answer;
    var a = answer && typeof answer === 'object' && !Array.isArray(answer) ? answer : {};
    var type = normalizeItemType(question, response);
    var compatible = !assessmentResponseVersionIssue(question, response);
    function label(value) { return value && typeof value === 'object' ? String(value.text || value.label || '') : String(value == null ? '' : value); }
    function originalChoice(index, text, options) {
      var saved = label(text);
      if (saved) return saved;
      if (!Number.isInteger(index) || index < 0) return '';
      if (compatible && Array.isArray(options)) return label(options[index]);
      return 'Choice ' + _optionLabel(index) + ' (original text unavailable)';
    }
    if (a.idk === true) return '🤔 I don\'t know';
    var reasonText = String(a.explanation || a.reasoning || '').trim();
    function withReasoning(base) {
      if (!reasonText) return base;
      return base ? base + ' · Reasoning: ' + reasonText : 'Reasoning: ' + reasonText;
    }
    if (type === 'mcq' || type === 'opinion-mcq' || type === 'likert') {
      var index = extractOptionIndex(question, response);
      var choiceText = originalChoice(index, a.optionText, question && question.options);
      var mcqBase = choiceText ? (index >= 0 && (compatible || a.optionText) ? _optionLabel(index) + '. ' : '') + choiceText : '';
      return withReasoning(mcqBase);
    }
    if (type === 'multi-select') {
      var saved = Array.isArray(a.selectedTexts) ? a.selectedTexts : Array.isArray(a.selectedOptions) ? a.selectedOptions : null;
      var multiBase = saved
        ? saved.map(label).filter(Boolean).join('; ')
        : (function () {
          var indices = compatible ? extractSelectedIndices(question, response) : a.selectedIndices || a.selectedOptionIndices || a.optionIndices || a.indices || a.selected || [];
          return Array.isArray(indices) ? indices.map(function (index) { return originalChoice(index, '', question && question.options); }).filter(Boolean).join('; ') : '';
        })();
      return withReasoning(multiBase);
    }
    if (type === 'numeric-response') {
      var numVal = extractNumericAnswer(response);
      var numUnit = extractNumericUnit(response);
      var numBase = numVal != null
        ? String(numVal) + (numUnit ? ' ' + numUnit : '')
        : (typeof a.text === 'string' && a.text.trim() ? a.text.trim() : (typeof answer === 'string' ? answer.trim() : ''));
      return withReasoning(numBase);
    }
    if (typeof a.text === 'string') return withReasoning(a.text);
    if (type === 'sequence-sense') {
      var seqBase = (a.principleAnswer ? 'Principle: ' + a.principleAnswer : '') + (a.verifyAnswer ? ' · Verify: ' + a.verifyAnswer : '') + (Array.isArray(a.orderAnswer) ? ' · Order: ' + canonicalOrderAnswer(question, a).map(function (index) { return compatible && question && Array.isArray(question.items) ? question.items[index] || String(index + 1) : String(index + 1); }).join(' → ') : '');
      return withReasoning(seqBase);
    }
    if (type === 'relation-mismatch') return (typeof a.clickedPairIdx === 'number' ? 'Clicked pair ' + (a.clickedPairIdx + 1) : '') + (a.partnerAnswer ? ' · Partner: ' + a.partnerAnswer : '') + (reasonText ? ' · Reasoning: ' + reasonText : '');
    if (type === 'answer-evidence') {
      var answerText = originalChoice(a.answerIdx, a.answerText, question && (question.answerOptions || question.options));
      var evidenceText = originalChoice(a.evidenceIdx, a.evidenceText, question && question.evidenceOptions);
      return (answerText ? 'Answer: ' + answerText : '') + (evidenceText ? ' · Evidence: ' + evidenceText : '') + (reasonText ? ' · Reasoning: ' + reasonText : '');
    }
    if (typeof answer === 'string' || typeof answer === 'number') return withReasoning(String(answer));
    try { return withReasoning(JSON.stringify(answer) || ''); } catch (e) { return reasonText ? 'Reasoning: ' + reasonText : ''; }
  }

  // ─── Aggregator: gradebook (exit-ticket) ──────────────────────────────
  // Per-student row: { uid, displayName, totalAnswered, totalCorrect, byQuestion }
  function aggregateGradebook(quizState, generatedContent, roster, aiGradedCache, teacherOverrides) {
    var allResponses = (quizState && _isPlainMap(quizState.allResponses)) ? quizState.allResponses : {};
    var questions = (generatedContent && generatedContent.data && Array.isArray(generatedContent.data.questions)) ? generatedContent.data.questions : [];
    var graded = collectAllGradedResponses(allResponses, questions, aiGradedCache, teacherOverrides, generatedContent && generatedContent.data && generatedContent.data.scoringPolicy);
    var rosterObj = _isPlainMap(roster) ? roster : {};
    // Build per-student aggregation
    var studentMap = Object.create(null);
    graded.forEach(function (g) {
      if (!studentMap[g.uid]) {
        studentMap[g.uid] = {
          uid: g.uid,
          displayName: _safeRosterDisplayName(rosterObj, g.uid),
          totalAnswered: 0,
          totalCorrect: 0,
          totalEvaluated: 0,
          totalEarned: 0,
          totalPossible: 0,
          totalPartial: 0,
          scorePercent: null,
          totalUnscored: 0,
          totalIdk: 0,
          byQuestion: new Array(questions.length).fill(null),
        };
      }
      var row = studentMap[g.uid];
      if (g.responseState.answered) row.totalAnswered++;
      if (g.grade.unscored) row.totalUnscored++;
      else if (g.grade.maxPoints > 0 || g.grade.status === 'idk') row.totalEvaluated++;
      if (g.grade.status === 'correct') row.totalCorrect++;
      if (g.grade.status === 'partially-correct') row.totalPartial++;
      row.totalEarned += g.grade.earnedPoints;
      row.totalPossible += g.grade.maxPoints;
      if (g.grade.status === 'idk') row.totalIdk++;
      // Extended cell: grade fields + question/answer snippets so the dashboard
      // can render drill-down detail without re-walking allResponses.
      var qText = (g.question && (g.question.question || g.question.contextSentence || g.question.expectedFill)) || '';
      var qType = (g.response && g.response.itemType) || (g.question && (g.question.itemType || g.question.type)) || 'mcq';
      var answerSummary = g.responseState.hasResponse ? assessmentAnswerSummary(g.question, g.response) : '';
      row.byQuestion[g.questionIdx] = Object.assign({}, g.grade, {
        questionText: qText,
        questionType: qType,
        answerSummary: answerSummary,
      });
    });
    // Include roster students who haven't responded yet
    Array.from(new Set(Object.keys(rosterObj).concat(Object.keys(allResponses).filter(function (uid) { return allResponses[uid] && allResponses[uid].__assessmentAttempt; })))).forEach(function (uid) {
      if (!studentMap[uid]) {
        studentMap[uid] = {
          uid: uid,
          displayName: _safeRosterDisplayName(rosterObj, uid),
          totalAnswered: 0,
          totalCorrect: 0,
          totalEvaluated: 0,
          totalEarned: 0,
          totalPossible: 0,
          totalPartial: 0,
          scorePercent: null,
          totalUnscored: 0,
          totalIdk: 0,
          byQuestion: new Array(questions.length).fill(null),
        };
      }
    });
    var studentRows = Object.values(studentMap).sort(function (a, b) { return a.displayName.localeCompare(b.displayName); });
    studentRows.forEach(function (row) {
      row.scorePercent = row.totalPossible > 0 ? Math.round(row.totalEarned / row.totalPossible * 100) : null;
      var responseMap = (_hasOwn(allResponses, row.uid) && _isPlainMap(allResponses[row.uid])) ? allResponses[row.uid] : {};
      var completion = responseMap[questions.length];
      var attempt = responseMap.__assessmentAttempt;
      row.attemptStatus = assessmentCompletionIsCurrent(responseMap, completion) ? 'submitted' : attempt && attempt.attemptId || row.totalAnswered > 0 ? 'in-progress' : 'not-started';
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
    var allResponses = (quizState && _isPlainMap(quizState.allResponses)) ? quizState.allResponses : {};
    var questions = (generatedContent && generatedContent.data && Array.isArray(generatedContent.data.questions)) ? generatedContent.data.questions : [];
    var graded = collectAllGradedResponses(allResponses, questions, aiGradedCache, teacherOverrides, generatedContent && generatedContent.data && generatedContent.data.scoringPolicy);
    var rosterObj = _isPlainMap(roster) ? roster : null;
    var rosterCount = rosterObj ? Object.keys(rosterObj).length : 0;
    var participantIds = new Set(graded.filter(function (g) { return g.responseState.hasResponse; }).map(function (g) { return g.uid; }));
    var expectedIds = new Set((rosterObj ? Object.keys(rosterObj) : []).concat(Array.from(participantIds)));
    var expectedCount = expectedIds.size;
    var perQuestion = questions.map(function (rawQ, idx) {
      var q = rawQ && typeof rawQ === 'object' ? rawQ : {};
      // Best-effort concept label: first 80 chars of question text or expectedFill
      var conceptText = String(q.question || q.expectedFill || ('Question ' + (idx + 1)));
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
        partialCount: 0,
        totalEarned: 0,
        totalPossible: 0,
        scorePercent: null,
        idkCount: 0,
        percentCorrect: 0,
        expectedCount: expectedCount,
        responseCount: 0,
        incompleteCount: 0,
        evaluatedCount: 0,
        awaitingReviewCount: 0,
        omittedCount: expectedCount,
        participationPercent: expectedCount > 0 ? 0 : null,
        evaluatedPercent: expectedCount > 0 ? 0 : null,
        coverageStatus: 'no-responses',
      };
    });
    graded.forEach(function (g) {
      var card = perQuestion[g.questionIdx];
      if (!card) return;
      if (g.responseState.answered) card.totalAnswered++;
      if (g.responseState.hasResponse) card.responseCount++;
      if (g.responseState.hasResponse && !g.responseState.answered) card.incompleteCount++;
      if (g.grade.status === 'correct') card.correctCount++;
      else if (g.grade.status === 'incorrect') card.incorrectCount++;
      else if (g.grade.status === 'partially-correct') card.partialCount++;
      else if (g.grade.status === 'idk') card.idkCount++;
      if (g.grade.maxPoints > 0) card.evaluatedCount++;
      else if (g.responseState.hasResponse && g.grade.status === 'submitted' && !g.grade.unscored) card.awaitingReviewCount++;
      card.totalEarned += g.grade.earnedPoints;
      card.totalPossible += g.grade.maxPoints;
    });
    perQuestion.forEach(function (card) {
      card.omittedCount = Math.max(0, card.expectedCount - card.responseCount);
      card.participationPercent = card.expectedCount > 0 ? Math.round(100 * card.responseCount / card.expectedCount) : null;
      card.evaluatedPercent = card.expectedCount > 0 ? Math.round(100 * card.evaluatedCount / card.expectedCount) : null;
      card.coverageStatus = card.totalAnswered === 0 && card.awaitingReviewCount === 0 ? 'no-responses'
        : card.evaluatedCount === 0 && card.awaitingReviewCount > 0 ? 'awaiting-review'
        : card.evaluatedCount < card.expectedCount ? 'partial-coverage' : 'complete-coverage';
      card.scorePercent = card.totalPossible > 0 ? Math.round(card.totalEarned / card.totalPossible * 100) : null;
      if (card.unscored) {
        card.percentCorrect = null;
      } else if (card.totalAnswered > 0) {
        card.percentCorrect = Math.round((card.correctCount / card.totalAnswered) * 100);
      }
    });
    // Sort evaluated gaps by earned credit; pending/IDK-only cards are not
    // evidence of zero understanding and remain after evaluated results.
    var sorted = perQuestion.slice().sort(function (a, b) {
      // Unanswered last; unscored polls do not compete with evaluative gaps.
      if (a.unscored !== b.unscored) return a.unscored ? 1 : -1;
      if ((a.scorePercent == null) !== (b.scorePercent == null)) return a.scorePercent == null ? 1 : -1;
      if (a.totalAnswered === 0 && b.totalAnswered > 0) return 1;
      if (b.totalAnswered === 0 && a.totalAnswered > 0) return -1;
      return (a.scorePercent || 0) - (b.scorePercent || 0);
    });
    return {
      conceptCards: sorted,
      totalQuestions: questions.length,
      totalStudents: rosterCount,
      participatingStudents: participantIds.size,
    };
  }

  // ─── Aggregator: reflections (Chunk 1A) ───────────────────────────────
  // Final attempts contain the current reflection drafts, including cleared
  // entries. Prefer that map over earlier individual /^r\d+$/ submissions.
  // Groups by reflection prompt index,
  // returns per-prompt list of { uid, displayName, text, timestamp }.
  // Returns null when there are no reflections in the quiz so the dashboard
  // can hide the section entirely.
  function aggregateReflections(quizState, generatedContent, roster) {
    var reflections = (generatedContent && generatedContent.data && generatedContent.data.reflections);
    if (!Array.isArray(reflections) || reflections.length === 0) return null;
    var allResponses = (quizState && _isPlainMap(quizState.allResponses)) ? quizState.allResponses : {};
    var rosterObj = _isPlainMap(roster) ? roster : {};
    // Build per-reflection-index buckets
    var buckets = reflections.map(function (ref, idx) {
      var promptText = (typeof ref === 'string') ? ref : (ref && ref.text) || ('Reflection ' + (idx + 1));
      return { reflectionIdx: idx, promptText: promptText, responses: [] };
    });
    var anyResponses = false;
    Object.keys(allResponses).forEach(function (uid) {
      var perStudent = allResponses[uid];
      if (!perStudent || typeof perStudent !== 'object') return;
      var completion = null;
      var completionTime = -Infinity;
      Object.keys(perStudent).slice(0, 500).forEach(function (key) {
        var candidate = perStudent[key];
        if (!assessmentCompletionIsCurrent(perStudent, candidate)) return;
        var rawTs = Number(candidate.timestamp || candidate.answer && candidate.answer.submittedAt);
        var timestamp = Number.isFinite(rawTs) ? rawTs : 0;
        if (timestamp >= completionTime) { completion = candidate; completionTime = timestamp; }
      });
      var finalMap = completion && completion.answer && completion.answer.reflections;
      var hasFinalMap = finalMap && typeof finalMap === 'object' && !Array.isArray(finalMap);
      buckets.forEach(function (bucket, rIdx) {
        var resp = hasFinalMap ? completion : (_hasOwn(perStudent, 'r' + rIdx) ? perStudent['r' + rIdx] : null);
        var attempt = perStudent.__assessmentAttempt;
        if (!hasFinalMap && attempt && attempt.attemptId && resp && resp.assessmentAttemptId
            && (resp.assessmentAttemptId !== attempt.attemptId || Number(resp.assessmentAttemptStartedAt || 0) !== Number(attempt.startedAt || 0))) return;
        var text = '';
        if (hasFinalMap) {
          var entry = _hasOwn(finalMap, rIdx) ? finalMap[rIdx] : null;
          entry = entry && typeof entry === 'object' ? entry : {};
          if (entry.submitted === true && typeof entry.submittedText === 'string' && entry.submittedText.trim()) text = entry.submittedText;
          else if (typeof entry.draft === 'string') text = entry.draft;
          else if (typeof entry.submittedText === 'string') text = entry.submittedText;
        } else {
          text = (resp && resp.answer && typeof resp.answer.text === 'string') ? resp.answer.text : '';
        }
        if (!text) return;
        var respTs = resp && Number.isFinite(Number(resp.timestamp)) ? Number(resp.timestamp) : 0;
        buckets[rIdx].responses.push({
          uid: uid,
          displayName: _safeRosterDisplayName(rosterObj, uid),
          text: text,
          timestamp: hasFinalMap ? (Number.isFinite(completionTime) ? completionTime : 0) : respTs,
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
    var allResponses = (quizState && _isPlainMap(quizState.allResponses)) ? quizState.allResponses : {};
    var questions = (generatedContent && generatedContent.data && Array.isArray(generatedContent.data.questions)) ? generatedContent.data.questions : [];
    var graded = collectAllGradedResponses(allResponses, questions, aiGradedCache, teacherOverrides, generatedContent && generatedContent.data && generatedContent.data.scoringPolicy);
    var rosterObj = _isPlainMap(roster) ? roster : {};
    var rosterCount = Object.keys(rosterObj).length;
    var bars = questions.map(function (rawQ, idx) {
      var q = rawQ && typeof rawQ === 'object' ? rawQ : {};
      return {
        questionIdx: idx,
        questionText: q.question || '',
        itemType: q.itemType || q.type || 'mcq',
        unscored: isUnscoredPollQuestion(q, null),
        correct: 0,
        incorrect: 0,
        partial: 0,
        totalEarned: 0,
        totalPossible: 0,
        scorePercent: null,
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
      if (g.responseState.hasResponse) bar.total++;
      if (g.grade.status === 'correct') bar.correct++;
      else if (g.grade.status === 'incorrect') bar.incorrect++;
      else if (g.grade.status === 'partially-correct') bar.partial++;
      else if (g.grade.status === 'idk') bar.idk++;
      else if (g.responseState.hasResponse) bar.submitted++;
      bar.totalEarned += g.grade.earnedPoints;
      bar.totalPossible += g.grade.maxPoints;
      // Per-student entry for drill-down
      var displayName = _safeRosterDisplayName(rosterObj, g.uid);
      var qText = (g.question && (g.question.question || g.question.contextSentence || g.question.expectedFill)) || '';
      var qType = (g.response && g.response.itemType) || (g.question && (g.question.itemType || g.question.type)) || 'mcq';
      var answerSummary = g.responseState.hasResponse ? assessmentAnswerSummary(g.question, g.response) : '';
      bar.byStudent.push({
        uid: g.uid,
        displayName: displayName,
        status: g.grade.status,
        scoreFraction: g.grade.scoreFraction,
        earnedPoints: g.grade.earnedPoints,
        maxPoints: g.grade.maxPoints,
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
      bar.scorePercent = bar.totalPossible > 0 ? Math.round(bar.totalEarned / bar.totalPossible * 100) : null;
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
    if (!_isPlainMap(conceptMasteryByUid) || Object.keys(conceptMasteryByUid).length === 0) {
      // No mastery data yet — return live-heatmap shape so dashboard renders
      // something useful instead of empty state. Dashboard recognizes this
      // via aggResult.variant.
      return aggregateLiveHeatmap(quizState, generatedContent, roster, aiGradedCache, teacherOverrides);
    }
    var questions = (generatedContent && generatedContent.data && Array.isArray(generatedContent.data.questions)) ? generatedContent.data.questions : [];
    var rosterObj = _isPlainMap(roster) ? roster : {};
    var nowMs = Date.now();
    var DAY_MS = 24 * 60 * 60 * 1000;

    // For each question with a conceptLabel, build a row
    var conceptRows = [];
    var seenConcepts = Object.create(null);
    questions.forEach(function (q, idx) {
      var label = (q && q.conceptLabel) || '';
      if (!label) return;
      var conceptId = normalizeConceptId(label);
      if (!conceptId || seenConcepts[conceptId]) return; // dedupe per concept
      seenConcepts[conceptId] = true;

      // Per-student mastery lookup
      var students = [];
      Object.keys(rosterObj).forEach(function (uid) {
        var displayName = _safeRosterDisplayName(rosterObj, uid);
        var masteryEntry = _hasOwn(conceptMasteryByUid, uid) ? conceptMasteryByUid[uid] : null;
        var attemptsObj = masteryEntry && _isPlainMap(masteryEntry.attempts) ? masteryEntry.attempts : null;
        var mastery = attemptsObj && _hasOwn(attemptsObj, conceptId) ? attemptsObj[conceptId] : null;
        if (!mastery || typeof mastery !== 'object') {
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
        var rawLastTs = Number(mastery.lastAttemptTs);
        var lastTs = Number.isFinite(rawLastTs) && rawLastTs > 0 ? rawLastTs : 0;
        var days = lastTs > 0 ? Math.max(0, Math.round((nowMs - lastTs) / DAY_MS)) : null;
        var rawTotal = Number(mastery.totalAttempts);
        var total = Number.isFinite(rawTotal) && rawTotal > 0 ? Math.floor(rawTotal) : 0;
        var rawCorrect = Number(mastery.correctAttempts);
        var correct = Number.isFinite(rawCorrect) && rawCorrect > 0 ? Math.min(total, Math.floor(rawCorrect)) : 0;
        var rate = total > 0 ? Math.max(0, Math.min(100, Math.round((correct / total) * 100))) : null;
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
        else if (typeof s.daysSinceLast === 'number' && Number.isFinite(s.daysSinceLast) && s.daysSinceLast > maxDays) maxDays = s.daysSinceLast;
      });

      conceptRows.push({
        conceptId: conceptId,
        label: label,
        questionIdx: idx,
        questionText: (q && q.question) || '',
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
    var allResponses = (quizState && _isPlainMap(quizState.allResponses)) ? quizState.allResponses : {};
    var questions = (generatedContent && generatedContent.data && Array.isArray(generatedContent.data.questions)) ? generatedContent.data.questions : [];
    var rosterObj = _isPlainMap(roster) ? roster : {};
    var graded = collectAllGradedResponses(allResponses, questions, aiGradedCache, teacherOverrides, generatedContent && generatedContent.data && generatedContent.data.scoringPolicy);
    var responseUids = Object.create(null);
    var gradedByQuestion = Object.create(null);
    graded.forEach(function (entry) {
      responseUids[entry.uid] = true;
      var qk = String(entry.questionIdx);
      if (!gradedByQuestion[qk]) gradedByQuestion[qk] = [];
      gradedByQuestion[qk].push(entry);
    });
    var rosterCount = Object.keys(rosterObj).length;
    var totalStudents = rosterCount > 0 ? rosterCount : Object.keys(responseUids).length;
    var items = questions.map(function (question, questionIdx) {
      var itemRows = gradedByQuestion[String(questionIdx)] || [];
      var distributionRows = itemRows.filter(function (entry) { return !assessmentResponseVersionIssue(question, entry.response); });
      var versionReviewCount = itemRows.length - distributionRows.length;
      var respondentMap = Object.create(null);
      itemRows.forEach(function (entry) { if (entry.responseState.hasResponse) respondentMap[entry.uid] = true; });
      var respondents = Object.keys(respondentMap).length;
      var distributionRespondents = distributionRows.filter(function (entry) { return entry.responseState.hasResponse; }).length;
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
      var totalEarned = itemRows.reduce(function (sum, entry) { return sum + entry.grade.earnedPoints; }, 0);
      var totalPossible = itemRows.reduce(function (sum, entry) { return sum + entry.grade.maxPoints; }, 0);
      var correctRate = totalPossible > 0 ? Math.round(totalEarned / totalPossible * 100) : null;
      var omittedCount = Math.max(0, totalStudents - respondents);
      var smallSample = distributionRespondents < 5;
      var type = normalizeItemType(question, null);
      var unscored = isUnscoredPollQuestion(question, null);
      var options = [];
      if ((type === 'mcq' || unscored) && question && Array.isArray(question.options)) {
        var correctIdx = unscored ? -1 : resolveCorrectIdx(question);
        options = question.options.map(function (label, optionIdx) {
          var count = distributionRows.reduce(function (sum, entry) {
            return sum + (extractOptionIndex(question, entry.response) === optionIdx ? 1 : 0);
          }, 0);
          return { optionIdx: optionIdx, label: label, count: count, correct: optionIdx === correctIdx };
        });
      }
      var flags = [];
      var signalCodes = [];
      if (!smallSample && !unscored) {
        if (correctRate != null && correctRate <= 35) {
          flags.push('Many learners found this item challenging; review wording, instruction, and the answer key.');
          signalCodes.push('challenging');
        }
        if (correctRate != null && correctRate >= 90) {
          flags.push('This item may be too easy for the intended decision; consider a deeper follow-up.');
          signalCodes.push('very-easy');
        }
        if (totalStudents > 0 && omittedCount / totalStudents >= 0.25) {
          flags.push('At least one quarter of the class omitted this item; check clarity and placement.');
          signalCodes.push('high-omission');
        }
        if (gradableCount > 0 && highConfidenceIncorrect / gradableCount >= 0.2) {
          flags.push('Several confident responses were incorrect; review the underlying misconception.');
          signalCodes.push('confidence-mismatch');
        }
        if (options.length >= 3 && distributionRespondents >= 10 && options.some(function (option) { return !option.correct && option.count === 0; })) {
          flags.push('One or more distractors were never selected; consider strengthening them.');
          signalCodes.push('weak-distractor');
        }
      }
      if (versionReviewCount > 0) flags.push(versionReviewCount + ' response(s) from another question version need review and are excluded from current-choice distributions.');
      var signalLabel = versionReviewCount > 0 && distributionRespondents === 0 ? 'Question version review needed' : unscored ? 'Unscored distribution' : smallSample ? 'Early signal (' + distributionRespondents + '/5)' : correctRate == null ? 'Teacher review needed' : correctRate <= 35 ? 'Challenging' : correctRate >= 90 ? 'Very easy' : 'Useful range';
      return {
        questionIdx: questionIdx,
        questionText: question && (question.question || question.contextSentence || question.expectedFill) || ('Question ' + (questionIdx + 1)),
        type: type,
        unscored: unscored,
        evaluative: !unscored,
        respondents: respondents,
        distributionRespondents: distributionRespondents,
        versionReviewCount: versionReviewCount,
        omittedCount: omittedCount,
        idkCount: idkCount,
        correctCount: correctCount,
        incorrectCount: incorrectCount,
        partialCount: partialCount,
        gradableCount: gradableCount,
        totalEarned: totalEarned,
        totalPossible: totalPossible,
        correctRate: correctRate,
        highConfidenceIncorrect: highConfidenceIncorrect,
        smallSample: smallSample,
        signalLabel: signalLabel,
        signalCodes: signalCodes,
        flags: flags,
        options: options
      };
    });
    return { items: items, totalStudents: totalStudents, minimumFlagSample: 5 };
  }
  // ─── Bounded, privacy-safe quiz evidence snapshot ─────────────────────
  // Reduces the teacher's merged P2P/fallback response view to outcome counts
  // and transient UID cohorts. It deliberately omits response text, answer
  // choices, prompts, names, feedback, and grading rationale. Callers may use
  // `byUid`/`cohorts` while the session is live, but should map UIDs to roster
  // codenames and discard those transient fields before persistence.
  //
  // options: {
  //   activityId?, sourceResourceId?, resourceTitle?, startedAt?, endedAt?,
  //   aiGradedCache?, teacherOverrides?
  // }
  function buildPrivacySafeQuizEvidenceSnapshot(quizState, generatedContent, roster, options) {
    var MAX_QUESTIONS = 100;
    var MAX_PARTICIPANTS = 250;
    var MAX_UID_LENGTH = 128;
    var opts = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
    var state = quizState && typeof quizState === 'object' && !Array.isArray(quizState) ? quizState : {};
    var content = generatedContent && typeof generatedContent === 'object' && !Array.isArray(generatedContent) ? generatedContent : {};
    var data = content.data && typeof content.data === 'object' && !Array.isArray(content.data) ? content.data : {};
    var rawQuestions = Array.isArray(data.questions) ? data.questions : [];
    var questions = rawQuestions.slice(0, MAX_QUESTIONS);
    var questionsTruncated = Math.max(0, rawQuestions.length - questions.length);
    var rawRoster = roster && typeof roster === 'object' && !Array.isArray(roster) ? roster : {};
    var rawResponses = state.allResponses && typeof state.allResponses === 'object' && !Array.isArray(state.allResponses)
      ? state.allResponses
      : {};

    function boundedText(value, maxLength) {
      return String(value == null ? '' : value)
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength);
    }
    function boundedTimestamp(value) {
      var parsed = Number(value);
      return Number.isFinite(parsed)
        ? Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(parsed)))
        : 0;
    }
    function safeUid(value) {
      var uid = boundedText(value, MAX_UID_LENGTH);
      if (!uid || uid === '__proto__' || uid === 'prototype' || uid === 'constructor') return '';
      return uid;
    }

    var participantUids = [];
    var seenUids = Object.create(null);
    var allValidUids = Object.create(null);
    var rawResponseKeyByUid = Object.create(null);
    var rawParticipantCount = 0;
    function registerValidUid(rawKey, isResponseSource) {
      var uid = safeUid(rawKey);
      if (!uid) return;
      if (isResponseSource && !rawResponseKeyByUid[uid]) rawResponseKeyByUid[uid] = rawKey;
      if (!allValidUids[uid]) {
        allValidUids[uid] = true;
        rawParticipantCount++;
      }
      if (participantUids.length < MAX_PARTICIPANTS && !seenUids[uid]) {
        seenUids[uid] = true;
        participantUids.push(uid);
      }
    }
    Object.keys(rawRoster).sort().forEach(function (k) { registerValidUid(k, false); });
    Object.keys(rawResponses).sort().forEach(function (k) { registerValidUid(k, true); });

    var participantsTruncated = Math.max(0, rawParticipantCount - participantUids.length);
    var safeRoster = Object.create(null);
    var safeAllResponses = Object.create(null);
    participantUids.forEach(function (uid) {
      safeRoster[uid] = {};
      var respKey = rawResponseKeyByUid[uid];
      if (respKey && _hasOwn(rawResponses, respKey) && _isPlainMap(rawResponses[respKey])) {
        safeAllResponses[uid] = rawResponses[respKey];
      }
    });

    var safeContent = { data: { questions: questions, scoringPolicy: data.scoringPolicy } };
    var safeState = { allResponses: safeAllResponses };
    var graded = collectAllGradedResponses(
      safeAllResponses,
      questions,
      opts.aiGradedCache,
      opts.teacherOverrides,
      data.scoringPolicy
    );
    var analysis = aggregateItemAnalysis(
      safeState,
      safeContent,
      safeRoster,
      opts.aiGradedCache,
      opts.teacherOverrides
    );
    var gradedByQuestion = Object.create(null);
    graded.forEach(function (entry) {
      var qKey = String(entry.questionIdx);
      if (!gradedByQuestion[qKey]) gradedByQuestion[qKey] = [];
      gradedByQuestion[qKey].push(entry);
    });

    var byUid = Object.create(null);
    participantUids.forEach(function (uid) {
      byUid[uid] = {
        answered: 0,
        omitted: 0,
        correct: 0,
        partial: 0,
        incorrect: 0,
        idk: 0,
        awaitingReview: 0,
        unscored: 0,
        completed: false,
        followUpQuestionIdxs: [],
        reviewQuestionIdxs: [],
        confidenceMismatchQuestionIdxs: []
      };
    });

    graded.forEach(function (entry) {
      var participant = byUid[entry.uid];
      var grade = entry.grade && typeof entry.grade === 'object' ? entry.grade : {};
      var status = grade.status;
      if (!participant || status === 'no-response') return;
      if (entry.responseState.answered) participant.answered++;
      if (grade.unscored) {
        participant.unscored++;
        return;
      }
      if (status === 'correct') participant.correct++;
      else if (status === 'partially-correct') {
        participant.partial++;
        participant.followUpQuestionIdxs.push(entry.questionIdx);
      } else if (status === 'incorrect') {
        participant.incorrect++;
        participant.followUpQuestionIdxs.push(entry.questionIdx);
      } else if (status === 'idk') {
        participant.idk++;
        participant.followUpQuestionIdxs.push(entry.questionIdx);
      } else if (status === 'submitted') {
        participant.awaitingReview++;
        participant.reviewQuestionIdxs.push(entry.questionIdx);
      }
      if ((status === 'incorrect' || status === 'partially-correct') && grade.confidence === 'knew') {
        participant.confidenceMismatchQuestionIdxs.push(entry.questionIdx);
      }
    });

    participantUids.forEach(function (uid) {
      var participant = byUid[uid];
      participant.omitted = Math.max(0, questions.length - participant.answered);
      var bucket = safeAllResponses[uid] || {};
      var completionAtAnalyzedCount = bucket[questions.length];
      var completionAtAuthoredCount = bucket[rawQuestions.length];
      var hasCompletionMarker = [completionAtAnalyzedCount, completionAtAuthoredCount].some(function (record) {
        return assessmentCompletionIsCurrent(bucket, record);
      });
      if (!hasCompletionMarker) {
        hasCompletionMarker = Object.keys(bucket).slice(0, MAX_QUESTIONS + 20).some(function (key) {
          var record = bucket[key];
          return assessmentCompletionIsCurrent(bucket, record);
        });
      }
      participant.completed = hasCompletionMarker
        || (questionsTruncated === 0 && questions.length > 0 && participant.answered >= questions.length);
    });

    var items = (analysis.items || []).slice(0, MAX_QUESTIONS).map(function (item) {
      var rows = gradedByQuestion[String(item.questionIdx)] || [];
      var responded = Object.create(null);
      var followUpUids = [];
      var awaitingReviewUids = [];
      var confidenceMismatchUids = [];
      var unscoredResponseCount = 0;
      rows.forEach(function (entry) {
        var grade = entry.grade && typeof entry.grade === 'object' ? entry.grade : {};
        var status = grade.status;
        if (status === 'no-response') return;
        responded[entry.uid] = true;
        if (grade.unscored) {
          unscoredResponseCount++;
          return;
        }
        if (status === 'incorrect' || status === 'partially-correct' || status === 'idk') {
          followUpUids.push(entry.uid);
        } else if (status === 'submitted') {
          awaitingReviewUids.push(entry.uid);
        }
        if ((status === 'incorrect' || status === 'partially-correct') && grade.confidence === 'knew') {
          confidenceMismatchUids.push(entry.uid);
        }
      });
      var omittedUids = participantUids.filter(function (uid) { return !responded[uid]; });
      return {
        questionIdx: item.questionIdx,
        itemType: boundedText(item.type, 40) || 'mcq',
        unscored: item.unscored === true,
        respondents: Math.max(0, Math.min(MAX_PARTICIPANTS, Number(item.respondents) || 0)),
        omittedCount: Math.max(0, Math.min(MAX_PARTICIPANTS, Number(item.omittedCount) || 0)),
        correctCount: Math.max(0, Math.min(MAX_PARTICIPANTS, Number(item.correctCount) || 0)),
        partialCount: Math.max(0, Math.min(MAX_PARTICIPANTS, Number(item.partialCount) || 0)),
        incorrectCount: Math.max(0, Math.min(MAX_PARTICIPANTS, Number(item.incorrectCount) || 0)),
        idkCount: Math.max(0, Math.min(MAX_PARTICIPANTS, Number(item.idkCount) || 0)),
        awaitingReviewCount: awaitingReviewUids.length,
        unscoredResponseCount: unscoredResponseCount,
        gradableCount: Math.max(0, Math.min(MAX_PARTICIPANTS, Number(item.gradableCount) || 0)),
        highConfidenceIncorrect: Math.max(0, Math.min(MAX_PARTICIPANTS, Number(item.highConfidenceIncorrect) || 0)),
        correctRate: item.correctRate == null
          ? null
          : Math.max(0, Math.min(100, Math.round(Number(item.correctRate) || 0))),
        smallSample: item.smallSample === true,
        signalCodes: Array.isArray(item.signalCodes) ? item.signalCodes.slice(0, 5) : [],
        cohorts: {
          followUpUids: followUpUids.slice(0, MAX_PARTICIPANTS),
          awaitingReviewUids: awaitingReviewUids.slice(0, MAX_PARTICIPANTS),
          omittedUids: omittedUids.slice(0, MAX_PARTICIPANTS),
          confidenceMismatchUids: confidenceMismatchUids.slice(0, MAX_PARTICIPANTS)
        }
      };
    });

    var respondentCount = participantUids.filter(function (uid) { return byUid[uid].answered > 0; }).length;
    var completedCount = participantUids.filter(function (uid) { return byUid[uid].completed; }).length;
    return {
      schemaVersion: 1,
      activityId: boundedText(opts.activityId || state.activityId, 120),
      sourceResourceId: boundedText(opts.sourceResourceId || content.id, 128),
      resourceTitle: boundedText(opts.resourceTitle || content.title, 140),
      startedAt: boundedTimestamp(opts.startedAt != null ? opts.startedAt : state.startedAt),
      endedAt: boundedTimestamp(opts.endedAt != null ? opts.endedAt : state.endedAt),
      questionCount: questions.length,
      participantCount: participantUids.length,
      respondentCount: respondentCount,
      completedCount: completedCount,
      questionsTruncated: questionsTruncated,
      participantsTruncated: participantsTruncated,
      minimumSignalSample: analysis.minimumFlagSample || 5,
      items: items,
      byUid: byUid
    };
  }

  // ─── Mode → aggregator router ─────────────────────────────────────────
  // For review mode, requires conceptMasteryByUid argument; falls back to
  // liveHeatmap if not provided.

  // Reviewed Quiz item analysis -> AlloSheet.
  // This adapter intentionally emits aggregate item measures only. It never
  // copies the privacy snapshot's transient byUid or cohort arrays, and it
  // does not include authored prompts/options, learner names, raw responses,
  // reflections, AI feedback, session identifiers, or grading rationale.
  //
  // The five-respondent floor matches aggregateItemAnalysis: descriptive
  // counts remain available below five, but interpretive signal codes do not.
  var QUIZ_ALLOSHEET_MIN_SIGNAL_SAMPLE = 5;
  var QUIZ_ALLOSHEET_ITEM_TYPES = Object.freeze({
    mcq: true,
    'multi-select': true,
    'fill-blank': true,
    'short-answer': true,
    'self-explanation': true,
    'sequence-sense': true,
    'relation-mismatch': true,
    'answer-evidence': true,
    'numeric-response': true,
    matching: true,
    order: true,
    likert: true,
    'opinion-mcq': true
  });
  var QUIZ_ALLOSHEET_SIGNAL_CODES = Object.freeze({
    challenging: true,
    'very-easy': true,
    'high-omission': true,
    'confidence-mismatch': true,
    'weak-distractor': true
  });
  var QUIZ_ALLOSHEET_COLUMNS = Object.freeze([
    Object.freeze({ key: 'question_number', label: 'Question number', type: 'number' }),
    Object.freeze({ key: 'item_type', label: 'Item type', type: 'category' }),
    Object.freeze({ key: 'unscored', label: 'Unscored item', type: 'boolean' }),
    Object.freeze({ key: 'respondents', label: 'Respondents', type: 'number' }),
    Object.freeze({ key: 'omitted_count', label: 'Omitted', type: 'number' }),
    Object.freeze({ key: 'gradable_count', label: 'Gradable responses', type: 'number' }),
    Object.freeze({ key: 'correct_count', label: 'Correct', type: 'number' }),
    Object.freeze({ key: 'partial_count', label: 'Partially correct', type: 'number' }),
    Object.freeze({ key: 'incorrect_count', label: 'Incorrect', type: 'number' }),
    Object.freeze({ key: 'idk_count', label: 'I do not know', type: 'number' }),
    Object.freeze({ key: 'awaiting_review_count', label: 'Awaiting review', type: 'number' }),
    Object.freeze({ key: 'high_confidence_incorrect', label: 'High-confidence incorrect', type: 'number' }),
    Object.freeze({ key: 'correct_rate_percent', label: 'Correct rate (percent)', type: 'number' }),
    Object.freeze({ key: 'sample_status', label: 'Sample status', type: 'category' }),
    Object.freeze({ key: 'signal_codes', label: 'Signal codes', type: 'text' })
  ]);

  function quizAlloSheetAdapter() {
    var candidate = window.AlloSheetTransferAdapter
      || (window.AlloModules && window.AlloModules.AlloSheetTransferAdapter);
    return candidate
      && typeof candidate.column === 'function'
      && typeof candidate.table === 'function'
      && typeof candidate.envelope === 'function'
      ? candidate
      : null;
  }

  function quizAlloSheetBoundedInt(value, max) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) return 0;
    return Math.max(0, Math.min(max, Math.floor(parsed)));
  }

  function quizAlloSheetRate(value) {
    if (value === null || value === undefined || value === '') return null;
    var parsed = Number(value);
    return Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : null;
  }

  function quizAlloSheetItemType(value) {
    var normalized = String(value || '').trim().toLowerCase();
    return Object.prototype.hasOwnProperty.call(QUIZ_ALLOSHEET_ITEM_TYPES, normalized) ? normalized : 'other';
  }

  function quizAlloSheetMode(value) {
    var normalized = String(value || '').trim().toLowerCase();
    return normalized === 'exit-ticket'
      || normalized === 'pre-check'
      || normalized === 'formative'
      || normalized === 'poll'
      || normalized === 'review'
      ? normalized
      : 'unknown';
  }

  function quizAlloSheetCreatedAt(value) {
    var parsed = value instanceof Date ? value.getTime() : Date.parse(String(value || ''));
    if (!Number.isFinite(parsed)) parsed = Date.now();
    try { return new Date(parsed).toISOString(); } catch (_) { return new Date().toISOString(); }
  }

  function quizAlloSheetFallbackTable(config) {
    var rows = (config.rows || []).slice(0, 200).map(function (row) {
      return {
        id: String(row.id),
        values: Object.assign({}, row.values)
      };
    });
    var sourceRowCount = Math.max(rows.length, quizAlloSheetBoundedInt(config.sourceRowCount, 1000000));
    return {
      id: 'quiz_item_analysis',
      title: 'Quiz item analysis',
      columns: QUIZ_ALLOSHEET_COLUMNS.map(function (column) { return Object.assign({}, column); }),
      rows: rows,
      rowCount: rows.length,
      sourceRowCount: sourceRowCount,
      truncated: sourceRowCount > rows.length
    };
  }

  function quizAlloSheetFallbackEnvelope(table, createdAt, provenance) {
    return {
      kind: 'alloflow.tabular.v1',
      version: 1,
      source: { tool: 'quiz-analytics', label: 'Quiz Analytics', version: '1' },
      title: 'Quiz item analysis',
      createdAt: createdAt,
      classification: {
        level: 'aggregate-education-data',
        studentIdentifierIncluded: false,
        freeTextNotesIncluded: false
      },
      privacy: {
        scope: 'educator-reviewed-aggregate',
        identifierIncluded: false,
        reducedData: true,
        notesIncluded: false,
        transferEnablesAI: false
      },
      tables: [table],
      provenance: provenance,
      capabilities: { writeBack: false, aiEnabled: false }
    };
  }

  function buildQuizAlloSheetEnvelope(quizState, generatedContent, roster, options) {
    var opts = options && typeof options === 'object' && !Array.isArray(options) ? options : {};
    var snapshot = buildPrivacySafeQuizEvidenceSnapshot(
      quizState,
      generatedContent,
      roster,
      {
        aiGradedCache: opts.aiGradedCache,
        teacherOverrides: opts.teacherOverrides
      }
    );
    var minimumSignalSample = Math.max(
      QUIZ_ALLOSHEET_MIN_SIGNAL_SAMPLE,
      quizAlloSheetBoundedInt(snapshot.minimumSignalSample, 100)
    );
    var sourceItems = Array.isArray(snapshot.items) ? snapshot.items : [];
    var rows = sourceItems.slice(0, 100).map(function (item, index) {
      var respondents = quizAlloSheetBoundedInt(item && item.respondents, 250);
      var earlySignal = (item && item.smallSample === true) || respondents < minimumSignalSample;
      var signalCodes = earlySignal
        ? []
        : (Array.isArray(item && item.signalCodes) ? item.signalCodes : []).reduce(function (codes, value) {
          var normalized = String(value || '').trim().toLowerCase();
          if (Object.prototype.hasOwnProperty.call(QUIZ_ALLOSHEET_SIGNAL_CODES, normalized) && codes.indexOf(normalized) === -1) codes.push(normalized);
          return codes;
        }, []).slice(0, 5);
      return {
        id: 'quiz-item-' + (index + 1),
        values: {
          question_number: index + 1,
          item_type: quizAlloSheetItemType(item && item.itemType),
          unscored: !!(item && item.unscored),
          respondents: respondents,
          omitted_count: quizAlloSheetBoundedInt(item && item.omittedCount, 250),
          gradable_count: quizAlloSheetBoundedInt(item && item.gradableCount, 250),
          correct_count: quizAlloSheetBoundedInt(item && item.correctCount, 250),
          partial_count: quizAlloSheetBoundedInt(item && item.partialCount, 250),
          incorrect_count: quizAlloSheetBoundedInt(item && item.incorrectCount, 250),
          idk_count: quizAlloSheetBoundedInt(item && item.idkCount, 250),
          awaiting_review_count: quizAlloSheetBoundedInt(item && item.awaitingReviewCount, 250),
          high_confidence_incorrect: quizAlloSheetBoundedInt(item && item.highConfidenceIncorrect, 250),
          correct_rate_percent: quizAlloSheetRate(item && item.correctRate),
          sample_status: earlySignal ? 'early_signal' : 'sufficient_sample',
          signal_codes: signalCodes.join(';')
        }
      };
    });
    var authoredQuestionCount = quizAlloSheetBoundedInt(
      snapshot.questionCount + snapshot.questionsTruncated,
      1000000
    );
    var provenance = {
      aggregation: 'item-analysis',
      quizMode: quizAlloSheetMode(
        opts.mode
        || (generatedContent && generatedContent.data && generatedContent.data.mode)
      ),
      minimumSignalSample: minimumSignalSample,
      authoredQuestionCount: authoredQuestionCount,
      analyzedQuestionCount: rows.length,
      participantCount: quizAlloSheetBoundedInt(snapshot.participantCount, 250),
      respondentCount: quizAlloSheetBoundedInt(snapshot.respondentCount, 250),
      completedCount: quizAlloSheetBoundedInt(snapshot.completedCount, 250),
      questionsTruncated: quizAlloSheetBoundedInt(snapshot.questionsTruncated, 1000000),
      participantsTruncated: quizAlloSheetBoundedInt(snapshot.participantsTruncated, 1000000)
    };
    var createdAt = quizAlloSheetCreatedAt(opts.createdAt);
    var adapter = quizAlloSheetAdapter();
    if (!adapter) {
      return quizAlloSheetFallbackEnvelope(
        quizAlloSheetFallbackTable({ rows: rows, sourceRowCount: authoredQuestionCount }),
        createdAt,
        provenance
      );
    }
    var columns = QUIZ_ALLOSHEET_COLUMNS.map(function (column) {
      return adapter.column(column.key, column.label, column.type);
    });
    var table = adapter.table({
      id: 'quiz_item_analysis',
      title: 'Quiz item analysis',
      columns: columns,
      rows: rows,
      sourceRowCount: authoredQuestionCount
    });
    return adapter.envelope({
      source: { tool: 'quiz-analytics', label: 'Quiz Analytics', version: '1' },
      title: 'Quiz item analysis',
      createdAt: createdAt,
      classification: {
        level: 'aggregate-education-data',
        studentIdentifierIncluded: false,
        freeTextNotesIncluded: false
      },
      privacy: {
        scope: 'educator-reviewed-aggregate',
        identifierIncluded: false,
        reducedData: true,
        notesIncluded: false
      },
      tables: [table],
      provenance: provenance
    });
  }

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
  // Success-criteria rollup: class results per concept label. Reads the same
  // allResponses map the item analysis reads (uid -> questionIndex -> response)
  // and grades each response with gradeResponseForItem, so a criterion is "met"
  // exactly when the item analysis would count the answer correct. The label
  // comes from the response (stamped at submit time) or the question. Returns
  // counts only: no names, no uids, nothing a plan strip should not show.
  function aggregateSuccessCriteria(quizState, generatedContent, roster, aiGradedCache, teacherOverrides, scoringPolicy) {
    var allResponses = (quizState && _isPlainMap(quizState.allResponses)) ? quizState.allResponses : {};
    var questions = (generatedContent && generatedContent.data && Array.isArray(generatedContent.data.questions)) ? generatedContent.data.questions : [];
    var effectivePolicy = scoringPolicy !== undefined ? scoringPolicy : (generatedContent && generatedContent.data && generatedContent.data.scoringPolicy);
    var rosterObj = _isPlainMap(roster) ? roster : null;
    var aiCache = _isPlainMap(aiGradedCache) ? aiGradedCache : null;
    var overrides = _isPlainMap(teacherOverrides) ? teacherOverrides : null;
    var byConcept = Object.create(null);
    var conceptCount = 0;
    var respondents = Object.create(null);
    Object.keys(allResponses).forEach(function (uid) {
      if (rosterObj && !_hasOwn(rosterObj, uid)) return;
      var perQuestion = allResponses[uid];
      if (!perQuestion || typeof perQuestion !== 'object') return;
      for (var idx = 0; idx < questions.length; idx++) {
        var key = String(idx);
        if (!_hasOwn(perQuestion, key)) continue;
        var question = questions[idx];
        var response = perQuestion[key];
        if (!question || !response || typeof response !== 'object') continue;
        var stamped = response.conceptLabel != null ? String(response.conceptLabel) : '';
        var label = (stamped.trim() || String(question.conceptLabel || ''))
          .replace(/[\u0000-\u001f\u007f]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 160);
        if (!label) continue;
        var grade = gradeResponseForItem(response, question, effectivePolicy);
        var responseState = assessmentResponseState(response, question);
        if (!responseState.hasResponse) grade = Object.assign({}, grade, { status: 'no-response' });
        else if (!responseState.answered && !grade.unscored && !grade.keyUnderReview) {
          grade = Object.assign({}, grade, { status: 'submitted', evaluable: false, incomplete: true });
        }
        if (aiCache && responseState.answered && grade.status === 'submitted' && !grade.unscored && !grade.keyUnderReview && !grade.versionMismatch && !grade.versionUnverified
            && (!effectivePolicy || effectivePolicy.writtenResponseMode !== 'teacher-review')) {
          var aiKey = uid + ':' + idx;
          var cached = _hasOwn(aiCache, aiKey) ? aiCache[aiKey] : null;
          if (cached && typeof cached === 'object' && (cached.status === 'correct' || cached.status === 'incorrect' || cached.status === 'partially-correct')) {
            grade = Object.assign({}, grade, { status: cached.status, aiGraded: true });
          }
        }
        var studentOverrides = (overrides && _hasOwn(overrides, uid) && _isPlainMap(overrides[uid])) ? overrides[uid] : null;
        if (!grade.unscored && !grade.versionMismatch && !grade.versionUnverified && studentOverrides) {
          var ov = _hasOwn(studentOverrides, key) ? studentOverrides[key] : null;
          var fpOk = !!(ov && typeof ov === 'object' && ov.responseFingerprint && ov.responseFingerprint === assessmentResponseFingerprint(question, response));
          if (fpOk && (ov.status === 'correct' || ov.status === 'incorrect' || ov.status === 'partially-correct' || ov.status === 'idk')) {
            grade = Object.assign({}, grade, { status: ov.status, teacherOverridden: true });
          }
        }
        var status = grade && grade.status;
        if (status !== 'correct' && status !== 'incorrect' && status !== 'partially-correct') continue;
        var bucket = byConcept[label];
        if (!bucket) {
          if (conceptCount >= 200) continue;
          bucket = byConcept[label] = { met: 0, partial: 0, total: 0, questionIdxs: [] };
          conceptCount++;
        }
        bucket.total += 1;
        if (status === 'correct') bucket.met += 1;
        else if (status === 'partially-correct') bucket.partial += 1;
        if (bucket.questionIdxs.indexOf(idx) === -1) bucket.questionIdxs.push(idx);
        respondents[uid] = true;
      }
    });
    return { byConcept: byConcept, respondents: Object.keys(respondents).length, questionCount: questions.length };
  }

  window.AlloModules.QuizLiveAggregators = {
    aggregateSuccessCriteria: aggregateSuccessCriteria,
    aggregateGradebook: aggregateGradebook,
    aggregatePreLessonGap: aggregatePreLessonGap,
    aggregateLiveHeatmap: aggregateLiveHeatmap,
    aggregateRetentionCurve: aggregateRetentionCurve,
    aggregateReflections: aggregateReflections,
    aggregateItemAnalysis: aggregateItemAnalysis,
    buildPrivacySafeQuizEvidenceSnapshot: buildPrivacySafeQuizEvidenceSnapshot,
    buildQuizAlloSheetEnvelope: buildQuizAlloSheetEnvelope,
    aggregateForMode: aggregateForMode,
    gradeResponseForItem: gradeResponseForItem,
    gradePresentationResponse: gradePresentationResponse,
    isAnswerKeyDisputed: isAnswerKeyDisputed,
    keyCheckShape: keyCheckShape,
    normalizeFillBlankComparable: normalizeFillBlankComparable,
    gradeFillBlankAnswer: gradeFillBlankAnswer,
    gradeNumericAnswer: gradeNumericAnswer,
    presentationQuestionIsGameScorable: presentationQuestionIsGameScorable,
    aggregatePresentationResponses: aggregatePresentationResponses,
    isUnscoredPollQuestion: isUnscoredPollQuestion,
    normalizeItemType: normalizeItemType,
    normalizeLiveScoringPolicy: normalizeLiveScoringPolicy,
    assessmentItemSignature: assessmentItemSignature,
    legacyAssessmentItemSignature: legacyAssessmentItemSignature,
    sequenceDisplayForm: sequenceDisplayForm,
    assessmentResponseFingerprint: assessmentResponseFingerprint,
    assessmentAnswerSummary: assessmentAnswerSummary,
    assessmentResponseState: assessmentResponseState,
    normalizePresentationConfidence: normalizePresentationConfidence,
    presentationAccuracyWeight: presentationAccuracyWeight,
    classifyPresentationConfidence: classifyPresentationConfidence,
    extractLikertNumericValue: extractLikertNumericValue,
    describePresentationCorrectAnswer: describePresentationCorrectAnswer,
    sequenceSenseTruth: sequenceSenseTruth,
    describeSequenceMisplaced: describeSequenceMisplaced,
    normalizeConceptId: normalizeConceptId,
    _meta: Object.freeze({
      version: '1',
      allosheetMinimumSignalSample: QUIZ_ALLOSHEET_MIN_SIGNAL_SAMPLE,
      buildQuizAlloSheetEnvelope: buildQuizAlloSheetEnvelope
    }),
  };
  console.log('[CDN] QuizLiveAggregators loaded');
})();
