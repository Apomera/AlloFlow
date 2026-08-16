'use strict';

// Single source of truth for guided-review derivation and answer-choice clue
// resistance. This file is embedded into the browser release by its factory
// source, so keep the factory self-contained and deterministic.

function createTestPrepGuidedExpansion() {
  'use strict';
  const compact = (value, max = 260) => {
    const normalized = String(value || '')
      .replace(/^(Correct|Not the best answer)\.\s*/i, '')
      .replace(/\s+/g, ' ').trim();
    if (normalized.length <= max) return normalized;
    const clipped = normalized.slice(0, max);
    const sentence = clipped.lastIndexOf('.');
    return (sentence > 80 ? clipped.slice(0, sentence + 1)
      : clipped.replace(/[,;:]?\s+\S*$/, '') + '.').trim();
  };
  // Only strip marks that would break the surrounding double quotes. An
  // apostrophe between two letters (child's, don't) or closing a plural
  // possessive (students') is prose, not a quotation mark. Removing it wrote
  // "young childs" into 104 learner-visible rationales in 5692 alone, and the
  // same damage to every other possessive across all 22 packs.
  const quoteMarkOnly = value => String(value || '')
    .replace(/["“”]/g, '')
    .replace(/['‘’]/gu, (mark, offset, text) => {
      const before = text[offset - 1] || '';
      const after = text[offset + 1] || '';
      const isLetter = /\p{L}/u;
      // Return `mark` unchanged, never a normalized substitute: the quoted span
      // must stay byte-identical to the source prose it was taken from, or
      // containment checks against that source stop matching.
      if (isLetter.test(before) && isLetter.test(after)) return mark;
      if (/s/i.test(before) && !isLetter.test(after)) return mark;
      return '';
    });
  const quote = value => '"' + quoteMarkOnly(value).replace(/\s+/g, ' ').trim() + '"';
  const inlineQuote = value => quote(String(value || '').replace(/[.?!]+$/, '').trim());
  function placeAnswer(correct, distractors, answerIndex) {
    const choices = [], wrong = [...distractors];
    for (let index = 0; index < 4; index += 1) choices.push(index === answerIndex ? correct : wrong.shift());
    return choices;
  }

  const clueStopwords = new Set([
    'about', 'among', 'because', 'being', 'between', 'could', 'each', 'from',
    'have', 'into', 'more', 'most', 'other', 'should', 'than', 'that', 'their',
    'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'under',
    'until', 'what', 'when', 'where', 'which', 'while', 'with', 'within', 'would',
  ]);
  const clueCanonical = value => String(value == null ? '' : value).normalize('NFKC').toLowerCase()
    .replace(/["']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const clueTokens = value => new Set(clueCanonical(value).split(' ')
    .filter(token => token.length > 3 && !clueStopwords.has(token)));
  const clueRaw = value => String(value == null ? '' : value).normalize('NFKC').replace(/\s+/g, ' ').trim();
  // clueCanonical output is a COMPARISON key, not prose: it is lowercased and
  // stripped of apostrophes, so splicing it into a learner-visible choice printed
  // tokenizer artefacts such as "young childs personality type". Recover each
  // token's surface form from the text it was taken from before displaying it.
  const clueSurfaceForm = (text, token) => {
    for (const word of clueRaw(text).split(' ')) {
      const bare = word.replace(/^[^A-Za-z0-9'’]+|[^A-Za-z0-9'’]+$/g, '');
      if (clueCanonical(bare) === token) return bare;
    }
    return token;
  };
  const clueExtremeReplacements = [
    [/\ball students\b/gi, 'students generally'],
    [/\bno students\b/gi, 'few students'],
    [/\balways\b/gi, 'typically'],
    [/\bnever\b/gi, 'rarely'],
    [/\bonly\b/gi, 'primarily'],
    [/\bentirely\b/gi, 'largely'],
    [/\bcompletely\b/gi, 'substantially'],
    [/\bguarantees?\b/gi, 'supports'],
    [/\bimmediately\b/gi, 'promptly'],
    [/\bautomatically\b/gi, 'as a routine step'],
  ];
  const cluePadding = [
    ' in this case', ' as presented', ' for this item', ' in context',
    ' under these facts', ' as described', ' for the scenario',
  ];
  function cluePadChoice(value, targetLength, index) {
    let output = clueRaw(value), suffixIndex = index % cluePadding.length;
    while (clueCanonical(output).length < targetLength) {
      output = output.replace(/[.!?]+$/, '') + cluePadding[suffixIndex % cluePadding.length];
      suffixIndex += 1;
    }
    return output;
  }
  function normalizeItem(item) {
    const isGuided = item?.expansionStatus === 'assistant-authored-guided-reasoning-task';
    if (!item || !Array.isArray(item.choices) || item.choices.length !== 4
        || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3
        || (item.answerChoiceClueNormalizationVersion === 'answer-choice-clue-normalization-v1' && !isGuided)) return item;
    const choices = item.choices.map(choice => clueRaw(choice));
    const wrongIndexes = choices.map((_, index) => index).filter(index => index !== item.answerIndex);
    let changed = false;
    for (const index of wrongIndexes) {
      let next = choices[index];
      for (const [pattern, replacement] of clueExtremeReplacements) next = next.replace(pattern, replacement);
      if (next !== choices[index]) { choices[index] = next; changed = true; }
    }
    const closeLexicalLeakage = () => {
      const stem = clueTokens(item.prompt), key = clueTokens(choices[item.answerIndex]);
      const leaked = [...stem].filter(token => key.has(token)
        && wrongIndexes.some(index => !clueTokens(choices[index]).has(token)));
      if (!leaked.length) return false;
      const label = leaked.map(token => clueSurfaceForm(item.prompt, token)).join(' ');
      let localChanged = false;
      for (const index of wrongIndexes) {
        if (leaked.some(token => !clueTokens(choices[index]).has(token))) {
          choices[index] = clueRaw(choices[index]).replace(/[.!?]+$/, '')
            + ' (in the context of ' + label + ')';
          localChanged = true;
        }
      }
      return localChanged;
    };
    if (closeLexicalLeakage()) changed = true;
    const targetLength = Math.max(...choices.map(choice => clueCanonical(choice).length));
    const balancedTarget = targetLength >= 20 ? targetLength : 0;
    for (let index = 0; index < choices.length; index += 1) {
      if ((!isGuided || index !== item.answerIndex)
          && clueCanonical(choices[index]).length < balancedTarget) {
        choices[index] = cluePadChoice(choices[index], balancedTarget, index);
        changed = true;
      }
    }
    if (closeLexicalLeakage()) changed = true;
    if (!changed) return item;
    return { ...item, choices, answerChoiceClueNormalizationVersion: 'answer-choice-clue-normalization-v1' };
  }

  function taskContext(source) {
    const prompt = String(source.prompt || '').replace(/\s+/g, ' ').trim();
    const declarative = prompt.match(/^(.+?[.!])\s+(?:Which|What|How|Why|When|Where|Who|Select|Determine|Identify|Based\b)/i);
    if (declarative) return declarative[1];
    return 'A learner is working through this task: ' + quote(prompt);
  }
  function sourceFeedback(source, choiceIndex, principle) {
    const authored = source.choiceRationales && source.choiceRationales[choiceIndex];
    const choice = source.choices[choiceIndex];
    return compact(authored || (choiceIndex === source.answerIndex
      ? principle : inlineQuote(choice) + ' does not satisfy the item-specific evidence or decision rule.'), 260);
  }
  function expandedItem(source, batch) {
    const correctIndex = source.answerIndex;
    const correct = source.choices[correctIndex];
    const wrongIndexes = source.choices.map((_, choiceIndex) => choiceIndex)
      .filter(choiceIndex => choiceIndex !== correctIndex);
    const wrong = wrongIndexes.map(choiceIndex => source.choices[choiceIndex]);
    const principle = compact(source.rationale, 300);
    const feedbacks = source.choices.map((_, choiceIndex) => sourceFeedback(source, choiceIndex, principle));
    const context = taskContext(source);
    const taskForm = batch === 3 ? 'misconception-correction' : batch === 4 ? 'principle-justification' : 'evidence-comparison';
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
      distractors = wrongIndexes.map(choiceIndex => inlineQuote(source.choices[choiceIndex]) + ' is better supported: ' + feedbacks[correctIndex] + ' In contrast, its competing response is not supported: ' + feedbacks[choiceIndex]);
      rationale = 'The accurate comparison assigns the affirmative source feedback to ' + inlineQuote(correct) + ' and the item-specific limitation to ' + inlineQuote(wrong[0]) + '. ' + principle;
      wrongFeedbackReason = 'This comparison misassigns the source evidence to a response that the item-specific feedback does not support.';
      answerDerivation = 'source-evidence-comparison:' + correctIndex + ':' + wrongIndexes[0];
    }
    const choices = placeAnswer(correctChoice, distractors, correctIndex);
    const choiceRationales = choices.map((choice, choiceIndex) => choiceIndex === correctIndex
      ? 'Correct. ' + rationale : 'Not the best answer. ' + wrongFeedbackReason + ' ' + rationale);
    return normalizeItem({ ...source, id: source.id + '-exp' + batch, prompt, choices, choiceRationales,
      answerIndex: correctIndex, rationale, difficulty: batch === 3 ? 'application' : 'analysis',
      reviewStatus: 'assistant-reviewed-guided-practice-only', qaStatus: 'structural-qa-passed-guided-practice-only',
      qaReviewedAt: source.qaReviewedAt || '2026-07-16', sourceItemId: source.id, sourceAnswerIndex: correctIndex,
      expansionBatch: batch, taskForm, answerDerivation, expansionStatus: 'assistant-authored-guided-reasoning-task',
      authorship: 'assistant-authored-derived-from-reviewed-core', editorialReviewer: 'OpenAI Codex',
      assistantReviewStatus: 'reviewed-guided-practice-only', examItemStatus: 'not-approved-as-independent-exam-item',
      assistantReviewedAt: '2026-07-16',
      reviewMethod: 'guided-practice-source-answer-key-option-feedback-distractor-editorial-and-structural-review-v1' });
  }
  function deriveGuidedReviewItems(baseItems) {
    const base = Array.isArray(baseItems) ? baseItems : [];
    const batch1 = base.slice(0, 100), batch2 = base.slice(100, 200);
    return [...batch1.map(item => expandedItem(item, 3)),
      ...batch2.map(item => expandedItem(item, 4)),
      ...batch1.map(item => expandedItem(item, 5))];
  }
  return { compact, quote, inlineQuote, placeAnswer, taskContext, sourceFeedback,
    expandedItem, deriveGuidedReviewItems, normalizeItem };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = createTestPrepGuidedExpansion();
  module.exports.factorySource = createTestPrepGuidedExpansion.toString();
}
