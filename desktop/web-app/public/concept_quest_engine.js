/**
 * Concept Quest deterministic game engine.
 *
 * The live transport is intentionally not part of this module.  Callers store
 * the returned state inside escapeRoomState.conceptQuest so the exact same
 * payload works through Firestore and the Google Mailbox session adapter.
 */
(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    root.AlloModules = root.AlloModules || {};
    root.AlloModules.ConceptQuestEngine = api;
    root.AlloModules.ConceptQuestEngineModule = true;
  }
})(typeof window !== 'undefined' ? window : null, function() {
  'use strict';

  var VERSION = 2;
  var logSequence = 0;
  var LOCALIZED_LABELS = {
    ability_analyze_name: 'Analyze',
    ability_analyze_description: 'Use evidence to deal 3 damage.',
    ability_explain_name: 'Explain',
    ability_explain_description: 'Teach the idea: 2 damage and restore 1 party HP.',
    ability_connect_name: 'Connect',
    ability_connect_description: 'Link concepts: 2 damage and add 1 party shield.',
    ability_question_name: 'Question',
    ability_question_description: 'Probe a misconception: 1 damage even when the answer misses.',
    role_analyst_name: 'Evidence Analyst',
    role_analyst_description: 'Adds 1 damage when Analyze succeeds.',
    role_explainer_name: 'Concept Explainer',
    role_explainer_description: 'Adds 1 damage when Explain succeeds.',
    role_connector_name: 'Pattern Connector',
    role_connector_description: 'Adds 1 damage when Connect succeeds.',
    role_investigator_name: 'Question Investigator',
    role_investigator_description: 'Adds 1 damage when Question succeeds.',
    support_clarify_name: 'Clarify',
    support_clarify_description: 'If your teammate misses, recover 1 damage by clarifying the concept.',
    support_guard_name: 'Guard',
    support_guard_description: 'A correct response adds 1 party shield for your teammate.',
    support_encourage_name: 'Encourage',
    support_encourage_description: 'A correct response restores 1 party HP for your teammate.'
  };
  var ABILITIES = [
    { id: 'analyze', nameKey: 'ability_analyze_name', descriptionKey: 'ability_analyze_description', name: LOCALIZED_LABELS.ability_analyze_name, emoji: '\uD83D\uDD0E', description: LOCALIZED_LABELS.ability_analyze_description, damage: 3 },
    { id: 'explain', nameKey: 'ability_explain_name', descriptionKey: 'ability_explain_description', name: LOCALIZED_LABELS.ability_explain_name, emoji: '\uD83D\uDCA1', description: LOCALIZED_LABELS.ability_explain_description, damage: 2, heal: 1 },
    { id: 'connect', nameKey: 'ability_connect_name', descriptionKey: 'ability_connect_description', name: LOCALIZED_LABELS.ability_connect_name, emoji: '\uD83D\uDD17', description: LOCALIZED_LABELS.ability_connect_description, damage: 2, shield: 1 },
    { id: 'question', nameKey: 'ability_question_name', descriptionKey: 'ability_question_description', name: LOCALIZED_LABELS.ability_question_name, emoji: '\u2753', description: LOCALIZED_LABELS.ability_question_description, damage: 2, missDamage: 1 }
  ];
  var ROLES = [
    { id: 'analyst', nameKey: 'role_analyst_name', descriptionKey: 'role_analyst_description', name: LOCALIZED_LABELS.role_analyst_name, emoji: '\uD83D\uDD0E', abilityId: 'analyze', description: LOCALIZED_LABELS.role_analyst_description },
    { id: 'explainer', nameKey: 'role_explainer_name', descriptionKey: 'role_explainer_description', name: LOCALIZED_LABELS.role_explainer_name, emoji: '\uD83D\uDCA1', abilityId: 'explain', description: LOCALIZED_LABELS.role_explainer_description },
    { id: 'connector', nameKey: 'role_connector_name', descriptionKey: 'role_connector_description', name: LOCALIZED_LABELS.role_connector_name, emoji: '\uD83D\uDD17', abilityId: 'connect', description: LOCALIZED_LABELS.role_connector_description },
    { id: 'investigator', nameKey: 'role_investigator_name', descriptionKey: 'role_investigator_description', name: LOCALIZED_LABELS.role_investigator_name, emoji: '\u2753', abilityId: 'question', description: LOCALIZED_LABELS.role_investigator_description }
  ];
  var SUPPORTS = [
    { id: 'clarify', nameKey: 'support_clarify_name', descriptionKey: 'support_clarify_description', name: LOCALIZED_LABELS.support_clarify_name, emoji: '\uD83E\uDDE0', description: LOCALIZED_LABELS.support_clarify_description },
    { id: 'guard', nameKey: 'support_guard_name', descriptionKey: 'support_guard_description', name: LOCALIZED_LABELS.support_guard_name, emoji: '\uD83D\uDEE1\uFE0F', description: LOCALIZED_LABELS.support_guard_description },
    { id: 'encourage', nameKey: 'support_encourage_name', descriptionKey: 'support_encourage_description', name: LOCALIZED_LABELS.support_encourage_name, emoji: '\uD83D\uDE4C', description: LOCALIZED_LABELS.support_encourage_description }
  ];
  var ROOM_LAYOUT = [
    { x: 8, y: 48 }, { x: 23, y: 22 }, { x: 39, y: 48 }, { x: 54, y: 20 },
    { x: 54, y: 76 }, { x: 70, y: 48 }, { x: 84, y: 22 }, { x: 92, y: 62 }
  ];
  var ROOM_KINDS = ['start', 'battle', 'puzzle', 'treasure', 'battle', 'puzzle', 'battle', 'boss'];
  var ROOM_EMOJIS = ['\uD83C\uDFE0', '\uD83C\uDF32', '\uD83E\uDDED', '\uD83C\uDF81', '\uD83C\uDF0B', '\uD83E\uDDEA', '\uD83C\uDF0C', '\uD83D\uDC09'];
  var LOCALIZED_DEFAULTS = {
    session_default_title: 'The Concept Compass',
    objective_default: 'Navigate together, explain the lesson concepts, and defeat the final misconception.',
    choice_number: 'Choice {number}',
    option_evidence: 'I can support this idea with evidence',
    option_clue: 'I need another clue',
    question_default: 'Which response best demonstrates the room concept?',
    explanation_default: 'Use evidence from the lesson to explain the best answer.',
    concept_number: 'Concept {number}',
    room_scholar_base: 'Scholar Base',
    room_mastery_gate: 'Mastery Gate',
    enemy_hydra: 'The Misconception Hydra',
    enemy_riddle_wisp: 'Riddle Wisp',
    enemy_confusionling: 'Confusionling',
    item_insight_lens: 'Insight Lens',
    item_insight_lens_description: 'The teacher may spend this to reveal a clue.',
    log_started: 'The class entered Scholar Base. Choose the path together.',
    travel_not_ready: 'The party is not ready to travel.',
    travel_connected: 'Choose a connected room.',
    travel_unavailable: 'That room is unavailable.',
    travel_gate_locked: 'The Mastery Gate needs {count} more concept sigil(s).',
    log_travel: 'The party entered {room}.',
    log_travel_found: 'The party entered {room} and found {item}.',
    encounter_none: 'There is no active encounter.',
    action_required: 'Wait for at least one student action.',
    puzzle_bonus: 'Puzzle consensus opened the reasoning lock for 4 bonus damage.',
    puzzle_locked: 'The reasoning lock needs two-thirds consensus; discuss the evidence and try another clue.',
    boss_bonus: 'The class broke the Mastery Barrier for 2 bonus damage.',
    boss_limited: 'The Mastery Barrier limited damage; regroup around the strongest evidence.',
    boss_assessment_remaining: 'The final barrier stays open for review: {count} supported assessment item(s) remain.',
    round_log: '{correct}/{total} concept checks succeeded; the party dealt {damage} damage.',
    round_combo_log: 'A three-ability concept combo added 3 damage!',
    round_synergy_log: '{count} party role synergies activated.',
    round_assist_log: '{count} peer assists activated.',
    round_enemy_defeated_log: '{enemy} was defeated!',
    round_party_damage_log: 'The party took {damage} damage.',
    round_sigil_log: 'A concept sigil was secured.',
    explanation_discuss: 'Discuss why the strongest answer fits the lesson concept.',
    item_unavailable: 'Choose an available item.',
    item_used_title: '{item} used',
    clue_evidence: 'Look for evidence in the lesson content.',
    log_item_used: 'The party used {item}.',
    gm_default_title: 'A New Development',
    gm_default_description: 'The situation changes and the party must respond together.',
    challenge_gate: 'Challenge Gate',
    log_gm: 'GM: {title} — {description}',
    gm_undo_unavailable: 'There is no GM change to undo.',
    log_gm_undo: 'The teacher undid the last GM change.',
    pacing_invalid: 'Choose a valid pacing adjustment.',
    pacing_no_encounter: 'There is no encounter to adjust.',
    log_pacing: 'GM pacing adjustment: {kind} {amount}.',
    unlabeled_concept: 'Unlabeled concept',
    source_questions_required: 'Concept Quest needs at least one multiple-choice question with a valid answer key.',
    challenge_key_required: 'Give this challenge at least two choices and select its correct answer.',
    item_no_effect: 'Save this item for when its effect can help the party.',
    inventory_full: 'The shared inventory is full. Use an item before adding another.'
  };

  function interpolate(text, params) {
    return Object.keys(params || {}).reduce(function(result, name) {
      return result.split('{' + name + '}').join(String(params[name]));
    }, String(text == null ? '' : text));
  }

  function createLocalizedStrings(translate) {
    var strings = {};
    Object.keys(LOCALIZED_DEFAULTS).forEach(function(key) {
      var fallback = LOCALIZED_DEFAULTS[key];
      var translated = typeof translate === 'function' ? translate(key, fallback) : '';
      strings[key] = typeof translated === 'string' && translated && translated !== key && translated !== 'concept_quest.' + key ? translated : fallback;
    });
    return strings;
  }

  function textFromStrings(strings, key, params) {
    return interpolate(strings && strings[key] || LOCALIZED_DEFAULTS[key] || key, params);
  }

  function questText(quest, key, params) {
    return textFromStrings(quest && quest.localizedStrings, key, params);
  }

  function questError(quest, key, params) {
    return { quest: quest, error: questText(quest, key, params), errorKey: key, errorParams: params || {} };
  }

  function clamp(value, min, max) {
    var number = Number(value);
    return Math.max(min, Math.min(max, Number.isFinite(number) ? number : min));
  }

  function cleanText(value, fallback, maxLength) {
    var text = String(value == null ? '' : value).replace(/[<>]/g, '').trim();
    if (!text) text = fallback || '';
    return text.slice(0, maxLength || 500);
  }

  function isAnswerKeyDisputed(question) {
    if (!question || !['mcq', 'multiple-choice', 'multiple-choice-question', 'single-select', 'true-false', 'tf'].includes(String(question.itemType || question.type || 'mcq').toLowerCase().replace(/_/g, '-'))) return false;
    var review = question.keyCheck;
    var key = question.correctAnswer != null ? String(question.correctAnswer) : Number.isInteger(question.correctIndex) && Array.isArray(question.options) ? String(question.options[question.correctIndex]) : '';
    if (review && typeof review === 'object') {
      if (review.checkedKey != null && String(review.checkedKey) !== key) return false;
      if (['confirmed', 'disputed', 'unclear', 'stale'].indexOf(review.status) >= 0) return review.status === 'disputed';
    }
    return /\[\[\s*KEY\s*:\s*DISPUTED\b/i.test(String(question.factCheck || '')) || /correction\s*\/\s*warning/i.test(String(question.factCheck || '').replace(/\*/g, ''));
  }

  function questionAnswerIndex(question) {
    if (!question || typeof question !== 'object') return -1;
    if (isAnswerKeyDisputed(question)) return -1;
    var type = String(question.itemType || question.type || 'mcq').toLowerCase().replace(/_/g, '-');
    if (['mcq', 'multiple-choice', 'multiple-choice-question', 'single-select'].indexOf(type) < 0) return -1;
    var options = question.options || question.choices;
    if (!Array.isArray(options) || options.length < 2 || options.length > 6) return -1;
    var text = function(value) { return String(value && typeof value === 'object' ? value.text || value.label || '' : value == null ? '' : value).normalize('NFC').trim().toLowerCase(); };
    if (options.some(function(value) { return !text(value); })) return -1;
    if (Number.isInteger(question.correctIndex)) return question.correctIndex >= 0 && question.correctIndex < options.length ? question.correctIndex : -1;
    var answer = question.correctAnswer;
    if (Number.isInteger(answer)) return answer >= 0 && answer < options.length ? answer : -1;
    if (typeof answer === 'string') {
      var matched = options.findIndex(function(option) { return text(option) === text(answer); });
      if (matched >= 0) return matched;
      if (/^[A-F]$/i.test(answer.trim())) { var letter = answer.trim().toUpperCase().charCodeAt(0) - 65; return letter < options.length ? letter : -1; }
      if (/^[0-5]$/.test(answer.trim())) { var number = Number(answer.trim()); return number < options.length ? number : -1; }
    }
    return -1;
  }

  function getTurnKey(quest) {
    var room = getRoom(quest, quest && quest.currentRoomId);
    var challenge = room && room.challenge || {};
    var value = JSON.stringify([challenge.id, challenge.prompt, challenge.options, challenge.correctIndex]);
    var hash = 2166136261;
    for (var i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
    return (quest && quest.sessionId ? quest.sessionId + ':' : '') + String(quest && quest.turn || 0) + ':' + String(quest && quest.currentRoomId || '') + ':' + (hash >>> 0).toString(36);
  }

  function currentActions(quest, actions) {
    if (!quest) return {};
    var room = getRoom(quest, quest && quest.currentRoomId);
    var options = room && room.challenge && room.challenge.options || [];
    var key = getTurnKey(quest);
    var filtered = {};
    Object.keys(actions || {}).slice(0, 250).forEach(function(uid) {
      var action = actions[uid];
      if (!action || typeof action !== 'object' || Array.isArray(action)) return;
      if (quest.actionSchema === 1 && action.turnKey !== key) return;
      if (action.turnKey != null && action.turnKey !== key) return;
      if (!Number.isInteger(action.answerIndex) || action.answerIndex < 0 || action.answerIndex >= options.length) return;
      if (!ABILITIES.some(function(ability) { return ability.id === action.abilityId; })) return;
      if (uid === '__proto__' || uid === 'constructor' || uid === 'prototype') return;
      filtered[uid] = action;
    });
    return filtered;
  }

  function currentVotes(quest, votes, turns) {
    if (!quest) return {};
    var room = getRoom(quest, quest && quest.currentRoomId);
    var filtered = {};
    Object.keys(votes || {}).slice(0, 250).forEach(function(uid) {
      if (uid === '__proto__' || uid === 'constructor' || uid === 'prototype') return;
      if (quest.actionSchema === 1 && (!turns || turns[uid] !== getTurnKey(quest))) return;
      var target = getRoom(quest, votes[uid]);
      if (!room || !target || (room.neighbors || []).indexOf(target.id) < 0) return;
      if (target.kind === 'boss' && (quest.sigils || []).length < requiredSigils(quest)) return;
      filtered[uid] = target.id;
    });
    return filtered;
  }

  function requiredSigils(quest) {
    var available = new Set((quest && quest.rooms || []).filter(function(room) { return room.kind !== 'start' && room.kind !== 'treasure' && room.kind !== 'boss'; }).map(function(room) { return room.concept; }));
    return Math.max(1, Math.min(Number(quest && quest.sigilsRequired) || 3, available.size || 1));
  }

  function recoveredPhase(quest, party) {
    if (party.hp <= 0) return 'defeat';
    if (quest.phase !== 'defeat') return quest.phase;
    var room = getRoom(quest, quest.currentRoomId);
    return room && room.enemy && room.enemy.hp > 0 ? 'battle' : 'explore';
  }

  function sealQuest(quest) { return Object.assign({}, quest, { turnKey: getTurnKey(quest) }); }
  function sealResult(result) { return result.error ? result : Object.assign({}, result, { quest: sealQuest(result.quest) }); }

  // New class sessions keep the whole supported assessment independently of
  // the map. Old sessions retain their room-local rotation; solo owns its own
  // source bank and must never credit the structural MCQ adapters stored here.
  function classAssessmentBank(quest) {
    var bank = quest && !quest.solo && quest.assessmentBank;
    return bank && bank.version === 1 && Array.isArray(bank.items) && bank.items.length ? bank : null;
  }

  function coverage(quest) {
    var bank = classAssessmentBank(quest);
    if (!bank) return null;
    var attempted = bank.items.filter(function(item) { return !!(bank.attempts && bank.attempts[item.sourceIndex] && bank.attempts[item.sourceIndex].rounds > 0); }).length;
    return { total: bank.items.length, attempted: attempted, remaining: bank.items.length - attempted, complete: attempted === bank.items.length, excluded: quest.excludedQuestions || 0 };
  }

  function nextAssessmentIndex(bank, start) {
    for (var offset = 0; offset < bank.items.length; offset++) {
      var index = (start + offset) % bank.items.length;
      if (!bank.attempts[bank.items[index].sourceIndex]) return index;
    }
    return start % bank.items.length;
  }

  function emptyLearningTotals(completeHistory) {
    return { version: 1, completeHistory: completeHistory !== false, rounds: 0, totalAnswers: 0, correctAnswers: 0, combos: 0, roleSynergies: 0, peerAssists: 0, puzzlesSolved: 0, concepts: {}, conceptsCleared: [], learners: {}, learnerHistoryComplete: completeHistory !== false };
  }

  function addLearningRound(totals, round, quest) {
    var concepts = Object.assign(Object.create(null), totals.concepts || {});
    var concept = cleanText(round.concept, questText(quest, 'unlabeled_concept'), 72);
    var previous = concepts[concept] || { concept: concept, correct: 0, total: 0, rounds: 0 };
    concepts[concept] = { concept: concept, correct: previous.correct + (round.correct || 0), total: previous.total + (round.total || 0), rounds: previous.rounds + 1 };
    var cleared = (totals.conceptsCleared || []).slice();
    if (round.enemyDefeated && cleared.indexOf(concept) < 0) cleared.push(concept);
    var learners = Object.assign(Object.create(null), totals.learners || {});
    (round.learnerEvidence || []).forEach(function(evidence) {
      var previousLearner = learners[evidence.uid] || { uid: evidence.uid, responses: 0, correct: 0, firstResponses: 0, firstCorrect: 0, repeatResponses: 0, repeatCorrect: 0, peerSupportReceived: 0, seen: {} };
      var first = !Object.prototype.hasOwnProperty.call(previousLearner.seen || {}, round.itemEvidenceKey);
      var seen = Object.assign(Object.create(null), previousLearner.seen || {}); seen[round.itemEvidenceKey] = true;
      learners[evidence.uid] = Object.assign({}, previousLearner, { seen: seen, responses: previousLearner.responses + 1, correct: previousLearner.correct + Number(evidence.correct), firstResponses: previousLearner.firstResponses + Number(first), firstCorrect: previousLearner.firstCorrect + Number(first && evidence.correct), repeatResponses: previousLearner.repeatResponses + Number(!first), repeatCorrect: previousLearner.repeatCorrect + Number(!first && evidence.correct), peerSupportReceived: previousLearner.peerSupportReceived + Number(evidence.peerSupportReceived) });
    });
    return Object.assign({}, totals, {
      rounds: totals.rounds + 1, totalAnswers: totals.totalAnswers + (round.total || 0), correctAnswers: totals.correctAnswers + (round.correct || 0),
      combos: totals.combos + (round.combo ? 1 : 0), roleSynergies: totals.roleSynergies + (round.synergyCount || 0), peerAssists: totals.peerAssists + (round.assistedCount || 0),
      puzzlesSolved: totals.puzzlesSolved + (round.roomKind === 'puzzle' && round.enemyDefeated ? 1 : 0), concepts: concepts, conceptsCleared: cleared,
      learners: learners, learnerHistoryComplete: totals.learnerHistoryComplete !== false && !(totals.rounds > 0 && !totals.learners) && Array.isArray(round.learnerEvidence)
    });
  }

  function learningTotals(quest) {
    if (quest && !quest.solo && quest.learningTotals && quest.learningTotals.version === 1) return quest.learningTotals;
    var rounds = quest && Array.isArray(quest.roundHistory) ? quest.roundHistory : [];
    // Older saves may already have discarded earlier rounds. Preserve available
    // evidence and label that limit instead of claiming it covers the session.
    return rounds.reduce(function(totals, round) { return addLearningRound(totals, round, quest); }, emptyLearningTotals(!!(quest && quest.solo) || rounds.length < 24));
  }

  // Assessment content is rendered as React text, not HTML. Keep authored
  // comparators and full passages; the bounded cleaner remains for GM drafts.
  function sourceQuestionText(value, fallback) {
    var text = typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
    return text || fallback || '';
  }

  // GM assessment text is also rendered as escaped React text. Keep mathematical
  // operators while retaining the draft limits; metadata still uses cleanText.
  function draftQuestionText(value, fallback, maxLength) {
    return sourceQuestionText(value, fallback).slice(0, maxLength || 500);
  }

  function sourceChallengePreview(item) {
    var preview = Object.assign({}, item);
    // Keep potentially large image data once in the bank and once in the active
    // encounter, rather than repeating it throughout the serialized map.
    ['imageUrl', 'imageAltText', 'optionImageUrls', 'optionImageAltTexts'].forEach(function(field) { delete preview[field]; });
    return preview;
  }

  function normalizeQuestion(question, index, strings, preserveSource) {
    question = question || {};
    var questionText = preserveSource ? sourceQuestionText : draftQuestionText;
    var options = Array.isArray(question.options) ? question.options :
      (Array.isArray(question.choices) ? question.choices : []);
    options = options.slice(0, 6).map(function(option, optionIndex) {
      if (option && typeof option === 'object') return questionText(option.text || option.label, textFromStrings(strings, 'choice_number', { number: optionIndex + 1 }), 180);
      return questionText(option, textFromStrings(strings, 'choice_number', { number: optionIndex + 1 }), 180);
    });
    if (options.length < 2) {
      options = [textFromStrings(strings, 'option_evidence'), textFromStrings(strings, 'option_clue')];
    }
    var correctIndex = questionAnswerIndex(question);
    if (correctIndex < 0) throw new Error(textFromStrings(strings, 'challenge_key_required'));
    var normalized = {
      id: 'challenge-' + (index + 1),
      concept: conceptLabel(question, index, strings),
      prompt: questionText(question.question || question.prompt || question.text, textFromStrings(strings, 'question_default'), 500),
      options: options,
      correctIndex: correctIndex,
      explanation: questionText(question.explanation || question.feedback || question.rationale, textFromStrings(strings, 'explanation_default'), 500)
    };
    if (preserveSource) {
      normalized.question_en = sourceQuestionText(question.question_en);
      normalized.imageUrl = sourceQuestionText(question.imageUrl);
      normalized.imageAltText = sourceQuestionText(question.imageAltText);
      ['options_en', 'optionImageUrls', 'optionImageAltTexts'].forEach(function(field) {
        normalized[field] = options.map(function(_, optionIndex) { return sourceQuestionText(Array.isArray(question[field]) ? question[field][optionIndex] : ''); });
      });
    }
    return normalized;
  }

  function conceptLabel(question, index, strings) {
    question = question || {};
    var label = question.concept || question.standard || question.topic || question.skill || question.category;
    if (Array.isArray(label)) label = label.join(', ');
    var fallback = textFromStrings(strings, 'concept_number', { number: index + 1 });
    if (!label) label = cleanText(question.question || question.prompt, fallback, 42);
    return cleanText(label, fallback, 72);
  }

  function createSession(options) {
    options = options || {};
    var strings = createLocalizedStrings(options.translate);
    var suppliedQuestions = Array.isArray(options.questions) ? options.questions : [];
    var sourceEntries = suppliedQuestions.map(function(question, sourceIndex) { return { question: question, sourceIndex: sourceIndex }; }).filter(function(entry) { return questionAnswerIndex(entry.question) >= 0; });
    var sourceQuestions = sourceEntries.map(function(entry) { return entry.question; });
    if (!sourceQuestions.length) throw new Error(textFromStrings(strings, 'source_questions_required'));
    var assessmentItems = sourceEntries.map(function(entry) { return Object.assign({}, normalizeQuestion(entry.question, entry.sourceIndex, strings, true), { sourceIndex: entry.sourceIndex }); });
    var title = cleanText(options.title, textFromStrings(strings, 'session_default_title'), 100);
    var rooms = ROOM_LAYOUT.map(function(position, index) {
      var source = sourceQuestions[index % sourceQuestions.length];
      var kind = ROOM_KINDS[index];
      var hp = kind === 'boss' ? 18 : (kind === 'battle' ? 9 : 6);
      var neighbors = [];
      if (index > 0) neighbors.push('room-' + index);
      if (index < ROOM_LAYOUT.length - 1) neighbors.push('room-' + (index + 2));
      if (index === 1) neighbors.push('room-5');
      if (index === 4) neighbors.push('room-2');
      var challenges = [];
      var challengeCount = Math.min(3, sourceQuestions.length);
      for (var challengeOffset = 0; challengeOffset < challengeCount; challengeOffset++) {
        challenges.push(sourceChallengePreview(assessmentItems[(index + challengeOffset) % assessmentItems.length]));
      }
      return {
        id: 'room-' + (index + 1),
        name: index === 0 ? textFromStrings(strings, 'room_scholar_base') : (kind === 'boss' ? textFromStrings(strings, 'room_mastery_gate') : conceptLabel(source, index, strings)),
        emoji: ROOM_EMOJIS[index],
        x: position.x,
        y: position.y,
        kind: kind,
        concept: conceptLabel(source, index, strings),
        neighbors: neighbors,
        challengeIndex: 0,
        challenges: challenges,
        challenge: challenges[0],
        enemy: kind === 'start' || kind === 'treasure' ? null : {
          id: 'enemy-' + (index + 1),
          name: kind === 'boss' ? textFromStrings(strings, 'enemy_hydra') : (kind === 'puzzle' ? textFromStrings(strings, 'enemy_riddle_wisp') : textFromStrings(strings, 'enemy_confusionling')),
          emoji: kind === 'boss' ? '\uD83D\uDC09' : (kind === 'puzzle' ? '\uD83D\uDC7B' : '\uD83D\uDC7E'),
          hp: hp,
          maxHp: hp,
          attack: kind === 'boss' ? 3 : 2
        },
        reward: kind === 'treasure' ? {
          id: 'item-insight-lens', name: textFromStrings(strings, 'item_insight_lens'), emoji: '\uD83D\uDD0D',
          description: textFromStrings(strings, 'item_insight_lens_description'), effect: { type: 'clue', amount: 1 }
        } : null
      };
    });
    return {
      version: VERSION,
      actionSchema: 1,
      sessionId: 'quest-' + Date.now().toString(36) + '-' + (++logSequence).toString(36),
      excludedQuestions: suppliedQuestions.length - sourceQuestions.length,
      assessmentBank: { version: 1, items: assessmentItems, cursor: 1 % assessmentItems.length, attempts: {} },
      learningTotals: emptyLearningTotals(true),
      title: title,
      objective: cleanText(options.objective, textFromStrings(strings, 'objective_default'), 240),
      localizedStrings: strings,
      turn: 1,
      phase: 'explore',
      currentRoomId: 'room-1',
      rooms: rooms,
      visited: ['room-1'],
      party: { hp: 14, maxHp: 14, shield: 0, xp: 0 },
      inventory: [],
      sigils: [],
      sigilsRequired: Math.min(3, new Set(rooms.filter(function(room) { return room.enemy && room.kind !== 'boss'; }).map(function(room) { return room.concept; })).size),
      activeEvent: null,
      gmUndo: null,
      gmHistory: [],
      log: [{ id: 'log-start', turn: 1, text: textFromStrings(strings, 'log_started') }],
      abilities: ABILITIES,
      roles: ROLES,
      supports: SUPPORTS,
      lastRound: null,
      roundHistory: []
    };
  }

  function getRoom(quest, roomId) {
    return quest && Array.isArray(quest.rooms) ? quest.rooms.find(function(room) { return room.id === roomId; }) : null;
  }

  function tallyVotes(votes, allowedRoomIds) {
    var counts = {};
    Object.keys(votes || {}).sort().forEach(function(uid) {
      var roomId = votes[uid];
      if (allowedRoomIds.indexOf(roomId) >= 0) counts[roomId] = (counts[roomId] || 0) + 1;
    });
    return allowedRoomIds.filter(function(id) { return counts[id] > 0; }).sort(function(a, b) {
      return (counts[b] || 0) - (counts[a] || 0) || a.localeCompare(b);
    })[0] || null;
  }

  function resolveTravel(quest, votes, selectedRoomId) {
    var current = getRoom(quest, quest.currentRoomId);
    if (!current || quest.phase !== 'explore') return questError(quest, 'travel_not_ready');
    var destinationId = selectedRoomId || tallyVotes(votes, current.neighbors || []);
    if ((current.neighbors || []).indexOf(destinationId) < 0) return questError(quest, 'travel_connected');
    var destination = getRoom(quest, destinationId);
    if (!destination) return questError(quest, 'travel_unavailable');
    if (destination.kind === 'boss' && (quest.sigils || []).length < requiredSigils(quest)) {
      return questError(quest, 'travel_gate_locked', { count: requiredSigils(quest) - (quest.sigils || []).length });
    }
    if (destination.reward && (quest.inventory || []).length >= 12 && !(quest.inventory || []).some(function(item) { return item.id === destination.reward.id; })) return questError(quest, 'inventory_full');
    var visited = (quest.visited || []).indexOf(destinationId) >= 0 ? (quest.visited || []).slice() : (quest.visited || []).concat([destinationId]);
    var rooms = quest.rooms.map(function(room) {
      var bank = classAssessmentBank(quest);
      if (room.id !== destinationId) return bank && Number.isInteger(room.challenge && room.challenge.sourceIndex) ? Object.assign({}, room, { challenge: sourceChallengePreview(room.challenge) }) : room;
      var scheduled = bank && room.enemy && room.enemy.hp > 0 && Number.isInteger(room.challenge && room.challenge.sourceIndex) ? bank.items[bank.cursor] : null;
      return Object.assign({}, room, room.reward ? { reward: null } : {}, scheduled ? { challenge: scheduled } : {});
    });
    var inventory = (quest.inventory || []).slice();
    if (destination.reward && !inventory.some(function(item) { return item.id === destination.reward.id; })) inventory.push(destination.reward);
    var nextPhase = destination.enemy && destination.enemy.hp > 0 ? 'battle' : 'explore';
    return { quest: Object.assign({}, quest, {
      currentRoomId: destinationId,
      gmUndo: null,
      gmHistory: [],
      rooms: rooms,
      visited: visited,
      inventory: inventory.slice(0, 12),
      phase: nextPhase,
      activeEvent: null,
      turn: quest.turn + 1,
      log: (quest.log || []).concat([{ id: 'log-' + Date.now() + '-' + (++logSequence), turn: quest.turn + 1, text: destination.reward ? questText(quest, 'log_travel_found', { room: destination.name, item: destination.reward.name }) : questText(quest, 'log_travel', { room: destination.name }) }]).slice(-30)
    }) };
  }

  function resolveBattle(quest, actions, roles) {
    var room = getRoom(quest, quest.currentRoomId);
    if (!room || !room.enemy || room.enemy.hp <= 0 || quest.party.hp <= 0 || quest.phase !== 'battle') return questError(quest, 'encounter_none');
    var challenge = room.challenge || {};
    actions = currentActions(quest, actions);
    var damage = 0;
    var heal = 0;
    var shield = 0;
    var correct = 0;
    var total = 0;
    var synergyCount = 0;
    var assistedCount = 0;
    var supportHeal = 0;
    var supportShield = 0;
    var correctAbilityIds = [];
    Object.keys(actions || {}).sort().forEach(function(uid) {
      var action = actions[uid] || {};
      var ability = ABILITIES.find(function(entry) { return entry.id === action.abilityId; }) || ABILITIES[0];
      var isCorrect = action.answerIndex === challenge.correctIndex;
      total += 1;
      if (isCorrect) {
        correct += 1;
        damage += ability.damage || 0;
        heal += ability.heal || 0;
        shield += ability.shield || 0;
        correctAbilityIds.push(ability.id);
        var committedRole = typeof action.roleId === 'string' ? action.roleId : roles && roles[uid];
        var role = ROLES.find(function(entry) { return entry.id === committedRole; });
        if (role && role.abilityId === ability.id) { damage += 1; synergyCount += 1; }
      } else {
        damage += ability.missDamage || 0;
      }
    });
    if (!total) return questError(quest, 'action_required');
    Object.keys(actions || {}).sort().forEach(function(uid) {
      var action = actions[uid] || {};
      var targetUid = cleanText(action.supportTargetUid, '', 128);
      if (!targetUid || targetUid === uid || !actions[targetUid]) return;
      var helperCorrect = action.answerIndex === challenge.correctIndex;
      if (!helperCorrect) return;
      var supportId = action.supportId;
      if (supportId === 'clarify' && actions[targetUid].answerIndex !== challenge.correctIndex) {
        damage += 1;
        assistedCount += 1;
      } else if (supportId === 'guard') {
        supportShield += 1;
        assistedCount += 1;
      } else if (supportId === 'encourage') {
        supportHeal += 1;
        assistedCount += 1;
      }
    });
    var combo = Array.from(new Set(correctAbilityIds)).length >= 3;
    if (combo) damage += 3;
    heal += supportHeal;
    shield += supportShield;
    var accuracy = total ? correct / total : 0;
    var encounterRule = '';
    if (room.kind === 'puzzle') {
      if (correct * 3 >= total * 2) {
        damage += 4;
        encounterRule = questText(quest, 'puzzle_bonus');
      } else {
        damage = Math.min(damage, 2);
        encounterRule = questText(quest, 'puzzle_locked');
      }
    } else if (room.kind === 'boss') {
      if (accuracy >= 0.6) {
        damage += 2;
        encounterRule = questText(quest, 'boss_bonus');
      } else {
        damage = Math.min(damage, 3);
        encounterRule = questText(quest, 'boss_limited');
      }
    }
    damage = clamp(damage, 0, 20);
    heal = clamp(heal, 0, 4);
    shield = clamp(shield, 0, 6);
    var bank = classAssessmentBank(quest);
    var sourceIndex = bank ? bank.items.findIndex(function(item) { return item.sourceIndex === challenge.sourceIndex; }) : -1;
    if (sourceIndex >= 0) {
      var attempts = Object.assign({}, bank.attempts);
      var previous = attempts[challenge.sourceIndex] || { rounds: 0, correct: 0, total: 0 };
      attempts[challenge.sourceIndex] = { rounds: previous.rounds + 1, correct: previous.correct + correct, total: previous.total + total };
      bank = Object.assign({}, bank, { attempts: attempts });
      bank.cursor = nextAssessmentIndex(bank, sourceIndex + 1);
    }
    var remaining = bank ? bank.items.filter(function(item) { return !bank.attempts[item.sourceIndex]; }).length : 0;
    var enemyHp = Math.max(0, room.enemy.hp - damage);
    var barrierHeld = !!(bank && room.kind === 'boss' && remaining > 0 && enemyHp === 0);
    if (barrierHeld) {
      enemyHp = 1;
      encounterRule += (encounterRule ? ' ' : '') + questText(quest, 'boss_assessment_remaining', { count: remaining });
    }
    var enemyDefeated = enemyHp === 0;
    var incoming = enemyDefeated || barrierHeld ? 0 : room.enemy.attack;
    var totalShield = clamp((quest.party.shield || 0) + shield, 0, 8);
    var absorbed = Math.min(incoming, totalShield);
    var partyHp = clamp(quest.party.hp + heal - Math.max(0, incoming - absorbed), 0, quest.party.maxHp);
    var remainingShield = Math.max(0, totalShield - incoming);
    var rooms = quest.rooms.map(function(entry) {
      if (entry.id !== room.id) return entry;
      var nextChallengeIndex = Array.isArray(entry.challenges) && entry.challenges.length
        ? ((entry.challengeIndex || 0) + 1) % entry.challenges.length : 0;
      return Object.assign({}, entry, {
        enemy: Object.assign({}, entry.enemy, { hp: enemyHp }),
        challengeIndex: nextChallengeIndex,
        challenge: bank && (sourceIndex >= 0 || barrierHeld) ? bank.items[bank.cursor] : Array.isArray(entry.challenges) && entry.challenges.length ? entry.challenges[nextChallengeIndex] : entry.challenge
      });
    });
    var won = enemyDefeated && room.kind === 'boss';
    var phase = partyHp <= 0 ? 'defeat' : (won ? 'complete' : (enemyDefeated ? 'explore' : 'battle'));
    var sigils = (quest.sigils || []).slice();
    if (enemyDefeated && room.kind !== 'boss' && sigils.indexOf(room.concept) < 0) sigils.push(room.concept);
    var text = questText(quest, 'round_log', { correct: correct, total: total, damage: damage });
    if (combo) text += ' ' + questText(quest, 'round_combo_log');
    if (synergyCount) text += ' ' + questText(quest, 'round_synergy_log', { count: synergyCount });
    if (assistedCount) text += ' ' + questText(quest, 'round_assist_log', { count: assistedCount });
    if (encounterRule) text += ' ' + encounterRule;
    if (enemyDefeated) text += ' ' + questText(quest, 'round_enemy_defeated_log', { enemy: room.enemy.name });
    else text += ' ' + questText(quest, 'round_party_damage_log', { damage: Math.max(0, incoming - absorbed) });
    var roundRecord = {
      turn: quest.turn, roomId: room.id, concept: challenge.concept || room.concept, correct: correct, total: total,
      accuracy: total ? Math.round((correct / total) * 100) : 0, damage: damage,
      incoming: Math.max(0, incoming - absorbed), combo: combo, synergyCount: synergyCount,
      assistedCount: assistedCount, roomKind: room.kind, encounterRule: encounterRule, enemyDefeated: enemyDefeated
    };
    if (!quest.solo) {
      // Retain first-versus-repeat evidence independently of the capped visual log.
      // Peer support is a game event, not proof that it caused a correct answer.
      var itemText = JSON.stringify([challenge.sourceIndex, challenge.prompt || challenge.question, challenge.options, challenge.correctIndex]);
      var itemHash = 2166136261;
      for (var hashIndex = 0; hashIndex < itemText.length; hashIndex++) itemHash = Math.imul(itemHash ^ itemText.charCodeAt(hashIndex), 16777619);
      roundRecord.itemEvidenceKey = 'item-' + (itemHash >>> 0).toString(16);
      roundRecord.learnerEvidence = Object.keys(actions).map(function(uid) {
        var peerSupportReceived = Object.keys(actions).some(function(helperUid) {
          var helper = actions[helperUid];
          return helperUid !== uid && helper.supportTargetUid === uid && helper.answerIndex === challenge.correctIndex && (helper.supportId === 'guard' || helper.supportId === 'encourage' || helper.supportId === 'clarify' && actions[uid].answerIndex !== challenge.correctIndex);
        });
        return { uid: uid, correct: actions[uid].answerIndex === challenge.correctIndex, peerSupportReceived: peerSupportReceived };
      });
    }
    return { quest: Object.assign({}, quest, bank ? { assessmentBank: bank } : {}, quest.solo ? {} : { learningTotals: addLearningRound(learningTotals(quest), roundRecord, quest) }, {
      rooms: rooms,
      phase: phase,
      gmUndo: null,
      gmHistory: [],
      turn: quest.turn + 1,
      party: Object.assign({}, quest.party, { hp: partyHp, shield: remainingShield, xp: (quest.party.xp || 0) + correct * 5 }),
      sigils: sigils,
      lastRound: {
        turn: quest.turn,
        prompt: challenge.prompt,
        correctAnswer: challenge.options[challenge.correctIndex],
        correct: correct,
        total: total,
        damage: damage,
        incoming: Math.max(0, incoming - absorbed),
        combo: combo,
        synergyCount: synergyCount,
        assistedCount: assistedCount,
        encounterRule: encounterRule,
        explanation: (Number.isInteger(challenge.sourceIndex) ? sourceQuestionText : draftQuestionText)(challenge.explanation, questText(quest, 'explanation_discuss'), 500)
      },
      roundHistory: (quest.roundHistory || []).concat([roundRecord]).slice(-24),
      log: (quest.log || []).concat([{ id: 'log-' + Date.now() + '-' + (++logSequence), turn: quest.turn + 1, text: text + (enemyDefeated && room.kind !== 'boss' ? ' ' + questText(quest, 'round_sigil_log') : '') }]).slice(-30)
    }), summary: { correct: correct, total: total, damage: damage, incoming: Math.max(0, incoming - absorbed), enemyDefeated: enemyDefeated, combo: combo, synergyCount: synergyCount, assistedCount: assistedCount, encounterRule: encounterRule } };
  }

  function gmSnapshot(quest) {
    return {
      rooms: quest.rooms,
      currentRoomId: quest.currentRoomId,
      roundCount: (quest.roundHistory || []).length,
      learningRoundCount: learningTotals(quest).rounds,
      party: quest.party,
      inventory: quest.inventory,
      phase: quest.phase,
      activeEvent: quest.activeEvent,
      logLength: (quest.log || []).length
    };
  }

  function gmHistoryWithCurrent(quest) {
    return (quest.gmHistory || []).concat([gmSnapshot(quest)]).slice(-5);
  }

  function useItem(quest, itemIndex) {
    var index = Number(itemIndex);
    if (!Number.isInteger(index) || index < 0 || index >= (quest.inventory || []).length) return questError(quest, 'item_unavailable');
    var inventory = quest.inventory.slice();
    var item = inventory.splice(index, 1)[0];
    var effect = item.effect || {};
    if ((effect.type === 'heal' && quest.party.hp >= quest.party.maxHp) || (effect.type === 'shield' && quest.party.shield >= 8) || (effect.type === 'clue' && quest.phase !== 'battle')) return questError(quest, 'item_no_effect');
    var party = Object.assign({}, quest.party);
    var activeEvent = { type: 'item', title: questText(quest, 'item_used_title', { item: item.name }), description: item.description, publishedAt: Date.now() };
    if (effect.type === 'heal') party.hp = clamp(party.hp + clamp(effect.amount, 1, 3), 0, party.maxHp);
    if (effect.type === 'shield') party.shield = clamp((party.shield || 0) + clamp(effect.amount, 1, 3), 0, 8);
    if (effect.type === 'clue') {
      var room = getRoom(quest, quest.currentRoomId);
      activeEvent.description = (room && room.challenge && room.challenge.explanation) || questText(quest, 'clue_evidence');
    }
    var phase = recoveredPhase(quest, party);
    return { quest: Object.assign({}, quest, {
      inventory: inventory,
      party: party,
      phase: phase,
      turn: quest.turn + (phase !== quest.phase ? 1 : 0),
      gmUndo: gmSnapshot(quest),
      gmHistory: gmHistoryWithCurrent(quest),
      activeEvent: activeEvent,
      log: (quest.log || []).concat([{ id: 'log-' + Date.now() + '-' + (++logSequence), turn: quest.turn, text: questText(quest, 'log_item_used', { item: item.name }) }]).slice(-30)
    }), item: item };
  }

  function normalizeGmDraft(input, strings) {
    input = input || {};
    var allowedTypes = ['narrative', 'item', 'challenge', 'enemy'];
    var type = allowedTypes.indexOf(input.type) >= 0 ? input.type : 'narrative';
    var draft = {
      type: type,
      title: cleanText(input.title, textFromStrings(strings, 'gm_default_title'), 100),
      description: cleanText(input.description, textFromStrings(strings, 'gm_default_description'), 600)
    };
    if (type === 'item') {
      var effectTypes = ['heal', 'shield', 'clue'];
      var effect = input.item && input.item.effect || {};
      draft.item = {
        id: cleanText(input.item && input.item.id, 'gm-item-' + Date.now(), 80).replace(/[^a-zA-Z0-9_-]/g, '-'),
        name: cleanText(input.item && input.item.name, draft.title, 80),
        emoji: cleanText(input.item && input.item.emoji, '\uD83C\uDF81', 8),
        description: cleanText(input.item && input.item.description, draft.description, 240),
        effect: { type: effectTypes.indexOf(effect.type) >= 0 ? effect.type : 'shield', amount: clamp(effect.amount, 1, 3) }
      };
    }
    if (type === 'challenge') draft.challenge = normalizeQuestion(Object.assign({}, input.challenge || input, { type: 'mcq', itemType: 'mcq' }), 99, strings);
    if (type === 'enemy') {
      draft.enemy = {
        id: 'gm-enemy-' + Date.now(),
        name: cleanText(input.enemy && input.enemy.name, draft.title, 80),
        emoji: cleanText(input.enemy && input.enemy.emoji, '\uD83D\uDC7E', 8),
        hp: clamp(input.enemy && input.enemy.hp, 4, 16),
        maxHp: clamp(input.enemy && (input.enemy.maxHp || input.enemy.hp), 4, 16),
        attack: clamp(input.enemy && input.enemy.attack, 1, 3)
      };
      draft.enemy.maxHp = Math.max(draft.enemy.hp, draft.enemy.maxHp);
      draft.challenge = normalizeQuestion(Object.assign({}, input.challenge || input, { type: 'mcq', itemType: 'mcq' }), 99, strings);
    }
    return draft;
  }

  function publishGmDraft(quest, rawDraft) {
    var draft = normalizeGmDraft(rawDraft, quest && quest.localizedStrings);
    var party = Object.assign({}, quest.party);
    var inventory = (quest.inventory || []).slice();
    var rooms = quest.rooms.slice();
    var phase = quest.phase;
    if (draft.type === 'item') {
      if (inventory.length >= 12) throw new Error(questText(quest, 'inventory_full'));
      inventory.push(draft.item);
      inventory = inventory.slice(-12);
      // Publishing awards the item. Its effect applies once, when the party uses it.
    } else if (draft.type === 'challenge') {
      rooms = rooms.map(function(room) {
        if (room.id !== quest.currentRoomId) return room;
        var gate = room.enemy && room.enemy.hp > 0 ? room.enemy : {
          id: 'gm-challenge-' + Date.now(), name: questText(quest, 'challenge_gate'), emoji: '\uD83E\uDDE9', hp: 4, maxHp: 4, attack: 1
        };
        return Object.assign({}, room, { challenge: draft.challenge, challenges: [draft.challenge], challengeIndex: 0, enemy: gate });
      });
      phase = 'battle';
    } else if (draft.type === 'enemy') {
      rooms = rooms.map(function(room) { return room.id === quest.currentRoomId ? Object.assign({}, room, { enemy: draft.enemy, challenge: draft.challenge, challenges: [draft.challenge], challengeIndex: 0 }) : room; });
      phase = 'battle';
    }
    return Object.assign({}, quest, {
      rooms: rooms,
      party: party,
      inventory: inventory,
      phase: party.hp <= 0 ? 'defeat' : phase,
      turn: quest.turn + (draft.type === 'challenge' || draft.type === 'enemy' ? 1 : 0),
      gmUndo: gmSnapshot(quest),
      gmHistory: gmHistoryWithCurrent(quest),
      activeEvent: { type: draft.type, title: draft.title, description: draft.description, publishedAt: Date.now() },
      log: (quest.log || []).concat([{ id: 'log-' + Date.now() + '-' + (++logSequence), turn: quest.turn, text: questText(quest, 'log_gm', { title: draft.title, description: draft.description }) }]).slice(-30)
    });
  }

  function undoLastGmChange(quest) {
    var history = quest && Array.isArray(quest.gmHistory) ? quest.gmHistory.slice() : [];
    var snapshot = history.length ? history.pop() : (quest && quest.gmUndo);
    if (!snapshot || snapshot.currentRoomId !== quest.currentRoomId || snapshot.roundCount !== (quest.roundHistory || []).length) return questError(quest, 'gm_undo_unavailable');
    if (snapshot.learningRoundCount != null && snapshot.learningRoundCount !== learningTotals(quest).rounds) return questError(quest, 'gm_undo_unavailable');
    var restoredLog = (quest.log || []).slice(0, Math.max(0, snapshot.logLength || 0));
    restoredLog.push({ id: 'log-' + Date.now() + '-' + (++logSequence), turn: quest.turn, text: questText(quest, 'log_gm_undo') });
    return { quest: Object.assign({}, quest, {
      rooms: snapshot.rooms,
      turn: quest.turn + 1,
      party: snapshot.party,
      inventory: snapshot.inventory,
      phase: snapshot.phase,
      activeEvent: snapshot.activeEvent,
      gmHistory: history,
      gmUndo: history.length ? history[history.length - 1] : null,
      log: restoredLog.slice(-30)
    }) };
  }

  function adjustEncounter(quest, kind, amount) {
    if (!quest || ['heal', 'shield', 'enemy'].indexOf(kind) < 0) return questError(quest, 'pacing_invalid');
    amount = clamp(amount, -6, 6);
    var party = Object.assign({}, quest.party);
    var rooms = quest.rooms.slice();
    var phase = quest.phase;
    if (kind === 'heal') party.hp = clamp(party.hp + amount, 0, party.maxHp);
    if (kind === 'shield') party.shield = clamp((party.shield || 0) + amount, 0, 8);
    if (kind === 'enemy') {
      var currentRoom = getRoom(quest, quest.currentRoomId);
      if (!currentRoom || !currentRoom.enemy || currentRoom.enemy.hp <= 0 || quest.phase !== 'battle') return questError(quest, 'pacing_no_encounter');
      var nextEnemyHp = clamp(currentRoom.enemy.hp + amount, 1, currentRoom.enemy.maxHp);
      rooms = rooms.map(function(room) {
        return room.id === currentRoom.id ? Object.assign({}, room, { enemy: Object.assign({}, room.enemy, { hp: nextEnemyHp }) }) : room;
      });
    }
    phase = recoveredPhase(quest, party);
    var signedAmount = amount > 0 ? '+' + amount : String(amount);
    return { quest: Object.assign({}, quest, {
      party: party,
      rooms: rooms,
      phase: phase,
      turn: quest.turn + (phase !== quest.phase ? 1 : 0),
      gmUndo: gmSnapshot(quest),
      gmHistory: gmHistoryWithCurrent(quest),
      log: (quest.log || []).concat([{ id: 'log-' + Date.now() + '-' + (++logSequence), turn: quest.turn, text: questText(quest, 'log_pacing', { kind: kind, amount: signedAmount }) }]).slice(-30)
    }) };
  }

  function dismissEvent(quest) {
    return Object.assign({}, quest, { activeEvent: null });
  }

  function createDebrief(quest) {
    var rounds = quest && Array.isArray(quest.roundHistory) ? quest.roundHistory : [];
    var totals = learningTotals(quest);
    var totalAnswers = totals.totalAnswers, correctAnswers = totals.correctAnswers, conceptTotals = totals.concepts;
    var conceptBreakdown = Object.keys(conceptTotals).map(function(key) {
      var entry = conceptTotals[key];
      return Object.assign({}, entry, { accuracy: entry.total ? Math.round((entry.correct / entry.total) * 100) : 0 });
    }).sort(function(a, b) { return a.accuracy - b.accuracy || a.concept.localeCompare(b.concept); });
    return {
      outcome: quest && quest.phase === 'complete' ? 'victory' : (quest && quest.phase === 'defeat' ? 'regroup' : 'in-progress'),
      coverage: coverage(quest),
      rounds: totals.rounds,
      recentRoundCount: rounds.length,
      completeHistory: totals.completeHistory,
      summaryScope: totals.completeHistory ? 'whole-session' : 'available-history',
      totalAnswers: totalAnswers,
      correctAnswers: correctAnswers,
      accuracy: totalAnswers ? Math.round((correctAnswers / totalAnswers) * 100) : 0,
      combos: totals.combos,
      roleSynergies: totals.roleSynergies,
      peerAssists: totals.peerAssists,
      puzzlesSolved: totals.puzzlesSolved,
      sigils: (quest && quest.sigils || []).slice(),
      conceptsCleared: totals.conceptsCleared,
      conceptBreakdown: conceptBreakdown,
      needsReview: conceptBreakdown.length && conceptBreakdown[0].accuracy < 70 ? conceptBreakdown[0] : null,
      strongestConcept: conceptBreakdown.length ? conceptBreakdown[conceptBreakdown.length - 1] : null,
      learnerEvidence: Object.keys(totals.learners || {}).map(function(uid) { var row = Object.assign({}, totals.learners[uid]); delete row.seen; return row; }),
      learnerHistoryComplete: totals.learnerHistoryComplete === true
    };
  }

  return {
    VERSION: VERSION,
    ABILITIES: ABILITIES,
    ROLES: ROLES,
    SUPPORTS: SUPPORTS,
    createSession: function(options) { return sealQuest(createSession(options)); },
    getTurnKey: getTurnKey,
    currentActions: currentActions,
    currentVotes: currentVotes,
    requiredSigils: requiredSigils,
    questionAnswerIndex: questionAnswerIndex,
    isAnswerKeyDisputed: isAnswerKeyDisputed,
    getRoom: getRoom,
    tallyVotes: tallyVotes,
    resolveTravel: function() { return sealResult(resolveTravel.apply(null, arguments)); },
    resolveBattle: function() { return sealResult(resolveBattle.apply(null, arguments)); },
    useItem: function() { return sealResult(useItem.apply(null, arguments)); },
    normalizeGmDraft: normalizeGmDraft,
    publishGmDraft: function(quest, draft) { return sealQuest(publishGmDraft(quest, draft)); },
    undoLastGmChange: function() { return sealResult(undoLastGmChange.apply(null, arguments)); },
    adjustEncounter: function() { return sealResult(adjustEncounter.apply(null, arguments)); },
    dismissEvent: dismissEvent,
    createDebrief: createDebrief,
    coverage: coverage
  };
});
