/**
 * AlloFlow Quiz Mode Strategies
 *
 * Plan S: Quiz becomes a multi-modal assessment primitive. This module
 * defines the four modes as strategy objects so the dispatcher (generation
 * side) and the view (render side) can read shared per-mode defaults
 * without each side hard-coding mode-specific behavior.
 *
 * Each strategy object describes:
 *   - generation.promptFrame: how to introduce the quiz to the LLM
 *   - generation.questionTargets: what the items should test
 *   - generation.defaultItemCount: typical item count for this mode
 *   - render.intro: copy shown to the student before they start
 *   - render.completionMessage: copy shown after they finish
 *   - render.aiExplainerOnFail: whether to surface the "Explain this" button
 *   - render.allowIDontKnow: whether "I don't know" counts as a non-penalized answer
 *   - render.allowConfidenceRating: whether per-item confidence is collected
 *   - aggregation: how this mode's results should aggregate (informs v2 dashboards)
 *
 * Module export: window.AlloModules.QuizModeStrategies (plain object).
 */
(function () {
  'use strict';

  if (window.AlloModules && window.AlloModules.QuizModeStrategies) {
    console.log('[CDN] QuizModeStrategies already loaded, skipping');
    return;
  }

  var STRATEGIES = {
    'exit-ticket': {
      key: 'exit-ticket',
      label: 'Exit Ticket',
      description: 'Check what students learned from today\'s lesson.',
      icon: '📝',
      generation: {
        promptFrame: 'Create a short "Exit Ticket" quiz that checks whether students learned today\'s content.',
        questionTargets: 'today\'s lesson content (the source text just taught)',
        defaultItemCount: 5,
        defaultReflectionCount: 1,
        // Plan S Slice 4: exit-ticket upgraded to use the full item-type vocabulary
        // (per Aaron's feedback that conservative back-compat wasn't load-bearing).
        // Default mix is mostly MCQ + reflections (familiar shape) with a fill-blank
        // and short-answer to broaden assessment beyond recognition. Sequencing /
        // matching available as opt-in.
        allowedItemTypes: ['mcq', 'multi-select', 'fill-blank', 'short-answer', 'self-explanation', 'sequence-sense', 'relation-mismatch', 'answer-evidence', 'numeric-response'],
        defaultItemTypeMix: { mcq: 3, 'fill-blank': 1, 'short-answer': 1 },
      },
      render: {
        intro: '',  // No intro banner — exit-ticket is the familiar default UX.
        completionMessage: 'Exit ticket complete. Review your results below.',
        // Slice 4: exit-ticket now gets the new pedagogical features too.
        aiExplainerOnFail: true,
        allowIDontKnow: true,
        allowConfidenceRating: true,
      },
      aggregation: 'gradebook',
    },
    'pre-check': {
      key: 'pre-check',
      label: 'Pre-Check (Readiness Check)',
      description: 'Find prerequisite gaps before teaching the new lesson.',
      icon: '🎯',
      generation: {
        promptFrame: 'Create a short "Readiness Check" that probes whether students have the PRIOR knowledge this lesson assumes — NOT the lesson\'s new content. For each key concept the lesson teaches, identify ONE prerequisite the student should already know, and write a probe for that prerequisite.',
        questionTargets: 'PREREQUISITE knowledge (what students should already know before today\'s lesson can land), not today\'s new content',
        defaultItemCount: 5,
        defaultReflectionCount: 0,
        // Pre-check benefits from a mix that surfaces different prerequisite types: MCQ
        // for general recognition, fill-blank for vocab recall, short-answer for reasoning,
        // matching for "do you know X is connected to Y" relational knowledge.
        allowedItemTypes: ['mcq', 'multi-select', 'fill-blank', 'short-answer', 'self-explanation', 'sequence-sense', 'relation-mismatch', 'answer-evidence', 'numeric-response'],
        defaultItemTypeMix: { mcq: 2, 'multi-select': 1, 'fill-blank': 1, 'relation-mismatch': 1 },
      },
      render: {
        intro: 'Let\'s see what you already know. This isn\'t a test — it just helps us know what to review before today\'s lesson.',
        completionMessage: 'Thanks! Review any concepts marked "Needs review" before the lesson — explanations are available below.',
        aiExplainerOnFail: true,    // Killer feature: just-in-time AI mini-lesson on missed prereqs
        allowIDontKnow: true,
        allowConfidenceRating: true,
      },
      aggregation: 'pre-lesson-dashboard',
    },
    'formative': {
      key: 'formative',
      label: 'Formative Check',
      description: 'Take a quick pulse on understanding during instruction.',
      icon: '🌡️',
      generation: {
        promptFrame: 'Create a VERY short formative check (1-3 items) for use mid-instruction. Items should probe whether students are following the in-progress lesson — surface common misconceptions if possible.',
        questionTargets: 'in-progress understanding (mid-lesson pulse check)',
        defaultItemCount: 2,
        defaultReflectionCount: 0,
        // Formative defaults to fast-to-answer MCQs, while customization can intentionally broaden the format.
        allowedItemTypes: ['mcq', 'multi-select', 'fill-blank', 'short-answer', 'self-explanation', 'sequence-sense', 'relation-mismatch', 'answer-evidence', 'numeric-response'],
        defaultItemTypeMix: { mcq: 1, 'multi-select': 1 },
      },
      render: {
        intro: 'Quick check — how\'s it going?',
        completionMessage: 'Thanks for the pulse check. Your teacher will use this to adjust pacing.',
        aiExplainerOnFail: false,   // Teacher-side intervention, not student-side remediation
        allowIDontKnow: true,
        allowConfidenceRating: true,
      },
      aggregation: 'live-heatmap',
    },
    'poll': {
      key: 'poll',
      label: 'Poll (student voice)',
      description: 'Collect student preference, confidence, or self-report with no right answer.',
      icon: '🗣️',
      generation: {
        promptFrame: 'Create a short student-voice POLL — NOT a quiz. Items have NO correct answer. Use Likert (rate 1-5 on a scale the student writes about) or opinion-MCQ (pick which framing fits, with no "right" choice). Items should surface PREFERENCE / SELF-REPORT / CONFIDENCE, not knowledge. Prompts should be neutrally worded — do NOT imply the student should pick a particular answer.',
        questionTargets: 'student self-report — preference, confidence, feeling about the lesson, prior comfort with a topic. NOT new content recall, NOT prerequisite knowledge, NOT misconceptions.',
        defaultItemCount: 4,
        defaultReflectionCount: 0,
        allowedItemTypes: ['likert', 'opinion-mcq'],
        defaultItemTypeMix: { 'likert': 3, 'opinion-mcq': 1 },
      },
      render: {
        intro: 'There are no right or wrong answers here — your honest take helps your teacher and helps you.',
        completionMessage: 'Thanks for sharing your take. Some resources may now look different based on what you said.',
        // Polls are non-evaluative by definition. Aiding "explanations on fail"
        // would imply there was a wrong answer, which there isn't.
        aiExplainerOnFail: false,
        // No "I don't know" affordance — the student CHOOSES; choosing nothing
        // is its own data point (an opt-out) handled at the response layer.
        allowIDontKnow: false,
        // Confidence rating is the data — having a SECOND confidence layer over
        // a self-report would be measurement-validity nonsense.
        allowConfidenceRating: false,
      },
      // Aggregation is multi-item by design (per Aaron's measurement-integrity
      // discipline: single-tick Likert routing is structurally refused at the
      // rule editor; routing requires when.aggregate + acrossQuestions.length>=2).
      aggregation: 'self-report-distribution',
    },
    'review': {
      key: 'review',
      label: 'Spaced Review',
      description: 'Revisit earlier learning and look for retention over time.',
      icon: '🔁',
      generation: {
        promptFrame: 'Create a "Spaced Review" quiz that probes retention of PREVIOUSLY taught content (concepts from earlier lessons in the history, not today\'s source). If history concepts are not provided, target concepts from the source that would benefit from re-exposure.',
        questionTargets: 'previously-taught content (retention check, not new learning)',
        defaultItemCount: 7,
        defaultReflectionCount: 0,
        // Review benefits from active recall — fill-blank, short-answer, self-explanation,
        // sequencing, and matching all force retrieval, far more effective for retention than
        // MCQ recognition. Adding 1 sequencing item by default surfaces process / chronological
        // / cause-effect retention.
        allowedItemTypes: ['mcq', 'multi-select', 'fill-blank', 'short-answer', 'self-explanation', 'sequence-sense', 'relation-mismatch', 'answer-evidence', 'numeric-response'],
        defaultItemTypeMix: { mcq: 2, 'fill-blank': 1, 'short-answer': 1, 'self-explanation': 2, 'sequence-sense': 1 },
      },
      render: {
        intro: 'Reviewing what we\'ve learned. Missed items get a quick re-explanation so they stick this time.',
        completionMessage: 'Review complete. Items you missed have explanations available — read them once more to lock the concept in.',
        aiExplainerOnFail: true,    // Re-teach via AI
        allowIDontKnow: true,
        allowConfidenceRating: true,
      },
      aggregation: 'retention-curve',
    },
  };

  // Helper: safe lookup with back-compat fallback to exit-ticket.
  function getStrategy(modeKey) {
    if (modeKey && STRATEGIES[modeKey]) return STRATEGIES[modeKey];
    return STRATEGIES['exit-ticket'];
  }

  function listModes() {
    return Object.keys(STRATEGIES).map(function (k) {
      var s = STRATEGIES[k];
      return { key: k, label: s.label, icon: s.icon };
    });
  }

  // Shared, deterministic authoring contracts. The panel and generator use the
  // same recipes and coverage rules so a short check never silently expands.
  function durationRecipe(mode, duration) {
    if (duration === 'two') return { itemTypes: { mcq: 1, 'fill-blank': 1 }, reflectionCount: 0 };
    if (duration === 'five') return { itemTypes: { mcq: 1, 'short-answer': 1 }, reflectionCount: 0 };
    if (duration === 'reasoning') return { itemTypes: { 'answer-evidence': 1, 'self-explanation': 1 }, reflectionCount: 0 };
    var generation = getStrategy(mode).generation;
    return { itemTypes: Object.assign({}, generation.defaultItemTypeMix), reflectionCount: generation.defaultReflectionCount || 0 };
  }

  function normalizeAssessmentOptions(value) {
    var source = value && typeof value === 'object' ? value : {};
    var numeric = source.numericSettings && typeof source.numericSettings === 'object' ? source.numericSettings : {};
    var weight = Number(numeric.valueWeight);
    return {
      fillBlankPolicy: ['normalized', 'exact', 'review-variants'].indexOf(source.fillBlankPolicy) >= 0 ? source.fillBlankPolicy : 'normalized',
      sequenceMode: source.sequenceMode === 'arrange-explain' ? 'arrange-explain' : 'diagnostic',
      sequenceMaxSteps: Number(source.sequenceMaxSteps) === 3 ? 3 : 6,
      numericSettings: { allowEquivalentUnits: numeric.allowEquivalentUnits === true, valueWeight: Number.isFinite(weight) ? Math.max(0, Math.min(1, weight)) : 0.5 },
      requireReasoning: source.requireReasoning === true
    };
  }

  function reviewSources(history) {
    return (Array.isArray(history) ? history : []).filter(function (item) {
      return item && item.id && item.type === 'analysis' && item.data && typeof item.data.originalText === 'string' && item.data.originalText.trim();
    }).map(function (item) {
      return {
        id: String(item.id), title: String(item.title || item.data.title || 'Analyzed lesson').slice(0, 160),
        date: String(item.createdAt || item.timestamp || item.date || '').slice(0, 80),
        text: item.data.originalText,
        concepts: Array.from(new Set((Array.isArray(item.data.concepts) ? item.data.concepts : []).filter(function (value) { return typeof value === 'string' && value.trim(); }).map(function (value) { return value.trim().slice(0, 160); }))).slice(0, 30)
      };
    }).reverse().filter(function (item, index, all) { return all.findIndex(function (other) { return other.id === item.id; }) === index; }).slice(0, 40);
  }

  function resolveReviewContext(history, ids, concepts) {
    var selectedIds = Array.isArray(ids) ? ids.map(String).slice(0, 4) : [];
    var sources = reviewSources(history).filter(function (source) { return selectedIds.indexOf(source.id) >= 0; });
    var available = Array.from(new Set(sources.reduce(function (all, source) { return all.concat(source.concepts); }, [])));
    var selected = Array.isArray(concepts) ? concepts.filter(function (concept) { return available.indexOf(concept) >= 0; }) : available;
    return { sourceIds: sources.map(function (source) { return source.id; }), sources: sources, concepts: Array.from(new Set(selected)).slice(0, 30), fallback: sources.length === 0 };
  }

  function resolveCriteriaCoverage(criteria, selectedIds, count, questions) {
    var available = (Array.isArray(criteria) ? criteria : []).filter(function (criterion) { return criterion && criterion.id && (criterion.statement || criterion.text); }).map(function (criterion) {
      return { id: String(criterion.id).slice(0, 160), statement: String(criterion.statement || criterion.text).slice(0, 600) };
    }).filter(function (criterion, index, all) { return all.findIndex(function (other) { return other.id === criterion.id; }) === index; }).slice(0, 20);
    var limit = Math.max(0, Math.floor(Number(count) || 0));
    var selected = (Array.isArray(selectedIds) ? available.filter(function (criterion) { return selectedIds.indexOf(criterion.id) >= 0; }) : available).slice(0, limit).map(function (criterion) { return criterion.id; });
    var covered = selected.filter(function (id) { return (Array.isArray(questions) ? questions : []).some(function (q) { return q && (q.criterionId === id || q.conceptLabel === id); }); });
    return { available: available, selectedIds: selected, coveredIds: covered, uncoveredIds: available.filter(function (criterion) { return covered.indexOf(criterion.id) < 0; }).map(function (criterion) { return criterion.id; }) };
  }

  function contentReviewSignature(question) {
    var q = question || {}, shape = {};
    ['type', 'question', 'options', 'optionFeedback', 'correctAnswer', 'correctAnswers', 'expectedFill', 'acceptableAlternatives', 'expectedAnswer', 'rubric', 'studentCriteria', 'items', 'presentedOrder', 'orderingPrinciple', 'pairs', 'wrongPairIndex', 'correctPartnerForWrong', 'candidatePartners', 'answerOptions', 'evidenceOptions', 'correctEvidence', 'correctValue', 'unit', 'acceptableUnits', 'tolerance', 'numericSettings', 'sourceEvidence', 'transferPrompt', 'transferCriteria'].forEach(function (key) { if (q[key] !== undefined) shape[key] = q[key]; });
    var value = JSON.stringify(shape), hash = 2166136261;
    for (var i = 0; i < value.length; i++) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return 'content-' + (hash >>> 0).toString(16);
  }

  function normalizeContentReview(raw, questions, sourceText, offset) {
    var rows = raw && Array.isArray(raw.items) ? raw.items : [];
    var source = String(sourceText || '').replace(/\s+/g, ' ').trim();
    return (Array.isArray(questions) ? questions : []).map(function (q, index) {
      var questionIdx = (offset || 0) + index;
      var matches = rows.filter(function (row) { return row && row.questionIdx === questionIdx; });
      var row = matches.length === 1 ? matches[0] : null;
      var quote = row && typeof row.evidenceQuote === 'string' ? row.evidenceQuote.replace(/\s+/g, ' ').trim().slice(0, 600) : '';
      var quoted = quote.length >= 8 && source.indexOf(quote) >= 0;
      var status = row && ['supported', 'review', 'unclear'].indexOf(row.status) >= 0 ? row.status : 'unclear';
      if (status === 'supported' && !quoted) status = 'unclear';
      return { questionIdx: questionIdx, itemSignature: contentReviewSignature(q), status: status,
        reason: row && typeof row.reason === 'string' ? row.reason.slice(0, 600) : 'Content review did not return an item result. Teacher review is needed.',
        evidenceQuote: quoted ? quote : '' };
    });
  }

  function localContentReview(questions, sourceText) {
    var source = String(sourceText || '').replace(/\s+/g, ' ').trim();
    var checklists = {
      mcq: ['Confirm there is exactly one defensible answer.', 'Check each option explanation and misconception against the lesson.'],
      'multi-select': ['Check every option independently; more than one answer must be correct.', 'Confirm the partial-credit policy matches the task.'],
      'fill-blank': ['Check the expected fill and acceptable variants in context.', 'Confirm whether spelling is part of the intended learning target.'],
      'short-answer': ['Check the reference answer for factual accuracy.', 'Confirm visible criteria describe quality without revealing the answer.'],
      'self-explanation': ['Check that the rubric rewards reasoning and relevant evidence.', 'Confirm visible criteria do not reveal the teacher answer guide.'],
      'sequence-sense': ['Confirm the intended order is necessary and unambiguous.', 'Check that the ordering principle fits the sequence.'],
      'relation-mismatch': ['Confirm exactly one displayed relationship needs repair.', 'Verify the repair and each distractor.'],
      'answer-evidence': ['Confirm the selected evidence genuinely supports the answer.', 'Check that other answer/evidence combinations are not also defensible.'],
      'numeric-response': ['Recalculate the answer independently.', 'Check tolerance, units, conversion policy, and value/unit credit.']
    };
    return { status: 'teacher-review-required', method: 'local-checks', provisional: true, sourceExcerptLimited: false,
      items: (Array.isArray(questions) ? questions : []).map(function (q, index) {
        var type = q && q.type || 'mcq';
        var quote = q && typeof q.sourceEvidence === 'string' ? q.sourceEvidence.replace(/\s+/g, ' ').trim().slice(0, 600) : '';
        var matches = quote.length >= 8 && source.indexOf(quote) >= 0;
        return { questionIdx: index, itemSignature: contentReviewSignature(q), status: matches ? 'review' : 'unclear',
          reason: matches ? 'The quotation occurs in the source. A teacher must still verify that it supports the answer and instructional target.' : 'No matching source quotation was provided. Check the answer and its source support before using this item.',
          evidenceQuote: matches ? quote : '', checklist: (checklists[type] || ['Review the prompt, answer key, and instructional fit.']).slice() };
      }) };
  }

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.QuizModeStrategies = {
    STRATEGIES: STRATEGIES,
    getStrategy: getStrategy,
    listModes: listModes,
    durationRecipe: durationRecipe,
    normalizeAssessmentOptions: normalizeAssessmentOptions,
    reviewSources: reviewSources,
    resolveReviewContext: resolveReviewContext,
    resolveCriteriaCoverage: resolveCriteriaCoverage,
    contentReviewSignature: contentReviewSignature,
    normalizeContentReview: normalizeContentReview,
    localContentReview: localContentReview,
  };
  console.log('[CDN] QuizModeStrategies loaded (5 modes: exit-ticket, pre-check, formative, review, poll)');
})();
