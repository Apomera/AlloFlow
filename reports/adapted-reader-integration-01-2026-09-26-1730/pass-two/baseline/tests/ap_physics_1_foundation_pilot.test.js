import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const packPath = resolve(root, 'test_prep/ap_physics_1_foundation_pilot.json');
const libraryPath = resolve(root, 'test_prep/ap_physics_1_foundation_pilot_learning_library.json');
const qaPath = resolve(root, 'test_prep/ap_physics_1_foundation_pilot_qa.json');
const manifestPath = resolve(root, 'test_prep/pack_manifest.json');

function readJson(filePath) { return JSON.parse(fs.readFileSync(filePath, 'utf8')); }
function countsBy(values) { return values.reduce((counts, value) => { counts[value] = (counts[value] || 0) + 1; return counts; }, {}); }
function sha256(filePath) { return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex'); }

const pack = readJson(packPath);
const library = readJson(libraryPath);
const qa = readJson(qaPath);

describe('AP Physics 1 internal foundation pilot', () => {
  it('crosswalks the current eight-unit blueprint without presenting itself as official', () => {
    expect(pack.id).toBe('ap-physics-1-foundation-pilot');
    expect(pack.version).toBe('0.19.0-internal-preview');
    expect(pack.status).toBe('preview');
    expect(pack.visibility).toBe('internal');
    expect(pack.released).toBe(false);
    expect(pack.releaseEligible).toBe(false);
    expect(pack.disclaimer).toMatch(/unofficial/i);
    expect(pack.disclaimer).toMatch(/laboratory competency/i);
    expect(pack.officialBlueprintUrl).toContain('ap-physics-1-course-and-exam-description.pdf');
    expect(pack.domains).toHaveLength(8);
    expect(pack.domains.every((domain) => domain.officialWeightMin < domain.officialWeightMax)).toBe(true);
    expect(pack.blueprint.bigIdeas).toHaveLength(5);
    expect(pack.blueprint.sciencePractices).toHaveLength(3);
  });

  it('contains a balanced 500-item pilot across all units and practices', () => {
    const unitCounts = countsBy(pack.items.map((item) => item.domainId));
    const practiceCounts = countsBy(pack.items.map((item) => item.practiceId));
    const answerCounts = countsBy(pack.items.map((item) => String(item.answerIndex)));

    expect(pack.items).toHaveLength(500);
    expect(new Set(pack.items.map((item) => item.id)).size).toBe(500);
    expect(Object.values(unitCounts)).toEqual([61, 87, 87, 61, 61, 47, 47, 49]);
    expect(Object.keys(practiceCounts).sort()).toEqual(['SP1', 'SP2', 'SP3']);
    expect(answerCounts).toEqual({ 0: 125, 1: 125, 2: 125, 3: 125 });
    expect(pack.sections).toHaveLength(100);
    expect(pack.sections.every((section) => section.itemIds.length === 5)).toBe(true);
    expect(pack.items.every((item) => item.choices.length === 4 && item.choiceRationales.length === 4)).toBe(true);
    expect(pack.items.every((item) => item.provenance === 'native-original' && item.releaseEligible === false)).toBe(true);
  });

  it('routes every item to a topic-level remediation target and native chapter', () => {
    const catalog = pack.blueprint.learningObjectiveCatalog;
    const objectiveById = new Map(catalog.map((objective) => [objective.id, objective]));
    expect(catalog).toHaveLength(39);
    expect(new Set(catalog.map((objective) => objective.topicId)).size).toBe(39);
    for (const item of pack.items) {
      const objective = objectiveById.get(item.learningObjectiveId);
      expect(objective).toBeTruthy();
      expect(objective.topicId).toBe(item.topicIds[0]);
      expect(objective.domainId).toBe(item.domainId);
      expect(item.chapterIds).toEqual([objective.chapterId]);
      expect(item.learningSectionId).toBe(objective.sectionId);
      expect(objective.sectionIds).toHaveLength(3);
      expect(item.learningSectionIds).toEqual(objective.sectionIds);
      expect(item.learningRoute).toEqual(['core-model', 'representation-and-routine', 'evidence-and-transfer']);
      expect(item.unitReviewRouteId).toBe(objective.unitReviewRouteId);
      expect(item.reviewLadderId).toMatch(/^ap-physics-1-ladder-/);
      expect(item.distractorDiagnostics).toHaveLength(3);
      expect(item.practiceIds).toContain(item.practiceId);
    }
  });

  it('provides eight native chapters with structured lessons and study aids', () => {
    expect(library.chapters).toHaveLength(8);
    expect(library.chapters.filter((chapter) => chapter.foundationPrototype).length).toBe(8);
    expect(library.chapters.every((chapter) => Array.isArray(chapter.sections))).toBe(true);
    expect(library.chapters.every((chapter) => chapter.sections.length === 3 && chapter.knowledgeChecks.length === 3 && chapter.studyRoute.length === 3)).toBe(true);
    expect(library.flashcards).toHaveLength(24);
    expect(library.memoryAids).toHaveLength(24);
    expect(library.summary).toMatchObject({ chapters: 8, sections: 24, knowledgeChecks: 24, flashcards: 24, memoryAids: 24, diagnosticRoutes: 39, diagnosticSets: 117, unitReviewRoutes: 8, unitMixedPracticeSets: 8, reviewLadders: 5, reviewLadderItems: 500, misconceptionFamilies: 9, misconceptionOccurrences: 1500, misconceptionRemediationPlaybooks: 9, studySessionPlans: 15, masteryCheckpoints: 39, adaptiveReviewQueues: 39, spacedReviewPlans: 39, practiceForms: 4, constructedResponseWorkshops: 8, diagramPlacements: 8, diagrams: 8, richLessonPrototypes: 8 });
    expect(library.contentMigration).toMatchObject({ contentVersion: 'ap-physics-1-foundation-v19', sections: 24, completeSections: 24, richLessonPrototypes: 8 });
    expect(library.blueprint.pilotAlignment).toMatch(/500-item/);
    expect(library.blueprint.pilotAlignment).toMatch(/24 section routes/);
    expect(library.blueprint.pilotAlignment).toMatch(/24 section flashcards/);
    expect(library.blueprint.pilotAlignment).toMatch(/24 section memory aids/);
    expect(library.blueprint.pilotAlignment).toMatch(/39 topic diagnostic routes/);
    expect(library.blueprint.pilotAlignment).toMatch(/entry checks/);
    expect(library.blueprint.pilotAlignment).toMatch(/reinforcement sets/);
    expect(library.blueprint.pilotAlignment).toMatch(/transfer sets/);
    expect(library.blueprint.pilotAlignment).toMatch(/8 unit synthesis routes/);
    expect(library.blueprint.pilotAlignment).toMatch(/mixed-practice sets/);
    expect(library.blueprint.pilotAlignment).toMatch(/5 cumulative review ladders/);
    expect(library.blueprint.pilotAlignment).toMatch(/9 misconception families/);
    expect(library.blueprint.pilotAlignment).toMatch(/8 original constructed-response workshops/);
    expect(library.blueprint.pilotAlignment).toMatch(/8 optional visual scaffolds/);
    expect(library.blueprint.topicDiagnosticRouteCount).toBe(39);
    expect(library.blueprint.unitReviewRouteCount).toBe(8);
    expect(library.blueprint.reviewLadderCount).toBe(5);
    expect(library.blueprint.misconceptionFamilyCount).toBe(9);
    expect(library.blueprint.misconceptionRemediationPlaybookCount).toBe(9);
    expect(library.blueprint.studySessionPlanCount).toBe(15);
    expect(library.blueprint.masteryCheckpointCount).toBe(39);
    expect(library.blueprint.adaptiveReviewQueueCount).toBe(39);
    expect(library.blueprint.spacedReviewPlanCount).toBe(39);
    expect(library.blueprint.practiceFormCount).toBe(4);
    expect(library.blueprint.constructedResponseWorkshopCount).toBe(8);
    expect(library.blueprint.diagramPlacementCount).toBe(8);
    expect(library.chapters.every((chapter) => {
      const section = chapter.sections[0];
      return section.contentBlocks.length >= 8 && section.examples.length >= 3 && section.nonExamples.length >= 3 && section.retrievalPrompts.length >= 3 && section.workedDataExample.rows.length >= 2;
    })).toBe(true);
  });

  it('binds section-aware flashcards and memory aids to every study route', () => {
    const sections = library.chapters.flatMap((chapter) => chapter.sections);
    expect(library.flashcards).toHaveLength(24);
    expect(library.memoryAids).toHaveLength(24);
    expect(new Set(library.flashcards.map((card) => card.id)).size).toBe(24);
    expect(new Set(library.memoryAids.map((aid) => aid.id)).size).toBe(24);
    expect(sections.every((section) => library.flashcards.some((card) => card.id === section.flashcardId && card.sectionId === section.id) && library.memoryAids.some((aid) => aid.id === section.memoryAidId && aid.sectionId === section.id))).toBe(true);
  });

  it('provides deterministic topic diagnostic routes with practice slices', () => {
    expect(library.topicDiagnosticRoutes).toHaveLength(39);
    expect(pack.topicDiagnosticRoutes).toHaveLength(39);
    expect(pack.topicDiagnosticRoutes).toEqual(library.topicDiagnosticRoutes);
    expect(new Set(library.topicDiagnosticRoutes.map((route) => route.topicId)).size).toBe(39);
    for (const route of library.topicDiagnosticRoutes) {
      expect(route.sectionIds).toHaveLength(3);
      expect(route.flashcardIds).toHaveLength(3);
      expect(route.memoryAidIds).toHaveLength(3);
      expect(route.knowledgeCheckIds).toHaveLength(3);
      expect(route.itemIds.length).toBeGreaterThan(0);
      expect(route.practiceSlices).toHaveLength(3);
      expect(route.practiceSlices.map((slice) => slice.practiceId)).toEqual(['SP1', 'SP2', 'SP3']);
      expect(route.practiceSlices.every((slice) => slice.questionCount === slice.itemIds.length)).toBe(true);
      expect(route.practiceSlices.flatMap((slice) => slice.itemIds).sort()).toEqual(route.itemIds.slice().sort());
      expect(route.itemIds.every((itemId) => pack.items.find((item) => item.id === itemId)?.diagnosticRouteId === route.id)).toBe(true);
      expect(route.diagnosticPlanVersion).toBe(1);
      expect(route.diagnosticSets).toHaveLength(3);
      expect(route.diagnosticSets.map((set) => set.type)).toEqual(['entry-check', 'reinforcement', 'transfer']);
      expect(route.diagnosticSets.every((set) => set.itemIds.length > 0 && set.itemIds.every((itemId) => route.itemIds.includes(itemId)))).toBe(true);
      expect(route.masterySignals.map((signal) => signal.id)).toEqual(['model-selection', 'representation-routine', 'evidence-transfer']);
      expect(route.recommendedSequence).toHaveLength(5);
      expect(route.recommendedSequence.slice(2).map((step) => step.id)).toEqual(route.diagnosticSets.map((set) => set.id));
    }
  });

  it('provides eight unit synthesis routes with mixed-practice coverage', () => {
    expect(library.unitReviewRoutes).toHaveLength(8);
    expect(pack.unitReviewRoutes).toEqual(library.unitReviewRoutes);
    expect(new Set(library.unitReviewRoutes.map((route) => route.unitId)).size).toBe(8);
    for (const route of library.unitReviewRoutes) {
      expect(route.topicIds.length).toBeGreaterThan(0);
      expect(route.topicDiagnosticRouteIds).toHaveLength(route.topicIds.length);
      expect(route.sectionIds).toHaveLength(3);
      expect(route.flashcardIds).toHaveLength(3);
      expect(route.memoryAidIds).toHaveLength(3);
      expect(route.knowledgeCheckIds).toHaveLength(3);
      expect(route.itemIds.length).toBeGreaterThan(0);
      expect(route.practiceSlices).toHaveLength(3);
      expect(route.practiceSlices.map((slice) => slice.practiceId)).toEqual(['SP1', 'SP2', 'SP3']);
      expect(route.practiceSlices.flatMap((slice) => slice.itemIds).sort()).toEqual(route.itemIds.slice().sort());
      expect(route.topicStarterItemIds).toHaveLength(route.topicIds.length);
      expect(new Set(route.topicStarterItemIds).size).toBe(route.topicStarterItemIds.length);
      expect(route.mixedPracticeSet.itemIds).toEqual(route.topicStarterItemIds);
      expect(route.recommendedSequence).toHaveLength(4);
      expect(route.recommendedSequence[2].id).toBe(route.mixedPracticeSet.id);
    }
  });

  it('provides five cumulative review ladders covering the full item progression', () => {
    expect(library.reviewLadders).toHaveLength(5);
    expect(pack.reviewLadders).toEqual(library.reviewLadders);
    expect(library.reviewLadders.map((ladder) => ladder.order)).toEqual([1, 2, 3, 4, 5]);
    expect(library.reviewLadders.reduce((sum, ladder) => sum + ladder.itemIds.length, 0)).toBe(500);
    for (const ladder of library.reviewLadders) {
      expect(ladder.itemIds.length).toBe(ladder.itemRange.endItemNumber - ladder.itemRange.startItemNumber + 1);
      expect(ladder.practiceSlices).toHaveLength(3);
      expect(ladder.practiceSlices.flatMap((slice) => slice.itemIds).sort()).toEqual(ladder.itemIds.slice().sort());
      expect(ladder.unitReviewRouteIds).toHaveLength(8);
      expect(ladder.representativeItemIds).toHaveLength(8);
      expect(ladder.recommendedSequence.length).toBe(ladder.nextLadderId ? 3 : 2);
    }
  });

  it('provides choice-level misconception families and remediation moves', () => {
    expect(library.misconceptionFamilies).toHaveLength(9);
    expect(pack.misconceptionFamilies).toEqual(library.misconceptionFamilies);
    expect(library.misconceptionFamilies.every((family) => family.occurrenceCount > 0 && family.recommendedSequence.length === 3)).toBe(true);
    expect(library.misconceptionFamilies.reduce((sum, family) => sum + family.occurrenceCount, 0)).toBe(1500);
    for (const item of pack.items) {
      expect(item.distractorDiagnostics).toHaveLength(3);
      expect(new Set(item.distractorDiagnostics.map((diagnostic) => diagnostic.choiceIndex)).size).toBe(3);
      expect(item.distractorDiagnostics.every((diagnostic) => library.misconceptionFamilies.some((family) => family.id === diagnostic.misconceptionFamilyId) && library.misconceptionRemediationPlaybooks.some((playbook) => playbook.id === diagnostic.remediationPlaybookId && playbook.familyId === diagnostic.misconceptionFamilyId) && diagnostic.remediationMove.length >= 30)).toBe(true);
    }
  });

  it('provides one linked response workshop and one accessible visual scaffold per unit', () => {
    expect(library.constructedResponseWorkshops).toHaveLength(8);
    expect(library.diagramPlacements).toHaveLength(8);
    expect(pack.constructedResponseWorkshops).toEqual(library.constructedResponseWorkshops);
    expect(pack.diagramPlacements).toEqual(library.diagramPlacements);
    expect(library.constructedResponseWorkshops.every((workshop) => workshop.parts.length === 4 && workshop.scoringGuide.length === 4 && workshop.parts.every((part) => part.points === 2) && workshop.responseSupport.officialRubric === false && workshop.responseSupport.officialScore === false && workshop.accessibility.textFirst === true && workshop.linkedItemIds.length >= 3)).toBe(true);
    expect(library.diagramPlacements.every((diagram) => diagram.requiredLabels.length >= 5 && diagram.constructionSteps.length >= 4 && diagram.textEquivalent.length >= 60 && diagram.originalSpecification === true && diagram.accessibility.textEquivalentProvided === true && diagram.accessibility.screenReaderReady === true)).toBe(true);
  });

  it('turns every misconception family into a staged remediation playbook', () => {
    expect(library.misconceptionRemediationPlaybooks).toHaveLength(9);
    expect(pack.misconceptionRemediationPlaybooks).toEqual(library.misconceptionRemediationPlaybooks);
    expect(library.misconceptionRemediationPlaybooks.every((playbook) => playbook.stages.length === 8)).toBe(true);
    expect(library.misconceptionRemediationPlaybooks[0].stages.map((stage) => stage.order)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(library.misconceptionRemediationPlaybooks.every((playbook) => playbook.recommendedSequence.join('|') === 'recognize|repair|micro-practice|retry|transfer|reflect' && playbook.linkedChoiceReferenceCount > 0 && playbook.linkedMemoryAidIds.length > 0 && playbook.accessibility.textFirst === true && playbook.accessibility.handsFreeContentCompatible === true)).toBe(true);
  });

  it('provides executable unit, cumulative, and timed study sessions', () => {
    expect(library.studySessionPlans).toHaveLength(15);
    expect(pack.studySessionPlans).toEqual(library.studySessionPlans);
    expect(library.studySessionPlans.filter((session) => session.sessionType === 'unit-launch')).toHaveLength(8);
    expect(library.studySessionPlans.filter((session) => session.sessionType === 'cumulative-ladder')).toHaveLength(5);
    expect(library.studySessionPlans.filter((session) => session.sessionType.startsWith('timed-'))).toHaveLength(2);
    expect(library.studySessionPlans.every((session) => session.steps.length >= 3 && session.steps.reduce((sum, step) => sum + step.durationMinutes, 0) === session.durationMinutes && session.successCriteria.length >= 3 && session.accessibility.pauseAndResumeAtStep === true && session.accessibility.handsFreeContentCompatible === true)).toBe(true);
    expect(library.studySessionPlans.find((session) => session.sessionType === 'timed-selected-response-practice')).toMatchObject({ durationMinutes: 85, targetItemCount: 42 });
    expect(library.studySessionPlans.find((session) => session.sessionType === 'timed-constructed-response-practice')).toMatchObject({ durationMinutes: 95, targetWorkshopCount: 4 });
  });

  it('provides one staged mastery checkpoint for every topic objective', () => {
    expect(library.learnerEvidenceSchema).toMatchObject({ id: 'ap-physics-1-learner-evidence-v1', schemaVersion: 1, recordType: 'topic-mastery-evidence', releaseEligible: false });
    expect(library.learnerEvidenceSchema.masteryStates).toHaveLength(4);
    expect(library.learnerEvidenceSchema.eventTypes).toHaveLength(5);
    expect(library.learnerEvidenceSchema.recordFields).toHaveLength(10);
    expect(library.learnerEvidenceSchema.accessibility).toMatchObject({ textFirst: true, linearReadingOrder: true, fieldsIndependentlyNavigable: true, handsFreeContentCompatible: true });
    expect(pack.learnerEvidenceSchema).toEqual(library.learnerEvidenceSchema);
    expect(library.masteryCheckpoints).toHaveLength(39);
    expect(pack.masteryCheckpoints).toEqual(library.masteryCheckpoints);
    const objectiveByTopicId = new Map(pack.blueprint.learningObjectiveCatalog.map((objective) => [objective.topicId, objective]));
    const routeByTopicId = new Map(library.topicDiagnosticRoutes.map((route) => [route.topicId, route]));
    expect(new Set(library.masteryCheckpoints.map((checkpoint) => checkpoint.topicId)).size).toBe(39);
    for (const checkpoint of library.masteryCheckpoints) {
      const objective = objectiveByTopicId.get(checkpoint.topicId);
      const route = routeByTopicId.get(checkpoint.topicId);
      expect(objective).toBeTruthy();
      expect(route).toBeTruthy();
      expect(checkpoint.sectionIds).toEqual(objective.sectionIds);
      expect(checkpoint.evidenceSequence.map((stage) => stage.id)).toEqual(['model-selection', 'representation-routine', 'evidence-transfer']);
      expect(checkpoint.evidenceSequence.every((stage) => stage.minimumEvidence === 1 && stage.sourceIds.length > 0)).toBe(true);
      expect(checkpoint.recommendationRules).toHaveLength(5);
      expect(checkpoint.requiredEvidence).toMatchObject({ modelSelectionAttempts: 1, representationRoutineAttempts: 1, evidenceTransferAttempts: 1, knowledgeCheckRequired: true, confidenceRequired: true, misconceptionTagOptional: true });
      expect(checkpoint.learnerRecordFields).toEqual(library.learnerEvidenceSchema.recordFields.map((field) => field.id));
      expect(checkpoint.linkedItemIds.every((itemId) => pack.items.some((item) => item.id === itemId))).toBe(true);
      expect(checkpoint.linkedRemediationPlaybookIds.length).toBeGreaterThan(0);
      expect(checkpoint.accessibility).toMatchObject({ textFirst: true, linearReadingOrder: true, stagesIndependentlyNavigable: true, screenReaderReady: true, handsFreeContentCompatible: true });
      expect(checkpoint.releaseEligible).toBe(false);
    }
  });

  it('provides a deterministic three-action queue for every checkpoint condition', () => {
    expect(library.adaptiveReviewQueueSchema).toMatchObject({ id: 'ap-physics-1-adaptive-review-queue-v1', schemaVersion: 1, recordType: 'topic-adaptive-review-queue', releaseEligible: false });
    expect(library.adaptiveReviewQueueSchema.laneTypes).toHaveLength(5);
    expect(library.adaptiveReviewQueueSchema.actionFields).toHaveLength(10);
    expect(pack.adaptiveReviewQueueSchema).toEqual(library.adaptiveReviewQueueSchema);
    expect(library.adaptiveReviewQueues).toHaveLength(39);
    expect(pack.adaptiveReviewQueues).toEqual(library.adaptiveReviewQueues);
    for (const queue of library.adaptiveReviewQueues) {
      expect(queue.decisionOrder).toEqual(['model-selection-missed', 'representation-routine-missed', 'evidence-transfer-missed', 'secure-low-confidence', 'secure']);
      expect(queue.defaultLaneId).toBe('secure');
      expect(queue.lanes).toHaveLength(5);
      expect(queue.lanes.every((lane) => lane.steps.length === 3 && lane.steps.map((step) => step.order).join('|') === '1|2|3' && lane.steps.every((step) => step.targetIds.length > 0 && step.expectedOutput.length >= 20 && step.accessibility.independentlyNavigable === true))).toBe(true);
      expect(queue.linkedCheckpointEvidenceStages).toEqual(['model-selection', 'representation-routine', 'evidence-transfer']);
      expect(queue.accessibility).toMatchObject({ textFirst: true, linearReadingOrder: true, lanesIndependentlyNavigable: true, actionsIndependentlyNavigable: true, screenReaderReady: true, handsFreeContentCompatible: true });
      expect(queue.releaseEligible).toBe(false);
    }
  });

  it('provides four bounded spaced-review moments for every topic', () => {
    expect(library.spacedReviewSchema).toMatchObject({ id: 'ap-physics-1-spaced-review-v1', schemaVersion: 1, recordType: 'topic-spaced-review-plan', releaseEligible: false });
    expect(library.spacedReviewSchema.cadenceStages).toHaveLength(4);
    expect(library.spacedReviewSchema.actionFields).toHaveLength(10);
    expect(pack.spacedReviewSchema).toEqual(library.spacedReviewSchema);
    expect(library.spacedReviewPlans).toHaveLength(39);
    expect(pack.spacedReviewPlans).toEqual(library.spacedReviewPlans);
    for (const plan of library.spacedReviewPlans) {
      expect(plan.intervalHours).toEqual([0, 24, 72, 168]);
      expect(plan.cadenceStages.map((stage) => stage.id)).toEqual(['same-day-retry', 'next-day-recall', 'three-day-transfer', 'seven-day-mixed-practice']);
      expect(plan.cadenceStages.every((stage) => stage.targetIds.length >= 2 && stage.completionEvidence.length >= 25 && stage.accessibility.independentlyNavigable === true && stage.accessibility.handsFreeContentCompatible === true)).toBe(true);
      expect(plan.linkedSessionIds).toHaveLength(3);
      expect(plan.accessibility).toMatchObject({ textFirst: true, linearReadingOrder: true, stagesIndependentlyNavigable: true, actionsIndependentlyNavigable: true, screenReaderReady: true, pauseAndResumeSupported: true, handsFreeContentCompatible: true });
      expect(plan.releaseEligible).toBe(false);
    }
  });

  it('provides four alternate internal 42-item forms with coverage metadata', () => {
    expect(library.practiceFormSchema).toMatchObject({ id: 'ap-physics-1-practice-form-v1', schemaVersion: 1, recordType: 'internal-selected-response-form', releaseEligible: false });
    expect(library.practiceFormSchema.formFields).toHaveLength(10);
    expect(pack.practiceFormSchema).toEqual(library.practiceFormSchema);
    expect(library.practiceForms).toHaveLength(4);
    expect(pack.practiceForms).toEqual(library.practiceForms);
    for (const form of library.practiceForms) {
      expect(form.itemIds).toHaveLength(42);
      expect(new Set(form.itemIds).size).toBe(42);
      expect(form.unitIds).toHaveLength(8);
      expect(form.practiceIds).toEqual(['SP1', 'SP2', 'SP3']);
      expect(form.timingPlan).toMatchObject({ suggestedMinutes: 85, pacingCheckpoints: expect.any(Array) });
      expect(form.timingPlan.pacingCheckpoints).toHaveLength(4);
      expect(form.reviewContract).toMatchObject({ officialScore: false, readinessInference: false });
      expect(form.accessibility).toMatchObject({ textFirst: true, linearReadingOrder: true, itemsIndependentlyNavigable: true, pauseAndResumeSupported: true, handsFreeContentCompatible: true });
      expect(form.releaseEligible).toBe(false);
    }
  });

  it('passes deterministic QA and binds byte-identical deployment mirrors', () => {
    expect(qa.automatedAssessment).toBe('pass');
    expect(qa.structuralFindings).toEqual([]);
    expect(qa.metrics).toMatchObject({ itemCount: 500, unitCount: 8, topicCount: 39, chapterCount: 8, sectionCount: 24, knowledgeCheckCount: 24, flashcardCount: 24, memoryAidCount: 24, diagnosticRouteCount: 39, diagnosticSetCount: 117, unitReviewRouteCount: 8, unitMixedPracticeSetCount: 8, reviewLadderCount: 5, reviewLadderItemCount: 500, misconceptionFamilyCount: 9, misconceptionOccurrenceCount: 1500, misconceptionRemediationPlaybookCount: 9, studySessionPlanCount: 15, masteryCheckpointCount: 39, adaptiveReviewQueueCount: 39, spacedReviewPlanCount: 39, practiceFormCount: 4, constructedResponseWorkshopCount: 8, diagramPlacementCount: 8, richLessonPrototypeCount: 8, nearDuplicatePairCount: 0 });
    for (const parity of qa.deploymentParity) expect(parity.status).toBe('pass');

    const manifest = readJson(manifestPath);
    const entry = manifest.entries.find((candidate) => candidate.id === pack.id);
    expect(entry).toMatchObject({ loadMode: 'lazy', visibility: 'internal', itemCount: 500, domainCount: 8 });
    expect(entry.sha256).toBe(sha256(packPath));
    expect(entry.nativeQaSha256).toBe(sha256(qaPath));
  });

  it('adds a third cross-unit synthesis and transfer layer with complete metadata', () => {
    const synthesis = pack.items.filter((item) => {
      const number = Number(item.id.split('-').at(-1));
      return number > 260 && number <= 360;
    });
    expect(synthesis).toHaveLength(100);
    expect(countsBy(synthesis.map((item) => item.practiceId))).toEqual({ SP1: 32, SP2: 33, SP3: 35 });
    expect(synthesis.every((item) => item.difficulty === 'challenging' || item.difficulty === 'moderate')).toBe(true);
    expect(synthesis.every((item) => item.stimulus.length >= 20 && item.editorialChecks.scenarioBased && item.editorialChecks.completeOptionFeedback)).toBe(true);
  });

  it('adds a fourth chained-scenario and exam-integration layer with complete metadata', () => {
    const examIntegration = pack.items.filter((item) => {
      const number = Number(item.id.split('-').at(-1));
      return number > 360 && number <= 460;
    });
    expect(examIntegration).toHaveLength(100);
    expect(countsBy(examIntegration.map((item) => item.practiceId))).toEqual({ SP1: 38, SP2: 32, SP3: 30 });
    expect(examIntegration.every((item) => item.difficulty === 'challenging' || item.difficulty === 'moderate')).toBe(true);
    expect(examIntegration.every((item) => item.stimulus.length >= 20 && item.editorialChecks.scenarioBased && item.editorialChecks.completeOptionFeedback)).toBe(true);
  });

  it('adds a fifth cumulative capstone layer with complete metadata', () => {
    const capstone = pack.items.filter((item) => Number(item.id.split('-').at(-1)) > 460);
    expect(capstone).toHaveLength(40);
    expect(countsBy(capstone.map((item) => item.practiceId))).toEqual({ SP1: 13, SP2: 13, SP3: 14 });
    expect(capstone.every((item) => item.difficulty === 'challenging' || item.difficulty === 'moderate')).toBe(true);
    expect(capstone.every((item) => item.stimulus.length >= 20 && item.editorialChecks.scenarioBased && item.editorialChecks.completeOptionFeedback)).toBe(true);
  });
});
