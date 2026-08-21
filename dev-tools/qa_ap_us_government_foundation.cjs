#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const packPath = path.join(root, 'test_prep', 'ap_us_government_foundation_pilot.json');
const libraryPath = path.join(root, 'test_prep', 'ap_us_government_foundation_pilot_learning_library.json');
const qaPath = path.join(root, 'test_prep', 'ap_us_government_foundation_pilot_qa.json');
const deployPackPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'ap_us_government_foundation_pilot.json');
const deployLibraryPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'ap_us_government_foundation_pilot_learning_library.json');

const PACK_ID = 'ap-us-government-foundation-pilot';
const VERSION = '0.4.0-internal-preview';
const CED_URL = 'https://apcentral.collegeboard.org/media/pdf/ap-us-government-and-politics-course-and-exam-description.pdf';
const COURSE_URL = 'https://apcentral.collegeboard.org/courses/ap-united-states-government-and-politics';
const OPENSTAX_URL = 'https://openstax.org/details/books/american-government-3e';
const expectedDomains = [
  ['foundations-of-american-democracy', 36],
  ['interactions-among-branches', 60],
  ['civil-liberties-and-civil-rights', 30],
  ['american-political-ideologies-and-beliefs', 24],
  ['political-participation', 50],
];
const expectedTopicIds = [
  ...Array.from({ length: 9 }, (_, index) => '1.' + (index + 1)),
  ...Array.from({ length: 15 }, (_, index) => '2.' + (index + 1)),
  ...Array.from({ length: 13 }, (_, index) => '3.' + (index + 1)),
  ...Array.from({ length: 10 }, (_, index) => '4.' + (index + 1)),
  ...Array.from({ length: 13 }, (_, index) => '5.' + (index + 1)),
];
const expectedSkillIds = [
  ...['1.A', '1.B', '1.C', '1.D', '1.E'],
  ...['2.A', '2.B', '2.C', '2.D'],
  ...['3.A', '3.B', '3.C', '3.D', '3.E', '3.F'],
  ...['4.A', '4.B', '4.C', '4.D'],
  ...['5.A', '5.B', '5.C', '5.D'],
];
const allowedHosts = new Set(['apcentral.collegeboard.org', 'openstax.org']);

function readAsset(filePath) {
  const bytes = fs.readFileSync(filePath);
  return {
    bytes,
    json: JSON.parse(bytes.toString('utf8')),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
}

function countBy(records, getter) {
  return records.reduce((counts, record) => {
    const key = String(getter(record));
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function hasText(value, minimum = 1) {
  return typeof value === 'string' && value.trim().length >= minimum;
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function validHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:' && allowedHosts.has(new URL(value).hostname.toLowerCase());
  } catch (_) {
    return false;
  }
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function nativeBlocksAreValid(blocks) {
  return Array.isArray(blocks) && blocks.length >= 8 && blocks.every((block) => {
    if (!block || typeof block !== 'object') return false;
    if (block.type === 'paragraph') return wordCount(block.text) >= 3 && Array.isArray(block.runs) && block.runs.length > 0;
    if (block.type === 'list') return typeof block.ordered === 'boolean' && Array.isArray(block.items) && block.items.length >= 2 &&
      block.items.every((item) => wordCount(item?.text) >= 3 && Array.isArray(item.runs) && item.runs.length > 0);
    if (block.type === 'table') return Array.isArray(block.rows) && block.rows.length >= 3 &&
      block.rows.every((row) => Array.isArray(row.cells) && row.cells.length >= 2);
    return false;
  });
}

function parity(asset, deployPath) {
  if (!fs.existsSync(deployPath)) {
    return {
      asset,
      status: 'not-present-prebuild',
      blocking: false,
      sourceSha256: asset === 'pack' ? packAsset.sha256 : libraryAsset.sha256,
      deploySha256: null,
      note: 'Deployment mirror is absent before the manifest build; this is a sequencing state, not a content failure.',
    };
  }
  const deployBytes = fs.readFileSync(deployPath);
  const deploySha256 = crypto.createHash('sha256').update(deployBytes).digest('hex');
  const sourceSha256 = asset === 'pack' ? packAsset.sha256 : libraryAsset.sha256;
  return {
    asset,
    status: deploySha256 === sourceSha256 ? 'pass' : 'mismatch',
    blocking: deploySha256 !== sourceSha256,
    sourceSha256,
    deploySha256,
    note: deploySha256 === sourceSha256 ? 'Source and deployment bytes are identical.' : 'Deployment mirror differs from source.',
  };
}

const packAsset = readAsset(packPath);
const libraryAsset = readAsset(libraryPath);
const pack = packAsset.json;
const library = libraryAsset.json;
const findings = [];
const advisories = [];
function addFinding(check, message, detail = {}) {
  findings.push({ check, asset: detail.asset || 'pack', recordId: detail.recordId || '', message });
}
function requireCondition(condition, check, message, detail = {}) {
  if (!condition) addFinding(check, message, detail);
}

requireCondition(
  pack.schemaVersion === 1 && pack.itemSchemaVersion === 2 && pack.id === PACK_ID &&
  pack.version === VERSION && pack.status === 'preview' && pack.visibility === 'internal' &&
  pack.released === false && pack.releaseEligible === false && pack.officialItem === false &&
  pack.calibrated === false,
  'asset-identity', 'Pack schema, identity, version, or internal-preview state is invalid.'
);
requireCondition(
  library.schemaVersion === 1 && library.librarySchemaVersion === 1 &&
  library.libraryId === PACK_ID + '-learning-library' && library.packId === PACK_ID &&
  library.version === VERSION && library.status === 'preview' && library.visibility === 'internal' &&
  library.released === false && library.releaseEligible === false,
  'asset-identity', 'Learning-library identity or internal-preview state is invalid.', { asset: 'learning-library' }
);
requireCondition(
  pack.learningLibraryUrl === './test_prep/ap_us_government_foundation_pilot_learning_library.json' &&
  pack.nativeQaUrl === './test_prep/ap_us_government_foundation_pilot_qa.json',
  'asset-identity', 'Pack companion URLs are incomplete or incorrect.'
);
requireCondition(
  pack.officialBlueprintUrl === CED_URL &&
  pack.blueprint?.officialFrameworkTopicCount === 60 &&
  pack.blueprint?.officialFrameworkTopicIds?.length === 60 &&
  pack.blueprint?.officialFrameworkTopicIds?.every((topicId) => expectedTopicIds.includes(topicId)),
  'blueprint-and-topic-coverage', 'The current five-unit, sixty-topic public framework declaration is incomplete.'
);
requireCondition(
  /unofficial/i.test(pack.disclaimer || '') && /not affiliated with|not endorsed by|not authored by/i.test(pack.disclaimer || '') &&
  /official scores|score predictions/i.test(pack.disclaimer || ''),
  'psychometric-boundary', 'The pack must carry clear unofficial and non-predictive boundary language.'
);
requireCondition(
  pack.rightsPolicy?.secureCollegeBoardContentUsed === false &&
  pack.rightsPolicy?.copiedOrRephrasedCollegeBoardQuestions === false &&
  pack.releaseGates?.releaseEligible === false &&
  pack.expertReviewGate?.releaseBlocked === true,
  'rights-and-review-boundary', 'Restricted-content, release, and expert-review gates are not closed.'
);

const items = Array.isArray(pack.items) ? pack.items : [];
const domains = Array.isArray(pack.domains) ? pack.domains : [];
const chapters = Array.isArray(library.chapters) ? library.chapters : [];
const sections = chapters.flatMap((chapter) => Array.isArray(chapter.sections) ? chapter.sections : []);
const checks = chapters.flatMap((chapter) => Array.isArray(chapter.knowledgeChecks) ? chapter.knowledgeChecks : []);
const objectiveCatalog = Array.isArray(pack.blueprint?.learningObjectiveCatalog) ? pack.blueprint.learningObjectiveCatalog : [];
const objectiveById = new Map(objectiveCatalog.map((objective) => [objective.id, objective]));

const domainCounts = countBy(items, (item) => item.domainId);
const topicCounts = countBy(items.flatMap((item) => item.topicIds || []), (topicId) => topicId);
const skillCounts = countBy(items, (item) => item.skillId);
const practiceCounts = countBy(items, (item) => item.practiceId);
const answerCounts = countBy(items, (item) => item.answerIndex);
const practiceSliceCounts = countBy(items, (item) => item.practiceSlice);

requireCondition(items.length === 200 && new Set(items.map((item) => item.id)).size === 200, 'item-inventory', 'The pilot must contain exactly 200 uniquely identified items.');
requireCondition(domains.length === 5 && Math.abs(domains.reduce((sum, domain) => sum + Number(domain.weight || 0), 0) - 1) < 1e-10, 'blueprint-and-unit-balance', 'Five unique domains with midpoint weights totaling 1.0 are required.');
for (const [domainId, expectedCount] of expectedDomains) {
  requireCondition(domainCounts[domainId] === expectedCount, 'blueprint-and-unit-balance', domainId + ' should contain ' + expectedCount + ' items; found ' + (domainCounts[domainId] || 0) + '.', { recordId: domainId });
}
const missingTopics = expectedTopicIds.filter((topicId) => !topicCounts[topicId]);
const shallowTopics = expectedTopicIds.filter((topicId) => (topicCounts[topicId] || 0) < 2);
const unexpectedTopics = Object.keys(topicCounts).filter((topicId) => !expectedTopicIds.includes(topicId));
requireCondition(missingTopics.length === 0 && shallowTopics.length === 0 && unexpectedTopics.length === 0, 'framework-topic-coverage', 'Every current topic ID must have at least two practice items; missing ' + (missingTopics.join(', ') || 'none') + ', shallow ' + (shallowTopics.join(', ') || 'none') + ', unexpected ' + (unexpectedTopics.join(', ') || 'none') + '.');
requireCondition(pack.depthCoverage?.baseItemCount === 100 && pack.depthCoverage?.depthItemCount === 100 && pack.depthCoverage?.topicsWithAtLeastTwoItems === 60 && pack.depthCoverage?.topicCount === 60, 'depth-coverage', 'The second-angle coverage declaration must report two 100-item slices and 60 topics covered at least twice.');
requireCondition(practiceSliceCounts['foundation-slice'] === 100 && practiceSliceCounts['depth-slice'] === 100 && items.every((item) => (item.practiceSlice === 'foundation-slice' && item.practiceAngle === 'foundation') || (item.practiceSlice === 'depth-slice' && item.practiceAngle === 'depth')), 'practice-slice-coverage', 'The pack must label exactly 100 foundation-slice and 100 depth-slice items with matching practice angles.');
requireCondition(pack.learningRouteMode === 'section-linked-item-routes' && pack.practiceRouting?.sectionCount === 15 && pack.practiceRouting?.itemCount === 200 && pack.practiceRouting?.uniqueItemCount === 200 && pack.practiceRouting?.foundationItemCount === 100 && pack.practiceRouting?.depthItemCount === 100 && pack.practiceRouting?.topicDrillMapCount === 60, 'study-routing', 'The pack must declare complete section-linked and topic-level practice routing.');
requireCondition(pack.sections?.length === 40 && pack.sections.every((section) => Array.isArray(section.itemIds) && section.itemIds.length === 5), 'bank-inventory', 'The forty five-item internal banks are incomplete.');
requireCondition(answerCounts[0] === 50 && answerCounts[1] === 50 && answerCounts[2] === 50 && answerCounts[3] === 50, 'answer-balance', 'Answer positions must be balanced at 50/50/50/50.');
requireCondition(expectedSkillIds.every((skillId) => skillCounts[skillId] > 0), 'subskill-coverage', 'Every current course subskill must be represented by at least one item.');
requireCondition(['C1', 'C2', 'C3', 'C4', 'C5'].every((practiceId) => practiceCounts[practiceId] > 0), 'skill-category-coverage', 'Every current course skill category must be represented.');
requireCondition(objectiveCatalog.length === 60 && new Set(objectiveCatalog.map((objective) => objective.topicId)).size === 60, 'learning-alignment', 'The sixty-topic learning-objective catalog is incomplete.');

const prompts = new Map();
for (const item of items) {
  const record = { recordId: item.id };
  const choices = Array.isArray(item.choices) ? item.choices : [];
  const normalizedChoices = choices.map(normalizeText);
  const objective = objectiveById.get(item.learningObjectiveId);
  requireCondition(/^ap-usg-u[1-5]-\d{3}$/.test(String(item.id || '')) && item.templateVersion === 1 && item.itemSchemaVersion === 2, 'item-identity', item.id + ' has an invalid identity or schema.', record);
  requireCondition(item.type === 'single-choice' && item.taskForm === 'single-choice-foundation' && hasText(item.prompt, 20) && /\?$/.test(item.prompt), 'prompt-coherence', item.id + ' must be a complete single-choice question.', record);
  requireCondition(choices.length === 4 && new Set(choices).size === 4 && normalizedChoices.every((choice) => choice.length >= 8), 'one-best-answer', item.id + ' must have four distinct substantive choices.', record);
  requireCondition(Number.isInteger(item.answerIndex) && item.answerIndex >= 0 && item.answerIndex < 4, 'one-best-answer', item.id + ' has an invalid answer index.', record);
  requireCondition(hasText(item.rationale, 30) && Array.isArray(item.choiceRationales) && item.choiceRationales.length === 4 && item.choiceRationales.every((value) => hasText(value, 30)), 'substantive-feedback', item.id + ' must have item and option-level feedback.', record);
  requireCondition(Array.isArray(item.references) && item.references.includes(CED_URL) && item.references.every(validHttpsUrl), 'source-and-provenance', item.id + ' must include the official CED and valid public references.', record);
  requireCondition(Array.isArray(item.sourceDetails) && item.sourceDetails.length >= 2 && item.sourceDetails.every((source) => hasText(source.title) && hasText(source.organization) && validHttpsUrl(source.url)), 'source-and-provenance', item.id + ' must include source details.', record);
  requireCondition(item.provenance === 'native-original' && item.officialItem === false && item.releaseEligible === false && item.rights?.secureContentUsed === false && item.rights?.copiedOfficialQuestion === false, 'rights-boundary', item.id + ' must remain original and unreleased.', record);
  requireCondition(item.accessibility?.textOnly === true && item.accessibility?.linearReadingOrder === true && item.accessibility?.handsFreeContentCompatible === true, 'accessibility-boundary', item.id + ' must remain text-first and linear.', record);
  requireCondition(item.expertReview?.status === 'pending' && item.expertReview?.releaseBlocked === true && item.psychometricStatus === 'not-calibrated', 'review-boundary', item.id + ' must remain review-blocked and uncalibrated.', record);
  requireCondition(Array.isArray(item.topicIds) && item.topicIds.length === 1 && expectedTopicIds.includes(item.topicIds[0]) && objective && objective.topicId === item.topicIds[0] && objective.domainId === item.domainId && item.learningSectionId === objective.sectionId, 'learning-alignment', item.id + ' has an incomplete topic or learning route.', record);
  requireCondition(/^C[1-5]$/.test(String(item.practiceId || '')) && /^[1-5]\.[A-F]$/.test(String(item.skillId || '')) && item.skillId.startsWith(item.practiceId.slice(1) + '.'), 'subskill-coverage', item.id + ' has an invalid category/subskill pairing.', record);
  const normalizedPrompt = normalizeText(item.prompt);
  if (prompts.has(normalizedPrompt)) addFinding('prompt-originality', item.id + ' duplicates ' + prompts.get(normalizedPrompt) + ' after normalization.', record);
  else prompts.set(normalizedPrompt, item.id);
}

requireCondition(chapters.length === 5 && sections.length === 15 && checks.length === 15, 'library-inventory', 'The native library must contain five chapters, fifteen sections, and fifteen checks.', { asset: 'learning-library' });
requireCondition(library.flashcards?.length === 15 && library.memoryAids?.length === 5, 'library-inventory', 'The native library flashcard and memory-aid inventory is incomplete.', { asset: 'learning-library' });
requireCondition(library.summary?.chapters === 5 && library.summary?.sections === 15 && library.summary?.knowledgeChecks === 15 && library.summary?.flashcards === 15 && library.summary?.memoryAids === 5 && library.summary?.richLessonPrototypes === 5 && library.summary?.releaseEligibleRecords === 0, 'library-inventory', 'The declared learning-library summary does not match the generated inventory.', { asset: 'learning-library' });
const itemById = new Map(items.map((item) => [item.id, item]));
const practiceRoutes = sections.map((section) => section.practiceRoute);
const routedItemIds = practiceRoutes.flatMap((route) => Array.isArray(route?.itemIds) ? route.itemIds : []);
const routesAreComplete = practiceRoutes.length === 15 && practiceRoutes.every((route) => {
  const foundationIds = Array.isArray(route?.foundationItemIds) ? route.foundationItemIds : [];
  const depthIds = Array.isArray(route?.depthItemIds) ? route.depthItemIds : [];
  const routeIds = Array.isArray(route?.itemIds) ? route.itemIds : [];
  const topicCountsForRoute = route?.topicCounts && typeof route.topicCounts === 'object' ? Object.values(route.topicCounts) : [];
  const topicItemIds = route?.topicItemIds && typeof route.topicItemIds === 'object' ? route.topicItemIds : {};
  const topicMappedIds = Object.values(topicItemIds).flatMap((ids) => Array.isArray(ids) ? ids : []);
  return routeIds.length === route?.itemCount &&
    new Set(routeIds).size === routeIds.length &&
    foundationIds.length + depthIds.length === routeIds.length &&
    foundationIds.every((id) => itemById.get(id)?.practiceSlice === 'foundation-slice') &&
    depthIds.every((id) => itemById.get(id)?.practiceSlice === 'depth-slice') &&
    routeIds.every((id) => itemById.has(id)) &&
    topicCountsForRoute.length > 0 &&
    topicCountsForRoute.every((count) => count >= 2) &&
    Object.keys(topicItemIds).length === topicCountsForRoute.length &&
    Object.entries(topicItemIds).every(([topicId, ids]) => Array.isArray(ids) && ids.length === route.topicCounts[topicId] && ids.every((id) => routeIds.includes(id) && itemById.get(id)?.topicIds?.[0] === topicId)) &&
    new Set(topicMappedIds).size === routeIds.length;
});
requireCondition(routesAreComplete && new Set(routedItemIds).size === 200 && routedItemIds.every((id) => itemById.has(id)) &&
  library.practiceRouting?.mode === 'section-linked-item-routes' &&
  library.practiceRouting?.sectionCount === 15 &&
  library.practiceRouting?.itemCount === 200 &&
  library.practiceRouting?.uniqueItemCount === 200 &&
  library.practiceRouting?.foundationItemCount === 100 &&
  library.practiceRouting?.depthItemCount === 100 &&
  library.practiceRouting?.topicDrillMapCount === 60,
  'study-routing', 'Every native lesson section must link unique, slice-labeled foundation and depth practice items.', { asset: 'learning-library' });
for (const chapter of chapters) {
  requireCondition(Array.isArray(chapter.sections) && chapter.sections.length === 3 && chapter.foundationPrototype === true, 'library-content-structure', chapter.id + ' must contain three structured sections.', { asset: 'learning-library', recordId: chapter.id });
  for (const section of chapter.sections || []) {
    requireCondition(nativeBlocksAreValid(section.contentBlocks) && section.contentComplete === true && section.releaseEligible === false, 'library-content-structure', section.id + ' must contain linear structured lesson blocks.', { asset: 'learning-library', recordId: section.id });
  }
}
for (const check of checks) {
  requireCondition(Array.isArray(check.choices) && check.choices.length === 4 && Number.isInteger(check.answerIndex) && hasText(check.rationale, 30) && Array.isArray(check.references) && check.references.includes(CED_URL), 'library-content-structure', check.id + ' is incomplete.', { asset: 'learning-library', recordId: check.id });
}

advisories.push({
  check: 'expert-review-boundary',
  asset: 'pack',
  recordId: '',
  message: 'AP U.S. Government subject-expert, rights, accessibility, production, field-testing, and psychometric review remain pending.',
  requiresHumanJudgment: true,
});

const deploymentParity = [parity('pack', deployPackPath), parity('learning-library', deployLibraryPath)];
for (const result of deploymentParity) {
  if (result.status === 'mismatch') addFinding('deployment-parity', result.asset + ' deployment mirror is not byte-identical to source.', { asset: result.asset });
}

const report = {
  schemaVersion: 1,
  qaVersion: 'ap-usg-foundation-qa-v4',
  packId: PACK_ID,
  version: VERSION,
  generatedAt: '2026-08-20T00:00:00.000Z',
  automatedAssessment: findings.length === 0 ? 'pass' : 'fail',
  structuralFindings: findings,
  advisories,
  metrics: {
    itemCount: items.length,
    unitCount: domains.length,
    topicCount: expectedTopicIds.length,
    representedTopicCount: expectedTopicIds.filter((topicId) => topicCounts[topicId] > 0).length,
    topicsWithAtLeastTwoItems: expectedTopicIds.filter((topicId) => topicCounts[topicId] >= 2).length,
    chapterCount: chapters.length,
    sectionCount: sections.length,
    knowledgeCheckCount: checks.length,
    flashcardCount: library.flashcards?.length || 0,
    memoryAidCount: library.memoryAids?.length || 0,
    skillCategoryCount: Object.keys(practiceCounts).length,
    subskillCount: Object.keys(skillCounts).length,
    practiceSliceCounts,
    topicDrillMapCount: practiceRoutes.reduce((sum, route) => sum + Object.keys(route?.topicItemIds || {}).length, 0),
    answerPositionCounts: answerCounts,
  },
  coverage: {
    domains: domainCounts,
    topics: topicCounts,
    practiceCategories: practiceCounts,
    subskills: skillCounts,
  },
  deploymentParity,
  rightsBoundary: {
    secureCollegeBoardContentUsed: false,
    copiedOrRephrasedCollegeBoardQuestions: false,
    officialRubricTextUsed: false,
    releaseEligible: false,
  },
  reviewBoundary: {
    subjectExpertReview: 'pending',
    accessibilityReview: 'pending',
    psychometricCalibration: 'not-started',
    releaseBlocked: true,
  },
};

writeGeneratedFile(qaPath, JSON.stringify(report, null, 2) + '\n');
console.log('AP U.S. Government QA ' + report.automatedAssessment + ': ' + findings.length + ' structural findings, ' + report.metrics.itemCount + ' items, ' + report.metrics.representedTopicCount + '/' + report.metrics.topicCount + ' topics represented.');
if (findings.length > 0) process.exitCode = 1;
