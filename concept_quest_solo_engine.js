/** Solo-only assessment coverage and grading for Concept Quest. Live rules stay in concept_quest_engine.js. */
(function(root, factory) {
  var target = root && typeof root === 'object' ? root : null;
  var api = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = api;
  if (target) {
    if (!target.AlloModules || typeof target.AlloModules !== 'object') target.AlloModules = {};
    target.AlloModules.ConceptQuestSoloEngine = api;
  }
})(typeof window === 'object' && window ? window : null, function() {
  'use strict';
  var hasOwn = Object.prototype.hasOwnProperty;
  var TYPES = Object.freeze(['mcq', 'multi-select', 'fill-blank', 'numeric-response', 'sequence-sense', 'relation-mismatch', 'answer-evidence', 'short-answer', 'self-explanation']);
  function text(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
    try { return String(value); } catch (_) { return ''; }
  }
  function optionText(value) { return text(value && typeof value === 'object' ? value.text != null ? value.text : value.label : value); }
  function norm(value) { return optionText(value).normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' '); }
  function copy(value, seen, depth) {
    if (value === null || typeof value !== 'object') return value;
    var d = depth || 0;
    if (d > 20) return Array.isArray(value) ? [] : {};
    var visited = seen || new Set();
    if (visited.has(value)) return Array.isArray(value) ? [] : {};
    visited.add(value);
    try {
      if (Array.isArray(value)) return value.map(function(el) { return copy(el, visited, d + 1); });
      var out = {};
      Object.keys(value).forEach(function(k) {
        if (k === '__proto__' || k === 'constructor' || k === 'prototype') return;
        out[k] = copy(value[k], visited, d + 1);
      });
      return out;
    } finally {
      visited.delete(value);
    }
  }
  function finiteNumber(value) { return (typeof value === 'number' || typeof value === 'string') && String(value).trim() !== '' && Number.isFinite(Number(value)); }
  function typeOf(item) {
    var type = text(item && (item.itemType || item.type) || 'mcq').toLowerCase().replace(/_/g, '-');
    if (['multiple-choice', 'multiple-choice-question', 'single-select'].indexOf(type) >= 0) return 'mcq';
    return type;
  }
  function indexFor(options, value, explicitIndex) {
    if (!Array.isArray(options)) return -1;
    if (Number.isInteger(explicitIndex)) return explicitIndex >= 0 && explicitIndex < options.length ? explicitIndex : -1;
    var target = norm(value);
    var exact = target !== '' ? options.findIndex(function(option) { return norm(option) === target; }) : -1;
    if (exact >= 0) return exact;
    if (Number.isInteger(value)) return value >= 0 && value < options.length ? value : -1;
    if (typeof value === 'string' && /^[A-Z]$/i.test(value.trim())) { var letter = value.trim().toUpperCase().charCodeAt(0) - 65; return letter < options.length ? letter : -1; }
    return -1;
  }
  function correctMultiIndices(item) {
    var options = item && Array.isArray(item.options) ? item.options : [];
    if (item && Array.isArray(item.correctIndices)) return Array.from(new Set(item.correctIndices)).filter(function(index) { return Number.isInteger(index) && index >= 0 && index < options.length; });
    return options.map(function(option, index) { return (item && Array.isArray(item.correctAnswers) ? item.correctAnswers : []).some(function(answer) { return norm(option) === norm(answer); }) ? index : -1; }).filter(function(index) { return index >= 0; });
  }
  // Sequence Sense answer key. The author supplies one "intentionallyWrongIndex",
  // but an adjacent swap leaves BOTH items out of place, so the accepted set is
  // derived from the displayed order itself: a displayed position counts as
  // misplaced when removing it leaves the remaining items in canonical order.
  // Canonical (or missing) order -> nothing is misplaced. A scramble no single
  // removal can repair falls back to the authored index, else every position
  // (all are out of place). Returns { orderIsCorrect, misplaced: [positions] }.
  function sequenceSenseTruth(presentedOrder, intentionallyWrongIndex, itemCount) {
    var n = (typeof itemCount === 'number' || typeof itemCount === 'string') ? (Number(itemCount) || 0) : 0;
    var valid = n > 0 && Array.isArray(presentedOrder) && presentedOrder.length === n
      && presentedOrder.every(function (value) { return Number.isInteger(value) && value >= 0 && value < n; })
      && new Set(presentedOrder).size === n;
    if (!valid || presentedOrder.every(function (value, index) { return value === index; })) return { orderIsCorrect: true, misplaced: [] };
    var prefixSorted = new Array(n);
    prefixSorted[0] = true;
    for (var p = 1; p < n; p++) {
      prefixSorted[p] = prefixSorted[p - 1] && (p === 1 || presentedOrder[p - 2] < presentedOrder[p - 1]);
    }
    var suffixSorted = new Array(n);
    suffixSorted[n - 1] = true;
    for (var s = n - 2; s >= 0; s--) {
      suffixSorted[s] = suffixSorted[s + 1] && (s === n - 2 || presentedOrder[s + 1] < presentedOrder[s + 2]);
    }
    var misplaced = [];
    for (var skip = 0; skip < n; skip++) {
      if (prefixSorted[skip] && suffixSorted[skip] && (skip === 0 || skip === n - 1 || presentedOrder[skip - 1] < presentedOrder[skip + 1])) {
        misplaced.push(skip);
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
  function isAnswerKeyDisputed(question) {
    if (!question || typeof question !== 'object' || !['mcq', 'multiple-choice', 'multiple-choice-question', 'single-select', 'true-false', 'tf'].includes(text(question.itemType || question.type || 'mcq').toLowerCase().replace(/_/g, '-'))) return false;
    var review = question.keyCheck;
    var key = question.correctAnswer != null ? text(question.correctAnswer) : Number.isInteger(question.correctIndex) && Array.isArray(question.options) ? text(question.options[question.correctIndex]) : '';
    if (review && typeof review === 'object') {
      if (review.checkedKey != null && text(review.checkedKey) !== key) return false;
      if (['confirmed', 'disputed', 'unclear', 'stale'].indexOf(review.status) >= 0) return review.status === 'disputed';
    }
    var fc = text(question.factCheck);
    return /\[\[\s*KEY\s*:\s*DISPUTED\b/i.test(fc) || /correction\s*\/\s*warning/i.test(fc.replace(/\*/g, ''));
  }

  function hasKey(item) {
    if (isAnswerKeyDisputed(item)) return false;
    if (item.type === 'mcq') return item.options.length >= 2 && item.correctIndex >= 0 && item.options.every(function(option) { return !!norm(option); });
    if (item.type === 'multi-select') {
      var multiKeys = Array.isArray(item.correctIndices) ? item.correctIndices : Array.isArray(item.correctAnswers) ? item.correctAnswers : [];
      return item.options.length >= 2 && item.options.every(function(option) { return !!norm(option); }) && multiKeys.length > 0 && multiKeys.every(function(key) { return Array.isArray(item.correctIndices) ? Number.isInteger(key) && key >= 0 && key < item.options.length : item.options.some(function(option) { return norm(option) === norm(key); }); }) && correctMultiIndices(item).length > 0;
    }
    if (item.type === 'fill-blank') return !!norm(item.expectedFill);
    if (item.type === 'numeric-response') return finiteNumber(item.correctValue);
    if (item.type === 'sequence-sense') {
      var steps = Array.isArray(item.items) ? item.items : [];
      var order = item.presentedOrder;
      var validOrder = order == null ? item.intentionallyWrongIndex == null : Array.isArray(order) && order.length === steps.length && new Set(order).size === steps.length && order.every(function(index) { return Number.isInteger(index) && index >= 0 && index < steps.length; });
      return steps.length > 0 && steps.every(function(step) { return !!norm(step); }) && validOrder && !!norm(item.orderingPrinciple) && (item.intentionallyWrongIndex == null || Number.isInteger(item.intentionallyWrongIndex) && item.intentionallyWrongIndex >= 0 && item.intentionallyWrongIndex < steps.length);
    }
    if (item.type === 'relation-mismatch') return Array.isArray(item.pairs) && item.pairs.every(function(pair) { return pair && !!norm(pair.left) && !!norm(pair.right); }) && Number.isInteger(item.wrongPairIndex) && item.wrongPairIndex >= 0 && item.wrongPairIndex < item.pairs.length && !!norm(item.correctPartnerForWrong);
    if (item.type === 'answer-evidence') return Array.isArray(item.answerOptions) && item.answerOptions.length >= 2 && Array.isArray(item.evidenceOptions) && item.evidenceOptions.length >= 2 && indexFor(item.answerOptions, item.correctAnswer) >= 0 && indexFor(item.evidenceOptions, item.correctEvidence) >= 0;
    return false;
  }
  function normalizeItems(content) {
    var data = content && content.data || {};
    var questions = Array.isArray(content) ? content : Array.isArray(data.questions) ? data.questions : [];
    var result = [];
    questions.forEach(function(question, sourceIndex) {
      if (!question || typeof question !== 'object' || Array.isArray(question)) return;
      var item = copy(question);
      item.type = typeOf(item);
      item.sourceIndex = sourceIndex;
      item.id = 'solo-source-' + sourceIndex;
      item.prompt = text(item.question != null ? item.question : item.prompt != null ? item.prompt : item.text);
      item.question = item.prompt;
      item.options = (Array.isArray(item.options) ? item.options : Array.isArray(item.choices) ? item.choices : []).map(optionText);
      if (Array.isArray(item.answerOptions)) item.answerOptions = item.answerOptions.map(optionText);
      if (Array.isArray(item.evidenceOptions)) item.evidenceOptions = item.evidenceOptions.map(optionText);
      if (Array.isArray(item.items)) item.items = item.items.map(optionText);
      if (Array.isArray(item.principleOptions)) item.principleOptions = item.principleOptions.map(optionText);
      if (Array.isArray(item.candidatePartners)) item.candidatePartners = item.candidatePartners.map(optionText);
      if (Array.isArray(item.pairs)) item.pairs = item.pairs.map(function(pair) { return pair && typeof pair === 'object' ? Object.assign({}, pair, {left:optionText(pair.left),right:optionText(pair.right)}) : pair; });
      item.correctIndex = indexFor(item.options, item.correctAnswer, item.correctIndex);
      item.concept = text(item.conceptLabel || item.concept || item.standard || item.topic || item.skill || item.category || 'Question ' + (sourceIndex + 1));
      item.explanation = isAnswerKeyDisputed(item) ? '' : text(item.keyCheck && item.keyCheck.checkedKey != null && text(item.keyCheck.checkedKey) !== text(item.correctAnswer) ? item.explanation || item.feedback || item.rationale : item.factCheck || item.explanation || item.feedback || item.rationale);
      item.imageUrl = text(item.imageUrl);
      item.imageAltText = text(item.imageAltText);
      item.optionImageUrls = Array.isArray(item.optionImageUrls) ? item.optionImageUrls : [];
      item.optionImageAltTexts = Array.isArray(item.optionImageAltTexts) ? item.optionImageAltTexts : [];
      item.soloPartialCredit = !(data.scoringPolicy && data.scoringPolicy.partialCredit === false);
      item.selfReviewRequired = !hasKey(item);
      item.reviewReason = isAnswerKeyDisputed(item) ? 'This answer key is under review. Explain your reasoning; this item will not count toward accuracy or XP.' : item.type === 'short-answer' || item.type === 'self-explanation' ? 'Compare your response with the guide. This is self-review, not an automatic grade.' : item.selfReviewRequired ? 'This item has no valid automatic answer key. Review it with the guide; it will not count toward accuracy or XP.' : '';
      result.push(item);
    });
    return result;
  }
  function initialResponse(item) {
    if (!item || typeof item !== 'object') return { text: '', unit: '' };
    if (item.selfReviewRequired || isAnswerKeyDisputed(item) || ['short-answer', 'self-explanation'].indexOf(item.type) >= 0) return { text: '', guideRevealed: false, selfReview: '' };
    if (item.type === 'mcq') return { answerIndex: null };
    if (item.type === 'multi-select') return { selectedIndices: [] };
    if (item.type === 'sequence-sense') return { verifyAnswer: '', wrongIndex: null, order: null, principleAnswer: '' };
    if (item.type === 'relation-mismatch') return { pairIndex: null, partnerAnswer: '' };
    if (item.type === 'answer-evidence') return { answerIndex: null, evidenceIndex: null };
    return { text: '', unit: '' };
  }
  function answerGuide(item) {
    if (!item || typeof item !== 'object') return 'No answer guide was supplied. Explain your reasoning and mark what you need to review.';
    if (isAnswerKeyDisputed(item)) return 'Answer key under review. Discuss your reasoning with your teacher; no answer is being marked correct.';
    var answer;
    if (item.type === 'mcq') answer = (Array.isArray(item.options) && item.options[item.correctIndex]) || item.correctAnswer || item.expectedAnswer;
    else if (item.type === 'multi-select') answer = correctMultiIndices(item).map(function(index) { return Array.isArray(item.options) ? item.options[index] : ''; }).join('; ');
    else if (item.type === 'fill-blank') answer = text(item.expectedFill) + (Array.isArray(item.acceptableAlternatives) && item.acceptableAlternatives.length ? '\nAlso accept: ' + item.acceptableAlternatives.map(text).join(', ') : '');
    else if (item.type === 'numeric-response') answer = finiteNumber(item.correctValue) ? text(item.correctValue) + (item.unit ? ' ' + text(item.unit) : '') + (finiteNumber(item.tolerance) && Number(item.tolerance) > 0 ? ' (±' + text(item.tolerance) + ')' : '') + (Array.isArray(item.acceptableUnits) && item.acceptableUnits.length ? '\nAlso accept units: ' + item.acceptableUnits.map(text).join(', ') : '') : '';
    else if (item.type === 'sequence-sense') {
      var seqItems = Array.isArray(item.items) ? item.items : [];
      var sequenceTruth = sequenceSenseTruth(item.presentedOrder, item.intentionallyWrongIndex, seqItems.length);
      answer = (sequenceTruth.orderIsCorrect ? 'The displayed order is correct.' : 'Displayed ' + describeSequenceMisplaced(sequenceTruth.misplaced) + '.') + '\nCorrect order: ' + seqItems.map(text).join(' → ') + '\nOrdering principle: ' + text(item.orderingPrinciple);
    }
    else if (item.type === 'relation-mismatch') { var pair = (Array.isArray(item.pairs) ? item.pairs[item.wrongPairIndex] : null) || {}; answer = 'Mismatched pair: ' + text(pair.left) + ' ↔ ' + text(pair.right) + '\nRepair: ' + text(pair.left) + ' → ' + text(item.correctPartnerForWrong); }
    else if (item.type === 'answer-evidence') answer = 'Answer: ' + text(item.correctAnswer) + '\nEvidence: ' + text(item.correctEvidence);
    else answer = item.rubric || item.expectedAnswer || item.sampleAnswer || item.correctAnswer;
    return text(answer || 'No answer guide was supplied. Explain your reasoning and mark what you need to review.');
  }
  function incomplete(error) { return { complete: false, correct: null, gradable: false, status: 'incomplete', score: null, maxScore: null, error: error }; }
  function result(item, score, maximum, parts) {
    if (item.soloPartialCredit === false && score !== maximum) score = 0;
    return Object.assign({ complete: true, correct: score === maximum, gradable: true, status: score === maximum ? 'correct' : score > 0 ? 'partially-correct' : 'incorrect', score: score, maxScore: maximum }, parts || {});
  }
  function parseNumeric(raw) {
    var value = text(raw).trim().slice(0, 500).replace(/,/g, '');
    var fraction = value.match(/^([+-]?\d+)\s*\/\s*(\d+)(?:\s+(.+))?$/);
    if (fraction) {
      var denom = Number(fraction[2]);
      if (denom === 0) return null;
      var q = Number(fraction[1]) / denom;
      return Number.isFinite(q) ? { value: q, unit: text(fraction[3]).trim() } : null;
    }
    var decimal = value.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(?:\s*(.*))?$/i);
    return decimal && Number.isFinite(Number(decimal[1])) ? { value: Number(decimal[1]), unit: text(decimal[2]).trim() } : null;
  }
  function unitNorm(value) { return norm(value).replace(/\./g, ''); }
  function grade(item, response) {
    if (!item || typeof item !== 'object') return incomplete('Choose an assessment item first.');
    response = response && typeof response === 'object' ? response : {};
    if (item.selfReviewRequired || isAnswerKeyDisputed(item) || ['short-answer', 'self-explanation'].indexOf(item.type) >= 0) {
      if (!text(response.text).trim()) return incomplete('Write your response before comparing it with the guide.');
      if (response.guideRevealed !== true || ['understood', 'needs-practice'].indexOf(response.selfReview) < 0) return incomplete('Reveal the answer guide and record your self-review before continuing.');
      return { complete: true, correct: null, gradable: false, status: 'self-reviewed', score: null, maxScore: null, selfReview: response.selfReview };
    }
    if (item.type === 'mcq') {
      var mcqOptions = Array.isArray(item.options) ? item.options : [];
      if (!Number.isInteger(response.answerIndex) || response.answerIndex < 0 || response.answerIndex >= mcqOptions.length) return incomplete('Choose an answer.');
      return result(item, response.answerIndex === item.correctIndex ? 1 : 0, 1);
    }
    if (item.type === 'multi-select') {
      var msOptions = Array.isArray(item.options) ? item.options : [];
      if (!Array.isArray(response.selectedIndices) || !response.selectedIndices.length || response.selectedIndices.some(function(index) { return !Number.isInteger(index) || index < 0 || index >= msOptions.length; })) return incomplete('Select at least one valid answer.');
      var selected = Array.from(new Set(response.selectedIndices));
      var expected = correctMultiIndices(item);
      if (!expected.length) return incomplete('Compare this item with its answer guide.');
      var right = selected.filter(function(index) { return expected.indexOf(index) >= 0; }).length;
      var wrong = selected.length - right;
      return result(item, Math.round(100 * Math.max(0, right - wrong) / expected.length), 100, { selectedCorrect: right, selectedWrong: wrong });
    }
    if (item.type === 'fill-blank') {
      if (!norm(response.text)) return incomplete('Enter an answer for the blank.');
      var accepted = [item.expectedFill].concat(Array.isArray(item.acceptableAlternatives) ? item.acceptableAlternatives : []);
      return result(item, accepted.some(function(answer) { return norm(answer) === norm(response.text); }) ? 1 : 0, 1);
    }
    if (item.type === 'numeric-response') {
      var parsed = parseNumeric(response.text);
      if (!parsed) return incomplete('Enter a valid number, decimal, or fraction.');
      if (response.unit && parsed.unit && unitNorm(response.unit) !== unitNorm(parsed.unit)) return incomplete('Use the same unit in the answer and unit fields.');
      var actualUnit = text(response.unit || parsed.unit);
      var units = [item.unit || ''].concat(Array.isArray(item.acceptableUnits) ? item.acceptableUnits : []).map(unitNorm).filter(Boolean);
      var tol = finiteNumber(item.tolerance) ? Math.max(0, Number(item.tolerance)) : 0;
      var valueCorrect = Math.abs(parsed.value - Number(item.correctValue)) <= tol + 1e-9;
      var unitCorrect = !units.length || units.indexOf(unitNorm(actualUnit)) >= 0;
      var numericScore = valueCorrect && unitCorrect ? 100 : valueCorrect || unitCorrect && units.length > 0 ? 50 : 0;
      return result(item, numericScore, 100, { valueCorrect: valueCorrect, unitCorrect: unitCorrect, numericValue: parsed.value, unit: actualUnit });
    }
    if (item.type === 'sequence-sense') {
      var seqList = Array.isArray(item.items) ? item.items : [];
      if (!seqList.length || ['yes', 'no'].indexOf(response.verifyAnswer) < 0 || !norm(response.principleAnswer)) return incomplete('Check the order and choose its ordering principle.');
      if (response.verifyAnswer === 'no' && (!Number.isInteger(response.wrongIndex) || response.wrongIndex < 0 || response.wrongIndex >= seqList.length)) return incomplete('Choose the misplaced displayed item.');
      var truth = sequenceSenseTruth(item.presentedOrder, item.intentionallyWrongIndex, seqList.length);
      var verify = (response.verifyAnswer === 'yes') === truth.orderIsCorrect;
      var diagnose = response.verifyAnswer === 'yes' ? verify : truth.misplaced.indexOf(response.wrongIndex) >= 0;
      // response.order is the student's arrangement (canonical indices); null
      // means "left as displayed", which is only right when the display was.
      var arranged = Array.isArray(response.order) ? response.order : Array.isArray(item.presentedOrder) ? item.presentedOrder : seqList.map(function(_, index) { return index; });
      var arrange = arranged.length === seqList.length && arranged.every(function(value, index) { return value === index; });
      var principle = norm(response.principleAnswer) === norm(item.orderingPrinciple);
      return result(item, Number(verify) + Number(diagnose) + Number(arrange) + Number(principle), 4, { step1Correct: verify, step2Correct: diagnose, arrangeCorrect: arrange, step3Correct: principle });
    }
    if (item.type === 'relation-mismatch') {
      var relPairs = Array.isArray(item.pairs) ? item.pairs : [];
      if (!Number.isInteger(response.pairIndex) || response.pairIndex < 0 || response.pairIndex >= relPairs.length || !norm(response.partnerAnswer)) return incomplete('Choose a mismatched pair and its replacement partner.');
      var pairCorrect = response.pairIndex === item.wrongPairIndex;
      var partnerCorrect = norm(response.partnerAnswer) === norm(item.correctPartnerForWrong);
      return result(item, Number(pairCorrect) + Number(partnerCorrect), 2, { step1Correct: pairCorrect, step2Correct: partnerCorrect });
    }
    if (item.type === 'answer-evidence') {
      var ansOpts = Array.isArray(item.answerOptions) ? item.answerOptions : [];
      var evOpts = Array.isArray(item.evidenceOptions) ? item.evidenceOptions : [];
      if (!Number.isInteger(response.answerIndex) || response.answerIndex < 0 || response.answerIndex >= ansOpts.length || !Number.isInteger(response.evidenceIndex) || response.evidenceIndex < 0 || response.evidenceIndex >= evOpts.length) return incomplete('Choose both an answer and supporting evidence.');
      var answerCorrect = response.answerIndex === indexFor(ansOpts, item.correctAnswer);
      var evidenceCorrect = response.evidenceIndex === indexFor(evOpts, item.correctEvidence);
      return result(item, Number(answerCorrect) + Number(evidenceCorrect), 2, { answerCorrect: answerCorrect, evidenceCorrect: evidenceCorrect });
    }
    return incomplete('Compare this item with its answer guide.');
  }
  function currentItem(quest) { return quest && quest.solo && Array.isArray(quest.solo.bank) && quest.solo.bank[quest.solo.currentIndex] || null; }
  function seal(base, quest) { return Object.assign({}, quest, { turnKey: base.getTurnKey(quest) }); }
  function schedule(base, quest) {
    var item = currentItem(quest);
    if (!item) return quest;
    return seal(base, Object.assign({}, quest, { rooms: quest.rooms.map(function(room) {
      return room.id === quest.currentRoomId ? Object.assign({}, room, { challenge: item, challenges: [item], challengeIndex: 0 }) : room;
    }) }));
  }
  function createSession(base, content, tr) {
    if (!base || typeof base.createSession !== 'function') throw new Error('Concept Quest is still loading. Try again in a moment.');
    var bank = normalizeItems(content);
    if (!bank.length) throw new Error('Add an assessment question before starting Concept Quest.');
    var data = content && content.data || {};
    // The live factory builds the map with MCQ shape. These structural adapters
    // are replaced everywhere before return and are never shown or credited.
    var adapters = bank.map(function(item) { return { type: 'mcq', question: item.prompt || 'Assessment question', concept: item.concept, options: ['Checked', 'Review'], correctIndex: 0 }; });
    var quest = base.createSession({ title: data.title || content && content.title || 'Concept Quest', objective: typeof tr === 'function' ? tr('solo_objective', 'Explore every lesson item, compare your answers, and overcome the final misconception.') : 'Explore every lesson item.', questions: adapters, translate: tr });
    quest.rooms = quest.rooms.map(function(room, index) {
      var item = bank[index % bank.length];
      return Object.assign({}, room, { challenge: item, challenges: [item], challengeIndex: 0,
        enemy: room.enemy ? Object.assign({}, room.enemy, { hp: room.kind === 'boss' ? 12 : 6, maxHp: room.kind === 'boss' ? 12 : 6, attack: 1 }) : null,
        reward: room.reward ? Object.assign({}, room.reward, { description: 'Use during an encounter to reveal a lesson clue.' }) : null
      });
    });
    quest.localizedStrings = Object.assign({}, quest.localizedStrings, { puzzle_bonus: 'Your correct answer opened the reasoning lock for 4 bonus damage.', puzzle_locked: 'Review the evidence behind the reasoning lock.', boss_bonus: 'Your correct answer broke the Mastery Barrier for 2 bonus damage.', boss_limited: 'The Mastery Barrier limited damage. Review the answer guide.' });
    quest.excludedQuestions = (Array.isArray(data.questions) ? data.questions.length : bank.length) - bank.length;
    quest.solo = { version: 1, bank: bank, cursor: 0, currentIndex: 0, repeatCursor: 0, attempts: {}, history: [] };
    return schedule(base, quest);
  }
  function error(quest, message) { return { quest: quest, error: message }; }
  function travel(base, quest, roomId) {
    if (!base || typeof base.resolveTravel !== 'function' || !quest || !quest.solo) return error(quest, 'Start a solo adventure first.');
    var outcome = base.resolveTravel(quest, {}, roomId);
    if (outcome.error) return outcome;
    return Object.assign({}, outcome, { quest: schedule(base, outcome.quest) });
  }
  function resolveTurn(base, quest, action) {
    if (!base || typeof base.resolveBattle !== 'function' || typeof base.getRoom !== 'function' || !quest || !quest.solo || !Array.isArray(quest.solo.bank) || !quest.solo.bank.length || quest.phase !== 'battle') return error(quest, 'There is no active solo encounter.');
    action = action && typeof action === 'object' ? action : {};
    if (!(base.ABILITIES || []).some(function(ability) { return ability.id === action.abilityId; }) || !(base.ROLES || []).some(function(role) { return role.id === action.roleId; })) return error(quest, 'Choose an adventurer role and ability.');
    var item = currentItem(quest);
    var evaluated = grade(item, action.response);
    if (!evaluated.complete) return Object.assign(error(quest, evaluated.error), { grade: evaluated });
    var room = base.getRoom(quest, quest.currentRoomId);
    if (!room) return error(quest, 'There is no active solo encounter.');
    var soloAttempts = quest.solo.attempts && typeof quest.solo.attempts === 'object' ? quest.solo.attempts : {};
    var srcKey = String(item.sourceIndex);
    var previous = hasOwn.call(soloAttempts, srcKey) ? soloAttempts[srcKey] : undefined;
    var firstAttempt = !previous;
    var attempts = Object.assign({}, soloAttempts);
    attempts[srcKey] = { count: (previous && previous.count || 0) + 1, firstCorrect: previous ? previous.firstCorrect : evaluated.correct, lastCorrect: evaluated.correct, firstStatus: previous ? previous.firstStatus : evaluated.status, firstSelfReview: previous ? previous.firstSelfReview || null : evaluated.selfReview || null, status: evaluated.status, selfReview: evaluated.selfReview || null };
    var cursor = quest.solo.cursor + (firstAttempt && quest.solo.currentIndex === quest.solo.cursor ? 1 : 0);
    var remaining = quest.solo.bank.length - cursor;
    // Project the already-graded result into live battle mechanics. No generated
    // answer is treated as evidence: only grade() decides correctness or XP.
    var projection = Object.assign({}, item, { options: ['Checked', 'Review'], correctIndex: 0 });
    var projected = Object.assign({}, quest, { rooms: quest.rooms.map(function(entry) { return entry.id === room.id ? Object.assign({}, entry, { challenge: projection }) : entry; }) });
    var outcome = base.resolveBattle(projected, { solo: { roleId: action.roleId, abilityId: action.abilityId, answerIndex: evaluated.correct === true ? 0 : 1, turnKey: base.getTurnKey(projected) } }, { solo: action.roleId });
    if (outcome.error) return outcome;
    var next = outcome.quest;
    var updatedRoom = base.getRoom(next, room.id);
    var enemy = Object.assign({}, updatedRoom.enemy);
    var party = Object.assign({}, next.party);
    var sigils = Array.isArray(next.sigils) ? next.sigils.slice() : [];
    var damage = outcome.summary.damage;
    var incoming = outcome.summary.incoming;
    var encounterRule = next.lastRound.encounterRule || '';
    var regrouped = false;
    if (!evaluated.gradable) {
      party = Object.assign({}, quest.party);
      damage = 0; incoming = 0;
      enemy.hp = room.kind !== 'boss' || remaining === 0 ? 0 : Math.max(1, room.enemy.hp);
      encounterRule = 'Self-review recorded. This advances the encounter without an automatic correctness score or XP.';
      if (enemy.hp === 0 && room.kind !== 'boss' && sigils.indexOf(room.concept) < 0) sigils.push(room.concept);
    }
    // A fast route or high-damage ability cannot finish the adventure with an
    // unseen portion of the assessment. The final barrier holds the next item.
    if (room.kind === 'boss' && remaining > 0 && enemy.hp === 0) {
      enemy.hp = 1;
      encounterRule += (encounterRule ? ' ' : '') + 'The final barrier stays open for review: ' + remaining + ' lesson item' + (remaining === 1 ? '' : 's') + ' remain.';
    }
    if (party.hp <= 0 && remaining > 0) {
      party.hp = party.maxHp;
      regrouped = true;
      encounterRule += (encounterRule ? ' ' : '') + 'A recovery pause restored health so you can finish every lesson item.';
    }
    var phase = party.hp <= 0 ? 'defeat' : enemy.hp === 0 ? room.kind === 'boss' && remaining === 0 ? 'complete' : 'explore' : 'battle';
    var repeatCursor = quest.solo.repeatCursor;
    var currentIndex = cursor;
    if (cursor >= quest.solo.bank.length) {
      var retryIndices = quest.solo.bank.map(function(entry, index) { var k = String(entry.sourceIndex); var attempt = hasOwn.call(attempts, k) ? attempts[k] : null; return attempt && attempt.lastCorrect === false ? index : -1; }).filter(function(index) { return index >= 0; });
      if (!retryIndices.length) retryIndices = quest.solo.bank.map(function(_, index) { return index; });
      currentIndex = retryIndices[repeatCursor % retryIndices.length];
      repeatCursor += 1;
    }
    var record = { sourceIndex: item.sourceIndex, type: item.type, roomId: room.id, roomKind: room.kind, turn: quest.turn, response: copy(action.response), status: evaluated.status, correct: evaluated.correct, gradable: evaluated.gradable, firstAttempt: firstAttempt, score: evaluated.score, maxScore: evaluated.maxScore, answerGuide: answerGuide(item), prompt: item.prompt, concept: item.concept, explanation: item.explanation, damage: damage, incoming: incoming, xp: evaluated.gradable ? party.xp - quest.party.xp : 0, selfReview: evaluated.selfReview || null, enemyDefeated: enemy.hp === 0, encounterRule: encounterRule, regrouped: regrouped };
    var history = (Array.isArray(quest.solo.history) ? quest.solo.history : []).concat([record]);
    var solo = Object.assign({}, quest.solo, { cursor: cursor, currentIndex: currentIndex, repeatCursor: repeatCursor, attempts: attempts, history: history });
    var lastRound = Object.assign({}, next.lastRound, record, { correctAnswer: record.answerGuide, total: evaluated.gradable ? 1 : 0 });
    next = Object.assign({}, next, { solo: solo, party: party, sigils: sigils, phase: phase, activeEvent: null, lastRound: lastRound,
      rooms: next.rooms.map(function(entry) { return entry.id === room.id ? Object.assign({}, entry, { enemy: enemy }) : entry; }),
      roundHistory: history.map(function(entry) { return Object.assign({}, entry, { correct: entry.correct === true ? 1 : 0, total: entry.gradable ? 1 : 0 }); }),
      log: (quest.log || []).concat([{ id: 'solo-turn-' + quest.turn, turn: next.turn, text: evaluated.status === 'self-reviewed' ? encounterRule : (evaluated.correct ? 'Correct. ' : 'Review the answer guide. ') + encounterRule }])
    });
    return { quest: schedule(base, next), grade: evaluated, summary: record };
  }
  function coverage(quest) {
    var solo = quest && quest.solo;
    if (!solo || !Array.isArray(solo.bank)) return { total: 0, attempted: 0, remaining: 0, graded: 0, correct: 0, incorrect: 0, selfReviewed: 0, needsPractice: 0, accuracy: null, firstAttemptAccuracy: null, complete: false, items: [], missedItems: [] };
    var attemptsMap = solo.attempts && typeof solo.attempts === 'object' ? solo.attempts : {};
    var items = solo.bank.map(function(item) { var k = String(item.sourceIndex); var attempt = hasOwn.call(attemptsMap, k) ? attemptsMap[k] : null; return Object.assign({}, item, { attempted: !!attempt, attempts: attempt && attempt.count || 0, firstCorrect: attempt ? attempt.firstCorrect : null, lastCorrect: attempt ? attempt.lastCorrect : null, status: attempt ? attempt.status : 'unseen', firstStatus: attempt ? attempt.firstStatus : 'unseen', firstSelfReview: attempt && attempt.firstSelfReview || null, selfReview: attempt && attempt.selfReview || null }); });
    var attempted = items.filter(function(item) { return item.attempted; }).length;
    var graded = items.filter(function(item) { return item.attempted && item.firstCorrect !== null; }).length;
    var firstCorrect = items.filter(function(item) { return item.firstCorrect === true; }).length;
    var correct = items.filter(function(item) { return item.lastCorrect === true; }).length;
    var incorrect = items.filter(function(item) { return item.lastCorrect === false; }).length;
    var selfReviewed = items.filter(function(item) { return item.status === 'self-reviewed'; }).length;
    var missedItems = items.filter(function(item) { return item.firstCorrect === false || item.firstSelfReview === 'needs-practice' || item.selfReview === 'needs-practice'; });
    return { total: items.length, attempted: attempted, remaining: items.length - attempted, graded: graded, correct: correct, incorrect: incorrect, selfReviewed: selfReviewed, needsPractice: items.filter(function(item) { return item.lastCorrect === false || item.selfReview === 'needs-practice'; }).length, accuracy: graded ? Math.round(100 * correct / graded) : null, firstAttemptAccuracy: graded ? Math.round(100 * firstCorrect / graded) : null, complete: items.length > 0 && attempted === items.length, items: items, missedItems: missedItems };
  }
  function createDebrief(quest) {
    var summary = coverage(quest);
    var history = quest && quest.solo && Array.isArray(quest.solo.history) ? quest.solo.history : [];
    var groups = Object.create(null);
    summary.items.forEach(function(item) {
      if (!item.attempted) return;
      var group = groups[item.concept] || { concept: item.concept, total: 0, correct: 0, firstCorrect: 0, selfReviewed: 0, rounds: 0 };
      group.rounds += item.attempts;
      if (item.firstCorrect !== null) { group.total += 1; group.firstCorrect += Number(item.firstCorrect); group.correct += Number(item.lastCorrect === true); }
      else group.selfReviewed += 1;
      groups[item.concept] = group;
    });
    var breakdown = Object.keys(groups).map(function(key) { var entry = groups[key]; return Object.assign({}, entry, { accuracy: entry.total ? Math.round(100 * entry.correct / entry.total) : null, firstAttemptAccuracy: entry.total ? Math.round(100 * entry.firstCorrect / entry.total) : null }); });
    return Object.assign({}, summary, { outcome: quest && quest.phase === 'complete' ? 'victory' : quest && quest.phase === 'defeat' ? 'regroup' : 'in-progress', rounds: history.length, history: history, conceptBreakdown: breakdown, sigils: quest && Array.isArray(quest.sigils) ? quest.sigils : [], missedItems: summary.missedItems });
  }
  return Object.freeze({ VERSION: 1, TYPES: TYPES, isAnswerKeyDisputed: isAnswerKeyDisputed, normalizeItems: normalizeItems, initialResponse: initialResponse, answerGuide: answerGuide, parseNumeric: parseNumeric, grade: grade, currentItem: currentItem, createSession: createSession, resolveTurn: resolveTurn, travel: travel, coverage: coverage, createDebrief: createDebrief });
});
