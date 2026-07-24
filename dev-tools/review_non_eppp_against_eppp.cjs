#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const sourceDir = path.join(root, 'test_prep');
const deployDir = path.join(root, 'desktop/web-app', 'public', 'test_prep');
const authoredDir = path.join(__dirname, 'authored');
const authoredManifestPath = path.join(authoredDir, 'test_prep_independent_additions_manifest.json');
const { validateAuthoredEvidence } = require('./non_eppp_authored_evidence.cjs');
const authoredEvidenceSnapshotPaths = new Set([authoredManifestPath]);
const reviewedAt = '2026-07-18';
const reportBase = 'non_eppp_eppp_guided_qa_2026-07-18';
const packFiles = fs.readdirSync(sourceDir)
  .filter((name) => name.endsWith('_pack.json') && !name.startsWith('eppp_'))
  .sort();
const catalogPath = path.join(sourceDir, 'reference_catalog.json');
const epppQaPath = path.join(sourceDir, 'eppp_native_qa.json');
const epppLibraryPath = path.join(sourceDir, 'eppp_learning_library.json');
const catalogBytes = fs.readFileSync(catalogPath);
const epppQaBytes = fs.readFileSync(epppQaPath);
const epppLibraryBytes = fs.readFileSync(epppLibraryPath);
const catalog = JSON.parse(catalogBytes);
const epppQa = JSON.parse(epppQaBytes);
const epppLibrary = JSON.parse(epppLibraryBytes);
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const visibleEncodingCorruption = /(?:\u00c3[\u0080-\u00bf]|\u00c2[\u0080-\u00bf]|\u00e2(?:\u20ac|[\u0080-\u00bf])|\u00f0\u0178|\u00ef\u00bf\u00bd|\ufffd)/u;
const hardChecks = [
  'pack-inventory-and-bank-balance',
  'one-best-answer-structure',
  'distinct-choice-and-prompt-structure',
  'rationale-and-option-feedback',
  'source-catalog-coverage',
  'learning-library-linkage',
  'review-tier-honesty',
  'text-encoding',
  'simulation-and-boundary-metadata',
  'native-and-library-qa',
  'source-deploy-parity',
  'independent-content-accounting',
  'independent-authored-review-evidence',
  'credential-scope-and-semantic-integrity',
  'independent-eppp-guided-review-evidence',
];
const warningChecks = [
  'short-prompt',
  'severe-answer-length-clue',
  'key-stem-lexical-leakage',
  'asymmetric-extreme-distractors',
  'advanced-direct-recall',
  'incorrect-option-feedback-detail',
  'incorrect-option-choice-restatement',
  'incorrect-option-full-key-echo',
  'source-bundle-reuse',
  'cross-pack-response-kernel-reuse',
  'independent-content-gap',
  'eppp-feature-depth-gap',
];

function canonical(value) {
  return String(value == null ? '' : value).normalize('NFKC').toLowerCase()
    .replace(/["']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}
function raw(value) {
  return String(value == null ? '' : value).normalize('NFKC').replace(/\s+/g, ' ').trim();
}
function words(value) {
  return raw(value).split(/\s+/).filter(Boolean).length;
}
function invalidCatalogDetail(detail) {
  const text = JSON.stringify(detail || {});
  return !detail || raw(detail.title).length < 12 || raw(detail.organization).length < 4
    || raw(detail.summary).length < 40 || raw(detail.credibility).length < 40
    || detail.metadataSource === 'url-derived-reviewed-fallback'
    || /^Scholarly source \(DOI |^Referenced educational source$/i.test(raw(detail.title))
    || /&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i.test(text) || visibleEncodingCorruption.test(text);
}
function contentKernel(item) {
  return JSON.stringify({
    answer: canonical(item.choices && item.choices[item.answerIndex]),
    distractors: (item.choices || []).filter((_, index) => index !== item.answerIndex).map(canonical).sort(),
    rationale: canonical(item.rationale),
    references: (item.references || []).map(canonical).sort(),
  });
}
function responseKernel(item) {
  return JSON.stringify((item.choices || []).map(canonical).sort());
}
function answerCounts(items) {
  return [0, 1, 2, 3].map((key) => items.filter((item) => item.answerIndex === key).length);
}
const { warningCodes } = require('./non_eppp_warning_checks.cjs');
function hardItemFindings(item, index, pack, skills, chapters) {
  const findings = [];
  const add = (check, message) => findings.push({ check, message });
  const choices = Array.isArray(item.choices) ? item.choices : [];
  if (!item.id || item.type !== 'single-choice' || !raw(item.prompt) || choices.length !== 4
      || !Number.isInteger(item.answerIndex) || item.answerIndex < 0 || item.answerIndex > 3) {
    add('one-best-answer-structure', 'Item lacks a complete single-choice structure or valid key.');
  }
  if (new Set(choices.map(raw)).size !== choices.length || choices.some((choice) => !raw(choice))
      || choices.some((choice) => /\b(?:all|none) of the above\b/i.test(choice))) {
    add('distinct-choice-and-prompt-structure', 'Choices must be distinct and cannot use all/none-of-the-above.');
  }
  if (raw(item.rationale).length < 80 || !Array.isArray(item.choiceRationales)
      || item.choiceRationales.length !== 4
      || item.choiceRationales.some((feedback) => raw(feedback).length < 20)) {
    add('rationale-and-option-feedback', 'Item lacks a substantive rationale or four option explanations.');
  }
  const references = Array.isArray(item.references) ? item.references : [];
  if (!references.length || references.some((reference) => !/^https:\/\//i.test(reference))) {
    add('source-catalog-coverage', 'Every item needs at least one HTTPS source.');
  }
  for (const reference of references) {
    const detail = catalog[reference];
    if (invalidCatalogDetail(detail)) {
      add('source-catalog-coverage', 'Incomplete source metadata: ' + reference);
    }
  }
  const skill = skills.get(item.skillIds && item.skillIds[0]);
  const chapter = chapters.get(item.chapterIds && item.chapterIds[0]);
  if (item.skillIds?.length !== 1 || item.chapterIds?.length !== 1 || !skill || !chapter
      || skill.domainId !== item.domainId || skill.chapterId !== chapter.id || chapter.skillId !== skill.id) {
    add('learning-library-linkage', 'Item does not resolve to one compatible released skill and chapter.');
  }
  const sourceCount = Number(pack.sourceQuestionItems) || 200;
  const independentCount = Number(pack.independentPracticeItems) || sourceCount;
  if (index < sourceCount) {
    if (item.reviewStatus !== 'source-reviewed' || item.qaStatus !== 'qa-passed') {
      add('review-tier-honesty', 'Original source item lacks source-reviewed and qa-passed status.');
    }
  } else if (index < independentCount) {
    if (item.authorship !== 'assistant-authored-independent'
        || item.reviewStatus !== 'assistant-reviewed-independent-practice-item'
        || item.qaStatus !== 'qa-passed-independent-practice-item' || item.sourceItemId) {
      add('review-tier-honesty', 'Independent addition lacks approved independent-practice provenance.');
    }
  } else if (item.reviewStatus !== 'assistant-reviewed-guided-practice-only'
      || item.qaStatus !== 'structural-qa-passed-guided-practice-only'
      || item.examItemStatus !== 'not-approved-as-independent-exam-item' || !item.sourceItemId) {
    add('review-tier-honesty', 'Guided activity is not honestly labeled and source-linked.');
  }
  const text = [item.prompt].concat(choices, item.rationale || '', item.choiceRationales || []).join('\n');
  if (visibleEncodingCorruption.test(text)
      || /\bCorrect\s*:\s*\([A-D]\)/i.test(text)) {
    add('text-encoding', 'Visible encoding corruption or a brittle answer-letter label remains.');
  }
  return findings;
}
function mirror(sourcePath, deployPath, findings, label) {
  if (!fs.existsSync(sourcePath) || !fs.existsSync(deployPath)
      || !fs.readFileSync(sourcePath).equals(fs.readFileSync(deployPath))) {
    findings.push({ check: 'source-deploy-parity', message: label + ' differs between source and deploy.' });
  }
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
function libraryInventory(library) {
  const chapters = Array.isArray(library.chapters) ? library.chapters : [];
  const sections = chapters.flatMap((chapter) => Array.isArray(chapter.sections) ? chapter.sections : []);
  const knowledgeChecks = chapters.flatMap((chapter) => Array.isArray(chapter.knowledgeChecks) ? chapter.knowledgeChecks : []);
  return {
    chapters: chapters.length,
    sections: sections.length,
    knowledgeChecks: knowledgeChecks.length,
    flashcards: Array.isArray(library.flashcards) ? library.flashcards.length : 0,
    memoryAids: Array.isArray(library.memoryAids) ? library.memoryAids.length : 0,
    diagrams: Array.isArray(library.diagrams) ? library.diagrams.length : 0,
    sectionsList: sections,
    knowledgeChecksList: knowledgeChecks,
    diagramsList: Array.isArray(library.diagrams) ? library.diagrams : [],
  };
}
function duplicateIds(records) {
  const ids = records.map((entry) => raw(entry && entry.id)).filter(Boolean);
  return ids.length !== records.length || new Set(ids).size !== ids.length;
}
function libraryFindings(library) {
  const findings = [];
  const summary = library.summary || {};
  const inventory = libraryInventory(library);
  if (inventory.chapters !== 12 || inventory.sections !== 48 || inventory.knowledgeChecks !== 60
      || inventory.flashcards !== 75 || inventory.memoryAids !== 20
      || summary.chapters !== inventory.chapters || summary.sections !== inventory.sections
      || summary.knowledgeChecks !== inventory.knowledgeChecks || summary.flashcards !== inventory.flashcards
      || summary.memoryAids !== inventory.memoryAids) {
    findings.push({ check: 'learning-library-linkage', message: 'Derived learning-library inventory is incomplete or differs from its declared summary.' });
  }
  const skills = Array.isArray(library.skills) ? library.skills : [];
  const chapters = Array.isArray(library.chapters) ? library.chapters : [];
  const flashcards = Array.isArray(library.flashcards) ? library.flashcards : [];
  const memoryAids = Array.isArray(library.memoryAids) ? library.memoryAids : [];
  const allRecords = skills.concat(chapters, inventory.sectionsList, inventory.knowledgeChecksList,
    flashcards, memoryAids, inventory.diagramsList);
  if (duplicateIds(allRecords)) {
    findings.push({ check: 'learning-library-linkage', message: 'Learning-library records contain missing or duplicate identifiers.' });
  }
  const skillMap = new Map(skills.map((skill) => [skill.id, skill]));
  for (const chapter of chapters) {
    if (!chapter.id || !skillMap.has(chapter.skillId) || chapter.sections?.length !== 4
        || chapter.knowledgeChecks?.length !== 5
        || chapter.sections.some((section) => raw(section.content).length < 250)
        || chapter.knowledgeChecks.some((check) => check.choices?.length !== 4
          || !Number.isInteger(check.answerIndex) || check.answerIndex < 0 || check.answerIndex > 3
          || raw(check.rationale).length < 70)) {
      findings.push({ check: 'learning-library-linkage', message: 'Invalid chapter, lesson, or knowledge check: ' + (chapter.id || '(missing)') });
    }
  }
  return findings;
}

if (packFiles.length !== 22) throw new Error('Expected 22 non-EPPP packs, found ' + packFiles.length + '.');
const credentialCodes = packFiles.map((file) => (file.replace('_pack.json', '').match(/_(\d{4})$/) || [])[1]).filter(Boolean);
const simulationMinutesByStem = {
  parapro: 150, audiology_5343: 120, early_childhood_5025: 120, educational_leadership_5412: 165,
  esol_5362: 120, plt_5_9_5623: 70, plt_7_12_5624: 70, plt_early_childhood_5621: 70,
  plt_k6_5622: 70, praxis_core_5752: 215, reading_specialist_5302: 150, school_counselor_5422: 120,
  school_librarian_5312: 120, school_psychologist_5403: 125, special_education_5355: 120,
  special_education_behavior_emotional_5372: 120, special_education_early_childhood_5692: 120,
  special_education_intellectual_disabilities_5322: 120, special_education_learning_disabilities_5383: 120,
  special_education_severe_profound_5547: 120, speech_language_pathology_5331: 150, teaching_reading_5205: 120,
};

const aggregate = {
  packsReviewed: 22,
  learningActivitiesStructurallyReviewed: 0,
  originalSourceItemsReviewed: 0,
  assistantAuthoredIndependentItemsReviewed: 0,
  independentPracticeItemsReviewed: 0,
  distinctIndependentContentKernels: 0,
  guidedReviewActivitiesReviewed: 0,
  independentQuestionTarget: 11000,
  newIndependentItemsNeeded: 0,
  librariesReviewed: 0,
  chaptersReviewed: 0,
  lessonsReviewed: 0,
  knowledgeChecksReviewed: 0,
  flashcardsReviewed: 0,
  memoryAidsReviewed: 0,
  uniqueReferencesReviewed: 0,
  warningCounts: Object.fromEntries(warningChecks.map((check) => [check, 0])),
};
const allReferences = new Set();
const hardFindings = [];
const warningDocket = [];
const perPack = [];
const responseKernelIndex = new Map();

for (const file of packFiles) {
  const stem = file.replace('_pack.json', '');
  const paths = {
    pack: path.join(sourceDir, file),
    deployPack: path.join(deployDir, file),
    library: path.join(sourceDir, stem + '_learning_library.json'),
    deployLibrary: path.join(deployDir, stem + '_learning_library.json'),
    nativeQa: path.join(sourceDir, stem + '_native_qa.json'),
    deployNativeQa: path.join(deployDir, stem + '_native_qa.json'),
    libraryQa: path.join(sourceDir, stem + '_learning_library_qa.json'),
    deployLibraryQa: path.join(deployDir, stem + '_learning_library_qa.json'),
  };
  const packBytes = fs.readFileSync(paths.pack);
  const libraryBytes = fs.readFileSync(paths.library);
  const nativeQaBytes = fs.readFileSync(paths.nativeQa);
  const libraryQaBytes = fs.readFileSync(paths.libraryQa);
  const pack = JSON.parse(packBytes);
  const library = JSON.parse(libraryBytes);
  const nativeQa = JSON.parse(nativeQaBytes);
  const libraryQa = JSON.parse(libraryQaBytes);
  const skills = new Map((library.skills || []).map((skill) => [skill.id, skill]));
  const chapters = new Map((library.chapters || []).map((chapter) => [chapter.id, chapter]));
  const libraryInventoryCounts = libraryInventory(library);
  const currentHard = [];
  const currentItems = [];
  const currentWarnings = [];
  const { items: _packItems, ...packMetadata } = pack;
  const packMetadataText = JSON.stringify(packMetadata);
  if (visibleEncodingCorruption.test(packMetadataText) || /&(?:#\d+|#x[0-9a-f]+|[a-z]+);/i.test(packMetadataText)) {
    currentHard.push({ check: 'text-encoding', message: 'Pack metadata contains visible encoding corruption or an undecoded HTML entity.' });
  }
  const sourceCount = Number(pack.sourceQuestionItems) || 200;
  const authoredCount = Number(pack.assistantAuthoredIndependentItems) || 0;
  const independentCount = Number(pack.independentPracticeItems) || sourceCount + authoredCount;
  const guidedCount = Number.isFinite(Number(pack.guidedReviewItems))
    ? Number(pack.guidedReviewItems) : pack.items.length - independentCount;
  const kernels = new Set(pack.items.slice(0, independentCount).map(contentKernel)).size;
  const gap = 500 - kernels;

  if (!Number.isInteger(Number(pack.sourceQuestionItems))
      || !Number.isInteger(Number(pack.assistantAuthoredIndependentItems))
      || !Number.isInteger(Number(pack.independentPracticeItems))
      || !Number.isInteger(Number(pack.guidedReviewItems))
      || sourceCount !== 200 || authoredCount < 0 || independentCount < sourceCount
      || guidedCount < 0 || sourceCount + authoredCount !== independentCount
      || independentCount + guidedCount !== pack.items.length) {
    currentHard.push({ check: 'independent-content-accounting', message: 'Declared source, authored-independent, independent-practice, and guided-practice counts are invalid or do not reconcile to the released items.' });
  }

  const authoredEvidence = validateAuthoredEvidence({ pack, stem, root });
  for (const message of authoredEvidence.findings) {
    currentHard.push({ check: 'independent-authored-review-evidence', message });
  }
  for (const evidencePath of authoredEvidence.snapshotPaths) authoredEvidenceSnapshotPaths.add(evidencePath);

  if (pack.items.length !== 500 || pack.batchSize !== 100 || pack.sections?.length !== 5 || pack.status !== 'ready') {
    currentHard.push({ check: 'pack-inventory-and-bank-balance', message: 'Pack must be ready with five 100-item banks.' });
  }
  if (new Set(pack.items.map((item) => item.id)).size !== 500
      || new Set(pack.items.map((item) => canonical(item.prompt))).size !== 500) {
    currentHard.push({ check: 'distinct-choice-and-prompt-structure', message: 'Duplicate IDs or normalized prompts remain.' });
  }
  if (answerCounts(pack.items).some((count) => count !== 125)) {
    currentHard.push({ check: 'pack-inventory-and-bank-balance', message: 'Full-pack answer keys are not 125/125/125/125.' });
  }
  for (let bankIndex = 0; bankIndex < 5; bankIndex++) {
    const bank = pack.items.slice(bankIndex * 100, bankIndex * 100 + 100);
    if (bank.length !== 100 || answerCounts(bank).some((count) => count !== 25)) {
      currentHard.push({ check: 'pack-inventory-and-bank-balance', message: 'Bank ' + (bankIndex + 1) + ' is not 100 items with 25 keys per position.' });
    }
  }
  const declaredKernels = Number(pack.distinctIndependentContentKernels ?? pack.distinctSourceContentKernels);
  if (kernels !== declaredKernels
      || gap !== Number(pack.newIndependentItemsNeeded) || independentCount + guidedCount !== 500) {
    currentHard.push({ check: 'independent-content-accounting', message: 'Independent/guided kernel accounting is stale.' });
  }
  if (!Number.isInteger(pack.simulationItemCount) || pack.simulationItemCount < 1
      || !Number.isInteger(pack.simulationTimeMinutes) || pack.simulationTimeMinutes < 1
      || pack.simulationTimeMinutes !== simulationMinutesByStem[stem]
      || pack.officialSelectedResponseCount !== pack.simulationItemCount
      || !Number.isInteger(pack.officialConstructedResponseCount) || pack.officialConstructedResponseCount < 0
      || !Number.isInteger(pack.officialTotalTimeMinutes) || pack.simulationTimeMinutes > pack.officialTotalTimeMinutes
      || raw(pack.simulationDomainCountsBasis).length < 12
      || !/not official|independent/i.test(String(pack.disclaimer || ''))
      || !/score|pass prediction/i.test(String(pack.disclaimer || ''))) {
    currentHard.push({ check: 'simulation-and-boundary-metadata', message: 'Simulation or independent-preparation boundary is incomplete.' });
  }
  const simulationDomainCounts = pack.simulationDomainCounts && typeof pack.simulationDomainCounts === 'object' ? pack.simulationDomainCounts : {};
  if (!Object.keys(simulationDomainCounts).length) {
    currentHard.push({ check: 'simulation-and-boundary-metadata', message: 'Simulation domain allocation metadata is missing.' });
  } else {
    const simulationTotal = Object.values(simulationDomainCounts).reduce((sum, value) => sum + Number(value || 0), 0);
    const undeclaredSimulationDomain = Object.keys(simulationDomainCounts).find((domainId) => !pack.domains.some((domain) => domain.id === domainId));
    const undersuppliedSimulationDomain = Object.entries(simulationDomainCounts).find(([domainId, required]) =>
      pack.items.filter((item) => item.domainId === domainId && item.examItemStatus !== 'not-approved-as-independent-exam-item').length < Number(required)
    );
    if (simulationTotal !== pack.simulationItemCount || undeclaredSimulationDomain || undersuppliedSimulationDomain) {
      currentHard.push({ check: 'simulation-and-boundary-metadata', message: 'Simulation domain allocation is invalid or cannot be supplied by independent items.' });
    }
  }
  if (nativeQa.summary?.status !== 'pass' || libraryQa.summary?.status !== 'pass') {
    currentHard.push({ check: 'native-and-library-qa', message: 'Native or library QA is not passing.' });
  }
  const expectedSourceItemsSha256 = sha256(Buffer.from(JSON.stringify(pack.items.slice(0, sourceCount))));
  const expectedLearningLibrarySha256 = sha256(fs.readFileSync(paths.library));
  for (const [label, qa] of [['native', nativeQa], ['learning-library', libraryQa]]) {
    const binding = qa.contentBinding;
    if (!binding || binding.algorithm !== 'sha256' || binding.reviewedAt !== reviewedAt
        || binding.sourceItemCount !== sourceCount
        || binding.sourceItemsSha256 !== expectedSourceItemsSha256
        || binding.learningLibrarySha256 !== expectedLearningLibrarySha256) {
      currentHard.push({ check: 'native-and-library-qa', message: label + ' QA is not bound to the released source items and learning library.' });
    }
  }
  mirror(paths.pack, paths.deployPack, currentHard, stem + ' pack');
  mirror(paths.library, paths.deployLibrary, currentHard, stem + ' library');
  mirror(paths.nativeQa, paths.deployNativeQa, currentHard, stem + ' native QA');
  mirror(paths.libraryQa, paths.deployLibraryQa, currentHard, stem + ' library QA');
  currentHard.push(...libraryFindings(library));
  const libraryReferences = collectHttpsReferences(library);
  for (const reference of libraryReferences) {
    allReferences.add(reference);
    const detail = catalog[reference];
    if (invalidCatalogDetail(detail)) {
      currentHard.push({ check: 'source-catalog-coverage', message: 'Incomplete learning-library source metadata: ' + reference });
    }
  }
  const forbiddenCredentialPatterns = {
    plt_5_9_5623: [/\b5621\b/, /\b5622\b/, /\b5624\b/, /\bK\s*[\-–]\s*6\b/i],
    plt_7_12_5624: [/\b5621\b/, /\b5622\b/, /\b5623\b/, /\bK\s*[\-–]\s*6\b/i],
    plt_early_childhood_5621: [/\b5622\b/, /\b5623\b/, /\b5624\b/, /\bK\s*[\-–]\s*6\b/i],
    special_education_behavior_emotional_5372: [/\b5383\b/, /learning-disabilities specialists?/i],
    special_education_intellectual_disabilities_5322: [/\b5383\b/, /learning-disabilities specialists?/i],
    special_education_early_childhood_5692: [/\byoung childs\b/i, /\ba early\b/i, /early intervention or school program/i, /\bIFSP or IEP\b/i, /\bturns 16\b/i, /\badult-service\b/i],
    teaching_reading_5205: [/\b5302\b/, /\breading specialists?\b/i, /\bliteracy specialists?\b/i, /phoneme\?grapheme/i, /measure\?s/i, /student\?s/i, /task\?s/i],
  };
  const libraryText = JSON.stringify(library);
  const credentialText = JSON.stringify(pack) + '\n' + libraryText;
  const ownCredentialCode = (stem.match(/_(\d{4})$/) || [])[1];
  for (const foreignCode of credentialCodes.filter((code) => code !== ownCredentialCode)) {
    if (new RegExp('\\b' + foreignCode + '\\b').test(credentialText)) {
      currentHard.push({ check: 'credential-scope-and-semantic-integrity', message: 'Pack or learning library contains foreign credential code ' + foreignCode + '.' });
    }
  }
  for (const pattern of forbiddenCredentialPatterns[stem] || []) {
    if (pattern.test(credentialText)) currentHard.push({ check: 'credential-scope-and-semantic-integrity', message: 'Pack or learning library contains a known foreign-scope or malformed credential marker: ' + pattern });
  }

  for (let index = 0; index < pack.items.length; index++) {
    const item = pack.items[index];
    const itemHard = hardItemFindings(item, index, pack, skills, chapters);
    if (itemHard.length) currentItems.push({ id: item.id, itemNumber: index + 1, findings: itemHard });
    for (const reference of item.references || []) allReferences.add(reference);
    if (index < independentCount) {
      const kernel = responseKernel(item);
      if (!responseKernelIndex.has(kernel)) responseKernelIndex.set(kernel, []);
      responseKernelIndex.get(kernel).push({ stem, id: item.id });
      const codes = warningCodes(item);
      if (codes.length) {
        currentWarnings.push({ id: item.id, itemNumber: index + 1, warnings: codes });
        for (const code of codes) aggregate.warningCounts[code]++;
      }
    }
  }

  const referenceBundles = pack.items.slice(0, independentCount)
    .map((item) => JSON.stringify([...(item.references || [])].sort()));
  const distinctReferenceBundles = new Set(referenceBundles).size;
  if (distinctReferenceBundles <= Math.max(2, Math.ceil(independentCount * 0.02))) {
    aggregate.warningCounts['source-bundle-reuse']++;
  }
  if (gap) aggregate.warningCounts['independent-content-gap']++;
  if ((library.summary?.diagrams || 0) === 0) aggregate.warningCounts['eppp-feature-depth-gap']++;

  const packHardCount = currentHard.length + currentItems.reduce((sum, entry) => sum + entry.findings.length, 0);
  hardFindings.push(
    ...currentHard.map((finding) => ({ stem, scope: 'pack-or-library', ...finding })),
    ...currentItems.flatMap((entry) => entry.findings.map((finding) =>
      ({ stem, scope: 'item', id: entry.id, itemNumber: entry.itemNumber, ...finding })
    ))
  );
  const priority = currentWarnings
    .map((entry) => ({ ...entry, score: entry.warnings.length }))
    .sort((left, right) => right.score - left.score || left.itemNumber - right.itemNumber)
    .slice(0, 10);
  warningDocket.push(...priority.map((entry) => ({ stem, ...entry })));

  aggregate.learningActivitiesStructurallyReviewed += pack.items.length;
  aggregate.originalSourceItemsReviewed += sourceCount;
  aggregate.assistantAuthoredIndependentItemsReviewed += authoredCount;
  aggregate.independentPracticeItemsReviewed += independentCount;
  aggregate.distinctIndependentContentKernels += kernels;
  aggregate.guidedReviewActivitiesReviewed += guidedCount;
  aggregate.newIndependentItemsNeeded += gap;
  aggregate.librariesReviewed++;
  aggregate.chaptersReviewed += libraryInventoryCounts.chapters;
  aggregate.lessonsReviewed += libraryInventoryCounts.sections;
  aggregate.knowledgeChecksReviewed += libraryInventoryCounts.knowledgeChecks;
  aggregate.flashcardsReviewed += libraryInventoryCounts.flashcards;
  aggregate.memoryAidsReviewed += libraryInventoryCounts.memoryAids;

  perPack.push({
    stem,
    packId: pack.id,
    title: pack.shortTitle || pack.title,
    packSha256: sha256(packBytes),
    learningLibrarySha256: sha256(libraryBytes),
    nativeQaSha256: sha256(nativeQaBytes),
    learningLibraryQaSha256: sha256(libraryQaBytes),
    learningActivities: pack.items.length,
    originalSourceItems: sourceCount,
    assistantAuthoredIndependentItems: authoredCount,
    independentPracticeItems: independentCount,
    distinctIndependentContentKernels: kernels,
    guidedReviewActivities: guidedCount,
    newIndependentItemsNeeded: gap,
    domains: pack.domains.length,
    simulation: { items: pack.simulationItemCount, minutes: pack.simulationTimeMinutes, domainCounts: pack.simulationDomainCounts || {}, basis: pack.simulationDomainCountsBasis },
    answerPositions: answerCounts(pack.items),
    library: {
      chapters: libraryInventoryCounts.chapters,
      lessons: libraryInventoryCounts.sections,
      knowledgeChecks: libraryInventoryCounts.knowledgeChecks,
      flashcards: libraryInventoryCounts.flashcards,
      memoryAids: libraryInventoryCounts.memoryAids,
      diagrams: libraryInventoryCounts.diagrams,
      constructedResponseWorkshops: library.summary?.constructedResponseWorkshops || 0,
      caseStudyDecisionLabs: library.summary?.caseStudyDecisionLabs || 0,
    },
    sourceCoverage: {
      uniqueReferences: new Set(pack.items.flatMap((item) => item.references || [])).size,
      distinctIndependentReferenceBundles: distinctReferenceBundles,
    },
    hardFindingCount: packHardCount,
    warningItemCount: currentWarnings.length,
    warningCounts: Object.fromEntries(warningChecks.slice(0, 8)
      .map((code) => [code, currentWarnings.filter((entry) => entry.warnings.includes(code)).length])),
    priorityWarnings: priority,
    structuralVerdict: packHardCount ? 'fail-hard-qa' : 'pass',
    contentDistinctnessVerdict: gap ? 'reviewed-gap-open' : 'target-met',
  });
}

const crossPackSharedResponseKernels = [...responseKernelIndex.values()]
  .map((occurrences) => ({ occurrences, stems: [...new Set(occurrences.map((entry) => entry.stem))].sort() }))
  .filter((entry) => entry.stems.length > 1)
  .sort((left, right) => right.occurrences.length - left.occurrences.length || left.stems.join('|').localeCompare(right.stems.join('|')));
aggregate.crossPackSharedResponseKernels = crossPackSharedResponseKernels.length;
aggregate.warningCounts['cross-pack-response-kernel-reuse'] = crossPackSharedResponseKernels.length;
for (const row of perPack) row.crossPackSharedResponseKernels = crossPackSharedResponseKernels.filter((entry) => entry.stems.includes(row.stem)).length;
aggregate.uniqueReferencesReviewed = allReferences.size;
if (aggregate.learningActivitiesStructurallyReviewed !== 11000) {
  hardFindings.push({ stem: 'suite', scope: 'inventory', check: 'pack-inventory-and-bank-balance', message: 'Expected 11,000 learning activities.' });
}

const reviewFiles = fs.existsSync(authoredDir)
  ? fs.readdirSync(authoredDir).filter((name) => /^non_eppp_eppp_guided_qa_group_[a-c]\.review\.json$/i.test(name)).sort()
  : [];
const independentReviewEvidence = reviewFiles.map((file) => {
  const evidence = JSON.parse(fs.readFileSync(path.join(authoredDir, file), 'utf8'));
  const packRows = evidence.packs || evidence.packStems || evidence.scope?.packs || [];
  const packs = packRows.map((entry) => typeof entry === 'string'
    ? entry : entry.stem || entry.packStem || entry.packId || entry.id).filter(Boolean);
  const reviewFindings = [
    ...(Array.isArray(evidence.findings) ? evidence.findings : []),
    ...(Array.isArray(evidence.manualPriorityFindings?.findings) ? evidence.manualPriorityFindings.findings : []),
    ...(Array.isArray(evidence.manualPriorityReview?.findings) ? evidence.manualPriorityReview.findings : []),
    ...(Array.isArray(evidence.results?.findings) ? evidence.results.findings : []),
  ];
  return {
    file,
    reviewedAt: evidence.reviewedAt,
    reviewer: evidence.reviewer,
    packs,
    automatedItemsReviewed: evidence.automatedItemsReviewed || evidence.independentItemsReviewed
      || evidence.sourceItemsReviewed || evidence.scope?.totals?.sourceItemsAutomated || 0,
    manuallyAdjudicatedItems: evidence.manuallyAdjudicatedItems
      || evidence.scope?.totals?.sourceItemsManuallyAdjudicated || evidence.results?.manualAdjudication?.items
      || evidence.manualPriorityFindings?.independentItemsManuallyAdjudicated
      || evidence.manualPriorityFindings?.length || 0,
    openBlockingFindings: reviewFindings.filter((finding) => finding.blocking === true && !/^(?:resolved|corrected|closed)/i.test(String(finding.status || ''))).length,
    artifactBindings: Array.isArray(evidence.artifactBindings) ? evidence.artifactBindings : [],
    verdict: evidence.verdict,
  };
});
const expectedReviewPacks = packFiles.map((file) => file.replace('_pack.json', '')).sort();
const reviewedPackList = independentReviewEvidence.flatMap((evidence) => evidence.packs);
const reviewedPackSet = [...new Set(reviewedPackList)].sort();
if (independentReviewEvidence.length !== 3
    || reviewedPackList.length !== expectedReviewPacks.length
    || JSON.stringify(reviewedPackSet) !== JSON.stringify(expectedReviewPacks)) {
  hardFindings.push({ stem: 'suite', scope: 'review-evidence', check: 'independent-eppp-guided-review-evidence', message: 'Three independent group reviews must cover every non-EPPP pack exactly once.' });
}
for (const evidence of independentReviewEvidence) {
  if (evidence.reviewedAt !== reviewedAt
      || evidence.reviewer !== 'OpenAI Codex independent EPPP-guided review'
      || evidence.automatedItemsReviewed < evidence.packs.length * 200
      || evidence.manuallyAdjudicatedItems < evidence.packs.length
      || evidence.openBlockingFindings !== 0
      || !/^pass/i.test(String(evidence.verdict || ''))) {
    hardFindings.push({ stem: 'suite', scope: 'review-evidence', check: 'independent-eppp-guided-review-evidence', message: evidence.file + ' is missing a current passing independent EPPP-guided verdict.' });
  }
  const bindingByStem = new Map(evidence.artifactBindings.map((binding) => [binding.stem, binding]));
  for (const stem of evidence.packs) {
    const binding = bindingByStem.get(stem);
    const pack = JSON.parse(fs.readFileSync(path.join(sourceDir, stem + '_pack.json'), 'utf8'));
    const expectedSourceHash = sha256(Buffer.from(JSON.stringify(pack.items.slice(0, 200))));
    const expectedLibraryHash = sha256(fs.readFileSync(path.join(sourceDir, stem + '_learning_library.json')));
    if (evidence.artifactBindings.length !== evidence.packs.length || !binding
        || binding.algorithm !== 'sha256' || binding.reviewedAt !== reviewedAt
        || binding.sourceItemCount !== 200 || binding.sourceItemsSha256 !== expectedSourceHash
        || binding.learningLibrarySha256 !== expectedLibraryHash) {
      hardFindings.push({ stem, scope: 'review-evidence', check: 'independent-eppp-guided-review-evidence', message: evidence.file + ' is not bound to this pack\'s exact reviewed source items and learning library.' });
    }
  }
}

const snapshotFiles = [
  catalogPath, epppQaPath, epppLibraryPath,
  ...packFiles.flatMap((file) => {
    const stem = file.replace('_pack.json', '');
    return [
      path.join(sourceDir, file),
      path.join(sourceDir, stem + '_learning_library.json'),
      path.join(sourceDir, stem + '_native_qa.json'),
      path.join(sourceDir, stem + '_learning_library_qa.json'),
    ];
  }),
  ...reviewFiles.map((file) => path.join(authoredDir, file)),
  ...authoredEvidenceSnapshotPaths,
];
const snapshotDependencies = snapshotFiles.map((file) => ({
  path: path.relative(root, file).replace(/\\/g, '/'),
  sha256: sha256(fs.readFileSync(file)),
})).sort((left, right) => left.path.localeCompare(right.path));
const snapshotSha256 = sha256(Buffer.from(JSON.stringify(snapshotDependencies)));
const status = hardFindings.length
  ? 'hard-qa-findings'
  : 'assistant-reviewed-pass-with-declared-content-gaps';
const report = {
  schemaVersion: 1,
  id: reportBase,
  reviewedAt,
  reviewer: 'OpenAI Codex',
  status,
  benchmark: {
    name: 'EPPP editorial, diagnostic, feedback, provenance, and learning-library QA model',
    epppNativeItems: epppQa.summary.totalItems,
    epppNativeQaStatus: epppQa.summary.status,
    epppHardChecks: epppQa.standard.checks,
    epppLibrary: epppLibrary.summary,
    adaptations: [
      'Applied EPPP one-best-answer, option-feedback, source, encoding, clue-resistance, provenance, and accessibility categories.',
      'Kept warning heuristics separate from hard release failures.',
      'Counted guided transformations as learning activities rather than new independent questions.',
      'Required readable title, organization, summary, and credibility metadata for every learner-visible source.',
      'Required every item to resolve to a released domain-compatible skill and chapter.',
    ],
  },
  standard: {
    hardChecks,
    warningChecks,
    passMeaning: 'A hard-QA pass confirms structure, balance, feedback presence, source metadata, learning linkage, credential scope, review-tier honesty, blueprint-aware simulation assembly, native QA, independent EPPP-guided review evidence, and exact deployment parity.',
    warningMeaning: 'Warnings are reviewed editorial signals, not automatic assertions that an answer is wrong.',
    distinctnessMeaning: 'Only independently usable questions count toward the 500-question target; guided transformations remain guided practice.',
    limitation: 'This assistant review is not ETS, ASPPB, or professional-association approval. Independent subject-matter validation, legal review, user accessibility testing, field testing, psychometric calibration, and score-validity evidence remain outside scope.',
  },
  snapshot: { algorithm: 'sha256', sha256: snapshotSha256, dependencyCount: snapshotDependencies.length, dependencies: snapshotDependencies },
  aggregate,
  independentReviewEvidence,
  hardFindings,
  crossPackReuse: { sharedResponseKernels: crossPackSharedResponseKernels.length, examples: crossPackSharedResponseKernels.slice(0, 100) },
  warningPriorityDocket: warningDocket
    .sort((left, right) => right.score - left.score || left.stem.localeCompare(right.stem) || left.itemNumber - right.itemNumber)
    .slice(0, 100),
  perPack,
  verdict: {
    hardQa: hardFindings.length ? 'fail' : 'pass',
    contentDistinctness: aggregate.newIndependentItemsNeeded ? 'reviewed-gap-open' : 'target-met',
    guidedActivities: 'approved-as-guided-practice-only',
    warningDiagnostics: 'reviewed-and-retained-as-editorial-priority-signals',
    overall: status,
  },
  nextWork: [
    'Complete each pack independent-question gap without relabeling guided transformations as exam questions.',
    'Replace cross-pack response-kernel reuse and mechanical adapters with credential-specific independently authored material.',
    'Use the warning docket for bounded distractor, clue-resistance, and incorrect-option-feedback refinement.',
    'Add purposeful visual supports where a domain genuinely benefits; zero diagrams is a parity gap, not automatically a defect.',
    'Commission independent credential-specific and psychometric review before making validity, readiness, or score claims.',
  ],
};

const rows = perPack.map((row) =>
  '| ' + row.title.replace(/\|/g, '/') + ' | ' + row.independentPracticeItems + ' | '
  + row.distinctIndependentContentKernels + ' | ' + row.guidedReviewActivities + ' | '
  + row.newIndependentItemsNeeded + ' | ' + row.hardFindingCount + ' | ' + row.warningItemCount + ' |'
);
const markdown = [
  '# Non-EPPP test-prep QA using EPPP as the guide',
  '',
  'Reviewed: ' + reviewedAt,
  '',
  'Status: **' + status + '**',
  '',
  '## Outcome',
  '',
  '- Packs reviewed: **' + aggregate.packsReviewed + '**',
  '- Learning activities structurally reviewed: **' + aggregate.learningActivitiesStructurallyReviewed.toLocaleString() + '**',
  '- Independent-practice items reviewed: **' + aggregate.independentPracticeItemsReviewed.toLocaleString() + '**',
  '- Distinct independent content kernels: **' + aggregate.distinctIndependentContentKernels.toLocaleString() + '**',
  '- Guided-review activities reviewed: **' + aggregate.guidedReviewActivitiesReviewed.toLocaleString() + '**',
  '- Remaining distinct-question gap: **' + aggregate.newIndependentItemsNeeded.toLocaleString() + '**',
  '- Exact response-option kernels shared across different packs: **' + aggregate.crossPackSharedResponseKernels.toLocaleString() + '**',
  '- Hard findings: **' + hardFindings.length + '**',
  '- Libraries: **' + aggregate.librariesReviewed + '** with ' + aggregate.chaptersReviewed
    + ' chapters, ' + aggregate.lessonsReviewed + ' lessons, ' + aggregate.knowledgeChecksReviewed
    + ' checks, ' + aggregate.flashcardsReviewed + ' flashcards, and ' + aggregate.memoryAidsReviewed + ' memory aids',
  '- Unique learner-visible sources reviewed: **' + aggregate.uniqueReferencesReviewed + '**',
  '',
  'A hard-QA pass does not mean every pack has 500 independent questions. Guided transformations remain guided practice and are excluded from the independent-question count.',
  '',
  '## Per-pack results',
  '',
  '| Pack | Independent practice | Distinct kernels | Guided review | New independent questions needed | Hard findings | Warning items |',
  '| --- | ---: | ---: | ---: | ---: | ---: | ---: |',
  ...rows,
  '',
  '## Boundary',
  '',
  report.standard.limitation,
].join('\n');

for (const outputRoot of [sourceDir, deployDir]) {
  fs.mkdirSync(outputRoot, { recursive: true });
  writeGeneratedFile(path.join(outputRoot, reportBase + '.json'), JSON.stringify(report, null, 2) + '\n');
  writeGeneratedFile(path.join(outputRoot, reportBase + '.md'), markdown + '\n');
}
console.log('Non-EPPP EPPP-guided QA: ' + aggregate.packsReviewed + ' packs; '
  + aggregate.learningActivitiesStructurallyReviewed + ' activities; '
  + hardFindings.length + ' hard findings; '
  + aggregate.newIndependentItemsNeeded + ' independent questions remain.');
if (hardFindings.length) process.exitCode = 1;