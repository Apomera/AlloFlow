#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const packPath = path.join(root, 'test_prep', 'ap_biology_foundation_pilot.json');
const libraryPath = path.join(root, 'test_prep', 'ap_biology_foundation_pilot_learning_library.json');
const deployPackPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'ap_biology_foundation_pilot.json');
const deployLibraryPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'ap_biology_foundation_pilot_learning_library.json');
const reportPath = path.join(root, 'test_prep', 'ap_biology_foundation_pilot_qa.json');

const cedUrl = 'https://apcentral.collegeboard.org/media/pdf/ap-biology-course-and-exam-description.pdf';
const courseUrl = 'https://apstudents.collegeboard.org/courses/ap-biology';
const openStaxUrl = 'https://openstax.org/details/books/biology-2e';
const expectedUnits = [
  'chemistry-of-life',
  'cells',
  'cellular-energetics',
  'cell-communication-and-cell-cycle',
  'heredity',
  'gene-expression-and-regulation',
  'natural-selection',
  'ecology',
];
const expectedPractices = ['SP1', 'SP2', 'SP3', 'SP4', 'SP5', 'SP6'];
const allowedHosts = new Set(['apcentral.collegeboard.org', 'apstudents.collegeboard.org', 'openstax.org']);
const signalDefinitions = [
  ['asset-identity', 'Pack/library identity, version, internal-preview state, and cross-links are consistent.'],
  ['blueprint-and-unit-coverage', 'The eight current AP Biology units, public weight ranges, four big ideas, and six science practices are declared.'],
  ['one-best-answer', 'Every pilot item and chapter check has four distinct choices and one valid key.'],
  ['substantive-feedback', 'Every item has an overall rationale and option-specific feedback of meaningful length.'],
  ['learning-alignment', 'Every item resolves to an internal objective, topic, chapter, lesson route, and science-practice metadata.'],
  ['library-inventory', 'Native chapters, sections, checks, cards, memory aids, and rich prototypes match their declared counts.'],
  ['library-content-structure', 'The native library has navigable, text-first chapter structures and structured lesson blocks.'],
  ['source-and-provenance', 'Public blueprint/factual references and independent-original provenance declarations are complete.'],
  ['rights-boundary', 'Restricted content, copied-question, and release flags remain closed pending independent review.'],
  ['accessibility-boundary', 'Text, linear-reading-order, hands-free, and independent accessibility gates are declared.'],
  ['expert-review-boundary', 'AP Biology subject-expert review remains pending and release-blocking.'],
  ['psychometric-boundary', 'The pilot remains uncalibrated, unreleased, non-predictive, and non-official.'],
  ['prompt-originality', 'No exact or conservative high-similarity duplicate prompt pair exists in the pilot.'],
  ['deployment-parity', 'Source and deployment mirrors are byte-identical after the manifest build.'],
];

function readAsset(filePath) {
  const bytes = fs.readFileSync(filePath);
  return {
    bytes,
    json: JSON.parse(bytes.toString('utf8')),
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
  };
}

function wordCount(value) {
  return String(value || '').trim().split(/\s+/).filter(Boolean).length;
}

function normalizeText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

function tokenSet(value) {
  return new Set((normalizeText(value).match(/[a-z0-9]+/g) || []).filter((token) => token.length > 2));
}

function jaccardSimilarity(left, right) {
  const a = tokenSet(left);
  const b = tokenSet(right);
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  const union = a.size + b.size - intersection;
  return union ? intersection / union : 0;
}

function validHttpsUrl(value) {
  try { return new URL(value).protocol === 'https:'; } catch (_) { return false; }
}

function countBy(records, getter) {
  return records.reduce((counts, record) => {
    const key = String(getter(record));
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

function nativeBlocksAreValid(blocks, rich) {
  if (!Array.isArray(blocks) || blocks.length < (rich ? 8 : 2)) return false;
  return blocks.every((block) => {
    if (!block || typeof block !== 'object') return false;
    if (block.type === 'paragraph') return wordCount(block.text) >= 3 && Array.isArray(block.runs) && block.runs.length > 0;
    if (block.type === 'list') return Array.isArray(block.items) && block.items.length >= 2 && block.items.every((item) => wordCount(item?.text) >= 3);
    if (block.type === 'table') return Array.isArray(block.rows) && block.rows.length >= 3 && block.rows.every((row) => Array.isArray(row.cells) && row.cells.length >= 2);
    return false;
  });
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

function addAdvisory(check, message, detail = {}) {
  advisories.push({ check, asset: detail.asset || 'pack', recordId: detail.recordId || '', message, requiresHumanJudgment: true });
}

function requireCondition(condition, check, message, detail) {
  if (!condition) addFinding(check, message, detail);
}

function checkReferences(records, asset, minimum = 2) {
  return Array.isArray(records) && records.length >= minimum && records.every((url) => {
    return validHttpsUrl(url) && allowedHosts.has(new URL(url).hostname.toLowerCase());
  });
}

requireCondition(
  pack.schemaVersion === 1 && pack.itemSchemaVersion === 2 && pack.id === 'ap-biology-foundation-pilot' &&
    pack.version === '0.1.0-internal-preview' && pack.status === 'preview' && pack.visibility === 'internal',
  'asset-identity', 'Pack schema, identity, version, or internal-preview state is invalid.'
);
requireCondition(
  library.schemaVersion === 1 && library.librarySchemaVersion === 1 &&
    library.libraryId === 'ap-biology-foundation-pilot-learning-library' && library.packId === pack.id &&
    library.version === pack.version && library.status === 'preview' && library.visibility === 'internal',
  'asset-identity', 'Learning-library schema, identity, version, or pack link is invalid.', { asset: 'learning-library' }
);
requireCondition(
  pack.learningLibraryUrl === './test_prep/ap_biology_foundation_pilot_learning_library.json' &&
    pack.nativeQaUrl === './test_prep/ap_biology_foundation_pilot_qa.json',
  'asset-identity', 'Pack companion URLs are incomplete or point to the wrong pilot assets.'
);
requireCondition(
  pack.released === false && pack.releaseEligible === false && pack.officialItem === false && pack.calibrated === false &&
    library.released === false && library.releaseEligible === false && library.officialItem === false,
  'psychometric-boundary', 'Internal pilot assets must remain unreleased, unofficial, uncalibrated, and release-ineligible.'
);
requireCondition(
  pack.officialBlueprintUrl === cedUrl && pack.officialExamUrl === 'https://apcentral.collegeboard.org/courses/ap-biology/exam' &&
    library.blueprint?.officialBlueprintUrl === cedUrl && library.blueprint?.officialCourseUrl === courseUrl,
  'blueprint-and-unit-coverage', 'Pack and library must preserve the current public AP Biology blueprint and course references.'
);

const domains = Array.isArray(pack.domains) ? pack.domains : [];
const items = Array.isArray(pack.items) ? pack.items : [];
const chapters = Array.isArray(library.chapters) ? library.chapters : [];
const sections = chapters.flatMap((chapter) => Array.isArray(chapter.sections) ? chapter.sections : []);
const checks = chapters.flatMap((chapter) => Array.isArray(chapter.knowledgeChecks) ? chapter.knowledgeChecks : []);
const objectiveCatalog = Array.isArray(pack.blueprint?.learningObjectiveCatalog) ? pack.blueprint.learningObjectiveCatalog : [];
const objectiveById = new Map(objectiveCatalog.map((objective) => [objective.id, objective]));

requireCondition(
  domains.length === 8 && new Set(domains.map((domain) => domain.id)).size === 8 &&
    expectedUnits.every((unit) => domains.some((domain) => domain.id === unit)) &&
    Math.abs(domains.reduce((sum, domain) => sum + Number(domain.weight || 0), 0) - 1) < 1e-10,
  'blueprint-and-unit-coverage', 'Exactly eight unique AP Biology units with midpoint weights totaling 1.0 are required.'
);
for (const unitId of expectedUnits) {
  const domain = domains.find((candidate) => candidate.id === unitId);
  requireCondition(
    domain && Number(domain.itemCount) >= 5 && Number(domain.officialWeightMin) > 0 && Number(domain.officialWeightMax) > Number(domain.officialWeightMin),
    'blueprint-and-unit-coverage', `${unitId} must declare an official weight range and at least five pilot items.`, { recordId: unitId }
  );
}
requireCondition(
  Array.isArray(pack.blueprint?.bigIdeas) && pack.blueprint.bigIdeas.length === 4 &&
    Array.isArray(pack.blueprint?.sciencePractices) && pack.blueprint.sciencePractices.length === 6 &&
    new Set(pack.blueprint.sciencePractices.map((practice) => practice.id)).size === 6,
  'blueprint-and-unit-coverage', 'The four big ideas and six science-practice records are incomplete.'
);
requireCondition(
  objectiveCatalog.length === 60 && new Set(objectiveCatalog.map((objective) => objective.id)).size === 60 &&
    objectiveCatalog.every((objective) => objective.status === 'internal-remediation-route' && objective.releaseEligible === false &&
      expectedUnits.includes(objective.domainId) && Array.isArray(objective.practiceIds) && objective.practiceIds.length >= 1),
  'learning-alignment', 'The 60-topic internal remediation catalog is incomplete.'
);

const itemIds = new Set();
const answerCounts = countBy(items, (item) => item.answerIndex);
const unitCounts = countBy(items, (item) => item.domainId);
const practiceCounts = countBy(items, (item) => item.practiceId);
requireCondition(items.length === 50 && new Set(items.map((item) => item.id)).size === 50, 'asset-identity', 'The AP Biology foundation pilot must contain exactly 50 uniquely identified items.');
requireCondition(expectedUnits.every((unit) => unitCounts[unit] >= 5), 'blueprint-and-unit-coverage', 'Every current AP Biology unit must receive at least five items.');
requireCondition(expectedPractices.every((practice) => practiceCounts[practice] > 0), 'blueprint-and-unit-coverage', 'All six AP Biology science practices must be represented.');
requireCondition(
  answerCounts[0] === 13 && answerCounts[1] === 13 && answerCounts[2] === 12 && answerCounts[3] === 12,
  'one-best-answer', 'Answer keys must be intentionally balanced at 13/13/12/12 across A-D.'
);

const prompts = [];
for (const item of items) {
  const recordId = String(item.id || '');
  const objective = objectiveById.get(item.learningObjectiveId);
  const choices = Array.isArray(item.choices) ? item.choices : [];
  const normalizedChoices = choices.map(normalizeText);
  const choiceRationales = Array.isArray(item.choiceRationales) ? item.choiceRationales : [];
  const references = Array.isArray(item.references) ? item.references : [];
  const sourceDetails = Array.isArray(item.sourceDetails) ? item.sourceDetails : [];
  itemIds.add(recordId);
  prompts.push({ id: recordId, prompt: item.prompt });
  requireCondition(
    /^ap-bio-u[1-8]-\d{3}$/.test(recordId) && item.templateVersion === 1 && item.itemSchemaVersion === 2 &&
      item.type === 'single-choice' && normalizeText(item.prompt).length >= 24 && choices.length === 4 &&
      new Set(normalizedChoices).size === 4 && choices.every((choice) => normalizeText(choice).length >= 2) &&
      Number.isInteger(item.answerIndex) && item.answerIndex >= 0 && item.answerIndex <= 3,
    'one-best-answer', 'Item must have a substantive prompt, four distinct options, and one valid answer key.', { recordId }
  );
  requireCondition(
    expectedUnits.includes(item.domainId) && Array.isArray(item.topicIds) && item.topicIds.length === 1 &&
      /^\d+\.\d+$/.test(String(item.topicIds[0])) && expectedPractices.includes(item.practiceId) &&
      Array.isArray(item.practiceIds) && item.practiceIds.includes(item.practiceId) &&
      Array.isArray(item.skillIds) && item.skillIds.includes(item.practiceId),
    'learning-alignment', 'Item unit, topic, or science-practice metadata is incomplete.', { recordId }
  );
  requireCondition(
    wordCount(item.rationale) >= 10 && choiceRationales.length === 4 && choiceRationales.every((text) => wordCount(text) >= 10),
    'substantive-feedback', 'Each item needs a substantive overall rationale and four option-specific explanations.', { recordId }
  );
  requireCondition(
    objective && objective.domainId === item.domainId && objective.topicId === item.topicIds?.[0] &&
      objective.id === item.learningObjectiveId && objective.label === item.learningObjectiveLabel &&
      objective.chapterId === item.chapterIds?.[0] && objective.sectionId === item.learningSectionId &&
      objective.sectionLabel === item.learningSectionLabel && objective.practiceIds.includes(item.practiceId),
    'learning-alignment', 'Item does not resolve to its matching internal objective/chapter/lesson route.', { recordId }
  );
  requireCondition(
    references.includes(cedUrl) && checkReferences(references) && sourceDetails.length >= 1 &&
      sourceDetails.every((source) => wordCount(source.title) >= 2 && wordCount(source.organization) >= 1 &&
        wordCount(source.credibility) >= 8 && validHttpsUrl(source.url) && references.includes(source.url) &&
        allowedHosts.has(new URL(source.url).hostname.toLowerCase())) &&
      item.provenance === 'native-original' && item.officialItem === false && item.reviewStatus === 'internal-editorial-draft',
    'source-and-provenance', 'Item references, source details, provenance, or draft review status are incomplete.', { recordId }
  );
  requireCondition(
    item.rights?.secureContentUsed === false && item.rights?.copiedOfficialQuestion === false &&
      item.rights?.sourceUse === 'facts-and-blueprint-only' && item.releaseEligible === false,
    'rights-boundary', 'Item restricted-content or release declarations regressed.', { recordId }
  );
  requireCondition(
    item.accessibility?.textOnly === true && item.accessibility?.essentialVisual === false &&
      item.accessibility?.linearReadingOrder === true && item.accessibility?.handsFreeContentCompatible === true,
    'accessibility-boundary', 'Item text/reading-order accessibility declarations are incomplete.', { recordId }
  );
  requireCondition(item.expertReview?.status === 'pending' && item.expertReview?.releaseBlocked === true, 'expert-review-boundary', 'Item expert review must remain pending and release-blocking.', { recordId });
  requireCondition(item.psychometricStatus === 'not-calibrated' && item.releaseEligible === false, 'psychometric-boundary', 'Item must remain uncalibrated and release-ineligible.', { recordId });
}

const nearDuplicatePairs = [];
for (let left = 0; left < prompts.length; left += 1) {
  for (let right = left + 1; right < prompts.length; right += 1) {
    const similarity = jaccardSimilarity(prompts[left].prompt, prompts[right].prompt);
    if (normalizeText(prompts[left].prompt) === normalizeText(prompts[right].prompt) || similarity >= 0.82) {
      nearDuplicatePairs.push({ left: prompts[left].id, right: prompts[right].id, similarity: Number(similarity.toFixed(3)) });
    }
  }
}
requireCondition(nearDuplicatePairs.length === 0, 'prompt-originality', 'Exact or conservative high-similarity pilot prompts were detected.', { asset: 'pack' });

requireCondition(
  chapters.length === 8 && sections.length === 8 && checks.length === 8 &&
    Array.isArray(library.flashcards) && library.flashcards.length === 8 &&
    Array.isArray(library.memoryAids) && library.memoryAids.length === 8 &&
    library.summary?.chapters === 8 && library.summary?.sections === 8 && library.summary?.knowledgeChecks === 8 &&
    library.summary?.richLessonPrototypes === 2,
  'library-inventory', 'The native AP Biology library inventory does not match its eight-unit foundation declaration.', { asset: 'learning-library' }
);
requireCondition(
  chapters.every((chapter, index) => chapter.id === `ap-bio-ch-${String(index + 1).padStart(2, '0')}` &&
    expectedUnits.includes(chapter.domainId) && chapter.sections?.length === 1 && chapter.knowledgeChecks?.length === 1 &&
    chapter.contentComplete === true && chapter.releaseEligible === false && checkReferences(chapter.references, 'learning-library', 3) &&
    chapter.sections.every((section) => section.contentComplete === true && nativeBlocksAreValid(section.contentBlocks, Boolean(chapter.foundationPrototype)))),
  'library-content-structure', 'Every native chapter must be navigable, text-first, referenced, and structurally complete.', { asset: 'learning-library' }
);
requireCondition(
  chapters.filter((chapter) => chapter.foundationPrototype === true).length === 2 &&
    chapters.filter((chapter) => chapter.foundationPrototype === true).every((chapter) => {
      const section = chapter.sections[0];
      return Array.isArray(section.examples) && section.examples.length >= 2 && Array.isArray(section.nonExamples) &&
        section.nonExamples.length >= 2 && Array.isArray(section.commonMisconceptions) && section.commonMisconceptions.length >= 1 &&
        Array.isArray(section.retrievalPrompts) && section.retrievalPrompts.length >= 3 && section.transferMove &&
        section.workedDataExample?.rows?.length >= 2;
    }),
  'library-content-structure', 'The two richer lesson prototypes must contain examples, boundaries, misconception guidance, data work, retrieval, and transfer.', { asset: 'learning-library' }
);
requireCondition(
  checks.every((check) => check.choices?.length === 4 && Number.isInteger(check.answerIndex) && wordCount(check.rationale) >= 8 && check.reviewStatus === 'source-reviewed-editorial-pass'),
  'library-content-structure', 'Every native chapter retrieval check must be single-choice, keyed, explained, and source-reviewed.', { asset: 'learning-library' }
);
requireCondition(
  Array.isArray(library.sourceCatalog) && library.sourceCatalog.length >= 3 && library.sourceCatalog.every((source) => validHttpsUrl(source.url) && allowedHosts.has(new URL(source.url).hostname.toLowerCase())),
  'source-and-provenance', 'Learning-library source catalog is incomplete or contains an unapproved host.', { asset: 'learning-library' }
);
requireCondition(
library.rightsPolicy?.secureCollegeBoardContentUsed === false && library.rightsPolicy?.copiedOrRephrasedCollegeBoardQuestions === false &&
  library.accessibility?.independentReviewStatus === 'pending' && library.expertReviewGate?.status === 'pending' &&
  library.releaseGates?.releaseEligible === false && library.contentMigration?.richLessonPrototypes === 2,
  'rights-boundary', 'Learning-library rights, accessibility, expert, release, or migration boundaries regressed.', { asset: 'learning-library' }
);

function inspectParity(assetName, sourceAsset, deployPath) {
  if (!fs.existsSync(deployPath)) return { asset: assetName, status: 'not-present-prebuild', blocking: false, sourceSha256: sourceAsset.sha256, deploySha256: null };
  const deployBytes = fs.readFileSync(deployPath);
  const deploySha256 = crypto.createHash('sha256').update(deployBytes).digest('hex');
  if (deploySha256 !== sourceAsset.sha256) addFinding('deployment-parity', `${assetName} deployment mirror is not byte-identical to source.`);
  return { asset: assetName, status: deploySha256 === sourceAsset.sha256 ? 'pass' : 'mismatch', blocking: deploySha256 !== sourceAsset.sha256, sourceSha256: sourceAsset.sha256, deploySha256 };
}

const deploymentParity = [
  inspectParity('pack', packAsset, deployPackPath),
  inspectParity('learning-library', libraryAsset, deployLibraryPath),
];
addAdvisory('independent-human-review', 'Before release, obtain AP Biology subject-expert, lab-boundary, rights, accessibility, production, field-testing, psychometric, and current-CED review.');

const checksBySignal = new Map(signalDefinitions.map(([id]) => [id, { id, status: 'pass', findingCount: 0 }]));
for (const finding of findings) {
  const signal = checksBySignal.get(finding.check);
  if (signal) { signal.status = 'fail'; signal.findingCount += 1; }
}
const automatedAssessment = findings.length === 0 ? 'pass' : 'fail';
const generatedAt = /^\d{4}-\d{2}-\d{2}$/.test(String(pack.blueprint?.lastVerifiedAt || ''))
  ? `${pack.blueprint.lastVerifiedAt}T00:00:00.000Z` : '2026-08-20T00:00:00.000Z';
const report = {
  reportId: 'ap-biology-foundation-qa',
  schemaVersion: 1,
  generatedAt,
  packId: pack.id,
  version: pack.version,
  status: automatedAssessment,
  automatedAssessment,
  structuralFindings: findings,
  editorialAdvisories: advisories,
  signals: signalDefinitions.map(([id, description]) => ({ ...checksBySignal.get(id), description })),
  metrics: {
    itemCount: items.length,
    unitCount: domains.length,
    unitCounts,
    practiceCounts,
    answerCounts: { A: Number(answerCounts[0] || 0), B: Number(answerCounts[1] || 0), C: Number(answerCounts[2] || 0), D: Number(answerCounts[3] || 0) },
    chapterCount: chapters.length,
    sectionCount: sections.length,
    knowledgeCheckCount: checks.length,
    flashcardCount: library.flashcards?.length || 0,
    memoryAidCount: library.memoryAids?.length || 0,
    richLessonPrototypeCount: chapters.filter((chapter) => chapter.foundationPrototype).length,
    nearDuplicatePairCount: nearDuplicatePairs.length,
  },
  inputs: {
    packSha256: packAsset.sha256,
    learningLibrarySha256: libraryAsset.sha256,
    officialBlueprintUrl: cedUrl,
    officialCourseUrl: courseUrl,
    factualCrossCheckUrl: openStaxUrl,
  },
  deploymentParity,
  releaseBlockers: [
    'Independent AP Biology subject-expert review',
    'Independent accessibility and production validation',
    'Rights review and current-CED/policy reverification',
    'Field testing and psychometric calibration',
    'Laboratory boundary review; this pilot is not laboratory competency or safety training',
  ],
};

writeGeneratedFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(`AP Biology foundation QA ${automatedAssessment}: ${items.length} items, ${chapters.length} chapters, ${findings.length} structural findings.`);
if (findings.length) process.exitCode = 1;
