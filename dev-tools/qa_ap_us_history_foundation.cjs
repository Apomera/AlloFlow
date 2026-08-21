#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const packPath = path.join(root, 'test_prep', 'ap_us_history_foundation_pilot.json');
const libraryPath = path.join(root, 'test_prep', 'ap_us_history_foundation_pilot_learning_library.json');
const deployPackPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'ap_us_history_foundation_pilot.json');
const deployLibraryPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'ap_us_history_foundation_pilot_learning_library.json');
const reportPath = path.join(root, 'test_prep', 'ap_us_history_foundation_pilot_qa.json');

const PACK_ID = 'ap-us-history-foundation-pilot';
const CED_URL = 'https://apcentral.collegeboard.org/media/pdf/ap-us-history-course-and-exam-description.pdf';
const CLARIFICATIONS_URL = 'https://apcentral.collegeboard.org/media/pdf/ap-us-history-course-and-exam-description-clarifications.pdf';
const officialTopicIds = new Set([
  ...Array.from({ length: 7 }, (_, index) => `1.${index + 1}`),
  ...Array.from({ length: 8 }, (_, index) => `2.${index + 1}`),
  ...Array.from({ length: 13 }, (_, index) => `3.${index + 1}`),
  ...Array.from({ length: 14 }, (_, index) => `4.${index + 1}`),
  ...Array.from({ length: 12 }, (_, index) => `5.${index + 1}`),
  ...Array.from({ length: 14 }, (_, index) => `6.${index + 1}`),
  ...Array.from({ length: 15 }, (_, index) => `7.${index + 1}`),
  ...Array.from({ length: 15 }, (_, index) => `8.${index + 1}`),
  ...Array.from({ length: 7 }, (_, index) => `9.${index + 1}`),
]);
const expectedDomains = [
  ['period-1-1491-1607', 41],
  ['period-2-1607-1754', 47],
  ['period-3-1754-1800', 74],
  ['period-4-1800-1848', 80],
  ['period-5-1844-1877', 69],
  ['period-6-1865-1898', 80],
  ['period-7-1890-1945', 85],
  ['period-8-1945-1980', 84],
  ['period-9-1980-present', 40],
];
const expectedSkillIds = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
const expectedReasoningProcesses = ['comparison', 'causation', 'continuity-change'];
const expectedAnswerPositions = { 0: 150, 1: 150, 2: 150, 3: 150 };
const expectedLibrarySummary = {
  chapters: 9,
  sections: 27,
  diagrams: 9,
  diagramPlacements: 9,
  knowledgeChecks: 27,
  skills: 6,
  flashcards: 27,
  memoryAids: 9,
  constructedResponseWorkshops: 3,
  glossaryTerms: 27,
  sourceReviewedChapters: 9,
  sourceReviewedFlashcards: 27,
  sourceReviewedMemoryAids: 9,
  sourceReviewedConstructedResponseWorkshops: 3,
  independentExpertReviewedChapters: 0,
  releaseEligibleRecords: 0,
  sourceReviewedDiagrams: 9,
  independentExpertReviewedDiagrams: 0,
  contentCompleteSections: 27,
  structuredContentSections: 27,
  workedDataExamples: 27,
  sectionRetrievalChecks: 27,
};

function readAsset(filePath) {
  const bytes = fs.readFileSync(filePath);
  return {
    bytes,
    byteLength: bytes.length,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    json: JSON.parse(bytes.toString('utf8')),
  };
}

function countBy(records, valueFor) {
  const counts = {};
  for (const record of records) {
    const value = String(valueFor(record));
    counts[value] = (counts[value] || 0) + 1;
  }
  return counts;
}

function hasText(value, minimum = 1) {
  return typeof value === 'string' && value.trim().length >= minimum;
}

function validHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch (_) {
    return false;
  }
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function nativeBlocksAreValid(blocks) {
  return Array.isArray(blocks) && blocks.length >= 5 && blocks.every((block) => {
    if (!block || typeof block !== 'object') return false;
    if (block.type === 'paragraph') {
      return wordCount(block.text) >= 3 && Array.isArray(block.runs) && block.runs.length > 0;
    }
    if (block.type === 'list') {
      return typeof block.ordered === 'boolean' && Array.isArray(block.items) && block.items.length >= 2 &&
        block.items.every((item) => wordCount(item?.text) >= 3 && Array.isArray(item.runs) && item.runs.length > 0);
    }
    if (block.type === 'table') {
      return Array.isArray(block.rows) && block.rows.length >= 3 &&
        block.rows.every((row) => Array.isArray(row.cells) && row.cells.length >= 2 &&
          row.cells.every((cell) => wordCount(cell?.text) >= 1 && Number.isInteger(cell.columnSpan) && cell.columnSpan >= 1));
    }
    return false;
  });
}

function inspectParity(assetName, sourceAsset, deployPath, addFinding) {
  if (!fs.existsSync(deployPath)) {
    return {
      asset: assetName,
      status: 'not-present-prebuild',
      blocking: false,
      sourceSha256: sourceAsset.sha256,
      deploySha256: null,
      note: 'The deployment mirror is absent. This is reported as a pre-build sequencing state, not a content failure.',
    };
  }
  const deployBytes = fs.readFileSync(deployPath);
  const deploySha256 = crypto.createHash('sha256').update(deployBytes).digest('hex');
  const matches = deploySha256 === sourceAsset.sha256;
  if (!matches) addFinding('deployment-parity', `${assetName} deployment mirror is not byte-identical to its source.`, { asset: assetName });
  return {
    asset: assetName,
    status: matches ? 'pass' : 'mismatch',
    blocking: !matches,
    sourceSha256: sourceAsset.sha256,
    deploySha256,
    note: matches ? 'Source and deployment bytes are identical.' : 'Rebuild the deployment mirror from the reviewed source before continuing.',
  };
}

const packAsset = readAsset(packPath);
const libraryAsset = readAsset(libraryPath);
const pack = packAsset.json;
const library = libraryAsset.json;
const structuralFindings = [];
const itemReports = new Map((Array.isArray(pack.items) ? pack.items : []).map((item) => [
  item.id,
  { id: item.id, domainId: item.domainId, practiceId: item.practiceId, answerIndex: item.answerIndex, findings: [] },
]));

function addFinding(check, message, detail = {}) {
  const finding = {
    check,
    asset: detail.asset || 'pack',
    recordId: detail.recordId || '',
    message,
  };
  structuralFindings.push(finding);
  if (finding.recordId && itemReports.has(finding.recordId)) itemReports.get(finding.recordId).findings.push(finding);
}

function requireCondition(condition, check, message, detail = {}) {
  if (!condition) addFinding(check, message, detail);
}

requireCondition(pack.schemaVersion === 1 && pack.itemSchemaVersion === 2, 'asset-identity', 'Pack schema versions must remain 1/2.');
requireCondition(pack.id === PACK_ID && pack.version === '0.1.0-internal-preview', 'asset-identity', 'Pack identity/version is unexpected.');
requireCondition(pack.status === 'preview' && pack.visibility === 'internal' && pack.released === false, 'asset-identity', 'Pack must remain an internal preview.');
requireCondition(pack.learningLibraryUrl === './test_prep/ap_us_history_foundation_pilot_learning_library.json', 'asset-identity', 'Pack learning-library URL is unexpected.');
requireCondition(pack.nativeQaUrl === './test_prep/ap_us_history_foundation_pilot_qa.json', 'asset-identity', 'Pack native-QA URL is unexpected.');
requireCondition(pack.blueprint?.targetExamYear === null, 'blueprint-boundary', 'Target exam year must remain unset pending re-verification.');
requireCondition(pack.capabilities?.stimulusGroupsIncluded === false && pack.capabilities?.constructedResponseIncluded === false, 'blueprint-boundary', 'The foundation pilot must remain text-first and non-stimulus.');
requireCondition(pack.releaseGates?.releaseEligible === false && pack.expertReviewGate?.releaseBlocked === true, 'expert-review-boundary', 'Release must remain blocked by independent review.');
requireCondition(pack.rightsPolicy?.secureCollegeBoardContentUsed === false && pack.rightsPolicy?.copiedOrRephrasedCollegeBoardQuestions === false, 'rights-boundary', 'Restricted or copied College Board content must remain disabled.');

const items = Array.isArray(pack.items) ? pack.items : [];
requireCondition(items.length === 600, 'blueprint-and-unit-balance', `Expected 600 items, found ${items.length}.`);
const domainCounts = countBy(items, (item) => item.domainId);
for (const [domainId, expectedCount] of expectedDomains) {
  requireCondition(domainCounts[domainId] === expectedCount, 'blueprint-and-unit-balance', `${domainId} should contain ${expectedCount} items; found ${domainCounts[domainId] || 0}.`);
}
requireCondition(Object.keys(domainCounts).length === expectedDomains.length, 'blueprint-and-unit-balance', 'Unexpected number of period domains.');
requireCondition(Array.isArray(pack.domains) && pack.domains.length === 9, 'blueprint-and-unit-balance', 'Pack domain catalog must contain nine periods.');
requireCondition(pack.sections?.length === 60 && pack.batchSize === 10 && pack.diagnosticBatchCount === 60, 'blueprint-and-unit-balance', 'The sixty ten-item internal banks are not structurally declared.');
requireCondition(pack.sourceQuestionItems === 600 && pack.independentPracticeItems === 600 && pack.distinctSourceContentKernels === 600, 'source-and-provenance', 'Declared independent item counts must match the pilot.');
const observedTopicIds = new Set(items.flatMap((item) => Array.isArray(item.topicIds) ? item.topicIds : []));
const missingTopicIds = [...officialTopicIds].filter((topicId) => !observedTopicIds.has(topicId));
const unexpectedTopicIds = [...observedTopicIds].filter((topicId) => !officialTopicIds.has(topicId));
const topicDepthCounts = Object.fromEntries([...officialTopicIds].map((topicId) => [topicId, items.filter((item) => item.topicIds?.includes(topicId)).length]));
const topicsWithAtLeastTwoItems = Object.values(topicDepthCounts).filter((count) => count >= 2).length;
const topicsWithThreeOrMoreItems = Object.values(topicDepthCounts).filter((count) => count >= 3).length;
const topicsWithFourOrMoreItems = Object.values(topicDepthCounts).filter((count) => count >= 4).length;
const topicsWithFiveOrMoreItems = Object.values(topicDepthCounts).filter((count) => count >= 5).length;
const topicsWithSixOrMoreItems = Object.values(topicDepthCounts).filter((count) => count >= 6).length;
const topicsWithSevenOrMoreItems = Object.values(topicDepthCounts).filter((count) => count >= 7).length;
const singleItemTopicCount = Object.values(topicDepthCounts).filter((count) => count === 1).length;
requireCondition(pack.blueprint?.officialFrameworkTopicCount === officialTopicIds.size && Array.isArray(pack.blueprint?.officialFrameworkTopicIds), 'framework-topic-coverage', 'Pack must declare the current public framework topic catalog.');
requireCondition(missingTopicIds.length === 0 && unexpectedTopicIds.length === 0, 'framework-topic-coverage', `Every current public framework topic must be represented exactly by ID; missing ${missingTopicIds.join(', ') || 'none'}, unexpected ${unexpectedTopicIds.join(', ') || 'none'}.`);
requireCondition(pack.blueprint?.depthCoverage?.status === 'complete-second-layer' && pack.blueprint?.depthCoverage?.depthSliceCount === 2, 'depth-coverage', 'Pack must declare both original second-layer depth slices.');
requireCondition(pack.blueprint?.depthCoverage?.additionalDepthItemCount === 100 && pack.blueprint?.depthCoverage?.additionalDepthTopicCount === 98, 'depth-coverage', 'The declared depth slices must contain 100 items across 98 distinct topic IDs.');
requireCondition(pack.blueprint?.depthCoverage?.topicsWithAtLeastTwoItems === topicsWithAtLeastTwoItems && pack.blueprint?.depthCoverage?.topicsWithThreeOrMoreItems === topicsWithThreeOrMoreItems && pack.blueprint?.depthCoverage?.topicsWithFourOrMoreItems === topicsWithFourOrMoreItems && pack.blueprint?.depthCoverage?.topicsWithFiveOrMoreItems === topicsWithFiveOrMoreItems && pack.blueprint?.depthCoverage?.singleItemTopicCount === singleItemTopicCount, 'depth-coverage', 'Declared topic-depth metrics must match the generated item bank.');
requireCondition(topicsWithAtLeastTwoItems === officialTopicIds.size && singleItemTopicCount === 0, 'depth-coverage', 'Every current framework topic must have at least two internal items.');
requireCondition(pack.blueprint?.balanceCoverage?.status === 'third-layer-skill-balance' && pack.blueprint?.balanceCoverage?.itemCount === 60 && pack.blueprint?.balanceCoverage?.topicCount === 60, 'third-layer-balance', 'The declared third-layer 60-item skill-balance slice is missing or mis-sized.');
requireCondition(pack.blueprint?.balanceCoverage?.topicsWithAtLeastThreeItems === topicsWithThreeOrMoreItems && pack.blueprint?.balanceCoverage?.topicsWithAtLeastFourItems === topicsWithFourOrMoreItems && pack.blueprint?.balanceCoverage?.topicsWithAtLeastFiveItems === topicsWithFiveOrMoreItems, 'third-layer-balance', 'Declared third-layer topic-depth metrics must match the generated item bank.');
requireCondition(pack.blueprint?.completionCoverage?.status === 'complete-third-layer' && pack.blueprint?.completionCoverage?.itemCount === 40 && pack.blueprint?.completionCoverage?.topicCount === 35, 'third-layer-completion', 'The declared 40-item third-layer completion slice is missing or mis-sized.');
requireCondition(pack.blueprint?.completionCoverage?.topicsWithAtLeastThreeItems === topicsWithThreeOrMoreItems && pack.blueprint?.completionCoverage?.topicsWithAtLeastFourItems === topicsWithFourOrMoreItems && pack.blueprint?.completionCoverage?.topicsWithAtLeastFiveItems === topicsWithFiveOrMoreItems && topicsWithThreeOrMoreItems === officialTopicIds.size, 'third-layer-completion', 'Every current framework topic must have at least three internal items after the completion slice.');
requireCondition(pack.blueprint?.fourthLayerCoverage?.status === 'complete-fourth-layer' && pack.blueprint?.fourthLayerCoverage?.itemCount === 100 && pack.blueprint?.fourthLayerCoverage?.topicCount === 100, 'fourth-layer-completion', 'The declared 100-item fourth-layer completion slice is missing or mis-sized.');
requireCondition(pack.blueprint?.fourthLayerCoverage?.topicsWithAtLeastFourItems === topicsWithFourOrMoreItems && pack.blueprint?.fourthLayerCoverage?.topicsWithAtLeastFiveItems === topicsWithFiveOrMoreItems && topicsWithFourOrMoreItems === officialTopicIds.size, 'fourth-layer-completion', 'Every current framework topic must have at least four internal items after the completion slice.');
requireCondition(pack.blueprint?.fifthLayerCoverage?.status === 'fifth-layer-balance' && pack.blueprint?.fifthLayerCoverage?.itemCount === 80 && pack.blueprint?.fifthLayerCoverage?.topicCount === 80, 'fifth-layer-balance', 'The declared 80-item fifth-layer balance slice is missing or mis-sized.');
requireCondition(pack.blueprint?.fifthLayerCoverage?.topicsWithAtLeastFourItems === topicsWithFourOrMoreItems && pack.blueprint?.fifthLayerCoverage?.topicsWithAtLeastFiveItems === topicsWithFiveOrMoreItems && pack.blueprint?.fifthLayerCoverage?.topicsWithAtLeastSixItems === topicsWithSixOrMoreItems && topicsWithFourOrMoreItems === officialTopicIds.size, 'fifth-layer-balance', 'Declared fifth-layer topic-depth metrics must match the generated item bank.');
requireCondition(pack.blueprint?.fifthLayerCompletionCoverage?.status === 'complete-fifth-layer' && pack.blueprint?.fifthLayerCompletionCoverage?.itemCount === 40 && pack.blueprint?.fifthLayerCompletionCoverage?.topicCount === 40, 'fifth-layer-completion', 'The declared 40-item fifth-layer completion slice is missing or mis-sized.');
requireCondition(pack.blueprint?.fifthLayerCompletionCoverage?.topicsWithAtLeastFiveItems === topicsWithFiveOrMoreItems && pack.blueprint?.fifthLayerCompletionCoverage?.topicsWithAtLeastSixItems === topicsWithSixOrMoreItems && topicsWithFiveOrMoreItems === officialTopicIds.size, 'fifth-layer-completion', 'Every current framework topic must have at least five internal items after the completion slice.');
requireCondition(pack.blueprint?.sixthLayerCoverage?.status === 'sixth-layer-balance' && pack.blueprint?.sixthLayerCoverage?.itemCount === 60 && pack.blueprint?.sixthLayerCoverage?.topicCount === 60, 'sixth-layer-balance', 'The declared 60-item sixth-layer balance slice is missing or mis-sized.');
requireCondition(pack.blueprint?.sixthLayerCoverage?.topicsWithAtLeastFiveItems === topicsWithFiveOrMoreItems && pack.blueprint?.sixthLayerCoverage?.topicsWithAtLeastSixItems === topicsWithSixOrMoreItems && pack.blueprint?.sixthLayerCoverage?.topicsWithAtLeastSevenItems === topicsWithSevenOrMoreItems, 'sixth-layer-balance', 'Declared sixth-layer topic-depth metrics must match the generated item bank.');

const prompts = new Map();
const answerCounts = countBy(items, (item) => item.answerIndex);
const skillCounts = countBy(items, (item) => item.practiceId);
const reasoningCounts = countBy(items, (item) => item.reasoningProcess);
for (const item of items) {
  const record = { recordId: item.id };
  requireCondition(item.type === 'single-choice' && item.taskForm === 'single-choice-foundation', 'one-best-answer', `${item.id} must be a single-choice foundation item.`, record);
  requireCondition(hasText(item.prompt, 20) && /[?]$/.test(item.prompt), 'prompt-coherence', `${item.id} must have a complete question stem.`, record);
  requireCondition(Array.isArray(item.choices) && item.choices.length === 4 && new Set(item.choices).size === 4, 'one-best-answer', `${item.id} must have four distinct choices.`, record);
  requireCondition(Number.isInteger(item.answerIndex) && item.answerIndex >= 0 && item.answerIndex < 4, 'one-best-answer', `${item.id} must have a valid answer index.`, record);
  requireCondition(hasText(item.rationale, 30) && Array.isArray(item.choiceRationales) && item.choiceRationales.length === 4 && item.choiceRationales.every((value) => hasText(value, 30)), 'substantive-feedback', `${item.id} must have item and option-level feedback.`, record);
  requireCondition(Array.isArray(item.references) && item.references.includes(CED_URL) && item.references.every(validHttpsUrl), 'source-and-provenance', `${item.id} must include the official CED link and valid HTTPS references.`, record);
  requireCondition(Array.isArray(item.sourceDetails) && item.sourceDetails.length >= 2 && item.sourceDetails.every((source) => hasText(source.title) && hasText(source.organization) && validHttpsUrl(source.url)), 'source-and-provenance', `${item.id} must include source details.`, record);
  requireCondition(item.provenance === 'native-original' && item.officialItem === false && item.releaseEligible === false, 'rights-boundary', `${item.id} must remain independently authored and unreleased.`, record);
  requireCondition(item.rights?.secureContentUsed === false && item.rights?.copiedOfficialQuestion === false, 'rights-boundary', `${item.id} must declare no restricted or copied official content.`, record);
  requireCondition(item.accessibility?.textOnly === true && item.accessibility?.linearReadingOrder === true && item.accessibility?.handsFreeContentCompatible === true, 'accessibility-boundary', `${item.id} must remain text-first and linear.`, record);
  requireCondition(item.expertReview?.status === 'pending' && item.expertReview?.releaseBlocked === true, 'expert-review-boundary', `${item.id} must remain review-blocked.`, record);
  requireCondition(item.psychometricStatus === 'not-calibrated', 'psychometric-boundary', `${item.id} must remain uncalibrated.`, record);
  requireCondition(Array.isArray(item.topicIds) && item.topicIds.length >= 1 && hasText(item.learningObjectiveId) && hasText(item.learningSectionId), 'learning-alignment', `${item.id} must have an internal remediation route.`, record);
  requireCondition(/^[1-6]\.[A-Z]$/.test(String(item.skillId || '')) && String(item.skillId).startsWith(`${String(item.practiceId || '').slice(1)}.`), 'historical-thinking-skill-coverage', `${item.id} must use a valid AP U.S. History subskill ID for its practice skill.`, record);
  const normalizedPrompt = item.prompt.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  if (prompts.has(normalizedPrompt)) addFinding('prompt-originality', `${item.id} duplicates ${prompts.get(normalizedPrompt)} after normalization.`, record);
  else prompts.set(normalizedPrompt, item.id);
}
for (const skillId of expectedSkillIds) requireCondition(skillCounts[skillId] > 0, 'historical-thinking-skill-coverage', `${skillId} has no sampled items.`);
requireCondition(expectedSkillIds.every((skillId) => pack.practiceDistribution?.[skillId] === skillCounts[skillId]), 'historical-thinking-skill-coverage', 'Declared historical-thinking-skill distribution must match the generated item bank.');
for (const reasoningProcess of expectedReasoningProcesses) requireCondition(reasoningCounts[reasoningProcess] > 0, 'reasoning-process-balance', `${reasoningProcess} has no sampled items.`);
requireCondition(expectedReasoningProcesses.every((reasoningProcess) => pack.reasoningDistribution?.[reasoningProcess] === reasoningCounts[reasoningProcess]), 'reasoning-process-balance', 'Declared reasoning-process distribution must match the generated item bank.');
requireCondition(Math.min(...expectedSkillIds.map((skillId) => skillCounts[skillId])) >= 20 && Math.max(...expectedSkillIds.map((skillId) => skillCounts[skillId])) - Math.min(...expectedSkillIds.map((skillId) => skillCounts[skillId])) <= 12, 'historical-thinking-skill-coverage', 'Historical-thinking-skill sampling should remain within the internal balance band.');
requireCondition(reasoningCounts.comparison >= 40 && reasoningCounts['continuity-change'] >= 25, 'reasoning-process-balance', 'Comparison and continuity/change need a substantive second-layer sample alongside causation.');
for (const [position, expectedCount] of Object.entries(expectedAnswerPositions)) requireCondition(answerCounts[position] === expectedCount, 'answer-key-balance', `Answer position ${position} should occur ${expectedCount} times; found ${answerCounts[position] || 0}.`);

requireCondition(library.schemaVersion === 1 && library.librarySchemaVersion === 1, 'library-identity', 'Library schema versions must remain 1/1.');
requireCondition(library.libraryId === `${PACK_ID}-learning-library` && library.packId === pack.id && library.version === pack.version, 'library-identity', 'Pack and library identities must match.');
requireCondition(library.status === 'preview' && library.visibility === 'internal' && library.released === false && library.releaseEligible === false, 'library-identity', 'Library must remain an internal preview.');
for (const [key, expected] of Object.entries(expectedLibrarySummary)) requireCondition(library.summary?.[key] === expected, 'library-inventory', `Library summary ${key} should be ${expected}; found ${library.summary?.[key]}.`);
requireCondition(Array.isArray(library.chapters) && library.chapters.length === 9, 'library-inventory', 'Library must contain nine period chapters.');
requireCondition(Array.isArray(library.flashcards) && library.flashcards.length === 27 && Array.isArray(library.memoryAids) && library.memoryAids.length === 9, 'library-inventory', 'Library study-aid inventory is unexpected.');
requireCondition(Array.isArray(library.constructedResponseWorkshops) && library.constructedResponseWorkshops.length === 3, 'workshop-unscored-safeguards', 'Library must contain three constructed-response planning workshops.');
for (const chapter of library.chapters || []) {
  requireCondition(chapter.contentComplete === true && chapter.expertReviewStatus === 'pending' && chapter.releaseEligible === false, 'library-content-structure', `${chapter.id} must remain complete but expert-review pending.`, { asset: 'learning-library', recordId: chapter.id });
  requireCondition(chapter.sections?.length === 3 && chapter.knowledgeChecks?.length === 3, 'library-inventory', `${chapter.id} must contain three sections and three checks.`, { asset: 'learning-library', recordId: chapter.id });
  requireCondition(Array.isArray(chapter.references) && chapter.references.includes(CED_URL), 'source-and-provenance', `${chapter.id} must include CED references.`, { asset: 'learning-library', recordId: chapter.id });
  for (const section of chapter.sections || []) {
    requireCondition(section.contentComplete === true && section.contentWordCount >= 50 && nativeBlocksAreValid(section.contentBlocks), 'library-content-depth', `${section.id} must contain structured, substantive lesson blocks.`, { asset: 'learning-library', recordId: section.id });
    requireCondition(Array.isArray(section.examples) && section.examples.length >= 2 && Array.isArray(section.nonExamples) && section.nonExamples.length >= 2 && Array.isArray(section.commonMisconceptions) && section.commonMisconceptions.length >= 1, 'library-content-depth', `${section.id} must include examples, nonexamples, and misconception boundaries.`, { asset: 'learning-library', recordId: section.id });
    requireCondition(section.workedDataExample?.rows?.length >= 2 && section.retrievalPrompts?.length >= 3, 'library-content-depth', `${section.id} must include a worked evidence table and retrieval prompts.`, { asset: 'learning-library', recordId: section.id });
  }
  for (const check of chapter.knowledgeChecks || []) requireCondition(check.choices?.length === 4 && Number.isInteger(check.answerIndex) && hasText(check.rationale, 20), 'one-best-answer', `${check.id} must be a valid retrieval check.`, { asset: 'learning-library', recordId: check.id });
}
for (const diagram of library.diagrams || []) {
  requireCondition(diagram.unscored === true && diagram.officialItem === false && diagram.releaseEligible === false, 'diagram-integrity', `${diagram.id} must remain an optional unscored study aid.`, { asset: 'learning-library', recordId: diagram.id });
  requireCondition(diagram.rights?.originalSpecification === true && diagram.rights?.officialFigureReproduced === false && diagram.rights?.sourceFigureReproduced === false, 'rights-boundary', `${diagram.id} must declare original, non-reproduced artwork.`, { asset: 'learning-library', recordId: diagram.id });
  requireCondition(Array.isArray(diagram.accessibility?.textEquivalent) && diagram.accessibility.textEquivalent.length >= 3 && diagram.accessibility.fallbackMode === 'ordered-text-equivalent', 'diagram-integrity', `${diagram.id} must have an accessible text equivalent.`, { asset: 'learning-library', recordId: diagram.id });
}
for (const workshop of library.constructedResponseWorkshops || []) {
  requireCondition(workshop.syntheticStimulus === true && workshop.unscored === true && workshop.automatedScoring === false && workshop.scorePrediction === false && workshop.officialItem === false && workshop.releaseEligible === false, 'workshop-unscored-safeguards', `${workshop.id} must remain synthetic, unscored, and release-ineligible.`, { asset: 'learning-library', recordId: workshop.id });
}

const deploymentParity = [
  inspectParity('pack', packAsset, deployPackPath, addFinding),
  inspectParity('learning-library', libraryAsset, deployLibraryPath, addFinding),
];
const signalDefinitions = [
  ['asset-identity', 'Pack and library identities, versions, preview state, and cross-links are structurally consistent.'],
  ['blueprint-and-unit-balance', 'Six hundred original internal items are distributed across all nine public framework periods and sixty ten-item banks.'],
  ['framework-topic-coverage', 'All 105 current public framework topic IDs are represented; this is content coverage, not official exam equivalence.'],
  ['depth-coverage', 'Two original 50-item depth slices bring every current framework topic to at least two internal items.'],
  ['third-layer-balance', 'A third original 60-item slice strengthens lighter historical-thinking skills and reasoning processes across 60 topics.'],
  ['third-layer-completion', 'A 40-item original completion slice brings every current framework topic to at least three internal items.'],
  ['fourth-layer-completion', 'A 100-item original completion slice brings every current framework topic to at least four internal items.'],
  ['fifth-layer-balance', 'An 80-item original fifth-layer balance slice strengthens practice depth across 80 topics while every current framework topic retains at least four items.'],
  ['fifth-layer-completion', 'A 40-item original fifth-layer completion slice brings every current framework topic to at least five internal items.'],
  ['sixth-layer-balance', 'A 60-item original sixth-layer balance slice adds another practice angle across 60 topics while preserving five-item coverage for every current framework topic.'],
  ['historical-thinking-skill-coverage', 'All six public historical-thinking skills are represented in the foundation sample.'],
  ['reasoning-process-balance', 'Comparison, causation, and continuity-and-change remain represented with a substantive internal balance sample.'],
  ['answer-key-balance', 'Answer positions follow the declared 150/150/150/150 structural distribution; this is not psychometric evidence.'],
  ['one-best-answer', 'Every item and chapter check has one prompt, four distinct options, and a valid key.'],
  ['substantive-feedback', 'Every item has a rationale and four option-level feedback records.'],
  ['source-and-provenance', 'Public framework and factual-reference links plus independent-original provenance declarations are complete.'],
  ['rights-boundary', 'Automated QA confirms only that restricted-content and release flags remain closed; it is not independent rights clearance.'],
  ['accessibility-boundary', 'Automated QA confirms text/reading-order declarations and a still-pending independent accessibility gate.'],
  ['expert-review-boundary', 'Automated QA confirms the independent AP U.S. History expert gate remains pending and release-blocking.'],
  ['psychometric-boundary', 'Automated QA confirms the items remain uncalibrated and ineligible for score inference or release.'],
  ['prompt-originality', 'No exact normalized prompt duplicate appears in the internal sample.'],
  ['prompt-coherence', 'Item stems remain complete questions rather than dangling template text.'],
  ['learning-alignment', 'Every item resolves to an internal topic learning target and lesson route.'],
  ['library-inventory', 'Declared chapter, section, check, study-aid, and workshop counts match the actual library.'],
  ['library-content-structure', 'Chapters, references, review declarations, and release boundaries remain structurally complete.'],
  ['library-content-depth', 'Each native lesson has structured blocks, examples, nonexamples, evidence tables, and retrieval prompts.'],
  ['diagram-integrity', 'Optional original diagram specifications have accessible text equivalents and remain unscored.'],
  ['workshop-unscored-safeguards', 'SAQ-, DBQ-, and LEQ-style workshops remain original, synthetic, unscored, non-predictive, and release-ineligible.'],
  ['deployment-parity', 'When deployment mirrors exist, they are byte-identical to source; absent pre-build mirrors are deferred.'],
];
const findingCounts = countBy(structuralFindings, (finding) => finding.check);
const signals = signalDefinitions.map(([check, meaning]) => ({ check, status: findingCounts[check] ? 'fail' : 'pass', findingCount: findingCounts[check] || 0, meaning }));
const generatedAt = `${pack.blueprint?.lastVerifiedAt || '1970-01-01'}T00:00:00.000Z`;
const report = {
  schemaVersion: 1,
  reportId: 'ap-us-history-foundation-pilot-qa',
  generatedAt,
  packId: pack.id,
  packVersion: pack.version,
  inputs: {
    pack: { path: 'test_prep/ap_us_history_foundation_pilot.json', byteLength: packAsset.byteLength, sha256: packAsset.sha256 },
    learningLibrary: { path: 'test_prep/ap_us_history_foundation_pilot_learning_library.json', byteLength: libraryAsset.byteLength, sha256: libraryAsset.sha256 },
  },
  standard: {
    label: 'AlloFlow AP U.S. History internal-foundation structural and editorial QA v1',
    meaning: 'Automated pass signals cover deterministic structure, period balance, historical-thinking-skill presence, answer-key distribution, feedback completeness, public-source linkage, independent-authoring declarations, native-library inventory and structure, original accessible diagrams, unscored workshop safeguards, and source/deploy parity.',
    limitation: 'Automated QA cannot establish AP U.S. History content validity, distractor functioning, fairness, accessibility conformance, rights clearance, psychometric quality, official AP alignment, score meaning, or release readiness. College Board has not reviewed or endorsed these materials.',
  },
  automatedAssessment: {
    automatedQaStatus: structuralFindings.length ? 'fail' : 'pass',
    releaseReady: false,
    structuralFindingCount: structuralFindings.length,
    signals,
    structuralFindings,
  },
  independentHumanReview: {
    releaseStatus: 'blocked-pending-independent-review',
    releaseReady: false,
    blockerCount: 8,
    blockers: [
      ['independent-rights-review', 'Independent intellectual-property and public-use review of both assets.'],
      ['independent-accessibility-review', 'Independent WCAG/assistive-technology review plus production screen-reader and voice validation.'],
      ['ap-us-history-subject-expert-review', 'Independent review by a current AP U.S. History educator or faculty subject expert.'],
      ['independent-editorial-review', 'Independent review of historical accuracy, periodization, framing, and item quality.'],
      ['production-validation', 'End-to-end browser, keyboard, hands-free, and deployment validation.'],
      ['field-testing', 'Representative learner field testing and documented item/library revisions.'],
      ['psychometric-calibration', 'Qualified psychometric review and calibration before any score or readiness inference.'],
      ['ced-and-policy-reverification', 'Fresh verification of the current CED, clarifications, exam mode, timing, policies, and public-use boundary.'],
    ].map(([gate, requiredEvidence]) => ({ gate, expectedBlockingState: gate === 'field-testing' || gate === 'psychometric-calibration' ? 'not-started' : 'pending', packDeclaredStatus: 'pending', libraryDeclaredStatus: 'pending', requiredEvidence })),
    note: 'These are genuine release blockers. Their presence is expected and does not make structural QA fail; automated checks must never convert them into completed reviews.',
  },
  deploymentParity,
  metrics: {
    blueprint: {
      framework: 'AP U.S. History Course and Exam Description, Effective Fall 2026, Course Framework V.1',
      itemCount: items.length,
      periodCount: expectedDomains.length,
      periodItemCounts: domainCounts,
      topicCount: observedTopicIds.size,
      topicDepth: {
        topicsWithAtLeastTwoItems,
        topicsWithThreeOrMoreItems,
        topicsWithFourOrMoreItems,
        topicsWithFiveOrMoreItems,
        topicsWithSixOrMoreItems,
        topicsWithSevenOrMoreItems,
        singleItemTopicCount,
      },
      thirdLayerCompletion: pack.blueprint?.completionCoverage || null,
      fourthLayerCompletion: pack.blueprint?.fourthLayerCoverage || null,
      fifthLayerBalance: pack.blueprint?.fifthLayerCoverage || null,
      fifthLayerCompletion: pack.blueprint?.fifthLayerCompletionCoverage || null,
      sixthLayerBalance: pack.blueprint?.sixthLayerCoverage || null,
      bankCount: pack.sections?.length || 0,
      bankSize: pack.batchSize,
      fullTopicCoverage: missingTopicIds.length === 0 && unexpectedTopicIds.length === 0,
      sourceSetStimuliIncluded: pack.capabilities?.stimulusGroupsIncluded === true,
      targetExamYear: pack.blueprint?.targetExamYear,
    },
    historicalThinkingSkills: skillCounts,
    reasoningProcesses: reasoningCounts,
    answerKeys: answerCounts,
    itemQuality: {
      singleChoiceItems: items.filter((item) => item.type === 'single-choice').length,
      independentOriginalItems: items.filter((item) => item.provenance === 'native-original').length,
      sourceLinkedItems: items.filter((item) => item.references?.includes(CED_URL)).length,
      uncalibratedItems: items.filter((item) => item.psychometricStatus === 'not-calibrated').length,
      releaseEligibleItems: items.filter((item) => item.releaseEligible === true).length,
    },
    learningLibrary: {
      chapters: library.chapters?.length || 0,
      sections: library.summary?.sections || 0,
      knowledgeChecks: library.summary?.knowledgeChecks || 0,
      flashcards: library.flashcards?.length || 0,
      memoryAids: library.memoryAids?.length || 0,
      diagrams: library.diagrams?.length || 0,
      diagramPlacements: library.diagramPlacements?.length || 0,
      constructedResponseWorkshops: library.constructedResponseWorkshops?.length || 0,
      glossaryTerms: library.glossary?.length || 0,
    },
  },
  editorialReviewQueue: { count: 0, advisories: [] },
  items: [...itemReports.values()],
  releaseAssessment: {
    releaseStatus: 'not-release-ready',
    releaseReady: false,
    reason: structuralFindings.length
      ? 'Automated structural QA found findings, and independent release gates remain open.'
      : 'Automated structural QA passed, but every independent review, production, field-test, psychometric, and re-verification gate remains open.',
  },
};

writeGeneratedFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(`QA ${pack.id}: ${report.automatedAssessment.automatedQaStatus}; ${structuralFindings.length} structural findings; release remains blocked.`);
if (structuralFindings.length) process.exitCode = 1;
