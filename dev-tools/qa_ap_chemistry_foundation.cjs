#!/usr/bin/env node
'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const packPath = path.join(root, 'test_prep', 'ap_chemistry_foundation_pilot.json');
const libraryPath = path.join(root, 'test_prep', 'ap_chemistry_foundation_pilot_learning_library.json');
const deployPackPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'ap_chemistry_foundation_pilot.json');
const deployLibraryPath = path.join(root, 'desktop', 'web-app', 'public', 'test_prep', 'ap_chemistry_foundation_pilot_learning_library.json');
const reportPath = path.join(root, 'test_prep', 'ap_chemistry_foundation_pilot_qa.json');

const cedUrl = 'https://apcentral.collegeboard.org/media/pdf/ap-chemistry-course-and-exam-description.pdf';
const courseUrl = 'https://apstudents.collegeboard.org/courses/ap-chemistry';
const openStaxUrl = 'https://openstax.org/details/books/chemistry-2e';
const expectedUnits = [
  'atomic-structure-and-properties',
  'compound-structure-and-properties',
  'properties-of-substances-and-mixtures',
  'chemical-reactions',
  'kinetics',
  'thermochemistry',
  'equilibrium',
  'acids-and-bases',
  'thermodynamics-and-electrochemistry',
];
const expectedUnitCounts = {
  'atomic-structure-and-properties': 40,
  'compound-structure-and-properties': 40,
  'properties-of-substances-and-mixtures': 40,
  'chemical-reactions': 40,
  kinetics: 40,
  thermochemistry: 40,
  equilibrium: 40,
  'acids-and-bases': 40,
  'thermodynamics-and-electrochemistry': 40,
};
const expectedPractices = ['SP1', 'SP2', 'SP3', 'SP4', 'SP5', 'SP6'];
const allowedHosts = new Set(['apcentral.collegeboard.org', 'apstudents.collegeboard.org', 'openstax.org']);
const signalDefinitions = [
  ['asset-identity', 'Pack/library identity, version, internal-preview state, and cross-links are consistent.'],
  ['blueprint-and-unit-coverage', 'The nine current AP Chemistry units, public weight ranges, seven big ideas, and six science practices are declared.'],
  ['one-best-answer', 'Every pilot item and chapter check has four distinct choices and one valid key.'],
  ['substantive-feedback', 'Every item has an overall rationale and option-specific feedback of meaningful length.'],
  ['learning-alignment', 'Every item resolves to an internal objective, topic, chapter, lesson route, and science-practice metadata.'],
  ['library-inventory', 'Native chapters, sections, checks, cards, memory aids, and rich prototypes match their declared counts.'],
  ['library-content-structure', 'The native library has navigable, text-first chapter structures, data moments, retrieval, and transfer blocks.'],
  ['source-and-provenance', 'Public blueprint/factual references and independent-original provenance declarations are complete.'],
  ['rights-boundary', 'Restricted content, copied-question, and release flags remain closed pending independent review.'],
  ['accessibility-boundary', 'Text, linear-reading-order, hands-free, and independent accessibility gates are declared.'],
  ['expert-review-boundary', 'AP Chemistry subject-expert and laboratory review remains pending and release-blocking.'],
  ['psychometric-boundary', 'The pilot remains uncalibrated, unreleased, non-predictive, and non-official.'],
  ['prompt-originality', 'No exact or conservative high-similarity duplicate prompt pair exists in the pilot.'],
  ['deployment-parity', 'Source and deployment mirrors are byte-identical after the manifest build.'],
];

function readAsset(filePath) {
  const bytes = fs.readFileSync(filePath);
  return { bytes, json: JSON.parse(bytes.toString('utf8')), sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
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

function checkReferences(records, minimum = 3) {
  return Array.isArray(records) && records.length >= minimum && records.every((url) => {
    return validHttpsUrl(url) && allowedHosts.has(new URL(url).hostname.toLowerCase());
  });
}

function nativeBlocksAreValid(blocks) {
  if (!Array.isArray(blocks) || blocks.length < 8) return false;
  return blocks.every((block) => {
    if (!block || typeof block !== 'object') return false;
    if (block.type === 'paragraph') return wordCount(block.text) >= 3 && Array.isArray(block.runs) && block.runs.length > 0;
    if (block.type === 'list') return Array.isArray(block.items) && block.items.length >= 2 && block.items.every((item) => wordCount(item?.text) >= 3);
    if (block.type === 'table') return Array.isArray(block.rows) && block.rows.length >= 2 && block.rows.every((row) => Array.isArray(row.cells) && row.cells.length >= 2);
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

requireCondition(
  pack.schemaVersion === 1 && pack.itemSchemaVersion === 2 && pack.id === 'ap-chemistry-foundation-pilot' &&
    pack.version === '0.2.0-internal-preview' && pack.status === 'preview' && pack.visibility === 'internal',
  'asset-identity', 'Pack schema, identity, version, or internal-preview state is invalid.'
);
requireCondition(
  library.schemaVersion === 1 && library.librarySchemaVersion === 1 &&
    library.libraryId === 'ap-chemistry-foundation-pilot-learning-library' && library.packId === pack.id &&
    library.version === pack.version && library.status === 'preview' && library.visibility === 'internal',
  'asset-identity', 'Learning-library schema, identity, version, or internal-preview state is invalid.', { asset: 'learning-library' }
);
requireCondition(
  pack.learningLibraryUrl === './test_prep/ap_chemistry_foundation_pilot_learning_library.json' &&
    pack.nativeQaUrl === './test_prep/ap_chemistry_foundation_pilot_qa.json',
  'asset-identity', 'Pack companion URLs are incomplete or point to the wrong pilot assets.'
);
requireCondition(
  pack.released === false && pack.releaseEligible === false && pack.officialItem === false && pack.calibrated === false &&
    library.released === false && library.releaseEligible === false && library.officialItem === false,
  'psychometric-boundary', 'Internal pilot assets must remain unreleased, unofficial, uncalibrated, and release-ineligible.'
);
requireCondition(
  /unofficial/i.test(String(pack.disclaimer || '')) && /not affiliated with|not endorsed by/i.test(String(pack.disclaimer || '')) &&
    /laboratory competency/i.test(String(pack.disclaimer || '')),
  'asset-identity', 'The pack must carry a clear unofficial, non-predictive, laboratory-boundary disclaimer.'
);
requireCondition(
  pack.officialBlueprintUrl === cedUrl && pack.officialExamUrl === 'https://apcentral.collegeboard.org/courses/ap-chemistry/exam' &&
    library.blueprint?.officialBlueprintUrl === cedUrl && library.blueprint?.officialCourseUrl === courseUrl,
  'blueprint-and-unit-coverage', 'Pack and library must preserve the current public AP Chemistry blueprint and course references.'
);

const domains = Array.isArray(pack.domains) ? pack.domains : [];
const items = Array.isArray(pack.items) ? pack.items : [];
const chapters = Array.isArray(library.chapters) ? library.chapters : [];
const sections = chapters.flatMap((chapter) => Array.isArray(chapter.sections) ? chapter.sections : []);
const checks = chapters.flatMap((chapter) => Array.isArray(chapter.knowledgeChecks) ? chapter.knowledgeChecks : []);
const objectiveCatalog = Array.isArray(pack.blueprint?.learningObjectiveCatalog) ? pack.blueprint.learningObjectiveCatalog : [];
const objectiveById = new Map(objectiveCatalog.map((objective) => [objective.id, objective]));
const topicCoverage = new Map();
for (const chapter of chapters) for (const topicLabel of chapter.topicCoverage || []) {
  const topicId = String(topicLabel).trim().split(/\s+/)[0];
  topicCoverage.set(topicId, chapter.domainId);
}

requireCondition(
  domains.length === 9 && new Set(domains.map((domain) => domain.id)).size === 9 &&
    expectedUnits.every((unit) => domains.some((domain) => domain.id === unit)) &&
    Math.abs(domains.reduce((sum, domain) => sum + Number(domain.weight || 0), 0) - 1) < 1e-10,
  'blueprint-and-unit-coverage', 'Exactly nine unique AP Chemistry units with midpoint weights totaling 1.0 are required.'
);
for (const unitId of expectedUnits) {
  const domain = domains.find((candidate) => candidate.id === unitId);
  requireCondition(
    domain && Number(domain.itemCount) === expectedUnitCounts[unitId] && Number(domain.officialWeightMin) > 0 && Number(domain.officialWeightMax) > Number(domain.officialWeightMin),
    'blueprint-and-unit-coverage', `${unitId} must declare its official weight range and its expected foundation-item count.`, { recordId: unitId }
  );
}
requireCondition(
  Array.isArray(pack.blueprint?.bigIdeas) && pack.blueprint.bigIdeas.length === 7 &&
    Array.isArray(pack.blueprint?.sciencePractices) && pack.blueprint.sciencePractices.length === 6 &&
    new Set(pack.blueprint.sciencePractices.map((practice) => practice.id)).size === 6,
  'blueprint-and-unit-coverage', 'The seven AP Chemistry big ideas and six science-practice records are incomplete.'
);
requireCondition(
  objectiveCatalog.length === topicCoverage.size && objectiveCatalog.length >= 90 && new Set(objectiveCatalog.map((objective) => objective.id)).size === objectiveCatalog.length &&
    objectiveCatalog.every((objective) => objective.status === 'internal-remediation-route' && objective.releaseEligible === false &&
      expectedUnits.includes(objective.domainId) && topicCoverage.get(objective.topicId) === objective.domainId &&
      Array.isArray(objective.practiceIds) && objective.practiceIds.length === 6),
  'learning-alignment', 'The AP Chemistry topic remediation catalog must cover every chapter topic and all six practices.'
);

const answerCounts = countBy(items, (item) => item.answerIndex);
const unitCounts = countBy(items, (item) => item.domainId);
const practiceCounts = countBy(items, (item) => item.practiceId);
const topicCounts = countBy(items, (item) => item.topicIds?.[0]);
requireCondition(items.length === 360 && new Set(items.map((item) => item.id)).size === 360, 'asset-identity', 'The AP Chemistry foundation pilot must contain exactly 360 uniquely identified items.');
requireCondition(expectedUnits.every((unit) => unitCounts[unit] === expectedUnitCounts[unit]), 'blueprint-and-unit-coverage', 'Every current AP Chemistry unit must receive its expected item count.');
requireCondition(expectedPractices.every((practice) => practiceCounts[practice] > 0), 'blueprint-and-unit-coverage', 'All six AP Chemistry science practices must be represented.');
requireCondition(
  answerCounts[0] === 90 && answerCounts[1] === 90 && answerCounts[2] === 90 && answerCounts[3] === 90,
  'one-best-answer', 'Answer keys must be intentionally balanced at 90/90/90/90 across A-D.'
);
requireCondition(
  Array.isArray(pack.sections) && pack.sections.length === 72 && pack.sections.every((section) => Array.isArray(section.itemIds) && section.itemIds.length === 5 && section.itemIds.every((id) => items.some((item) => item.id === id))),
  'asset-identity', 'The 360-item pilot must expose seventy-two complete five-item internal banks.'
);
requireCondition(
  [...topicCoverage.keys()].every((topicId) => topicCounts[topicId] > 0),
  'blueprint-and-unit-coverage', 'Every declared AP Chemistry topic must receive at least one item.'
);

const prompts = [];
for (const item of items) {
  const recordId = String(item.id || '');
  const objective = objectiveById.get(item.learningObjectiveId);
  const choices = Array.isArray(item.choices) ? item.choices : [];
  const choiceKeys = choices.map((choice) => String(choice || '').trim().toLowerCase().replace(/\s+/g, ' '));
  const choiceRationales = Array.isArray(item.choiceRationales) ? item.choiceRationales : [];
  const references = Array.isArray(item.references) ? item.references : [];
  prompts.push({ id: recordId, prompt: item.prompt });
  requireCondition(
    /^ap-chem-u[1-9]-\d{3}$/.test(recordId) && item.templateVersion === 1 && item.itemSchemaVersion === 2 &&
      item.type === 'single-choice' && normalizeText(item.prompt).length >= 24 && choices.length === 4 &&
      new Set(choiceKeys).size === 4 && choices.every((choice) => String(choice || '').trim().length >= 1) &&
      Number.isInteger(item.answerIndex) && item.answerIndex >= 0 && item.answerIndex <= 3,
    'one-best-answer', 'Item must have a substantive prompt, four distinct options, and one valid answer key.', { recordId }
  );
  requireCondition(
    expectedUnits.includes(item.domainId) && Array.isArray(item.topicIds) && item.topicIds.length === 1 &&
      topicCoverage.get(item.topicIds[0]) === item.domainId && expectedPractices.includes(item.practiceId) &&
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
    references.includes(cedUrl) && checkReferences(references) && Array.isArray(item.sourceDetails) && item.sourceDetails.length >= 1 &&
      item.sourceDetails.every((source) => wordCount(source.title) >= 2 && wordCount(source.organization) >= 1 &&
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
  chapters.length === 9 && sections.length === 9 && checks.length === 9 &&
    Array.isArray(library.flashcards) && library.flashcards.length === 9 &&
    Array.isArray(library.memoryAids) && library.memoryAids.length === 9 &&
    library.summary?.chapters === 9 && library.summary?.sections === 9 && library.summary?.knowledgeChecks === 9 &&
    library.summary?.richLessonPrototypes === 9,
  'library-inventory', 'The native AP Chemistry library inventory does not match its nine-unit structured-lesson declaration.', { asset: 'learning-library' }
);
requireCondition(
  chapters.every((chapter, index) => chapter.id === `ap-chem-ch-${String(index + 1).padStart(2, '0')}` &&
    expectedUnits.includes(chapter.domainId) && chapter.sections?.length === 1 && chapter.knowledgeChecks?.length === 1 &&
    chapter.contentComplete === true && chapter.foundationPrototype === true && chapter.releaseEligible === false &&
    checkReferences(chapter.references) && chapter.sections.every((section) => section.contentComplete === true && nativeBlocksAreValid(section.contentBlocks))),
  'library-content-structure', 'Every native chapter must be navigable, text-first, referenced, and structurally complete.', { asset: 'learning-library' }
);
requireCondition(
  chapters.every((chapter) => {
    const section = chapter.sections?.[0];
    return Array.isArray(section?.examples) && section.examples.length >= 3 && Array.isArray(section.nonExamples) &&
      section.nonExamples.length >= 3 && Array.isArray(section.commonMisconceptions) && section.commonMisconceptions.length >= 1 &&
      Array.isArray(section.retrievalPrompts) && section.retrievalPrompts.length >= 2 && section.transferMove &&
      section.workedDataExample?.rows?.length >= 2;
  }),
  'library-content-structure', 'All nine structured lessons must contain examples, boundaries, misconception guidance, data work, retrieval, and transfer.', { asset: 'learning-library' }
);
requireCondition(
  checks.every((check) => check.choices?.length === 4 && Number.isInteger(check.answerIndex) && check.answerIndex >= 0 && check.answerIndex <= 3 && wordCount(check.rationale) >= 8 && check.reviewStatus === 'source-reviewed-editorial-pass'),
  'library-content-structure', 'Every native chapter retrieval check must be single-choice, keyed, explained, and source-reviewed.', { asset: 'learning-library' }
);
requireCondition(
  Array.isArray(library.sourceCatalog) && library.sourceCatalog.length >= 3 && library.sourceCatalog.every((source) => validHttpsUrl(source.url) && allowedHosts.has(new URL(source.url).hostname.toLowerCase())),
  'source-and-provenance', 'Learning-library source catalog is incomplete or contains an unapproved host.', { asset: 'learning-library' }
);
requireCondition(
  library.rightsPolicy?.secureCollegeBoardContentUsed === false && library.rightsPolicy?.copiedOrRephrasedCollegeBoardQuestions === false &&
    library.accessibility?.independentReviewStatus === 'pending' && library.expertReviewGate?.status === 'pending' &&
    library.expertReviewGate?.releaseBlocked === true && library.releaseGates?.releaseEligible === false &&
    library.releaseGates?.apChemistrySubjectExpertReview === 'pending' && library.contentMigration?.richLessonPrototypes === 9,
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
addAdvisory('independent-human-review', 'Before release, obtain AP Chemistry subject-expert, laboratory-boundary, rights, accessibility, production, field-testing, psychometric, and current-CED review.');

const checksBySignal = new Map(signalDefinitions.map(([id]) => [id, { id, status: 'pass', findingCount: 0 }]));
for (const finding of findings) {
  const signal = checksBySignal.get(finding.check);
  if (signal) { signal.status = 'fail'; signal.findingCount += 1; }
}
const automatedAssessment = findings.length === 0 ? 'pass' : 'fail';
const generatedAt = /^\d{4}-\d{2}-\d{2}$/.test(String(pack.blueprint?.lastVerifiedAt || ''))
  ? `${pack.blueprint.lastVerifiedAt}T00:00:00.000Z` : '2026-08-20T00:00:00.000Z';
const report = {
  reportId: 'ap-chemistry-foundation-qa',
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
    topicCount: topicCoverage.size,
    topicCounts,
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
    'Independent AP Chemistry subject-expert and laboratory-boundary review',
    'Independent accessibility and production validation',
    'Rights review and current-CED/policy reverification',
    'Field testing and psychometric calibration',
    'No official score, readiness, college-credit, laboratory-competency, or safety inference is supported',
  ],
};

writeGeneratedFile(reportPath, JSON.stringify(report, null, 2) + '\n');
console.log(`AP Chemistry foundation QA ${automatedAssessment}: ${items.length} items, ${chapters.length} chapters, ${findings.length} structural findings.`);
if (findings.length) process.exitCode = 1;
