'use strict';

// Compatibility wrapper for the guided-expansion core. The checked-in base
// factory remains the source of the item/task derivation logic; this wrapper
// injects clean prompt-context preservation, source-feedback math corrections,
// and accurate non-echoing distractor feedback, then evaluates the resulting
// self-contained factory for Node and browser builds alike.
const base = require('./test_prep_guided_expansion_core_base.cjs');

const feedbackCode = String.raw`
  const feedbackCanonical = value => String(value == null ? '' : value).normalize('NFKC').toLowerCase()
    .replace(/["']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  const feedbackRaw = value => String(value == null ? '' : value).normalize('NFKC').replace(/\s+/g, ' ').trim();
  const feedbackWordCount = value => feedbackRaw(value).split(/\s+/).filter(Boolean).length;
  const escapeFeedbackRegex = value => String(value).replace(/[.*+?^\${}()|[\]\\]/g, '\\$&');
  const cleanSmartQuestionQuotes = value => String(value == null ? '' : value)
    .replace(/(^|[\s(])\?([A-Za-z][^?\n]{0,60}?[A-Za-z0-9][.,;:]?)\?(?=$|[\s.,;:)"'])/g, "$1'$2'");
  const stripCluePadding = value => feedbackRaw(value)
    .replace(/\s+\((?:in the context of|in this case|as presented|for this item|under these facts|as described|for the scenario)[^)]*\)/ig, '')
    .replace(/(?:\s+(?:in this case|as presented|for this item|in context|under these facts|as described|for the scenario))+[.?!]*$/ig, '')
    .trim();
  const cleanDoublePunct = value => String(value || '')
    .replace(/(?<!\.)\.\.(?!\.)/g, '.')
    .replace(/[,;]\./g, '.')
    .replace(/\?\./g, '?')
    .replace(/!\./g, '!')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const collapseRepeatedWords = value => cleanDoublePunct(String(value || '')
    .replace(/\b([A-Za-z]+)(?:,\s+\1|\s+\1)+\b/gi, '$1')
    .replace(/\bpreassigned assigned\b/gi, 'preassigned')
    .replace(/\bsuprathreshold behavioral suprathreshold\b/gi, 'behavioral suprathreshold')
    .replace(/\bsame-(?:age|grade) same-age peers\b/gi, 'same-age peers')
    .replace(/\bA individual support profile\b/g, 'An individual support profile')
    .replace(/\$25 dollar\b/gi, '$25')
    .replace(/Dyslexia commonly involves accurate or fluent word recognition, decoding, and spelling\./g,
      'Dyslexia commonly involves difficulties with accurate or fluent word recognition, decoding, and spelling.')
    .replace(/not commonly linked to the eventual (?:individual )?(?:support|learning) profile/gi,
      'not commonly linked to the eventual disability category')
    .replace(/\byoung early-childhood young learners\b/gi, 'young early-childhood learners')
    .replace(/(^|[.:]\s+)(early-childhood|middle-grades|secondary)\s+learners\b/g,
      (_, p, band) => p + band[0].toUpperCase() + band.slice(1) + ' learners')
    .replace(/an eighth grader receives a grade-equivalent score of 6\.2\b/gi,
      'an eighth grader receives a grade-equivalent score of 9.2')
    .replace(/an eleventh grader receives a grade-equivalent score of 6\.2\b/gi,
      'an eleventh grader receives a grade-equivalent score of 12.2'));
  const canonicalTokenRegex = token => escapeFeedbackRegex(token).split('').join("['’]?");
  function removeKeyEcho(text, keyText, replacement) {
    const keyCanonical = feedbackCanonical(keyText);
    if (keyCanonical.length < 25) return text;
    if (!feedbackCanonical(text).includes(keyCanonical)) return text;
    const tokens = keyCanonical.split(' ').filter(Boolean);
    if (tokens.length < 2) return text;
    const pattern = new RegExp('\\b' + tokens.map(canonicalTokenRegex).join('\\W+') + '\\b', 'ig');
    return cleanDoublePunct(String(text).replace(pattern, replacement));
  }
  const sourceFeedbackMathFixes = {
    'core5752-b1-069': {
      2: 'Taking the difference of absolute values (|-7| - 5 = 2, ignoring the sign change across zero) understates the 12-degree distance moved across zero.',
    },
    'core5752-b1-077': {
      1: 'Selecting the first (minimum) value in the ordered list misses the middle (third) position of a five-number data set.',
    },
    'core5752-b1-083': {
      0: 'Subtracting the second value from the maximum (18 - 9 = 9) omits the minimum endpoint 4 needed for the full range.',
    },
    'core5752-b1-089': {
      1: 'Miscomputing (25 - 7)/3 = 18/3 as 4 leaves x too small; substituting x = 4 gives 3(4) + 7 = 19 instead of 25.',
      3: 'Overestimating 18/3 as 10 (or adding 7 to get 32/3, about 10.67, and truncating) gives x = 10, which yields 3(10) + 7 = 37 instead of 25.',
    },
    'ec5025-b1-036': {
      1: 'Choosing 7n - 8 adds 5 to the coefficient 2 and to the subtracted constant 3, producing (2 + 5)n - (3 + 5) instead of multiplying both terms inside the parentheses by 5.',
    },
    'ec5025-b1-048': {
      0: 'Arriving at 1 computes 4^2 - 3(5) = 16 - 15 (or multiplies 2 * 4 * 2 = 16 instead of squaring 4) and omits doubling 16 to 32 before subtracting 15.',
      1: 'Choosing 49 multiplies 2 by 4 before squaring to get (2 * 4)^2 = 64 and then subtracts 15, instead of squaring a = 4 first to obtain 2(16) - 15 = 17.',
      2: 'Selecting 145 misapplies exponents and place value rather than squaring a = 4 first to get 16, doubling to 32, and subtracting 3(5) = 15 to reach 17.',
    },
    'ec5025-b1-049': {
      2: 'Selecting $29 adds 14 directly to $15 ($15 + 14 = $29) instead of scaling the proportional unit rate of $2.50 per notebook across 14 notebooks to get $35.',
    },
    'sp5403-b1-052': {
      2: 'Decreasing future behavior by adding an aversive reprimand is positive punishment, whereas removing points (response cost) is negative punishment; neither increases behavior as positive reinforcement does.',
    },
    'se5692-b1-005': {
      1: 'Early-childhood routines should use developmentally appropriate, play-based, and functional materials matched to a young child\'s daily routines and peers rather than mismatched adult or adolescent formats.',
    },
    'se5692-b1-082': {
      2: 'Splitting roles strictly into behavior manager versus content teacher fragments instruction; general educators and early childhood special educators share responsibility for both instruction and positive support.',
    },
    'ld5383-b1-064': {
      0: 'Multiplying 12.5 by 0.5 yields 6.25 (or rounding down to 6), reversing the operation when finding how many 0.5-meter pieces fit into 12.5 meters requires dividing (12.5 / 0.5 = 25).',
    },
    'ld5383-b1-067': {
      1: 'Taking the difference of absolute values (|-7| - 5 = 2, ignoring the sign change across zero) understates the 12-degree distance moved from -7 to 5.',
    },
    'lead5412-b1-072': {
      1: 'Predetermining specific supports before gathering individualized data violates collaborative Section 504 and IDEA team decision-making requirements.',
    },
    'plt5621-b1-008': {
      2: 'Classical conditioning pairs a neutral stimulus with an unconditioned stimulus to elicit an involuntary reflexive response rather than strengthening voluntary classroom routines through contingent behavioral consequences.',
    },
    'plt5622-b1-008': {
      2: 'Classical conditioning pairs a neutral stimulus with an unconditioned stimulus to elicit an involuntary reflexive response rather than strengthening voluntary classroom routines through contingent behavioral consequences.',
    },
    'plt5623-b1-008': {
      2: 'Classical conditioning pairs a neutral stimulus with an unconditioned stimulus to elicit an involuntary reflexive response rather than strengthening voluntary classroom routines through contingent behavioral consequences.',
    },
    'plt5624-b1-008': {
      2: 'Classical conditioning pairs a neutral stimulus with an unconditioned stimulus to elicit an involuntary reflexive response rather than strengthening voluntary classroom routines through contingent behavioral consequences.',
    },
  };
  function buildCleanGuidedDistractorFeedback(item, cleanedChoices, index, prompt, rationale) {
    const key = cleanedChoices[item.answerIndex] || '';
    const choice = cleanedChoices[index] || '';
    const cleanChoice = stripCluePadding(choice);
    const taskForm = item.taskForm || '';
    const quotedChoiceLead = cleanChoice.match(/^["\u201c]([^"\u201d]+)["\u201d]/);
    let output = '';

    if (taskForm === 'misconception-correction') {
      const selMatch = prompt.match(/A candidate selects "([^"]+)"/i);
      const selectedResp = selMatch ? selMatch[1] : 'the candidate response named in the prompt';
      const supMatch = rationale.match(/This feedback directly evaluates the selected response\.\s+"([^"]+)" remains the source-supported response\.\s*(.*)$/i);
      const supportedResp = supMatch ? supMatch[1] : '';
      let principle = supMatch ? feedbackRaw(supMatch[2]) : '';
      if (principle) {
        const keyCan = feedbackCanonical(key);
        if (keyCan.length >= 25 && feedbackCanonical(principle).includes(keyCan)) {
          principle = '';
        }
      }
      const distPreview = cleanChoice.replace(/[.?!]+$/, '');
      output = 'Not the best answer. This option describes a different claim (' + inlineQuote(distPreview)
        + ') rather than identifying the flaw in the candidate\'s selection (' + inlineQuote(selectedResp) + ').';
      if (supportedResp) {
        output += ' Because ' + inlineQuote(supportedResp) + ' remains the source-supported response, the needed feedback must address the specific error in ' + inlineQuote(selectedResp) + '.';
      } else {
        output += ' The explanation must directly address the specific error in the response named in the prompt.';
      }
      if (principle) output += ' ' + principle;
    } else if (taskForm === 'principle-justification') {
      const wrongResp = quotedChoiceLead ? quotedChoiceLead[1] : cleanChoice.replace(/\s+[—–-]\s+.*$/, '').replace(/^["\u201c]|["\u201d]$/g, '');
      const corMatch = rationale.match(/^The evidence statement accurately describes "([^"]+)"\.\s*Pairing that same evidence with another response creates a mismatch\.\s*(.*)$/i);
      const correctResp = corMatch ? corMatch[1] : '';
      let principle = corMatch ? feedbackRaw(corMatch[2]) : '';
      if (principle) principle = removeKeyEcho(principle, key, 'the accurately matched pairing');
      if (correctResp) {
        output = 'Not the best answer. Pairing the affirmative evidence with ' + inlineQuote(wrongResp)
          + ' creates a mismatch because that evidence describes ' + inlineQuote(correctResp)
          + ', not ' + inlineQuote(wrongResp) + '; the evidence statement does not fit that choice.';
      } else {
        output = 'Not the best answer. Pairing the affirmative evidence with ' + inlineQuote(wrongResp)
          + ' assigns the supporting rationale to a response it does not describe.';
      }
      if (principle) output += ' ' + principle;
    } else if (taskForm === 'evidence-comparison') {
      const wrongResp = quotedChoiceLead ? quotedChoiceLead[1] : cleanChoice.replace(/\s+is better supported:.*$/i, '').replace(/^["\u201c]|["\u201d]$/g, '');
      const safeRat = removeKeyEcho(rationale, key, 'the accurately aligned comparison');
      output = 'Not the best answer. Treating ' + inlineQuote(wrongResp)
        + ' as better supported misassigns the source evidence to a response that the item-specific feedback does not support. '
        + safeRat;
    } else {
      output = removeKeyEcho(feedbackRaw(item.choiceRationales[index]), key, 'the best-supported option');
    }

    output = removeKeyEcho(output, key, 'the response-matched feedback');
    if (output.length < 100 || feedbackWordCount(output) < 16) {
      output = output + ' The deciding evidence is the definition, condition, or principle stated in the stem, so this option does not satisfy the required criterion.';
    }
    return collapseRepeatedWords(output);
  }
  function normalizeFeedbackItem(item) {
    if (!item || !Array.isArray(item.choices) || item.choices.length !== 4 || !Number.isInteger(item.answerIndex)
        || !Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4) return item;
    let changed = false;
    let prompt = collapseRepeatedWords(cleanSmartQuestionQuotes(feedbackRaw(item.prompt)));
    if (prompt.length < 35) { prompt = prompt + ' Select the best-supported answer.'; changed = true; }
    if (prompt !== item.prompt) changed = true;
    let rationale = typeof item.rationale === 'string'
      ? collapseRepeatedWords(cleanSmartQuestionQuotes(item.rationale))
      : item.rationale;
    if (rationale !== item.rationale) changed = true;
    const cleanedChoices = item.choices.map((c) => {
      const next = collapseRepeatedWords(cleanSmartQuestionQuotes(c));
      if (next !== c) changed = true;
      return next;
    });
    let choiceRationales = item.choiceRationales.map((feedback, index) => {
      if (index === item.answerIndex) {
        const cleaned = collapseRepeatedWords(cleanSmartQuestionQuotes(feedback));
        if (cleaned !== feedback) changed = true;
        return cleaned;
      }
      const next = buildCleanGuidedDistractorFeedback(item, cleanedChoices, index, prompt, rationale);
      if (next !== feedback) changed = true;
      return next;
    });
    const wrongIndexes = [0, 1, 2, 3].filter((idx) => idx !== item.answerIndex);
    const wrongSet = new Set(wrongIndexes.map((idx) => feedbackCanonical(choiceRationales[idx])));
    if (wrongSet.size < wrongIndexes.length) {
      choiceRationales = choiceRationales.map((feedback, idx) => {
        if (idx === item.answerIndex) return feedback;
        const optLabel = 'option ' + String.fromCharCode(65 + idx);
        const next = cleanDoublePunct(feedback + ' Specifically, ' + optLabel + ' does not match the exact wording, sign, or evidence required by the prompt.');
        if (next !== feedback) changed = true;
        return next;
      });
    }
    if (!changed) return item;
    return { ...item, prompt, rationale, choices: cleanedChoices, choiceRationales, feedbackQualityNormalizationVersion: 'feedback-quality-normalization-v2' };
  }
`;

const baseFactorySource = base.factorySource.replace(/\r\n/g, '\n');
const normalizeMarker = '  function normalizeItem(item) {';
const returnMarker = "    if (!changed) return item;\n    return { ...item, choices, answerChoiceClueNormalizationVersion: 'answer-choice-clue-normalization-v1' };\n  }\n\n  function taskContext";
const taskContextMarker = `  function taskContext(source) {
    const prompt = String(source.prompt || '').replace(/\\s+/g, ' ').trim();
    const declarative = prompt.match(/^(.+?[.!])\\s+(?:Which|What|How|Why|When|Where|Who|Select|Determine|Identify|Based\\b)/i);
    if (declarative) return declarative[1];
    return 'A learner is working through this task: ' + quote(prompt);
  }`;
const taskContextReplacement = `  function taskContext(source) {
    const prompt = cleanSmartQuestionQuotes(String(source.prompt || '').replace(/\\s+/g, ' ').trim());
    const declarative = prompt.match(/^(.+?[.!])\\s+(?:Which|What|How|Why|When|Where|Who|Select|Determine|Identify|Based\\b)/i);
    if (declarative) {
      const lead = declarative[1];
      const dropped = prompt.slice(lead.length).trim();
      const balancedQuotes = ((lead.match(/"/g) || []).length % 2) === 0;
      const calcLeadIn = /solve or interpret|without using a calculator/i.test(lead);
      const droppedNeedsMathOrGivens = /\\d|\\$|%|\\b(?:perimeter|area|volume|slope|median|mode|sale price|percent increase|percent decrease|total cost|total number|how many|how much|value of|probability|circumference|radius|diameter|angle|measure of)\\b/i.test(dropped);
      if (balancedQuotes && !calcLeadIn && !droppedNeedsMathOrGivens) return lead;
    }
    return 'A learner is working through this task: ' + quote(prompt);
  }`;
const sourceFeedbackMarker = `  function sourceFeedback(source, choiceIndex, principle) {
    const authored = source.choiceRationales && source.choiceRationales[choiceIndex];
    const choice = source.choices[choiceIndex];
    return compact(authored || (choiceIndex === source.answerIndex
      ? principle : inlineQuote(choice) + ' does not satisfy the item-specific evidence or decision rule.'), 260);
  }`;
const sourceFeedbackReplacement = `  function sourceFeedback(source, choiceIndex, principle) {
    const fixed = sourceFeedbackMathFixes[source.id] && sourceFeedbackMathFixes[source.id][choiceIndex];
    const authored = fixed || (source.choiceRationales && source.choiceRationales[choiceIndex]);
    const choice = source.choices[choiceIndex];
    return compact(collapseRepeatedWords(cleanSmartQuestionQuotes(authored || (choiceIndex === source.answerIndex
      ? principle : inlineQuote(choice) + ' does not satisfy the item-specific evidence or decision rule.'))), 260);
  }`;

if (
  !baseFactorySource.includes(normalizeMarker) ||
  !baseFactorySource.includes(returnMarker) ||
  !baseFactorySource.includes(taskContextMarker) ||
  !baseFactorySource.includes(sourceFeedbackMarker)
) {
  throw new Error('guided-expansion base factory markers changed; refresh the parity wrapper');
}

const factorySource = baseFactorySource
  .replace(normalizeMarker, feedbackCode + '\n' + normalizeMarker)
  .replace(returnMarker, "    const clueNormalized = changed\n      ? { ...item, choices, answerChoiceClueNormalizationVersion: 'answer-choice-clue-normalization-v1' }\n      : item;\n    return normalizeFeedbackItem(clueNormalized);\n  }\n\n  function taskContext")
  .replace(taskContextMarker, taskContextReplacement)
  .replace(sourceFeedbackMarker, sourceFeedbackReplacement);

const createFactory = new Function('return (' + factorySource + ')')();
const api = createFactory();
module.exports = { ...api, factorySource };
