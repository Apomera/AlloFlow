'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const packPath = path.join(root, 'test_prep', 'ap_statistics_foundation_pilot.json');
const libraryPath = path.join(root, 'test_prep', 'ap_statistics_foundation_pilot_learning_library.json');
const qaPath = path.join(root, 'test_prep', 'ap_statistics_foundation_pilot_qa.json');
const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));

function fail(message) {
  throw new Error('[AP Statistics foundation QA] ' + message);
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

const findings = [];
const topics = new Set((pack.domains || []).flatMap((domain) => {
  const unit = (pack.blueprint && pack.blueprint.officialFrameworkTopicIds || []).filter((id) => String(id).startsWith(String(domain.id).slice(0, 1)));
  return unit;
}));
const itemIds = new Set();
const answerCounts = [0, 0, 0, 0];
for (const item of pack.items || []) {
  if (itemIds.has(item.id)) findings.push({ code: 'duplicate-item-id', itemId: item.id });
  itemIds.add(item.id);
  if (!Array.isArray(item.choices) || item.choices.length !== 4) findings.push({ code: 'choice-count', itemId: item.id });
  if (item.answerIndex < 0 || item.answerIndex > 3) findings.push({ code: 'answer-index', itemId: item.id });
  else answerCounts[item.answerIndex] += 1;
}

const unitCounts = Object.fromEntries((pack.domains || []).map((domain) => [domain.id, (pack.items || []).filter((item) => item.domainId === domain.id).length]));
const representedTopicIds = new Set((pack.items || []).flatMap((item) => item.topicIds || []));
const declaredTopicIds = new Set(pack.blueprint && pack.blueprint.officialFrameworkTopicIds || []);
const topicCounts = Object.fromEntries((pack.items || []).flatMap((item) => item.topicIds || []).map((topicId) => [topicId, ((pack.items || []).filter((candidate) => (candidate.topicIds || []).includes(topicId))).length]));
for (const topicId of declaredTopicIds) if (!representedTopicIds.has(topicId)) findings.push({ code: 'missing-topic', topicId });
for (const [unitId, count] of Object.entries(unitCounts)) if (count !== 40) findings.push({ code: 'unit-balance', unitId, actual: count, expected: 40 });
for (const topicId of declaredTopicIds) if ((topicCounts[topicId] || 0) < 2) findings.push({ code: 'topic-depth', topicId, actual: topicCounts[topicId] || 0, expectedMinimum: 2 });
if (answerCounts.some((count) => count !== 50)) findings.push({ code: 'answer-balance', actual: answerCounts, expected: [50, 50, 50, 50] });
if (pack.id !== 'ap-statistics-foundation-pilot') findings.push({ code: 'pack-identity' });
  if ((pack.items || []).length !== 200) findings.push({ code: 'item-count', actual: (pack.items || []).length });
if ((pack.domains || []).length !== 5) findings.push({ code: 'unit-count', actual: (pack.domains || []).length });
if ((library.chapters || []).length !== 5) findings.push({ code: 'chapter-count', actual: (library.chapters || []).length });
if ((library.summary && library.summary.sections) !== 15) findings.push({ code: 'section-count', actual: library.summary && library.summary.sections });
if ((library.constructedResponseWorkshops || []).some((workshop) => workshop.unscored !== true)) findings.push({ code: 'workshop-score-boundary' });
if (pack.releaseEligible !== false || library.releaseEligible !== false) findings.push({ code: 'release-boundary' });

const report = {
  schemaVersion: 1,
  qaVersion: 'ap-statistics-foundation-qa-v2',
  reportId: 'ap-statistics-foundation-qa',
  generatedAt: '2026-08-20T00:00:00.000Z',
  packId: pack.id,
  version: pack.version,
  automatedAssessment: findings.length ? 'fail' : 'pass',
  structuralFindings: findings,
  advisories: [
    'Automated QA does not establish AP Statistics content validity, fairness, accessibility conformance, rights clearance, production readiness, score meaning, or psychometric quality.',
    'Independent AP Statistics subject-expert, rights, accessibility, field-testing, and psychometric review remain release-blocking.',
  ],
  metrics: {
    itemCount: pack.items.length,
    unitCount: pack.domains.length,
    unitCounts,
    declaredTopicCount: declaredTopicIds.size,
    representedTopicCount: representedTopicIds.size,
    minimumItemsPerTopic: Math.min(...Array.from(declaredTopicIds, (topicId) => topicCounts[topicId] || 0)),
    answerPositionCounts: answerCounts,
    chapterCount: library.chapters.length,
    sectionCount: library.summary.sections,
    knowledgeCheckCount: library.summary.knowledgeChecks,
    flashcardCount: library.summary.flashcards,
    memoryAidCount: library.summary.memoryAids,
    constructedResponseWorkshopCount: library.constructedResponseWorkshops.length,
  },
  coverage: {
    allDeclaredTopicsRepresented: findings.every((finding) => finding.code !== 'missing-topic'),
    allUnitsRepresented: Object.values(unitCounts).every((count) => count > 0),
    nativeLearningRoutes: pack.items.filter((item) => item.learningSectionId && item.chapterIds && item.chapterIds.length).length,
  },
  inputs: {
    packSha256: sha256(packPath),
    learningLibrarySha256: sha256(libraryPath),
    officialBlueprintUrl: pack.officialBlueprintUrl,
    reviewedAt: '2026-08-20',
  },
  deploymentParity: { sourceAndDeployCopiesCheckedByManifestBuilder: true, status: 'pending-manifest-build' },
  rightsBoundary: { officialItemsUsed: false, officialStimuliUsed: false, officialRubricsUsed: false, status: 'pending-independent-rights-review' },
  reviewBoundary: { subjectExpert: 'pending', accessibility: 'pending', production: 'pending', psychometric: 'not-started', releaseEligible: false },
};

if (findings.length) fail(findings.length + ' structural findings detected.');
writeGeneratedFile(qaPath, JSON.stringify(report, null, 2) + '\n');
console.log('AP Statistics foundation QA pass: ' + pack.items.length + ' items, ' + representedTopicIds.size + '/' + declaredTopicIds.size + ' topics, ' + library.chapters.length + ' chapters.');
