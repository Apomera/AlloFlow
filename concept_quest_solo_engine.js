/** Solo-only assessment coverage and grading for Concept Quest. Live rules stay in concept_quest_engine.js. */
(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) { root.AlloModules = root.AlloModules || {}; root.AlloModules.ConceptQuestSoloEngine = api; }
})(typeof window !== 'undefined' ? window : null, function() {
  'use strict';
  var TYPES = ['mcq', 'multi-select', 'fill-blank', 'numeric-response', 'sequence-sense', 'relation-mismatch', 'answer-evidence', 'short-answer', 'self-explanation'];
  function text(value) { return String(value == null ? '' : value); }
  function optionText(value) { return text(value && typeof value === 'object' ? value.text != null ? value.text : value.label : value); }
  function norm(value) { return optionText(value).normalize('NFC').trim().toLowerCase().replace(/\s+/g, ' '); }
  function copy(value) { return JSON.parse(JSON.stringify(value)); }
  function finiteNumber(value) { return (typeof value === 'number' || typeof value === 'string') && value !== '' && value != null && Number.isFinite(Number(value)); }
  function typeOf(item) {
    var type = text(item.itemType || item.type || 'mcq').toLowerCase().replace(/_/g, '-');
    if (['multiple-choice', 'multiple-choice-question', 'single-select'].indexOf(type) >= 0) return 'mcq';
    return type;
  }
  function indexFor(options, value, explicitIndex) {
    if (Number.isInteger(explicitIndex)) return explicitIndex >= 0 && explicitIndex < options.length ? explicitIndex : -1;
    var exact = options.findIndex(function(option) { return norm(option) === norm(value) && norm(value) !== ''; });
    if (exact >= 0) return exact;
    if (Number.isInteger(value)) return value >= 0 && value < options.length ? value : -1;
    if (typeof value === 'string' && /^[A-Z]$/i.test(value.trim())) { var letter = value.trim().toUpperCase().charCodeAt(0) - 65; return letter < options.length ? letter : -1; }
    return -1;
  }
  function correctMultiIndices(item) {
    if (Array.isArray(item.correctIndices)) return Array.from(new Set(item.correctIndices)).filter(function(index) { return Number.isInteger(index) && index >= 0 && index < item.options.length; });
    return item.options.map(function(option, index) { return (Array.isArray(item.correctAnswers) ? item.correctAnswers : []).some(function(answer) { return norm(option) === norm(answer); }) ? index : -1; }).filter(function(index) { return index >= 0; });
  }
  function hasKey(item) {
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
      item.explanation = text(item.factCheck || item.explanation || item.feedback || item.rationale);
      item.imageUrl = text(item.imageUrl);
      item.imageAltText = text(item.imageAltText);
      item.optionImageUrls = Array.isArray(item.optionImageUrls) ? item.optionImageUrls : [];
      item.optionImageAltTexts = Array.isArray(item.optionImageAltTexts) ? item.optionImageAltTexts : [];
      item.soloPartialCredit = !(data.scoringPolicy && data.scoringPolicy.partialCredit === false);
      item.selfReviewRequired = !hasKey(item);
      item.reviewReason = item.type === 'short-answer' || item.type === 'self-explanation' ? 'Compare your response with the guide. This is self-review, not an automatic grade.' : item.selfReviewRequired ? 'This item has no valid automatic answer key. Review it with the guide; it will not count toward accuracy or XP.' : '';
      result.push(item);
    });
    return result;
  }
  function initialResponse(item) {
    if (item.selfReviewRequired || ['short-answer', 'self-explanation'].indexOf(item.type) >= 0) return { text: '', guideRevealed: false, selfReview: '' };
    if (item.type === 'mcq') return { answerIndex: null };
    if (item.type === 'multi-select') return { selectedIndices: [] };
    if (item.type === 'sequence-sense') return { verifyAnswer: '', wrongIndex: null, principleAnswer: '' };
    if (item.type === 'relation-mismatch') return { pairIndex: null, partnerAnswer: '' };
    if (item.type === 'answer-evidence') return { answerIndex: null, evidenceIndex: null };
    return { text: '', unit: '' };
  }
  function answerGuide(item) {
    var answer;
    if (item.type === 'mcq') answer = item.options && item.options[item.correctIndex] || item.correctAnswer || item.expectedAnswer;
    else if (item.type === 'multi-select') answer = correctMultiIndices(item).map(function(index) { return item.options[index]; }).join('; ');
    else if (item.type === 'fill-blank') answer = text(item.expectedFill) + (Array.isArray(item.acceptableAlternatives) && item.acceptableAlternatives.length ? '\nAlso accept: ' + item.acceptableAlternatives.join(', ') : '');
    else if (item.type === 'numeric-response') answer = finiteNumber(item.correctValue) ? text(item.correctValue) + (item.unit ? ' ' + item.unit : '') + (Number(item.tolerance) > 0 ? ' (±' + item.tolerance + ')' : '') + (Array.isArray(item.acceptableUnits) && item.acceptableUnits.length ? '\nAlso accept units: ' + item.acceptableUnits.join(', ') : '') : '';
    else if (item.type === 'sequence-sense') answer = (item.intentionallyWrongIndex == null ? 'The displayed order is correct.' : 'Misplaced displayed item: ' + (item.intentionallyWrongIndex + 1) + '.') + '\nCorrect order: ' + (item.items || []).join(' → ') + '\nOrdering principle: ' + text(item.orderingPrinciple);
    else if (item.type === 'relation-mismatch') { var pair = (item.pairs || [])[item.wrongPairIndex] || {}; answer = 'Mismatched pair: ' + text(pair.left) + ' ↔ ' + text(pair.right) + '\nRepair: ' + text(pair.left) + ' → ' + text(item.correctPartnerForWrong); }
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
    var value = text(raw).trim().replace(/,/g, '');
    var fraction = value.match(/^([+-]?\d+)\s*\/\s*(\d+)(?:\s+(.+))?$/);
    if (fraction) return Number(fraction[2]) !== 0 ? { value: Number(fraction[1]) / Number(fraction[2]), unit: text(fraction[3]).trim() } : null;
    var decimal = value.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?)(?:\s*(.*))?$/i);
    return decimal && Number.isFinite(Number(decimal[1])) ? { value: Number(decimal[1]), unit: text(decimal[2]).trim() } : null;
  }
  function unitNorm(value) { return norm(value).replace(/\./g, ''); }
  function grade(item, response) {
    if (!item || typeof item !== 'object') return incomplete('Choose an assessment item first.');
    response = response && typeof response === 'object' ? response : {};
    if (item.selfReviewRequired || ['short-answer', 'self-explanation'].indexOf(item.type) >= 0) {
      if (!text(response.text).trim()) return incomplete('Write your response before comparing it with the guide.');
      if (response.guideRevealed !== true || ['understood', 'needs-practice'].indexOf(response.selfReview) < 0) return incomplete('Reveal the answer guide and record your self-review before continuing.');
      return { complete: true, correct: null, gradable: false, status: 'self-reviewed', score: null, maxScore: null, selfReview: response.selfReview };
    }
    if (item.type === 'mcq') {
      if (!Number.isInteger(response.answerIndex) || response.answerIndex < 0 || response.answerIndex >= item.options.length) return incomplete('Choose an answer.');
      return result(item, response.answerIndex === item.correctIndex ? 1 : 0, 1);
    }
    if (item.type === 'multi-select') {
      if (!Array.isArray(response.selectedIndices) || !response.selectedIndices.length || response.selectedIndices.some(function(index) { return !Number.isInteger(index) || index < 0 || index >= item.options.length; })) return incomplete('Select at least one valid answer.');
      var selected = Array.from(new Set(response.selectedIndices));
      var expected = correctMultiIndices(item);
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
      var valueCorrect = Math.abs(parsed.value - Number(item.correctValue)) <= Math.max(0, Number(item.tolerance) || 0) + 1e-9;
      var unitCorrect = !units.length || units.indexOf(unitNorm(actualUnit)) >= 0;
      var numericScore = valueCorrect && unitCorrect ? 100 : valueCorrect || unitCorrect && units.length > 0 ? 50 : 0;
      return result(item, numericScore, 100, { valueCorrect: valueCorrect, unitCorrect: unitCorrect, numericValue: parsed.value, unit: actualUnit });
    }
    if (item.type === 'sequence-sense') {
      if (['yes', 'no'].indexOf(response.verifyAnswer) < 0 || !norm(response.principleAnswer)) return incomplete('Check the order and choose its ordering principle.');
      if (response.verifyAnswer === 'no' && (!Number.isInteger(response.wrongIndex) || response.wrongIndex < 0 || response.wrongIndex >= item.items.length)) return incomplete('Choose the misplaced displayed item.');
      var inOrder = item.intentionallyWrongIndex == null;
      var verify = (response.verifyAnswer === 'yes') === inOrder;
      var diagnose = response.verifyAnswer === 'yes' ? verify : response.wrongIndex === item.intentionallyWrongIndex;
      var principle = norm(response.principleAnswer) === norm(item.orderingPrinciple);
      return result(item, Number(verify) + Number(diagnose) + Number(principle), 3, { step1Correct: verify, step2Correct: diagnose, step3Correct: principle });
    }
    if (item.type === 'relation-mismatch') {
      if (!Number.isInteger(response.pairIndex) || response.pairIndex < 0 || response.pairIndex >= item.pairs.length || !norm(response.partnerAnswer)) return incomplete('Choose a mismatched pair and its replacement partner.');
      var pairCorrect = response.pairIndex === item.wrongPairIndex;
      var partnerCorrect = norm(response.partnerAnswer) === norm(item.correctPartnerForWrong);
      return result(item, Number(pairCorrect) + Number(partnerCorrect), 2, { step1Correct: pairCorrect, step2Correct: partnerCorrect });
    }
    if (item.type === 'answer-evidence') {
      if (!Number.isInteger(response.answerIndex) || response.answerIndex < 0 || response.answerIndex >= item.answerOptions.length || !Number.isInteger(response.evidenceIndex) || response.evidenceIndex < 0 || response.evidenceIndex >= item.evidenceOptions.length) return incomplete('Choose both an answer and supporting evidence.');
      var answerCorrect = response.answerIndex === indexFor(item.answerOptions, item.correctAnswer);
      var evidenceCorrect = response.evidenceIndex === indexFor(item.evidenceOptions, item.correctEvidence);
      return result(item, Number(answerCorrect) + Number(evidenceCorrect), 2, { answerCorrect: answerCorrect, evidenceCorrect: evidenceCorrect });
    }
    return incomplete('Compare this item with its answer guide.');
  }
  function currentItem(quest) { return quest && quest.solo && quest.solo.bank[quest.solo.currentIndex] || null; }
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
    if (!quest || !quest.solo) return error(quest, 'Start a solo adventure first.');
    var outcome = base.resolveTravel(quest, {}, roomId);
    if (outcome.error) return outcome;
    return Object.assign({}, outcome, { quest: schedule(base, outcome.quest) });
  }
  function resolveTurn(base, quest, action) {
    if (!quest || !quest.solo || quest.phase !== 'battle') return error(quest, 'There is no active solo encounter.');
    action = action || {};
    if (!(base.ABILITIES || []).some(function(ability) { return ability.id === action.abilityId; }) || !(base.ROLES || []).some(function(role) { return role.id === action.roleId; })) return error(quest, 'Choose an adventurer role and ability.');
    var item = currentItem(quest);
    var evaluated = grade(item, action.response);
    if (!evaluated.complete) return Object.assign(error(quest, evaluated.error), { grade: evaluated });
    var room = base.getRoom(quest, quest.currentRoomId);
    var previous = quest.solo.attempts[item.sourceIndex];
    var firstAttempt = !previous;
    var attempts = Object.assign({}, quest.solo.attempts);
    attempts[item.sourceIndex] = { count: (previous && previous.count || 0) + 1, firstCorrect: previous ? previous.firstCorrect : evaluated.correct, lastCorrect: evaluated.correct, firstStatus: previous ? previous.firstStatus : evaluated.status, firstSelfReview: previous ? previous.firstSelfReview || null : evaluated.selfReview || null, status: evaluated.status, selfReview: evaluated.selfReview || null };
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
    var sigils = next.sigils.slice();
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
      var retryIndices = quest.solo.bank.map(function(entry, index) { var attempt = attempts[entry.sourceIndex]; return attempt && attempt.lastCorrect === false ? index : -1; }).filter(function(index) { return index >= 0; });
      if (!retryIndices.length) retryIndices = quest.solo.bank.map(function(_, index) { return index; });
      currentIndex = retryIndices[repeatCursor % retryIndices.length];
      repeatCursor += 1;
    }
    var record = { sourceIndex: item.sourceIndex, type: item.type, roomId: room.id, roomKind: room.kind, turn: quest.turn, response: copy(action.response), status: evaluated.status, correct: evaluated.correct, gradable: evaluated.gradable, firstAttempt: firstAttempt, score: evaluated.score, maxScore: evaluated.maxScore, answerGuide: answerGuide(item), prompt: item.prompt, concept: item.concept, explanation: item.explanation, damage: damage, incoming: incoming, xp: evaluated.gradable ? party.xp - quest.party.xp : 0, selfReview: evaluated.selfReview || null, enemyDefeated: enemy.hp === 0, encounterRule: encounterRule, regrouped: regrouped };
    var history = quest.solo.history.concat([record]);
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
    if (!solo) return { total: 0, attempted: 0, remaining: 0, graded: 0, correct: 0, incorrect: 0, selfReviewed: 0, needsPractice: 0, accuracy: null, firstAttemptAccuracy: null, complete: false, items: [], missedItems: [] };
    var items = solo.bank.map(function(item) { var attempt = solo.attempts[item.sourceIndex]; return Object.assign({}, item, { attempted: !!attempt, attempts: attempt && attempt.count || 0, firstCorrect: attempt ? attempt.firstCorrect : null, lastCorrect: attempt ? attempt.lastCorrect : null, status: attempt ? attempt.status : 'unseen', firstStatus: attempt ? attempt.firstStatus : 'unseen', firstSelfReview: attempt && attempt.firstSelfReview || null, selfReview: attempt && attempt.selfReview || null }); });
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
    var history = quest && quest.solo && quest.solo.history || [];
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
    return Object.assign({}, summary, { outcome: quest && quest.phase === 'complete' ? 'victory' : quest && quest.phase === 'defeat' ? 'regroup' : 'in-progress', rounds: history.length, history: history, conceptBreakdown: breakdown, sigils: quest && quest.sigils || [], missedItems: summary.missedItems });
  }
  return { VERSION: 1, TYPES: TYPES, normalizeItems: normalizeItems, initialResponse: initialResponse, answerGuide: answerGuide, parseNumeric: parseNumeric, grade: grade, currentItem: currentItem, createSession: createSession, resolveTurn: resolveTurn, travel: travel, coverage: coverage, createDebrief: createDebrief };
});
