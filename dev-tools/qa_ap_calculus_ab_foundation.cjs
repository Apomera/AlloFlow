'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { writeGeneratedFile } = require('./write_generated_file.cjs');

const root = path.resolve(__dirname, '..');
const packPath = path.join(root, 'test_prep', 'ap_calculus_ab_foundation_pilot.json');
const libraryPath = path.join(root, 'test_prep', 'ap_calculus_ab_foundation_pilot_learning_library.json');
const qaPath = path.join(root, 'test_prep', 'ap_calculus_ab_foundation_pilot_qa.json');
const pack = JSON.parse(fs.readFileSync(packPath, 'utf8'));
const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));
const findings = [];

function check(condition, code, message, details) {
  if (!condition) findings.push({ code, message, ...(details || {}) });
}

function sha256(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function countBy(values, selector) {
  const result = {};
  for (const value of values) {
    const key = selector(value);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

const expectedUnitCounts = {
  'limits-and-continuity': 10,
  'differentiation-definition-and-fundamental-properties': 10,
  'differentiation-composite-implicit-inverse-functions': 10,
  'contextual-applications-of-differentiation': 10,
  'analytical-applications-of-differentiation': 10,
  'integration-and-accumulation-of-change': 10,
  'differential-equations': 10,
  'applications-of-integration': 10,
};
const expectedPractices = new Set(['MP1', 'MP2', 'MP3', 'MP4']);
const expectedRepresentations = new Set(['analytical', 'tabular', 'verbal', 'graphical-text']);
const expectedCalculatorModes = new Set(['calculator-not-required', 'calculator-permitted-practice']);
const items = Array.isArray(pack.items) ? pack.items : [];
const itemIds = new Set();
const answerCounts = [0, 0, 0, 0];
const unitCounts = countBy(items, (item) => item.domainId);
const practiceCounts = countBy(items, (item) => item.practiceId);
const representationCounts = countBy(items, (item) => item.representation);
const calculatorCounts = countBy(items, (item) => item.calculatorUse);
const topicCounts = countBy(items.flatMap((item) => item.topicIds || []), (topicId) => topicId);
const selectedTopicIds = new Set(pack.blueprint?.selectedFrameworkTopicIds || []);

check(pack.id === 'ap-calculus-ab-foundation-pilot' && pack.version === '0.1.0-internal-preview', 'pack-identity', 'Pack identity or version is invalid.');
check(pack.schemaVersion === 1 && pack.itemSchemaVersion === 2, 'pack-schema', 'Pack schema versions are invalid.');
check(pack.status === 'preview' && pack.visibility === 'internal' && pack.released === false && pack.releaseEligible === false, 'release-boundary', 'Pack must remain an unreleased internal preview.');
check(items.length === 80, 'item-count', 'The initial seed must contain 80 items.', { actual: items.length, expected: 80 });
check((pack.domains || []).length === 8, 'unit-count', 'The pack must declare eight units.');
check((pack.sections || []).length === 16 && (pack.sections || []).every((section) => section.itemIds?.length === 5), 'bank-inventory', 'The pack must contain sixteen five-item internal banks.');
check(selectedTopicIds.size === 66 && pack.blueprint?.foundationTopicRouteCount === 40, 'topic-blueprint', 'The selected framework-topic and foundation-route inventory is invalid.', { selectedTopics: selectedTopicIds.size, routes: pack.blueprint?.foundationTopicRouteCount });

for (const [unitId, expected] of Object.entries(expectedUnitCounts)) {
  check(unitCounts[unitId] === expected, 'unit-balance', 'Each unit must contain ten items.', { unitId, actual: unitCounts[unitId] || 0, expected });
}

for (const item of items) {
  check(!itemIds.has(item.id), 'duplicate-item-id', 'Item IDs must be unique.', { itemId: item.id });
  itemIds.add(item.id);
  check(item.type === 'single-choice' && item.taskForm === 'multiple-choice', 'item-type', 'Items must use the supported single-choice task form.', { itemId: item.id });
  check(Array.isArray(item.choices) && item.choices.length === 4 && new Set(item.choices).size === 4, 'choice-shape', 'Each item must have four unique choices.', { itemId: item.id });
  check(Number.isInteger(item.answerIndex) && item.answerIndex >= 0 && item.answerIndex <= 3, 'answer-index', 'Answer index must be between zero and three.', { itemId: item.id });
  if (Number.isInteger(item.answerIndex) && item.answerIndex >= 0 && item.answerIndex <= 3) answerCounts[item.answerIndex] += 1;
  check(String(item.prompt || '').length >= 24 && String(item.rationale || '').length >= 30, 'editorial-depth', 'Prompt or rationale is too short for the foundation standard.', { itemId: item.id });
  check(Array.isArray(item.choiceRationales) && item.choiceRationales.length === 4 && item.choiceRationales.every((value) => String(value).length >= 40), 'choice-feedback', 'Every choice needs substantive feedback.', { itemId: item.id });
  check(expectedPractices.has(item.practiceId), 'practice-id', 'Item practice ID is invalid.', { itemId: item.id, practiceId: item.practiceId });
  check(expectedRepresentations.has(item.representation), 'representation', 'Item representation is invalid.', { itemId: item.id, representation: item.representation });
  check(expectedCalculatorModes.has(item.calculatorUse), 'calculator-mode', 'Item calculator route is invalid.', { itemId: item.id, calculatorUse: item.calculatorUse });
  check(Array.isArray(item.topicIds) && item.topicIds.length > 0 && item.topicIds.every((topicId) => selectedTopicIds.has(topicId)), 'topic-link', 'Item topic links must resolve to selected public framework IDs.', { itemId: item.id });
  check(Boolean(item.learningObjectiveId && item.learningSectionId && item.chapterIds?.length === 1), 'learning-route-link', 'Item learning-route metadata is incomplete.', { itemId: item.id });
  check(item.officialItem === false && item.releaseEligible === false && item.psychometricStatus === 'not-calibrated', 'item-release-boundary', 'Item must remain original, uncalibrated, and unreleased.', { itemId: item.id });
  check(item.provenance?.officialContentReproduced === false && item.provenance?.sourceQuestionReproduced === false && item.rights?.secureCollegeBoardContentUsed === false, 'item-rights-boundary', 'Item provenance or rights metadata is invalid.', { itemId: item.id });
  check(item.accessibility?.essentialVisual === false && item.accessibility?.textEquivalentProvided === true && item.accessibility?.mathNotationPlainTextCompatible === true && item.accessibility?.linearReadingOrder === true, 'item-accessibility', 'Item accessibility metadata is incomplete.', { itemId: item.id });
}

check(answerCounts.every((count) => count === 20), 'answer-balance', 'Correct-answer positions must be balanced.', { actual: answerCounts, expected: [20, 20, 20, 20] });
check(calculatorCounts['calculator-not-required'] === 56 && calculatorCounts['calculator-permitted-practice'] === 24, 'calculator-balance', 'Calculator routing must contain 56 no-calculator and 24 calculator-permitted items.', { actual: calculatorCounts });
for (const practiceId of expectedPractices) check((practiceCounts[practiceId] || 0) > 0, 'practice-coverage', 'Every declared practice must be represented.', { practiceId });
for (const representation of expectedRepresentations) check((representationCounts[representation] || 0) > 0, 'representation-coverage', 'Every declared representation must be represented.', { representation });
for (const topicId of selectedTopicIds) check((topicCounts[topicId] || 0) >= 2, 'topic-depth', 'Every selected framework topic ID must have at least two routed items.', { topicId, actual: topicCounts[topicId] || 0 });

const chapters = library.chapters || [];
const sections = chapters.flatMap((chapter) => chapter.sections || []);
const practiceRoutes = sections.map((section) => section.practiceRoute).filter(Boolean);
const routedItemIds = practiceRoutes.flatMap((route) => route.itemIds || []);
const chapterIds = new Set(chapters.map((chapter) => chapter.id));
const sectionIds = new Set(sections.map((section) => section.id));
const learningObjectiveIds = new Set(library.blueprint?.learningObjectiveCatalog?.map((objective) => objective.id) || []);

check(library.packId === pack.id && library.version === pack.version && library.status === 'preview' && library.releaseEligible === false, 'library-identity', 'Learning-library identity or release boundary is invalid.');
check(library.sourceCatalog?.length === 4 && library.sourceCatalog.every((source) => /^https:\/\//.test(source.url || '')), 'source-catalog', 'Learning library must declare four public HTTPS sources.');
check(chapters.length === 8 && sections.length === 24 && chapters.every((chapter) => chapter.sections?.length === 3), 'chapter-inventory', 'Library must contain eight chapters and twenty-four sections.');
check(library.summary?.knowledgeChecks === 24 && library.flashcards?.length === 40 && library.memoryAids?.length === 16, 'retrieval-inventory', 'Knowledge-check, flashcard, or memory-aid inventory is invalid.');
check(practiceRoutes.length === 24 && library.studyRoutes?.length === 4 && library.quickReference?.length === 8, 'route-inventory', 'Practice, study, or quick-reference inventory is invalid.');
check(library.diagrams?.length === 8 && library.diagramPlacements?.length === 8, 'diagram-inventory', 'Optional reasoning-flow inventory is invalid.');
check(library.constructedResponseWorkshops?.length === 8, 'workshop-inventory', 'Eight response-planning workshops are required.');
check(library.summary?.topicRoutes === 40 && learningObjectiveIds.size === 40, 'objective-inventory', 'Forty topic routes and learning objectives are required.');
check(routedItemIds.length === 80 && new Set(routedItemIds).size === 80 && routedItemIds.every((itemId) => itemIds.has(itemId)), 'practice-route-coverage', 'Section routes must cover every item exactly once.', { routed: routedItemIds.length, unique: new Set(routedItemIds).size });

for (const section of sections) {
  check(section.blocks?.length >= 5 && section.workedExample?.steps?.length >= 2 && section.misconceptionGuidance?.length >= 1, 'section-depth', 'Section lesson content is incomplete.', { sectionId: section.id });
  check(section.knowledgeCheck?.itemIds?.length >= 2 && section.knowledgeCheck?.unscored === true && section.knowledgeCheck?.releaseEligible === false, 'knowledge-check-boundary', 'Section knowledge check is incomplete or incorrectly scored.', { sectionId: section.id });
  check(section.practiceRoute?.itemIds?.length >= 2 && section.practiceRoute?.releaseEligible === false, 'practice-route-boundary', 'Section practice route is incomplete.', { sectionId: section.id });
}

for (const item of items) {
  check(chapterIds.has(item.chapterIds?.[0]) && sectionIds.has(item.learningSectionId) && learningObjectiveIds.has(item.learningObjectiveId), 'item-route-resolution', 'Item references an unknown chapter, section, or objective.', { itemId: item.id });
}

for (const route of library.studyRoutes || []) {
  check(route.itemIds?.length >= 20 && route.itemIds.every((itemId) => itemIds.has(itemId)) && route.unscored === true && route.releaseEligible === false, 'study-route-boundary', 'Study route is incomplete or references unknown items.', { routeId: route.id });
}

for (const reference of library.quickReference || []) {
  check(reference.formulas?.length >= 3 && reference.decisionRules?.length === 5 && reference.cautions?.length >= 3 && reference.checklist?.length >= 3, 'quick-reference-depth', 'Quick reference is incomplete.', { referenceId: reference.id });
  check(reference.originalStudyAid === true && reference.officialExamReference === false && reference.releaseEligible === false, 'quick-reference-boundary', 'Quick reference must remain original and unofficial.', { referenceId: reference.id });
}

const diagramIds = new Set((library.diagrams || []).map((diagram) => diagram.id));
for (const diagram of library.diagrams || []) {
  check(diagram.spec?.nodes?.length === 4 && diagram.spec?.edges?.length === 3 && diagram.accessibility?.textEquivalent?.length === 4 && diagram.accessibility?.fallbackMode === 'ordered-text-equivalent', 'diagram-shape', 'Reasoning flow or text equivalent is invalid.', { diagramId: diagram.id });
  check(diagram.unscored === true && diagram.officialItem === false && diagram.releaseEligible === false, 'diagram-boundary', 'Reasoning flow must remain unscored and unofficial.', { diagramId: diagram.id });
}
for (const placement of library.diagramPlacements || []) {
  check(diagramIds.has(placement.diagramId) && sectionIds.has(placement.sectionId) && placement.requiredForComprehension === false, 'diagram-placement', 'Diagram placement is invalid.', { placementId: placement.id });
}

for (const workshop of library.constructedResponseWorkshops || []) {
  check(workshop.parts?.length === 4 && workshop.responsePlanning?.length === 4 && workshop.selfCheck?.length === 5, 'workshop-depth', 'Workshop planning structure is incomplete.', { workshopId: workshop.id });
  check(workshop.unscored === true && workshop.automatedScoring === false && workshop.officialItem === false && workshop.officialRubricUsed === false && workshop.releaseEligible === false, 'workshop-boundary', 'Workshop must remain unscored, original, and unreleased.', { workshopId: workshop.id });
}

check(pack.blueprint?.targetExamYear === 2027 && pack.blueprint?.examModeReference === 'hybrid-digital' && /42 multiple-choice questions in 100 minutes/.test(pack.blueprint?.officialSectionOne || '') && /6 free-response questions in 90 minutes/.test(pack.blueprint?.officialSectionTwo || ''), 'exam-format-boundary', 'Current public May 2027 exam-format metadata is incomplete.');
check(pack.capabilities?.constructedResponseIncluded === false && pack.capabilities?.frqWorkshopsIncluded === true && pack.capabilities?.calculatorRoutingIncluded === true, 'capabilities', 'Pack capability boundaries are invalid.');
check(pack.rightsPolicy?.secureCollegeBoardContentUsed === false && pack.releaseGates?.releaseEligible === false && library.rightsPolicy?.secureCollegeBoardContentUsed === false && library.releaseGates?.releaseEligible === false, 'rights-release-gates', 'Rights or release gates are invalid.');

const report = {
  schemaVersion: 1,
  qaVersion: 'ap-calculus-ab-foundation-qa-v1',
  reportId: 'ap-calculus-ab-foundation-qa',
  generatedAt: '2026-08-25T00:00:00.000Z',
  packId: pack.id,
  version: pack.version,
  status: findings.length ? 'fail' : 'pass',
  automatedAssessment: findings.length ? 'fail' : 'pass',
  structuralFindings: findings,
  advisories: [
    'Automated QA does not establish AP Calculus AB content validity, fairness, accessibility conformance, rights clearance, production readiness, score meaning, or psychometric quality.',
    'Independent AP Calculus AB subject-expert, rights, accessibility, field-testing, and psychometric review remain release-blocking.',
    'The 80-item initial seed is not a complete AP exam form or full topic-depth bank.',
  ],
  metrics: {
    itemCount: items.length,
    unitCount: pack.domains.length,
    unitCounts,
    selectedFrameworkTopicCount: selectedTopicIds.size,
    foundationTopicRouteCount: library.summary?.topicRoutes || 0,
    minimumItemsPerSelectedTopic: Math.min(...Array.from(selectedTopicIds, (topicId) => topicCounts[topicId] || 0)),
    practiceCounts,
    representationCounts,
    calculatorCounts,
    answerPositionCounts: answerCounts,
    chapterCount: chapters.length,
    sectionCount: sections.length,
    knowledgeCheckCount: library.summary?.knowledgeChecks || 0,
    flashcardCount: library.flashcards?.length || 0,
    memoryAidCount: library.memoryAids?.length || 0,
    practiceRouteCount: practiceRoutes.length,
    studyRouteCount: library.studyRoutes?.length || 0,
    quickReferenceCount: library.quickReference?.length || 0,
    diagramCount: library.diagrams?.length || 0,
    diagramPlacementCount: library.diagramPlacements?.length || 0,
    constructedResponseWorkshopCount: library.constructedResponseWorkshops?.length || 0,
  },
  coverage: {
    allSelectedTopicsRepresented: Array.from(selectedTopicIds).every((topicId) => (topicCounts[topicId] || 0) >= 2),
    allUnitsRepresented: Object.values(unitCounts).every((count) => count > 0),
    everyItemSectionRouted: routedItemIds.length === items.length && new Set(routedItemIds).size === items.length,
  },
  inputs: {
    packSha256: sha256(packPath),
    learningLibrarySha256: sha256(libraryPath),
    officialBlueprintUrl: pack.officialBlueprintUrl,
    officialExamUrl: pack.officialExamUrl,
    reviewedAt: '2026-08-25',
  },
  deploymentParity: { sourceAndDeployCopiesCheckedByManifestBuilder: true, status: 'pending-manifest-build' },
  rightsBoundary: { officialItemsUsed: false, officialStimuliUsed: false, officialRubricsUsed: false, status: 'pending-independent-rights-review' },
  reviewBoundary: { subjectExpert: 'pending', accessibility: 'pending', production: 'pending', psychometric: 'not-started', releaseEligible: false },
};

writeGeneratedFile(qaPath, JSON.stringify(report, null, 2) + '\n');
if (findings.length) {
  throw new Error('[AP Calculus AB foundation QA] ' + findings.length + ' structural findings detected: ' + findings.slice(0, 5).map((finding) => finding.code).join(', '));
}
console.log('AP Calculus AB foundation QA pass: ' + items.length + ' items, ' + selectedTopicIds.size + ' selected framework topics, ' + chapters.length + ' chapters, 0 structural findings.');
