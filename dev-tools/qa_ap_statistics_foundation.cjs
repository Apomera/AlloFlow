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
const expectedUnitCounts = {
  'exploring-one-variable-data-and-collecting-data': 48,
  'probability-random-variables-and-probability-distributions': 48,
  'inference-for-categorical-data-proportions': 48,
  'inference-for-quantitative-data-means': 48,
  'regression-analysis': 48,
};
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
for (const [unitId, count] of Object.entries(unitCounts)) if (count !== expectedUnitCounts[unitId]) findings.push({ code: 'unit-balance', unitId, actual: count, expected: expectedUnitCounts[unitId] });
for (const topicId of declaredTopicIds) if ((topicCounts[topicId] || 0) < 2) findings.push({ code: 'topic-depth', topicId, actual: topicCounts[topicId] || 0, expectedMinimum: 2 });
if (answerCounts.some((count) => count !== 60)) findings.push({ code: 'answer-balance', actual: answerCounts, expected: [60, 60, 60, 60] });
if (pack.id !== 'ap-statistics-foundation-pilot') findings.push({ code: 'pack-identity' });
  if ((pack.items || []).length !== 240) findings.push({ code: 'item-count', actual: (pack.items || []).length });
if ((pack.domains || []).length !== 5) findings.push({ code: 'unit-count', actual: (pack.domains || []).length });
if ((library.chapters || []).length !== 5) findings.push({ code: 'chapter-count', actual: (library.chapters || []).length });
if ((library.summary && library.summary.sections) !== 15) findings.push({ code: 'section-count', actual: library.summary && library.summary.sections });
if ((library.flashcards || []).length !== 30) findings.push({ code: 'flashcard-count', actual: (library.flashcards || []).length, expected: 30 });
if ((library.summary && library.summary.knowledgeChecks) !== 30) findings.push({ code: 'knowledge-check-count', actual: library.summary && library.summary.knowledgeChecks, expected: 30 });
if ((library.memoryAids || []).length !== 10) findings.push({ code: 'memory-aid-count', actual: (library.memoryAids || []).length, expected: 10 });
if ((library.constructedResponseWorkshops || []).length !== 9) findings.push({ code: 'workshop-count', actual: (library.constructedResponseWorkshops || []).length, expected: 9 });
if ((library.constructedResponseWorkshops || []).some((workshop) => workshop.unscored !== true)) findings.push({ code: 'workshop-score-boundary' });
const diagrams = library.diagrams || [];
const diagramPlacements = library.diagramPlacements || [];
const practiceRoutes = (library.chapters || []).flatMap((chapter) => (chapter.sections || []).map((section) => section.practiceRoute).filter(Boolean));
const studyRoutes = library.studyRoutes || [];
const packItemIds = new Set((pack.items || []).map((item) => item.id));
if (diagrams.length !== 5) findings.push({ code: 'diagram-count', actual: diagrams.length, expected: 5 });
if (diagramPlacements.length !== 5) findings.push({ code: 'diagram-placement-count', actual: diagramPlacements.length, expected: 5 });
if (practiceRoutes.length !== 15) findings.push({ code: 'practice-route-count', actual: practiceRoutes.length, expected: 15 });
if (studyRoutes.length !== 4) findings.push({ code: 'study-route-count', actual: studyRoutes.length, expected: 4 });
const routedItemIds = practiceRoutes.flatMap((route) => route.itemIds || []);
if (routedItemIds.length !== pack.items.length || new Set(routedItemIds).size !== pack.items.length || routedItemIds.some((itemId) => !packItemIds.has(itemId))) findings.push({ code: 'practice-route-item-coverage', actual: { routed: routedItemIds.length, unique: new Set(routedItemIds).size, pack: pack.items.length } });
for (const route of practiceRoutes) {
  if (!route.foundationItemIds?.length || !route.depthItemIds?.length || !route.transferItemIds?.length) findings.push({ code: 'practice-route-depth', actual: route });
  if (!route.topicItemIds || Object.keys(route.topicItemIds).length === 0) findings.push({ code: 'practice-route-topic-map', actual: route });
}
for (const route of studyRoutes) {
  if (!route.itemIds?.length || route.itemIds.some((itemId) => !packItemIds.has(itemId)) || route.releaseEligible !== false) findings.push({ code: 'study-route-boundary', routeId: route.id });
}
for (const diagram of diagrams) {
  if (!diagram.unscored || diagram.officialItem || diagram.releaseEligible) findings.push({ code: 'diagram-score-boundary', diagramId: diagram.id });
  if (!diagram.accessibility || !Array.isArray(diagram.accessibility.textEquivalent) || diagram.accessibility.textEquivalent.length < 3) findings.push({ code: 'diagram-text-equivalent', diagramId: diagram.id });
  if (!diagram.accessibility || diagram.accessibility.fallbackMode !== 'ordered-text-equivalent') findings.push({ code: 'diagram-fallback-mode', diagramId: diagram.id });
  if (!diagram.spec || !Array.isArray(diagram.spec.nodes) || diagram.spec.nodes.length < 3 || !Array.isArray(diagram.spec.edges) || diagram.spec.edges.length !== diagram.spec.nodes.length - 1) findings.push({ code: 'diagram-flow-shape', diagramId: diagram.id });
}
const diagramIds = new Set(diagrams.map((diagram) => diagram.id));
const sectionIds = new Set((library.chapters || []).flatMap((chapter) => (chapter.sections || []).map((section) => section.id)));
for (const placement of diagramPlacements) {
  if (!diagramIds.has(placement.diagramId)) findings.push({ code: 'diagram-placement-target', placementId: placement.id });
  if (!sectionIds.has(placement.sectionId)) findings.push({ code: 'diagram-placement-section', placementId: placement.id });
  if (placement.fallbackMode !== 'diagram-text-equivalent' || placement.requiredForComprehension !== false) findings.push({ code: 'diagram-placement-boundary', placementId: placement.id });
}
if (pack.releaseEligible !== false || library.releaseEligible !== false) findings.push({ code: 'release-boundary' });

const report = {
  schemaVersion: 1,
  qaVersion: 'ap-statistics-foundation-qa-v3',
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
    practiceRouteCount: practiceRoutes.length,
    studyRouteCount: studyRoutes.length,
    practiceRoutedItemCount: routedItemIds.length,
    studyRouteReferenceCount: studyRoutes.reduce((sum, route) => sum + route.itemIds.length, 0),
    diagramCount: diagrams.length,
    diagramPlacementCount: diagramPlacements.length,
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
