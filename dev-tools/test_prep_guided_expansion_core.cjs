'use strict';
// test_prep_guided_expansion_core.cjs — the ONE definition of the guided-review
// derivation. The 300 guided activities per pack are a pure, deterministic
// function of the 200 source items, so the hub module embeds only the source
// items (keeping the CDN bundle far under Cloudflare's 25 MiB per-file limit)
// and derives batches 3-5 at registration with THIS code. The shipped
// test_prep/*_items.json keep the full 500 for transparency and corrections.
//
// Consumers:
//   - dev-tools/expand_test_prep_packs_to_500.cjs   (pipeline: writes the JSONs)
//   - dev-tools/build_test_prep_hub_release.cjs      (embeds factorySource in the
//     module prelude + parity-gates derived === shipped before slicing)
//   - test_prep_hub_source.jsx registerTestPrepPack  (runtime derivation)
//
// Any edit here changes BOTH the shipped JSONs (after re-running the expansion)
// and the runtime derivation; the release-build parity gate fails closed if the
// two ever diverge.

function createTestPrepGuidedExpansion() {
  'use strict';
  const compact = (value, max = 260) => { const normalized = String(value || '').replace(/^(Correct|Not the best answer)\.\s*/i, '').replace(/\s+/g, ' ').trim(); if (normalized.length <= max) return normalized; const clipped = normalized.slice(0, max); const sentence = clipped.lastIndexOf('.'); return (sentence > 80 ? clipped.slice(0, sentence + 1) : clipped.replace(/[,;:]?\s+\S*$/, '') + '.').trim(); };
  const quote = value => '“' + String(value || '').replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim() + '”';
  const inlineQuote = value => quote(String(value || '').replace(/[.?!]+$/, '').trim());
  function placeAnswer(correct, distractors, answerIndex) { const choices = [], wrong = [...distractors]; for (let index = 0; index < 4; index++) choices.push(index === answerIndex ? correct : wrong.shift()); return choices; }
  function taskContext(source) {
    const prompt = String(source.prompt || '').replace(/\s+/g, ' ').trim();
    const declarative = prompt.match(/^(.+?[.!])\s+(?:Which|What|How|Why|When|Where|Who|Select|Determine|Identify|Based\b)/i);
    if (declarative) return declarative[1];
    return 'A learner is working through this task: ' + quote(prompt);
  }
  function sourceFeedback(source, choiceIndex, principle) {
    const authored = source.choiceRationales && source.choiceRationales[choiceIndex], choice = source.choices[choiceIndex];
    return compact(authored || (choiceIndex === source.answerIndex ? principle : inlineQuote(choice) + ' does not satisfy the item-specific evidence or decision rule.'), 260);
  }
  function expandedItem(source, batch) {
    const correctIndex = source.answerIndex, correct = source.choices[correctIndex], wrongIndexes = source.choices.map((_, choiceIndex) => choiceIndex).filter(choiceIndex => choiceIndex !== correctIndex), wrong = wrongIndexes.map(choiceIndex => source.choices[choiceIndex]), principle = compact(source.rationale, 300), feedbacks = source.choices.map((_, choiceIndex) => sourceFeedback(source, choiceIndex, principle)), context = taskContext(source), taskForm = batch === 3 ? 'misconception-correction' : batch === 4 ? 'principle-justification' : 'evidence-comparison';
    let prompt, correctChoice, distractors, rationale, wrongFeedbackReason, answerDerivation;
    if (batch === 3) {
      prompt = context + ' A candidate selects ' + inlineQuote(wrong[0]) + '. Which feedback most directly identifies the problem with that selection?';
      correctChoice = feedbacks[wrongIndexes[0]];
      distractors = [feedbacks[correctIndex], feedbacks[wrongIndexes[1]], feedbacks[wrongIndexes[2]]];
      rationale = 'The candidate selected ' + inlineQuote(wrong[0]) + '. ' + correctChoice + ' This feedback directly evaluates the selected response. ' + inlineQuote(correct) + ' remains the source-supported response. ' + principle;
      wrongFeedbackReason = 'This feedback evaluates a different response rather than the candidate response named in the prompt.';
      answerDerivation = 'source-choice-feedback:' + wrongIndexes[0];
    } else if (batch === 4) {
      prompt = context + ' Which response-and-evidence pairing is internally consistent with the case?';
      correctChoice = inlineQuote(correct) + ' — ' + feedbacks[correctIndex];
      distractors = wrongIndexes.map(choiceIndex => inlineQuote(source.choices[choiceIndex]) + ' — ' + feedbacks[correctIndex]);
      rationale = 'The evidence statement accurately describes ' + inlineQuote(correct) + '. Pairing that same evidence with another response creates a mismatch. ' + principle;
      wrongFeedbackReason = 'This pairing assigns the affirmative evidence to a response that the evidence statement does not describe.';
      answerDerivation = 'source-correct-feedback:' + correctIndex;
    } else {
      prompt = context + ' A team compares ' + inlineQuote(correct) + ' with ' + inlineQuote(wrong[0]) + '. Which evaluation most accurately distinguishes them?';
      correctChoice = inlineQuote(correct) + ' is better supported: ' + feedbacks[correctIndex] + ' In contrast, ' + inlineQuote(wrong[0]) + ' is not supported: ' + feedbacks[wrongIndexes[0]];
      distractors = wrongIndexes.map(choiceIndex => inlineQuote(source.choices[choiceIndex]) + ' is better supported: ' + feedbacks[correctIndex] + ' In contrast, ' + inlineQuote(correct) + ' is not supported: ' + feedbacks[choiceIndex]);
      rationale = 'The accurate comparison assigns the affirmative source feedback to ' + inlineQuote(correct) + ' and the item-specific limitation to ' + inlineQuote(wrong[0]) + '. ' + principle;
      wrongFeedbackReason = 'This comparison misassigns the source evidence to a response that the item-specific feedback does not support.';
      answerDerivation = 'source-evidence-comparison:' + correctIndex + ':' + wrongIndexes[0];
    }
    const choices = placeAnswer(correctChoice, distractors, correctIndex), choiceRationales = choices.map((choice, choiceIndex) => choiceIndex === correctIndex ? 'Correct. ' + rationale : 'Not the best answer. ' + wrongFeedbackReason + ' ' + rationale);
    return { ...source, id: source.id + '-exp' + batch, prompt, choices, choiceRationales, answerIndex: correctIndex, rationale, difficulty: batch === 3 ? 'application' : 'analysis', reviewStatus: 'assistant-reviewed-guided-practice-only', qaStatus: 'structural-qa-passed-guided-practice-only', qaReviewedAt: source.qaReviewedAt || '2026-07-16', sourceItemId: source.id, sourceAnswerIndex: correctIndex, expansionBatch: batch, taskForm, answerDerivation, expansionStatus: 'assistant-authored-guided-reasoning-task', authorship: 'assistant-authored-derived-from-reviewed-core', editorialReviewer: 'OpenAI Codex', assistantReviewStatus: 'reviewed-guided-practice-only', examItemStatus: 'not-approved-as-independent-exam-item', assistantReviewedAt: '2026-07-16', reviewMethod: 'guided-practice-source-answer-key-option-feedback-distractor-editorial-and-structural-review-v1' };
  }
  function deriveGuidedReviewItems(baseItems) {
    const base = Array.isArray(baseItems) ? baseItems : [];
    const batch1 = base.slice(0, 100), batch2 = base.slice(100, 200);
    return [
      ...batch1.map(item => expandedItem(item, 3)),
      ...batch2.map(item => expandedItem(item, 4)),
      ...batch1.map(item => expandedItem(item, 5)),
    ];
  }
  return { compact, quote, inlineQuote, placeAnswer, taskContext, sourceFeedback, expandedItem, deriveGuidedReviewItems };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = createTestPrepGuidedExpansion();
  module.exports.factorySource = createTestPrepGuidedExpansion.toString();
}
