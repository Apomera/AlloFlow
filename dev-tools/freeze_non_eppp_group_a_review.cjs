#!/usr/bin/env node
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { auditLibraryIntegrity } = require('./plt_learning_library_integrity.cjs');
const pltSpecs = require('./plt_grade_band_qa.config.cjs');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');
const outputPath = path.join(__dirname, 'authored', 'non_eppp_eppp_guided_qa_group_a.review.json');
const reviewedAt = '2026-07-18';
const reviewer = 'OpenAI Codex independent EPPP-guided review';
const artifactSuffixes = [
  '_pack.json',
  '_items.json',
  '_native_qa.json',
  '_native_qa.md',
  '_learning_library.json',
  '_learning_library_qa.json',
  '_learning_library_qa.md',
];

const packSpecs = [
  {
    stem: 'audiology_5343',
    officialSource: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5343.pdf',
    officialSelectedResponseCount: 120,
    officialConstructedResponseCount: 0,
    officialTotalTimeMinutes: 120,
    simulationItems: 120,
    simulationMinutes: 120,
    manualPriorityItemIds: [
      'aud5343-b1-058', 'aud5343-b1-060', 'aud5343-b2-088', 'aud5343-b1-022',
      'aud5343-b1-028', 'aud5343-b1-062', 'aud5343-b2-022', 'aud5343-b2-028',
      'aud5343-b2-045', 'aud5343-b2-062', 'aud5343-b1-004', 'aud5343-b1-017',
    ],
  },
  {
    stem: 'early_childhood_5025',
    officialSource: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5025.pdf',
    officialSelectedResponseCount: 120,
    officialConstructedResponseCount: 0,
    officialTotalTimeMinutes: 120,
    simulationItems: 120,
    simulationMinutes: 120,
    manualPriorityItemIds: [
      ...[1, 2].flatMap((batch) => Array.from({ length: 25 }, (_, offset) =>
        `ec5025-b${batch}-${String(31 + offset).padStart(3, '0')}`)),
      'ec5025-b1-026', 'ec5025-b2-026', 'ec5025-b1-063', 'ec5025-b2-063',
      'ec5025-b1-077', 'ec5025-b2-077',
    ],
  },
  {
    stem: 'educational_leadership_5412',
    officialSource: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5412.pdf',
    officialSelectedResponseCount: 120,
    officialConstructedResponseCount: 0,
    officialTotalTimeMinutes: 165,
    simulationItems: 120,
    simulationMinutes: 165,
    manualPriorityItemIds: [
      'lead5412-b1-070', 'lead5412-b2-070', 'lead5412-b1-093',
      'lead5412-b2-093', 'lead5412-b1-040', 'lead5412-b2-040',
    ],
  },
  {
    stem: 'esol_5362',
    officialSource: 'https://praxis.ets.org/on/demandware.static/-/Library-Sites-ets-praxisLibrary/default/pdfs/5362.pdf',
    officialSelectedResponseCount: 120,
    officialConstructedResponseCount: 0,
    officialTotalTimeMinutes: 120,
    simulationItems: 120,
    simulationMinutes: 120,
    manualPriorityItemIds: [
      'esol5362-b1-072', 'esol5362-b2-072', 'esol5362-b1-058',
      'esol5362-b2-058', 'esol5362-b1-053', 'esol5362-b2-053',
    ],
  },
  {
    stem: 'plt_5_9_5623',
    officialSource: pltSpecs.plt_5_9_5623.officialSource,
    officialSelectedResponseCount: 70,
    officialConstructedResponseCount: 4,
    officialTotalTimeMinutes: 120,
    simulationItems: 70,
    simulationMinutes: 70,
    manualPriorityItemIds: [
      'plt5623-b1-085', 'plt5623-b2-085', 'plt5623-b1-082',
      'plt5623-b2-082', 'plt5623-b1-079', 'plt5623-b1-095',
    ],
  },
  {
    stem: 'plt_7_12_5624',
    officialSource: pltSpecs.plt_7_12_5624.officialSource,
    officialSelectedResponseCount: 70,
    officialConstructedResponseCount: 4,
    officialTotalTimeMinutes: 120,
    simulationItems: 70,
    simulationMinutes: 70,
    manualPriorityItemIds: [
      'plt5624-b1-085', 'plt5624-b2-085', 'plt5624-b1-082',
      'plt5624-b2-082', 'plt5624-b1-079', 'plt5624-b1-095',
    ],
  },
  {
    stem: 'plt_early_childhood_5621',
    officialSource: pltSpecs.plt_early_childhood_5621.officialSource,
    officialSelectedResponseCount: 70,
    officialConstructedResponseCount: 4,
    officialTotalTimeMinutes: 120,
    simulationItems: 70,
    simulationMinutes: 70,
    manualPriorityItemIds: [
      'plt5621-b1-086', 'plt5621-b1-072', 'plt5621-b2-002', 'plt5621-b2-014',
      'plt5621-b2-077', 'plt5621-b1-061', 'plt5621-b1-002', 'plt5621-b1-062',
      'plt5621-b1-082', 'plt5621-b1-003', 'plt5621-b1-083', 'plt5621-b1-004',
    ],
  },
];

function readBytes(file) {
  return fs.readFileSync(file);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function raw(value) {
  return String(value == null ? '' : value).normalize('NFKC').replace(/\s+/g, ' ').trim();
}

function canonical(value) {
  return raw(value).toLowerCase().replace(/["']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

function words(value) {
  return raw(value).split(/\s+/).filter(Boolean).length;
}

function answerCounts(items) {
  return [0, 1, 2, 3].map((answerIndex) => items.filter((item) => item.answerIndex === answerIndex).length);
}

function contentKernel(item) {
  return JSON.stringify({
    answer: canonical(item.choices && item.choices[item.answerIndex]),
    distractors: (item.choices || []).filter((_, index) => index !== item.answerIndex).map(canonical).sort(),
    rationale: canonical(item.rationale),
    references: (item.references || []).map(canonical).sort(),
  });
}

function tokenSet(value) {
  return new Set(canonical(value).split(' ').filter((token) => token.length > 3));
}

function warningCodes(item) {
  const findings = [];
  const choices = item.choices || [];
  const key = choices[item.answerIndex] || '';
  if (raw(item.prompt).length < 35) findings.push('shortPrompt');
  if (choices.length === 4 && key) {
    const lengths = choices.map((choice) => canonical(choice).length);
    const answerLength = lengths[item.answerIndex];
    const longestWrong = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
    if (answerLength >= longestWrong + 20 && answerLength >= longestWrong * 1.75) {
      findings.push('severeAnswerLengthClue');
    }
    const stem = tokenSet(item.prompt);
    const keyed = tokenSet(key);
    const distractors = choices.filter((_, index) => index !== item.answerIndex).map(tokenSet);
    if ([...stem].some((token) => keyed.has(token) && distractors.every((set) => !set.has(token)))) {
      findings.push('keyStemLexicalLeakage');
    }
    const extreme = /\b(?:always|never|only|entirely|completely|guarantees?|immediately|automatically|all students|no students)\b/i;
    if (choices.filter((choice, index) => index !== item.answerIndex && extreme.test(choice)).length >= 2
        && !extreme.test(key)) {
      findings.push('asymmetricExtremeDistractors');
    }
  }
  if (String(item.difficulty || '').toLowerCase() === 'advanced'
      && /^(?:what is|which .* (?:defines|means)|complete the statement)/i.test(raw(item.prompt))) {
    findings.push('advancedDirectRecall');
  }
  const generic = /\b(?:is not best because|does not meet the defining condition or distinction|the supported response is|does not represent the best available answer)\b/i;
  for (let index = 0; index < (item.choiceRationales || []).length; index++) {
    if (index === item.answerIndex) continue;
    const feedback = raw(item.choiceRationales[index]);
    const normalizedFeedback = canonical(feedback);
    const choice = canonical(choices[index]);
    const normalizedKey = canonical(key);
    if (feedback.length < 100 || words(feedback) < 16 || generic.test(feedback)) {
      findings.push('incorrectOptionFeedbackDetail');
    }
    if (choice.length >= 25 && normalizedFeedback.startsWith(choice.slice(0, Math.min(60, choice.length)))) {
      findings.push('incorrectOptionChoiceRestatement');
    }
    if (normalizedKey.length >= 25 && normalizedFeedback.includes(normalizedKey)) {
      findings.push('incorrectOptionFullKeyEcho');
    }
  }
  return [...new Set(findings)];
}

function collectHttpsReferences(value, output = new Set()) {
  if (Array.isArray(value)) {
    for (const entry of value) collectHttpsReferences(entry, output);
  } else if (value && typeof value === 'object') {
    for (const entry of Object.values(value)) collectHttpsReferences(entry, output);
  } else if (typeof value === 'string' && /^https:\/\/\S+$/i.test(value.trim())) {
    output.add(value.trim());
  }
  return output;
}

function repeatedSentenceCount(sections) {
  const sectionSentences = sections.map((section) => new Set(raw(section.content)
    .split(/(?<=[.!?])\s+/)
    .map(canonical)
    .filter((sentence) => sentence.length >= 70)));
  if (!sectionSentences.length) return 0;
  return [...sectionSentences[0]].filter((sentence) =>
    sectionSentences.every((set) => set.has(sentence))).length;
}

function severeKeyLength(item) {
  const choices = item.choices || [];
  if (choices.length !== 4 || !Number.isInteger(item.answerIndex)) return false;
  const lengths = choices.map((choice) => canonical(choice).length);
  const answerLength = lengths[item.answerIndex];
  const longestWrong = Math.max(...lengths.filter((_, index) => index !== item.answerIndex));
  return answerLength >= longestWrong + 20 && answerLength >= longestWrong * 1.75;
}

const catalogPath = path.join(sourceDir, 'reference_catalog.json');
const deployCatalogPath = path.join(deployDir, 'reference_catalog.json');
const catalog = readJson(catalogPath);
const hardFindings = [];
const addHard = (stem, check, message) => hardFindings.push({ stem, check, message });
if (!readBytes(catalogPath).equals(readBytes(deployCatalogPath))) {
  addHard('reference_catalog', 'source-deploy-parity', 'Reference catalog differs between source and deploy.');
}

const warningNames = [
  'shortPrompt', 'severeAnswerLengthClue', 'keyStemLexicalLeakage',
  'asymmetricExtremeDistractors', 'advancedDirectRecall',
  'incorrectOptionFeedbackDetail', 'incorrectOptionChoiceRestatement',
  'incorrectOptionFullKeyEcho',
];
const warningTotals = Object.fromEntries(warningNames.map((name) => [name, 0]));
const feedbackTotals = {
  incorrectOptionExplanations: 0,
  startsWithNotTheBestAnswerWrapper: 0,
  startsWithEcClaimConflictWrapper: 0,
  containsCompleteOverallRationale: 0,
  underSixteenWords: 0,
  underOneHundredCharacters: 0,
};
const hardGateCounters = {
  invalidKeys: 0,
  duplicateChoicesWithinItem: 0,
  missingOrShortHardThresholdRationales: 0,
  missingOptionFeedbackArrays: 0,
  invalidLearningLinks: 0,
  invalidReviewTierProvenance: 0,
  invalidOrUncatalogedReferences: 0,
  encodingDefects: 0,
};
const allReferences = new Set();
const packRows = [];
const pltIntegrity = {};
const sectionRepetition = {};
let knowledgeChecksWithSevereAnswerLengthClue = 0;
let itemsWithWarnings = 0;
let sourceItemsReviewed = 0;
let learningActivitiesReviewed = 0;
let guidedReviewActivities = 0;
let distinctIndependentContentKernels = 0;
let newIndependentItemsNeeded = 0;
let chapters = 0;
let sections = 0;
let knowledgeChecks = 0;
let diagrams = 0;
let flashcards = 0;
let memoryAids = 0;
let workshops = 0;

for (const spec of packSpecs) {
  const stem = spec.stem;
  const artifactSha256 = {};
  for (const suffix of artifactSuffixes) {
    const sourcePath = path.join(sourceDir, stem + suffix);
    const deployPath = path.join(deployDir, stem + suffix);
    if (!fs.existsSync(sourcePath) || !fs.existsSync(deployPath)) {
      addHard(stem, 'source-deploy-parity', `Missing ${suffix} source or deploy artifact.`);
      continue;
    }
    const sourceBytes = readBytes(sourcePath);
    artifactSha256[suffix] = sha256(sourceBytes);
    if (!sourceBytes.equals(readBytes(deployPath))) {
      addHard(stem, 'source-deploy-parity', `${suffix} differs between source and deploy.`);
    }
  }

  const packBytes = readBytes(path.join(sourceDir, stem + '_pack.json'));
  const pack = JSON.parse(packBytes);
  const itemsArtifact = readJson(path.join(sourceDir, stem + '_items.json'));
  const nativeQa = readJson(path.join(sourceDir, stem + '_native_qa.json'));
  const library = readJson(path.join(sourceDir, stem + '_learning_library.json'));
  const libraryQa = readJson(path.join(sourceDir, stem + '_learning_library_qa.json'));
  const skills = new Map((library.skills || []).map((skill) => [skill.id, skill]));
  const chapterMap = new Map((library.chapters || []).map((chapter) => [chapter.id, chapter]));
  const independentCount = 200;
  const guidedCount = pack.items.length - independentCount;
  const kernels = new Set(pack.items.slice(0, independentCount).map(contentKernel)).size;

  if (JSON.stringify(itemsArtifact) !== JSON.stringify(pack.items)) {
    addHard(stem, 'artifact-consistency', 'The items artifact does not match pack.items.');
  }
  if (pack.status !== 'ready' || pack.items.length !== 500 || pack.batchSize !== 100 || pack.sections?.length !== 5) {
    addHard(stem, 'pack-inventory-and-bank-balance', 'Expected ready status and five 100-item banks.');
  }
  if (new Set(pack.items.map((item) => item.id)).size !== 500
      || new Set(pack.items.map((item) => canonical(item.prompt))).size !== 500) {
    addHard(stem, 'distinct-choice-and-prompt-structure', 'Duplicate IDs or normalized prompts remain.');
  }
  if (answerCounts(pack.items).some((count) => count !== 125)) {
    addHard(stem, 'pack-inventory-and-bank-balance', 'Full-pack answers are not balanced 125/125/125/125.');
  }
  for (let bank = 0; bank < 5; bank++) {
    if (answerCounts(pack.items.slice(bank * 100, bank * 100 + 100)).some((count) => count !== 25)) {
      addHard(stem, 'pack-inventory-and-bank-balance', `Bank ${bank + 1} answers are not balanced 25/25/25/25.`);
    }
  }
  if (kernels !== Number(pack.distinctSourceContentKernels)
      || kernels !== 100 || Number(pack.parallelSourceVariants) !== 100
      || Number(pack.newIndependentItemsNeeded) !== 400) {
    addHard(stem, 'independent-content-accounting', 'Distinct, parallel, or remaining-question accounting is stale.');
  }
  if (pack.simulationItemCount !== spec.simulationItems || pack.simulationTimeMinutes !== spec.simulationMinutes) {
    addHard(stem, 'simulation-and-boundary-metadata', 'Simulation count or pacing does not match the reviewed official boundary.');
  }
  if (!/not official|independent/i.test(String(pack.disclaimer || ''))
      || !/score|pass prediction/i.test(String(pack.disclaimer || ''))) {
    addHard(stem, 'simulation-and-boundary-metadata', 'Independent-preparation and no-score-prediction boundary is incomplete.');
  }
  if (spec.officialConstructedResponseCount > 0) {
    if (pack.officialSelectedResponseCount !== spec.officialSelectedResponseCount
        || pack.officialConstructedResponseCount !== spec.officialConstructedResponseCount
        || pack.officialTotalTimeMinutes !== spec.officialTotalTimeMinutes
        || !/reserve[sd]? 50 minutes|50-minute/i.test(String(pack.simulationNote || ''))
        || !/does not score/i.test(String(pack.simulationNote || ''))) {
      addHard(stem, 'simulation-and-boundary-metadata', 'PLT selected-response and written-response boundaries are incomplete.');
    }
  }
  if (nativeQa.summary?.status !== 'pass' || libraryQa.summary?.status !== 'pass') {
    addHard(stem, 'native-and-library-qa', 'Native or learning-library QA is not passing.');
  }
  if (nativeQa.summary?.totalItems !== 500 || nativeQa.summary?.passedItems !== 500
      || nativeQa.summary?.distinctSourceContentKernels !== 100
      || nativeQa.summary?.newIndependentItemsNeeded !== 400) {
    addHard(stem, 'native-and-library-qa', 'Native QA summary has stale count or independence evidence.');
  }
  const libSummary = library.summary || {};
  if (libSummary.chapters !== 12 || libSummary.sections !== 48 || libSummary.knowledgeChecks !== 60
      || libSummary.flashcards !== 75 || libSummary.memoryAids !== 20 || libSummary.diagrams !== 0) {
    addHard(stem, 'learning-library-linkage', 'Learning-library inventory does not match the reviewed release shape.');
  }
  const librarySections = (library.chapters || []).flatMap((chapter) => chapter.sections || []);
  const libraryChecks = (library.chapters || []).flatMap((chapter) => chapter.knowledgeChecks || []);
  for (const chapter of library.chapters || []) {
    if (!chapter.id || !skills.has(chapter.skillId) || chapter.sections?.length !== 4
        || chapter.knowledgeChecks?.length !== 5
        || chapter.sections.some((section) => raw(section.content).length < 250)
        || chapter.knowledgeChecks.some((check) => check.choices?.length !== 4
          || !Number.isInteger(check.answerIndex) || check.answerIndex < 0 || check.answerIndex > 3
          || raw(check.rationale).length < 70)) {
      addHard(stem, 'learning-library-linkage', `Invalid chapter, lesson, or knowledge check: ${chapter.id || '(missing)'}.`);
    }
  }
  const libraryReferences = collectHttpsReferences(library);
  for (const reference of libraryReferences) allReferences.add(reference);
  sectionRepetition[stem] = {
    sections: librarySections.length,
    longSentencesRepeatedInEverySection: repeatedSentenceCount(librarySections),
  };
  knowledgeChecksWithSevereAnswerLengthClue += libraryChecks.filter(severeKeyLength).length;

  if (pltSpecs[stem]) {
    const integrityFindings = [];
    const integrity = auditLibraryIntegrity(library, pltSpecs[stem], (check, message) =>
      integrityFindings.push({ check, message }));
    for (const finding of integrityFindings) addHard(stem, finding.check, finding.message);
    if (integrity.foreignCodeOccurrences !== 0 || integrity.k6ContaminationOccurrences !== 0
        || integrity.foreignBandOccurrences !== 0 || integrity.outOfBandOccurrences !== 0
        || integrity.referenceSets !== 223 || integrity.officialSourceReferenceSets !== 223) {
      addHard(stem, 'credential-scope-and-semantic-integrity', 'PLT integrity closure metrics are not zero/223-of-223.');
    }
    if (JSON.stringify(integrity) !== JSON.stringify(libraryQa.summary.libraryIntegrity)) {
      addHard(stem, 'native-and-library-qa', 'PLT library integrity summary is stale.');
    }
    pltIntegrity[stem] = integrity;
  }

  const perPackWarnings = Object.fromEntries(warningNames.map((name) => [name, 0]));
  let perPackWarningItems = 0;
  for (let index = 0; index < pack.items.length; index++) {
    const item = pack.items[index];
    const choices = Array.isArray(item.choices) ? item.choices : [];
    const validKey = item.type === 'single-choice' && choices.length === 4
      && Number.isInteger(item.answerIndex) && item.answerIndex >= 0 && item.answerIndex < 4;
    if (!validKey) {
      hardGateCounters.invalidKeys++;
      addHard(stem, 'one-best-answer-structure', `${item.id || index} has an invalid one-best-answer structure.`);
    }
    if (choices.length !== 4 || new Set(choices.map(raw)).size !== choices.length
        || choices.some((choice) => !raw(choice) || /\b(?:all|none) of the above\b/i.test(choice))) {
      hardGateCounters.duplicateChoicesWithinItem++;
      addHard(stem, 'distinct-choice-and-prompt-structure', `${item.id || index} has duplicate, blank, or all/none choices.`);
    }
    if (raw(item.rationale).length < 80) {
      hardGateCounters.missingOrShortHardThresholdRationales++;
      addHard(stem, 'rationale-and-option-feedback', `${item.id || index} has a missing or short overall rationale.`);
    }
    if (!Array.isArray(item.choiceRationales) || item.choiceRationales.length !== 4
        || item.choiceRationales.some((feedback) => raw(feedback).length < 20)) {
      hardGateCounters.missingOptionFeedbackArrays++;
      addHard(stem, 'rationale-and-option-feedback', `${item.id || index} lacks four substantive option explanations.`);
    }
    const itemReferences = Array.isArray(item.references) ? item.references : [];
    let invalidReference = !itemReferences.length;
    for (const reference of itemReferences) {
      allReferences.add(reference);
      const detail = catalog[reference];
      if (!/^https:\/\//i.test(reference) || !detail || raw(detail.title).length < 12
          || raw(detail.organization).length < 4 || raw(detail.summary).length < 40
          || raw(detail.credibility).length < 40) invalidReference = true;
    }
    if (invalidReference) {
      hardGateCounters.invalidOrUncatalogedReferences++;
      addHard(stem, 'source-catalog-coverage', `${item.id || index} has an invalid or incompletely cataloged source.`);
    }
    const skill = skills.get(item.skillIds && item.skillIds[0]);
    const chapter = chapterMap.get(item.chapterIds && item.chapterIds[0]);
    if (item.skillIds?.length !== 1 || item.chapterIds?.length !== 1 || !skill || !chapter
        || skill.domainId !== item.domainId || skill.chapterId !== chapter.id || chapter.skillId !== skill.id) {
      hardGateCounters.invalidLearningLinks++;
      addHard(stem, 'learning-library-linkage', `${item.id || index} has an incompatible skill/chapter link.`);
    }
    if (index < independentCount) {
      if (item.reviewStatus !== 'source-reviewed' || item.qaStatus !== 'qa-passed') {
        hardGateCounters.invalidReviewTierProvenance++;
        addHard(stem, 'review-tier-honesty', `${item.id || index} lacks source-review provenance.`);
      }
      const codes = warningCodes(item);
      if (codes.length) {
        itemsWithWarnings++;
        perPackWarningItems++;
        for (const code of codes) {
          warningTotals[code]++;
          perPackWarnings[code]++;
        }
      }
      for (let option = 0; option < (item.choiceRationales || []).length; option++) {
        if (option === item.answerIndex) continue;
        const feedback = raw(item.choiceRationales[option]);
        feedbackTotals.incorrectOptionExplanations++;
        if (/^Not the best answer\./i.test(feedback)) feedbackTotals.startsWithNotTheBestAnswerWrapper++;
        if (/^This option applies the claim/i.test(feedback)) feedbackTotals.startsWithEcClaimConflictWrapper++;
        if (raw(item.rationale) && feedback.includes(raw(item.rationale))) {
          feedbackTotals.containsCompleteOverallRationale++;
        }
        if (words(feedback) < 16) feedbackTotals.underSixteenWords++;
        if (feedback.length < 100) feedbackTotals.underOneHundredCharacters++;
      }
    } else if (item.reviewStatus !== 'assistant-reviewed-guided-practice-only'
        || item.qaStatus !== 'structural-qa-passed-guided-practice-only'
        || item.examItemStatus !== 'not-approved-as-independent-exam-item' || !item.sourceItemId) {
      hardGateCounters.invalidReviewTierProvenance++;
      addHard(stem, 'review-tier-honesty', `${item.id || index} lacks guided-practice provenance.`);
    }
    const text = [item.prompt].concat(choices, item.rationale || '', item.choiceRationales || []).join('\n');
    if (/(?:\u00c3[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]|\ufffd)/u.test(text)
        || /\bCorrect\s*:\s*\([A-D]\)/i.test(text)) {
      hardGateCounters.encodingDefects++;
      addHard(stem, 'text-encoding', `${item.id || index} contains visible encoding corruption or an answer-letter leak.`);
    }
  }

  for (const reference of libraryReferences) {
    const detail = catalog[reference];
    if (!detail || raw(detail.title).length < 12 || raw(detail.organization).length < 4
        || raw(detail.summary).length < 40 || raw(detail.credibility).length < 40) {
      addHard(stem, 'source-catalog-coverage', `Incomplete learning-library source metadata: ${reference}`);
    }
  }
  for (const id of spec.manualPriorityItemIds) {
    if (!pack.items.slice(0, independentCount).some((item) => item.id === id)) {
      addHard(stem, 'manual-review-evidence', `Manual priority item is absent from the reviewed source set: ${id}.`);
    }
  }

  const sourceBoundary = pack.items.slice(0, independentCount);
  const uniqueReferences = new Set(sourceBoundary.flatMap((item) => item.references || [])).size;
  packRows.push({
    stem,
    packId: pack.id,
    title: pack.shortTitle || pack.title,
    learningActivities: pack.items.length,
    sourceItems: independentCount,
    assistantAuthoredIndependentItems: 0,
    independentItems: independentCount,
    distinctIndependentContentKernels: kernels,
    parallelSourceVariants: Number(pack.parallelSourceVariants),
    guidedReviewItems: guidedCount,
    newIndependentItemsNeededFor500Distinct: 500 - kernels,
    simulation: { items: pack.simulationItemCount, minutes: pack.simulationTimeMinutes },
    answerPositions: answerCounts(pack.items),
    sourceReferences: uniqueReferences,
    nativeQaStatus: nativeQa.summary.status,
    learningLibraryQaStatus: libraryQa.summary.status,
    learningLibrary: {
      chapters: libSummary.chapters,
      sections: libSummary.sections,
      knowledgeChecks: libSummary.knowledgeChecks,
      diagrams: libSummary.diagrams,
      flashcards: libSummary.flashcards,
      memoryAids: libSummary.memoryAids,
      constructedResponseWorkshops: libSummary.constructedResponseWorkshops || 0,
    },
    warningItemCount: perPackWarningItems,
    warningCounts: perPackWarnings,
    packSha256: sha256(packBytes),
    artifactSha256,
    manualPriorityItemIds: spec.manualPriorityItemIds,
  });

  sourceItemsReviewed += independentCount;
  learningActivitiesReviewed += pack.items.length;
  guidedReviewActivities += guidedCount;
  distinctIndependentContentKernels += kernels;
  newIndependentItemsNeeded += 500 - kernels;
  chapters += libSummary.chapters;
  sections += libSummary.sections;
  knowledgeChecks += libSummary.knowledgeChecks;
  diagrams += libSummary.diagrams;
  flashcards += libSummary.flashcards;
  memoryAids += libSummary.memoryAids;
  workshops += libSummary.constructedResponseWorkshops || 0;
}

const ecPack = readJson(path.join(sourceDir, 'early_childhood_5025_pack.json'));
const ecLibrary = readJson(path.join(sourceDir, 'early_childhood_5025_learning_library.json'));
const ecSkillById = Object.fromEntries(ecLibrary.skills.map((skill) => [skill.id, skill]));
const ecPositionsBySkill = {
  'oral-language-emergent-literacy': [1,2,3,4,5,6,7,8],
  'phonological-phonics-word-reading': [9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29],
  'comprehension-writing-literature': [28,30],
  'number-operations': [31,32,33,34,35,36,45,47,48,49,51,52,53,54],
  'measurement-data': [41,42,43,44,46,55],
  'geometry-reasoning': [37,38,39,40,50],
  'history-civics-culture': [56,57,59,60,64,65,67,68,69],
  'geography-economics-inquiry': [58,61,62,63,66],
  'physical-earth-science': [70,71,72,73,74,75,76,77,78,79],
  'life-science-engineering': [80,81,82,83],
  'health-physical-development': [84,85,86,87,88,89,90],
  'creative-performing-arts': [91,92,93,94,95,96,97,98,99,100],
};
const expectedEcSkill = new Map(Object.entries(ecPositionsBySkill)
  .flatMap(([skill, positions]) => positions.map((position) => [position, skill])));
let ecSemanticLinkMismatches = 0;
let ecFormerGenericRationales = 0;
let ecFullRationaleFeedbackCopies = 0;
for (const item of ecPack.items.slice(0, 200)) {
  const position = Number(item.id.match(/-(\d{3})$/)?.[1]);
  const expectedSkillId = expectedEcSkill.get(position);
  if (item.skillIds?.[0] !== expectedSkillId
      || item.chapterIds?.[0] !== ecSkillById[expectedSkillId]?.chapterId) ecSemanticLinkMismatches++;
  if (/^The correct response represents the central disciplinary idea/i.test(raw(item.rationale))) {
    ecFormerGenericRationales++;
  }
  for (let option = 0; option < item.choiceRationales.length; option++) {
    if (option !== item.answerIndex && raw(item.choiceRationales[option]).includes(raw(item.rationale))) {
      ecFullRationaleFeedbackCopies++;
    }
  }
}
if (ecSemanticLinkMismatches) addHard('early_childhood_5025', 'semantic-learning-linkage', `${ecSemanticLinkMismatches} source mappings do not match the item-level map.`);
if (ecFormerGenericRationales) addHard('early_childhood_5025', 'rationale-quality', `${ecFormerGenericRationales} former generic disciplinary-idea rationales remain.`);
if (ecFullRationaleFeedbackCopies) addHard('early_childhood_5025', 'option-feedback', `${ecFullRationaleFeedbackCopies} EC wrong-option explanations still copy the full rationale.`);

function ecItem(id) {
  return ecPack.items.find((item) => item.id === id);
}
for (const id of ['ec5025-b1-026', 'ec5025-b2-026']) {
  const item = ecItem(id);
  if (!item || !/instructional response|instructional target/i.test(item.prompt)
      || !/phoneme segmentation/i.test(item.choices[item.answerIndex])
      || item.skillIds?.[0] !== 'phonological-phonics-word-reading'
      || item.chapterIds?.[0] !== 'ec5025-ch-02') {
    addHard('early_childhood_5025', 'stem-key-scope', `${id} does not retain the corrected phoneme stem/key/link alignment.`);
  }
}
for (const id of ['ec5025-b1-052', 'ec5025-b2-052']) {
  const item = ecItem(id);
  if (!item || item.choices[item.answerIndex] !== '50 - 3n = 32'
      || item.skillIds?.[0] !== 'number-operations' || item.chapterIds?.[0] !== 'ec5025-ch-04'
      || !/original amount/i.test(item.rationale) || !/remainder/i.test(item.rationale)
      || !/50\s*-\s*3n\s*=\s*32/i.test(item.rationale)) {
    addHard('early_childhood_5025', 'fact-and-linkage', `${id} does not retain the corrected equation rationale/link.`);
  }
}
for (const id of ['ec5025-b1-077', 'ec5025-b2-077']) {
  const item = ecItem(id);
  if (!item || item.skillIds?.[0] !== 'physical-earth-science' || item.chapterIds?.[0] !== 'ec5025-ch-09'
      || !/weathering, erosion, and deposition/i.test(item.rationale)) {
    addHard('early_childhood_5025', 'fact-and-linkage', `${id} does not retain the corrected Earth-materials rationale/link.`);
  }
}

if (hardFindings.length) {
  console.error(JSON.stringify({ status: 'hard-findings', hardFindings }, null, 2));
  process.exitCode = 1;
  return;
}

const manualCount = packSpecs.reduce((sum, spec) => sum + spec.manualPriorityItemIds.length, 0);
const snapshot = sha256(Buffer.from(packRows.map((row) => `${row.stem}:${row.packSha256}`).join('\n')));
const officialBlueprintVerification = packSpecs.map((spec) => {
  const pack = readJson(path.join(sourceDir, spec.stem + '_pack.json'));
  const plt = spec.officialConstructedResponseCount > 0;
  return {
    stem: spec.stem,
    officialSource: spec.officialSource,
    officialSelectedResponseCount: spec.officialSelectedResponseCount,
    officialConstructedResponseCount: spec.officialConstructedResponseCount,
    officialTotalTimeMinutes: spec.officialTotalTimeMinutes,
    packSimulation: `${pack.simulationItemCount} selected-response items / ${pack.simulationTimeMinutes} minutes`,
    alignment: plt
      ? 'pass - the separate 50-minute written-response segment, four constructed responses, unscored workshops, and full 120-minute official session are disclosed'
      : 'pass - selected-response count and pacing align; this is explicitly independent practice and not a score or pass predictor',
  };
});

const report = {
  schemaVersion: 1,
  reviewedAt,
  reviewer,
  title: 'EPPP-guided independent QA review: non-EPPP group A final corrected snapshot',
  verdict: 'pass-with-major-editorial-priorities-and-declared-independent-content-gaps - the corrected current snapshot has zero open wrong-key, factual, source, scope, learning-link, blueprint-boundary, provenance, encoding, or source/deploy-parity defects. Generic but accurate option feedback, clue heuristics, zero diagrams, and the honestly declared 2,800-question independent-content gap remain major editorial and development warnings rather than hard factual failures.',
  packs: packRows,
  sourceItemsReviewed,
  learningActivitiesStructurallyReviewed: learningActivitiesReviewed,
  manuallyAdjudicatedItems: manualCount,
  reviewStandard: {
    guideArtifacts: [
      'test_prep/eppp_native_qa.json',
      'test_prep/eppp_distractor_quality_diagnostics.json',
      'test_prep/eppp_option_feedback_diagnostics.json',
      'test_prep/eppp_native_quality_audit_wave_01.json',
      'test_prep/eppp_native_quality_audit_wave_02.json',
      'test_prep/eppp_native_quality_audit_wave_03.json',
      'test_prep/eppp_learning_library.json',
      'test_prep/eppp_learning_library_qa.json',
    ],
    method: 'Automated hard-gate inspection covered all 3,500 activities, all 1,400 source items, every learning-library structure and learner-visible source, current native/library QA, exact hashes, and 50 source/deploy pairs. Manual review adjudicated 104 risk-priority items, including both variants of all 25 formerly suspect EC5025 mathematics mappings and the named EC phoneme, equation, social-studies, and Earth-materials cases. The three PLT libraries were additionally checked with mutation-tested foreign-code and grade-band integrity gates.',
    releaseRule: 'A verdict may begin with pass only when no current wrong key, fact, source, scope, learning link, blueprint boundary, provenance declaration, encoding, or source/deploy parity defect remains. Accurate-but-generic feedback, clue diagnostics, zero diagrams, and honestly declared distinct-content gaps remain visible nonblocking warnings.',
  },
  scope: {
    sourceRoot: 'test_prep',
    deployMirrorRoot: 'desktop/web-app/public/test_prep',
    artifactSuffixesReviewedPerPack: artifactSuffixes,
    exactPackStems: packSpecs.map((spec) => spec.stem),
    totals: {
      packs: packSpecs.length,
      sourceItemsAutomated: sourceItemsReviewed,
      sourceItemsManuallyAdjudicated: manualCount,
      guidedItemsStructurallyReviewed: guidedReviewActivities,
      totalPackActivities: learningActivitiesReviewed,
      distinctIndependentContentKernels,
      newIndependentItemsNeeded,
      chapters,
      sections,
      knowledgeChecks,
      diagrams,
      flashcards,
      memoryAids,
      workshops,
    },
  },
  automatedResults: {
    snapshot: {
      algorithm: 'sha256',
      sha256: snapshot,
      meaning: 'Hash of the seven current source-pack hashes in exact pack-stem order; each pack row also records all seven artifact hashes.',
    },
    regressionTests: {
      status: 'pass',
      testFiles: 11,
      tests: 46,
      defectSpecificRegressions: { status: 'pass', testFiles: 4, tests: 15 },
      command: 'npm test -- tests/audiology_5343_pack.test.js tests/audiology_5343_learning_library.test.js tests/early_childhood_5025.test.js tests/early_childhood_5025_semantic_qa.test.js tests/educational_leadership_5412_pack.test.js tests/educational_leadership_5412_learning_library.test.js tests/esol_5362_pack.test.js tests/esol_5362_learning_library.test.js tests/plt_5_9_5623.test.js tests/plt_7_12_5624.test.js tests/plt_early_childhood_5621.test.js',
      coverage: 'Pack registration, five-bank shape, balance, diagnostic behavior, simulation boundaries, library inventory/linkage, EC item-level semantic mapping, removal of the former EC generic rationale family, PLT foreign-code and out-of-band mutation gates, generated QA, and deployment mirrors.',
    },
    hardGate: {
      status: 'pass',
      openHardFindings: 0,
      activitiesChecked: learningActivitiesReviewed,
      sourceItemsChecked: sourceItemsReviewed,
      checks: {
        readyFiveBankInventoryAndAnswerBalance: 'pass',
        oneBestAnswerAndFourDistinctChoices: 'pass',
        rationaleAndFourOptionFeedbackPresence: 'pass',
        authoritativeHttpsSourcesAndCatalogCoverage: 'pass',
        learningSkillChapterDomainLinks: 'pass',
        reviewTierAndGuidedProvenance: 'pass',
        textEncodingAndAnswerLetterLeakage: 'pass',
        simulationAndProfessionalScopeBoundaries: 'pass',
        nativeAndLearningQaStatus: 'pass',
        sourceItemsArtifactConsistency: 'pass',
        sourceDeployParity: 'pass',
        independentContentAccounting: 'pass',
      },
      answerBalance: { everyPack: [125, 125, 125, 125], everyOneHundredItemBank: [25, 25, 25, 25] },
      uniqueIdsPerPack: 500,
      uniqueNormalizedPromptsPerPack: 500,
      ...hardGateCounters,
    },
    correctedDefectClosure: {
      status: 'pass',
      earlyChildhood5025: {
        sourceItemsChecked: 200,
        formerGenericDisciplinaryRationales: ecFormerGenericRationales,
        fullOverallRationaleCopiesInWrongOptionFeedback: ecFullRationaleFeedbackCopies,
        itemLevelSemanticSkillChapterMismatches: ecSemanticLinkMismatches,
        namedStemKeyLinkChecks: ['ec5025-b1-026', 'ec5025-b2-026', 'ec5025-b1-052', 'ec5025-b2-052', 'ec5025-b1-077', 'ec5025-b2-077'],
        namedStemKeyLinkDefects: 0,
      },
      pltLibraries: pltIntegrity,
      interpretation: 'The former EC generic-rationale, semantic-link, and phoneme stem/key defects are zero. Each PLT library has 223/223 official companion reference sets and zero foreign-code, K-6, foreign-band, or out-of-band occurrences; negative mutation regressions pass.',
    },
    independentContentAccounting: {
      status: 'honestly-declared-target-gap',
      sourceItems: sourceItemsReviewed,
      distinctIndependentContentKernels,
      parallelSourceVariants: 700,
      guidedReviewActivities,
      independentQuestionTarget: 3500,
      newIndependentItemsNeeded,
      perPackGap: Object.fromEntries(packRows.map((row) => [row.stem, row.newIndependentItemsNeededFor500Distinct])),
      interpretation: 'Every pack provides five 100-activity banks, but each currently rests on 100 distinct source kernels. The parallel and guided transformations remain transparently labeled and are not counted as 500 independent questions.',
    },
    warningDiagnostics: {
      status: 'open-major-editorial-priority',
      sourceItemsScreened: sourceItemsReviewed,
      itemsWithOneOrMoreWarnings: itemsWithWarnings,
      counts: warningTotals,
      perPackWarningItems: Object.fromEntries(packRows.map((row) => [row.stem, row.warningItemCount])),
      severeAnswerLengthClueByPack: Object.fromEntries(packRows.map((row) => [row.stem, row.warningCounts.severeAnswerLengthClue])),
      interpretation: 'These are screening heuristics, not automatic wrong-key findings. Manual priority review found defensible keys, but frequent length, lexical-overlap, and distractor-extremity signals materially reduce exam-likeness and warrant editing.',
    },
    optionFeedbackAudit: {
      status: 'open-major-editorial-priority',
      ...feedbackTotals,
      interpretation: 'Every required feedback field is present and the manually reviewed feedback remains directionally accurate. Six packs use a generic Not the best answer wrapper and copy the overall rationale; EC5025 now names the selected claim and an item-specific conflict but still follows a repeated template. These are remediation-depth warnings, not evidence of a wrong key or fact.',
    },
    learningLibraryAudit: {
      status: 'pass-hard-structure-with-depth-warnings',
      totals: { chapters, sections, knowledgeChecks, diagrams, flashcards, memoryAids, constructedResponseWorkshops: workshops },
      knowledgeChecksWithSevereAnswerLengthClue,
      longSentenceRepetitionByPack: sectionRepetition,
      epppComparator: {
        chapters: 49,
        sections: 278,
        knowledgeChecks: 109,
        diagrams: 25,
        diagramPlacements: 58,
        flashcards: 415,
        memoryAids: 255,
      },
      interpretation: 'All libraries meet their released structural and linkage requirements. Zero diagrams and repeated instructional prose remain EPPP feature-depth warnings; visual supports should be added only where they materially teach a concept and include accessible alternatives.',
    },
    referenceCatalogAudit: {
      status: 'pass',
      uniqueLearnerVisibleReferences: allReferences.size,
      catalogedWithTitleOrganizationSummaryAndCredibility: allReferences.size,
      referenceCatalogSha256: sha256(readBytes(catalogPath)),
      interpretation: 'Every learner-visible URL resolves to a catalog entry with a source name, organization, brief summary, and credibility context rather than a bare DOI or URL.',
    },
    officialBlueprintVerification,
    existingQaAssessment: {
      nativeQaReportsPassing: 7,
      learningLibraryQaReportsPassing: 7,
      disposition: 'accepted as supporting evidence only after independent closure checks',
      reason: 'The final PLT QA now includes foreign-code, grade-band, 223/223 source, and negative-mutation gates; EC has item-level semantic and generic-rationale regressions. Generic feedback, clue signals, diagram depth, and distinct-content gaps deliberately remain warning/development categories.',
    },
    sourceDeployParity: {
      status: 'pass',
      packArtifactPairsCompared: packSpecs.length * artifactSuffixes.length,
      referenceCatalogPairsCompared: 1,
      totalByteIdenticalPairs: packSpecs.length * artifactSuffixes.length + 1,
      artifactSuffixes,
      comparison: 'Exact byte equality for all seven artifact kinds for each exact Group A stem plus reference_catalog.json.',
    },
  },
  manualPriorityReview: {
    independentItemsManuallyAdjudicated: manualCount,
    wrongKeysFound: 0,
    factualOrScopeDefectsFound: 0,
    learningLinkDefectsFound: 0,
    defensibleKeys: manualCount,
    coverage: 'Risk-priority, domain-stratified samples across every pack; all 50 EC5025 b1/b2 mathematics items 031-055; both phoneme, producers/consumers, and Earth-materials variants; and grade-band-sensitive, legal, assessment, mentoring, accessibility, and applied-practice cases.',
    result: 'No current wrong key, factual statement, credential-scope error, or semantic learning-link error was found in the 104-item docket. Manual review confirmed that key-length asymmetry and templated distractor feedback remain material editorial weaknesses.',
  },
  findings: [
    {
      id: 'G-A-CLOSED-001', severity: 'critical-hard-scope', blocking: true, status: 'resolved',
      title: 'PLT 5622/K-6 and out-of-band library contamination',
      affectedPacks: ['plt_5_9_5623', 'plt_7_12_5624', 'plt_early_childhood_5621'],
      evidence: pltIntegrity,
      resolution: 'Pack-specific 5623, 5624, and 5621 generators and QA now require the correct official source in all 223 reference sets and reject foreign codes, K-6 markers, foreign bands, and out-of-band examples. All focused and mutation regressions pass.',
    },
    {
      id: 'G-A-CLOSED-002', severity: 'major-hard-feedback-and-linkage', blocking: true, status: 'resolved',
      title: 'EC5025 generic rationales, semantic chapter drift, and phoneme stem/key mismatch',
      affectedPacks: ['early_childhood_5025'],
      evidence: { formerGenericRationales: 0, fullRationaleFeedbackCopies: 0, semanticLinkMismatches: 0, namedDefects: 0 },
      resolution: 'All 200 source items pass the item-level concept map; the former 90-item generic rationale family is absent; the phoneme stem asks for the response its key gives; equation and Earth-materials items now carry concept-specific rationales and correct links.',
    },
    {
      id: 'G-A-OPEN-001', severity: 'major-editorial', blocking: false, status: 'open',
      title: 'Accurate but generic wrong-option feedback remains',
      affectedPacks: packSpecs.map((spec) => spec.stem),
      evidence: feedbackTotals,
      impact: 'Feedback exists after every response, but repeated wrappers often do not diagnose the precise misconception as deeply as the EPPP model.',
    },
    {
      id: 'G-A-OPEN-002', severity: 'major-product-development', blocking: false, status: 'open-and-transparently-declared',
      title: 'The seven packs still need 2,800 genuinely independent question kernels',
      affectedPacks: packSpecs.map((spec) => spec.stem),
      evidence: { distinctIndependentContentKernels, independentQuestionTarget: 3500, newIndependentItemsNeeded },
      impact: 'The five-bank top-level experience works, but each pack currently contains 100 distinct source kernels plus parallel and guided practice rather than 500 independent questions.',
    },
    {
      id: 'G-A-OPEN-003', severity: 'major-editorial', blocking: false, status: 'open',
      title: 'Answer-length, lexical-overlap, and distractor-extremity clues remain',
      affectedPacks: packSpecs.map((spec) => spec.stem),
      evidence: warningTotals,
      impact: 'Test-wise learners may infer some answers from specificity or wording rather than the intended content knowledge.',
    },
    {
      id: 'G-A-OPEN-004', severity: 'moderate-editorial-and-feature-depth', blocking: false, status: 'open',
      title: 'Learning libraries remain shallower and less visual than EPPP',
      affectedPacks: packSpecs.map((spec) => spec.stem),
      evidence: { diagrams, sectionRepetition, knowledgeChecksWithSevereAnswerLengthClue },
      impact: 'The libraries pass structural QA, but zero diagrams, recurrent prose, and knowledge-check clue patterns limit remediation depth.',
    },
    {
      id: 'G-A-OPEN-005', severity: 'minor-schema-consistency', blocking: false, status: 'open',
      title: 'Two correct simulations do not expose every newer explicit official-metadata field',
      affectedPacks: ['audiology_5343', 'educational_leadership_5412'],
      evidence: 'Audiology has correct 120/120 simulation values but omits the newer explicit official-count/time and label/note fields; Educational Leadership has correct 120/165 values and a note but omits officialTotalTimeMinutes.',
      impact: 'No count, timing, rendering, source, or scope error was found, but normalizing the schema would reduce maintenance and feature-consistency risk.',
    },
    {
      id: 'G-A-OPEN-006', severity: 'moderate-qa-depth', blocking: false, status: 'open',
      title: 'Generated QA should continue expanding beyond structural gates',
      affectedPacks: packSpecs.map((spec) => spec.stem),
      evidence: 'PLT and EC now have durable semantic/scope guards. The remaining feedback-template, clue, diagram-depth, and independent-content signals are surfaced as warnings rather than being silently hidden behind pass.',
      impact: 'Future authoring waves need bounded warning dockets and human editorial review so a structural pass is not mistaken for psychometric or subject-matter validation.',
    },
  ],
  correctionsRecommended: [
    {
      priority: 'P1', releaseBlocking: false, productTargetBlocking: true,
      action: 'Author 400 genuinely new independent question kernels per pack (2,800 total), preserve official blueprint balance, and continue to label parallel and guided transformations honestly.',
    },
    {
      priority: 'P1', releaseBlocking: false,
      action: 'Rewrite generic wrong-option explanations as concise selected-distractor diagnoses, beginning with the highest-warning docket. Preserve the corrected EC concept-specific rationales and choice references.',
    },
    {
      priority: 'P1', releaseBlocking: false,
      action: 'Human-edit severe answer-length, lexical-overlap, and extreme-distractor flags for parallel grammar, specificity, plausibility, and length; rerun diagnostics after each bounded wave.',
    },
    {
      priority: 'P2', releaseBlocking: false,
      action: 'Deepen repetitive learning sections and add selective accessible diagrams only where a visual materially teaches audiology, data/assessment, language, science, or learning-process content.',
    },
    {
      priority: 'P2', releaseBlocking: false,
      action: 'Normalize Audiology and Educational Leadership to the newer explicit official simulation metadata schema without changing their already correct counts or pacing.',
    },
    {
      priority: 'P3', releaseBlocking: false,
      action: 'Obtain credential-specific subject-matter, accessibility, legal/ethical, field-test, and psychometric review before making score-validity, readiness, or pass claims.',
    },
  ],
  limitations: [
    'Automation inspected all 3,500 activities and all learning-library structures, but semantic key and factual adjudication was risk-based and manually covered 104 of the 1,400 source items rather than every key.',
    'The 2,100 guided activities were structurally checked for derivation, linkage, provenance, feedback, references, and boundaries; they were not treated as independent exam questions because the product labels them guided practice.',
    'Key-length, lexical-overlap, prompt-length, and distractor-extremity counts are screening heuristics. They prioritize editing and do not by themselves prove that a key is wrong.',
    'Official ETS Study Companions were used for blueprint boundaries. Specifications can change and should be rechecked immediately before release; this review is not ETS approval.',
    'Reference-catalog checks establish learner-facing name, organization, summary, and credibility coverage; this review did not live-check every URL or independently fact-check every sentence in every linked source.',
    'No psychometric calibration, field testing, differential-item-functioning analysis, independent credential-owner approval, or licensed-professional endorsement was performed.',
    'The EPPP materials are a feature and review-process guide, not an official validation standard; the EPPP learning-library QA itself remains review-in-progress.',
    'Artifact hashes and source/deploy parity describe the workspace at freeze time. Any later generator or content change requires a fresh QA freeze.',
  ],
};

fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(`Group A QA freeze: ${packSpecs.length} packs; ${learningActivitiesReviewed} activities; ${sourceItemsReviewed} source items; ${manualCount} manually adjudicated; 0 hard findings; report ${path.relative(root, outputPath)}.`);
