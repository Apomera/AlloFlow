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
      icon: '📝',
      generation: {
        promptFrame: 'Create a short "Exit Ticket" quiz that checks whether students learned today\'s content.',
        questionTargets: 'today\'s lesson content (the source text just taught)',
        defaultItemCount: 5,
        // 'mcq' is the existing primary type. Reflection ships separately on the same artifact.
        // Slice 2 leaves exit-ticket as MCQ-only by default to preserve existing UX.
        allowedItemTypes: ['mcq'],
        defaultItemTypeMix: { mcq: 5 },
      },
      render: {
        intro: '',  // No intro banner for exit-ticket — preserves the existing UX.
        completionMessage: 'Exit ticket complete. Review your results below.',
        aiExplainerOnFail: false,
        allowIDontKnow: false,
        allowConfidenceRating: false,
      },
      aggregation: 'gradebook',
    },
    'pre-check': {
      key: 'pre-check',
      label: 'Pre-Check (Readiness Check)',
      icon: '🎯',
      generation: {
        promptFrame: 'Create a short "Readiness Check" that probes whether students have the PRIOR knowledge this lesson assumes — NOT the lesson\'s new content. For each key concept the lesson teaches, identify ONE prerequisite the student should already know, and write a probe for that prerequisite.',
        questionTargets: 'PREREQUISITE knowledge (what students should already know before today\'s lesson can land), not today\'s new content',
        defaultItemCount: 4,
        // Pre-check benefits from a mix: MCQ for confidence, fill-blank for vocab recall, short-answer for reasoning
        allowedItemTypes: ['mcq', 'fill-blank', 'short-answer'],
        defaultItemTypeMix: { mcq: 2, 'fill-blank': 1, 'short-answer': 1 },
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
      icon: '🌡️',
      generation: {
        promptFrame: 'Create a VERY short formative check (1-3 items) for use mid-instruction. Items should probe whether students are following the in-progress lesson — surface common misconceptions if possible.',
        questionTargets: 'in-progress understanding (mid-lesson pulse check)',
        defaultItemCount: 2,
        // Formative defaults to fast-to-answer types (MCQ + fill-blank). Short-answer is too slow for mid-lesson use.
        allowedItemTypes: ['mcq', 'fill-blank'],
        defaultItemTypeMix: { mcq: 2 },
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
    'review': {
      key: 'review',
      label: 'Spaced Review',
      icon: '🔁',
      generation: {
        promptFrame: 'Create a "Spaced Review" quiz that probes retention of PREVIOUSLY taught content (concepts from earlier lessons in the history, not today\'s source). If history concepts are not provided, target concepts from the source that would benefit from re-exposure.',
        questionTargets: 'previously-taught content (retention check, not new learning)',
        defaultItemCount: 6,
        // Review benefits from active recall — fill-blank, short-answer, and self-explanation
        // all force retrieval, far more effective for retention than MCQ recognition.
        allowedItemTypes: ['mcq', 'fill-blank', 'short-answer', 'self-explanation'],
        defaultItemTypeMix: { mcq: 2, 'fill-blank': 1, 'short-answer': 1, 'self-explanation': 2 },
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

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.QuizModeStrategies = {
    STRATEGIES: STRATEGIES,
    getStrategy: getStrategy,
    listModes: listModes,
  };
  console.log('[CDN] QuizModeStrategies loaded (4 modes: exit-ticket, pre-check, formative, review)');
})();
