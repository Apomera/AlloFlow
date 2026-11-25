#!/usr/bin/env node
'use strict';

/**
 * Formal Priority-2 Source & Batch-3 Re-Review Patch Module
 * Repairs Priority-2 accuracy & distractor-precision items across:
 *   - School Psychologist 5403 (sp5403-b2-014/020/052 carryovers + b1/b2-052 punishment distractor)
 *   - School Counselor 5422 (sc5422-b2-005/047/079/096 carryovers)
 *   - Audiology 5343 Batch-3 (aud5343-b3-006: 20 uPa acoustic reference sound pressure vs atmospheric pressure)
 *   - SPED 5322 / 5383 / 5547 / 5372 / 5692 (6 dyslexia definitions, 18 IDEA profile phrases, ld5383-064/067, se5692-005/082)
 *   - Educational Leadership 5412 (lead5412-b1/b2-072 Section 504/IDEA)
 *   - PLT 5621 / 5622 / 5623 / 5624 (8 classical-conditioning distractor notes)
 *   - Praxis Core 5752 & Early Childhood 5025 (math distractor precision on b1/b2)
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('../write_generated_file.cjs');

const root = path.resolve(__dirname, '..', '..');
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function canonical(value) {
  return String(value == null ? '' : value).normalize('NFKC').toLowerCase()
    .replace(/["']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function contentKernel(item) {
  return JSON.stringify({
    answer: canonical(item.choices && item.choices[item.answerIndex]),
    distractors: (item.choices || []).filter((_, index) => index !== item.answerIndex).map(canonical).sort(),
    rationale: canonical(item.rationale),
    references: (item.references || []).map(canonical).sort(),
  });
}

const ITEM_PATCHES = {
  school_psychologist_5403: {
    'sp5403-b1-052': {
      choiceRationales: {
        2: 'Decreasing future behavior by adding an aversive reprimand is positive punishment, whereas removing points (response cost) is negative punishment; neither increases behavior as positive reinforcement does.',
      },
    },
    'sp5403-b2-014': {
      choices: {
        1: 'Validity evidence does not support interpreting or using anxiety scores to determine reading skill.',
        2: 'Converting the anxiety raw total into a national percentile rank resolves the mismatch across domains.',
      },
      choiceRationales: {
        2: 'Changing the score metric to a percentile alters reporting format without changing the underlying emotional construct measured.',
        3: 'Strong norms improve relative standing comparisons on anxiety, yet they cannot turn an anxiety scale into a reading measure.',
      },
    },
    'sp5403-b2-020': {
      choices: {
        0: 'Require the standard timed spoken response mode even when speech limitations prevent the student from showing mastery.',
        1: 'Simplify the target skill items substantially without documenting the change so the student experiences less frustration.',
        3: 'Remove irrelevant speech barriers while preserving the target construct and document standardization effects.',
      },
      choiceRationales: {
        0: 'Forcing an inaccessible spoken response measures the speech limitation instead of the intended construct, invalidating results.',
        1: 'Altering the target construct turns an accommodation into an undocumented modification that misleads team decisions.',
      },
    },
    'sp5403-b2-052': {
      prompt: 'A school psychologist explains positive reinforcement during behavioral consultation. Which description accurately defines this process?',
      choiceRationales: {
        2: 'Decreasing future behavior by adding an aversive reprimand is positive punishment, whereas removing points (response cost) is negative punishment; neither increases behavior as positive reinforcement does.',
      },
    },
  },

  school_counselor_5422: {
    'sc5422-b2-005': {
      prompt: 'A counselor considers joining a national or state professional counseling association to maintain up-to-date competence. Which statement best describes its continuing benefit?',
    },
    'sc5422-b2-047': {
      choices: [
        'Convene peer mediation right away and ask both sides to compromise equally to end the conflict.',
        'Coach the targeted student to ignore the teasing for a month to see if the peer group loses interest.',
        'Activate anti-bullying safety steps, protect the target, follow reporting channels, and address power.',
        'Keep the bullying reports private inside counseling sessions even when school policy requires reporting.',
      ],
    },
    'sc5422-b2-079': {
      choices: {
        0: 'Reliability ensures that a survey with strong consistency yields valid scores for any guidance decision.',
        1: 'Percentile norms from the belonging survey permit career-aptitude inferences whenever a score is low.',
        3: 'High score stability proves that the belonging survey captures fixed career-aptitude traits across settings.',
      },
      choiceRationales: {
        1: 'Low percentiles on school belonging do not measure career aptitude and cannot support career-placement inferences.',
        3: 'Stability reflects consistency of the measured belonging construct, not evidence that it assesses an unrelated career-aptitude trait.',
      },
    },
    'sc5422-b2-096': {
      choices: {
        1: 'Lower the outcome target for students facing access barriers so their final numbers meet the goal.',
        3: 'Keep effective elements, remove the access barrier, adapt delivery, and monitor affected students’ gains.',
      },
      choiceRationales: {
        0: 'Meeting an overall average masks an equity gap affecting students excluded from sessions by access barriers.',
        1: 'Lowering expectations leaves the access barrier intact instead of adapting delivery so affected students can participate equitably.',
      },
    },
  },

  audiology_5343: {
    'aud5343-b3-006': {
      choices: {
        2: 'The listener detects a sound pressure twenty times greater than the standard acoustic reference pressure of 20 micropascals.',
      },
      choiceRationales: {
        2: 'Not the best answer. A decibel value is logarithmic and dB HL is referenced to normative threshold, not directly to the 20-micropascal dB SPL reference pressure. The dB HL scale incorporates reference-equivalent threshold sound-pressure levels so that zero approximates normal threshold across frequencies for a specified transducer. It cannot be converted to a single identical SPL value without calibration data.',
      },
    },
  },

  educational_leadership_5412: {
    'lead5412-b1-072': {
      choiceRationales: {
        1: 'Predetermining specific supports before gathering individualized data violates collaborative Section 504 and IDEA team decision-making requirements.',
      },
    },
    'lead5412-b2-072': {
      choiceRationales: {
        1: 'Predetermining specific supports before gathering individualized data violates collaborative Section 504 and IDEA team decision-making requirements.',
      },
    },
  },

  special_education_early_childhood_5692: {
    'se5692-b1-005': {
      choiceRationales: {
        1: 'Early-childhood routines should use developmentally appropriate, play-based, and functional materials matched to a young child\'s daily routines and peers rather than mismatched adult or adolescent formats.',
      },
    },
    'se5692-b2-005': {
      choiceRationales: {
        1: 'Early-childhood routines should use developmentally appropriate, play-based, and functional materials matched to a young child\'s daily routines and peers rather than mismatched adult or adolescent formats.',
      },
    },
    'se5692-b1-082': {
      choiceRationales: {
        2: 'Splitting roles strictly into behavior manager versus content teacher fragments instruction; general educators and early childhood special educators share responsibility for both instruction and positive support.',
      },
    },
    'se5692-b2-082': {
      choiceRationales: {
        2: 'Splitting roles strictly into behavior manager versus content teacher fragments instruction; general educators and early childhood special educators share responsibility for both instruction and positive support.',
      },
    },
  },

  special_education_learning_disabilities_5383: {
    'ld5383-b1-064': {
      choiceRationales: {
        0: 'Multiplying 12.5 by 0.5 yields 6.25 (or rounding down to 6), reversing the operation when finding how many 0.5-meter pieces fit into 12.5 meters requires dividing (12.5 / 0.5 = 25).',
      },
    },
    'ld5383-b2-064': {
      choiceRationales: {
        0: 'Multiplying 12.5 by 0.5 yields 6.25 (or rounding down to 6), reversing the operation when finding how many 0.5-meter pieces fit into 12.5 meters requires dividing (12.5 / 0.5 = 25).',
      },
    },
    'ld5383-b1-067': {
      choiceRationales: {
        1: 'Taking the difference of absolute values (|-7| - 5 = 2, ignoring the sign change across zero) understates the 12-degree distance moved from -7 to 5.',
      },
    },
    'ld5383-b2-067': {
      choiceRationales: {
        1: 'Taking the difference of absolute values (|-7| - 5 = 2, ignoring the sign change across zero) understates the 12-degree distance moved from -7 to 5.',
      },
    },
  },

  praxis_core_5752: {
    'core5752-b1-069': {
      choiceRationales: {
        2: 'Taking the difference of absolute values (|-7| - 5 = 2, ignoring the sign change across zero) understates the 12-degree distance moved across zero.',
      },
    },
    'core5752-b1-077': {
      choiceRationales: {
        1: 'Selecting the first (minimum) value in the ordered list misses the middle (third) position of a five-number data set.',
      },
    },
    'core5752-b1-083': {
      choiceRationales: {
        0: 'Subtracting the second value from the maximum (18 - 9 = 9) omits the minimum endpoint 4 needed for the full range.',
      },
    },
    'core5752-b1-089': {
      choiceRationales: {
        1: 'Miscomputing (25 - 7)/3 = 18/3 as 4 leaves x too small; substituting x = 4 gives 3(4) + 7 = 19 instead of 25.',
        3: 'Overestimating 18/3 as 10 (or adding 7 to get 32/3, about 10.67, and truncating) gives x = 10, which yields 3(10) + 7 = 37 instead of 25.',
      },
    },
  },

  early_childhood_5025: {
    'ec5025-b1-036': {
      choiceRationales: {
        1: 'Choosing 7n - 8 adds 5 to the coefficient 2 and to the subtracted constant 3, producing (2 + 5)n - (3 + 5) instead of multiplying both terms inside the parentheses by 5.',
      },
    },
    'ec5025-b1-048': {
      choiceRationales: {
        0: 'Arriving at 1 computes 4^2 - 3(5) = 16 - 15 (or multiplies 2 * 4 * 2 = 16 instead of squaring 4) and omits doubling 16 to 32 before subtracting 15.',
        1: 'Choosing 49 multiplies 2 by 4 before squaring to get (2 * 4)^2 = 64 and then subtracts 15, instead of squaring a = 4 first to obtain 2(16) - 15 = 17.',
        2: 'Selecting 145 misapplies exponents and place value rather than squaring a = 4 first to get 16, doubling to 32, and subtracting 3(5) = 15 to reach 17.',
      },
    },
    'ec5025-b1-049': {
      choiceRationales: {
        2: 'Selecting $29 adds 14 directly to $15 ($15 + 14 = $29) instead of scaling the proportional unit rate of $2.50 per notebook across 14 notebooks to get $35.',
      },
    },
  },
};

const CLASSICAL_CR = 'Classical conditioning pairs a neutral stimulus with an unconditioned stimulus to elicit an involuntary reflexive response rather than strengthening voluntary classroom routines through contingent behavioral consequences.';
for (const [stem, prefix] of [
  ['plt_early_childhood_5621', 'plt5621'],
  ['plt_k6_5622', 'plt5622'],
  ['plt_5_9_5623', 'plt5623'],
  ['plt_7_12_5624', 'plt5624'],
]) {
  ITEM_PATCHES[stem] = {
    [`${prefix}-b1-008`]: { choiceRationales: { 2: CLASSICAL_CR } },
    [`${prefix}-b2-008`]: { choiceRationales: { 2: CLASSICAL_CR } },
  };
}

function normalizeSpedText(str) {
  if (typeof str !== 'string') return str;
  return str
    .replace(/Dyslexia commonly involves accurate or fluent word recognition, decoding, and spelling\./g,
      'Dyslexia commonly involves difficulties with accurate or fluent word recognition, decoding, and spelling.')
    .replace(/not commonly linked to the eventual (?:individual )?(?:support|learning) profile/gi,
      'not commonly linked to the eventual disability category')
    .replace(/\bA individual support profile\b/g, 'An individualized support profile')
    .replace(/\ban individual support profile\b/g, 'an individualized support profile')
    .replace(/\bindividual support profile\b/g, 'individualized support profile');
}

function applyPatchToItem(item, patch) {
  if (typeof patch.prompt === 'string') item.prompt = patch.prompt;
  if (typeof patch.rationale === 'string') item.rationale = patch.rationale;
  if (Array.isArray(patch.choices)) {
    item.choices = patch.choices.slice();
  } else if (patch.choices && typeof patch.choices === 'object') {
    for (const [idx, text] of Object.entries(patch.choices)) item.choices[Number(idx)] = text;
  }
  if (Array.isArray(patch.choiceRationales)) {
    item.choiceRationales = patch.choiceRationales.slice();
  } else if (patch.choiceRationales && typeof patch.choiceRationales === 'object') {
    for (const [idx, text] of Object.entries(patch.choiceRationales)) item.choiceRationales[Number(idx)] = text;
  }
}

function normalizeSpedItem(item) {
  let changed = false;
  for (const field of ['prompt', 'rationale']) {
    if (typeof item[field] === 'string') {
      const next = normalizeSpedText(item[field]);
      if (next !== item[field]) { item[field] = next; changed = true; }
    }
  }
  for (const arrField of ['choices', 'choiceRationales']) {
    if (Array.isArray(item[arrField])) {
      for (let i = 0; i < item[arrField].length; i++) {
        const next = normalizeSpedText(item[arrField][i]);
        if (next !== item[arrField][i]) { item[arrField][i] = next; changed = true; }
      }
    }
  }
  return changed;
}

const SPED_SWEEP_STEMS = [
  'special_education_intellectual_disabilities_5322',
  'special_education_learning_disabilities_5383',
  'special_education_severe_profound_5547',
  'special_education_behavior_emotional_5372',
];

const ALL_STEMS = [...new Set([...Object.keys(ITEM_PATCHES), ...SPED_SWEEP_STEMS])];
let totalExplicit = 0;
let totalSpedNormalized = 0;

for (const stem of ALL_STEMS) {
  const packPath = path.join(root, 'test_prep', `${stem}_pack.json`);
  const itemsPath = path.join(root, 'test_prep', `${stem}_items.json`);
  const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
  const itemsArr = JSON.parse(fs.readFileSync(itemsPath, 'utf8'));
  const explicit = ITEM_PATCHES[stem] || {};

  for (const [id, patch] of Object.entries(explicit)) {
    const pItem = pack.items.find((x) => x.id === id);
    const iItem = itemsArr.find((x) => x.id === id);
    if (!pItem || !iItem) throw new Error(`Missing item ${id} in ${stem}`);
    applyPatchToItem(pItem, patch);
    applyPatchToItem(iItem, patch);
    totalExplicit += 1;
  }

  let spedCount = 0;
  if (SPED_SWEEP_STEMS.includes(stem)) {
    for (let idx = 0; idx < 200; idx++) {
      const c1 = normalizeSpedItem(pack.items[idx]);
      const c2 = normalizeSpedItem(itemsArr[idx]);
      if (c1 || c2) spedCount += 1;
    }
    totalSpedNormalized += spedCount;
  }

  const independentCount = Number(pack.independentPracticeItems) || ((Number(pack.sourceQuestionItems) || 200) + (Number(pack.assistantAuthoredIndependentItems) || 0));
  const kernels = new Set(pack.items.slice(0, independentCount).map(contentKernel)).size;
  const gap = 500 - kernels;
  if ('distinctIndependentContentKernels' in pack) pack.distinctIndependentContentKernels = kernels;
  if ('distinctSourceContentKernels' in pack) pack.distinctSourceContentKernels = kernels;
  if ('newIndependentItemsNeeded' in pack) pack.newIndependentItemsNeeded = gap;
  if (pack.assistantReview && typeof pack.assistantReview === 'object') {
    if ('distinctIndependentContentKernels' in pack.assistantReview) pack.assistantReview.distinctIndependentContentKernels = kernels;
    if ('newIndependentItemsNeeded' in pack.assistantReview) pack.assistantReview.newIndependentItemsNeeded = gap;
  }

  writeGeneratedFile(packPath, JSON.stringify(pack, null, 2) + '\n', 'utf8');
  writeGeneratedFile(itemsPath, JSON.stringify(itemsArr, null, 2) + '\n', 'utf8');
  console.log(`Patched ${stem}: explicit=${Object.keys(explicit).length}, spedNorm=${spedCount} (kernels=${kernels}, gap=${gap})`);
}

// Keep dev-tools/authored/audiology_5343_batch3.json, its review binding, and pack artifactBindings in sync
const audB3Path = path.join(root, 'dev-tools', 'authored', 'audiology_5343_batch3.json');
const audB3ReviewPath = path.join(root, 'dev-tools', 'authored', 'audiology_5343_batch3.review.json');
const audB3 = JSON.parse(fs.readFileSync(audB3Path, 'utf8'));
const audB3List = Array.isArray(audB3) ? audB3 : audB3.items;
const audItem = audB3List.find((x) => x.id === 'aud5343-b3-006');
if (!audItem) throw new Error('Missing aud5343-b3-006 in audiology_5343_batch3.json');
applyPatchToItem(audItem, ITEM_PATCHES.audiology_5343['aud5343-b3-006']);
const audB3Text = JSON.stringify(audB3, null, 2) + '\n';
writeGeneratedFile(audB3Path, audB3Text, 'utf8');

const audB3Sha = sha256(Buffer.from(audB3Text, 'utf8'));
const audB3Review = JSON.parse(fs.readFileSync(audB3ReviewPath, 'utf8'));
if (audB3Review.artifactBinding && typeof audB3Review.artifactBinding === 'object') {
  audB3Review.artifactBinding.sha256 = audB3Sha;
}
if ('sourceSha256' in audB3Review) {
  audB3Review.sourceSha256 = audB3Sha;
}
writeGeneratedFile(audB3ReviewPath, JSON.stringify(audB3Review, null, 2) + '\n', 'utf8');

const audPackPath = path.join(root, 'test_prep', 'audiology_5343_pack.json');
const audPack = JSON.parse(fs.readFileSync(audPackPath, 'utf8'));
for (const batch of (audPack.assistantReview?.independentBatchEvidence || [])) {
  for (const binding of (batch.artifactBindings || [])) {
    if (binding.file === 'audiology_5343_batch3.json') binding.sha256 = audB3Sha;
  }
}
writeGeneratedFile(audPackPath, JSON.stringify(audPack, null, 2) + '\n', 'utf8');
console.log(`Updated audiology_5343_batch3.json, review & pack artifactBinding sha256 -> ${audB3Sha.slice(0, 12)}...`);
console.log(`Total Priority-2 repairs: explicit=${totalExplicit}, spedNorm=${totalSpedNormalized}`);
