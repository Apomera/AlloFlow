import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const pack = JSON.parse(fs.readFileSync(resolve(root, 'test_prep/ap_calculus_ab_foundation_pilot.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(resolve(root, 'test_prep/ap_calculus_ab_foundation_pilot_learning_library.json'), 'utf8'));
const qa = JSON.parse(fs.readFileSync(resolve(root, 'test_prep/ap_calculus_ab_foundation_pilot_qa.json'), 'utf8'));

function countBy(values, selector) {
  const result = {};
  for (const value of values) {
    const key = selector(value);
    result[key] = (result[key] || 0) + 1;
  }
  return result;
}

describe('AP Calculus AB foundation pilot', () => {
  it('stays an unreleased 80-item internal preview', () => {
    expect(pack).toMatchObject({
      schemaVersion: 1,
      id: 'ap-calculus-ab-foundation-pilot',
      version: '0.1.0-internal-preview',
      status: 'preview',
      visibility: 'internal',
      released: false,
      releaseEligible: false,
      officialItem: false,
      calibrated: false,
      itemSchemaVersion: 2,
    });
    expect(pack.items).toHaveLength(80);
    expect(pack.domains).toHaveLength(8);
    expect(pack.sections).toHaveLength(16);
    expect(pack.sections.every((section) => section.itemIds.length === 5)).toBe(true);
  });

  it('declares the current May 2027 hybrid exam boundary without claiming simulation', () => {
    expect(pack.blueprint).toMatchObject({
      targetExamYear: 2027,
      examModeReference: 'hybrid-digital',
      officialUnitCount: 8,
      selectedFrameworkTopicCount: 66,
      foundationTopicRouteCount: 40,
    });
    expect(pack.blueprint.officialSectionOne).toContain('42 multiple-choice questions in 100 minutes');
    expect(pack.blueprint.officialSectionOne).toContain('29 without a calculator');
    expect(pack.blueprint.officialSectionOne).toContain('13 with a graphing calculator');
    expect(pack.blueprint.officialSectionTwo).toContain('6 free-response questions in 90 minutes');
    expect(pack.capabilities.limitations.join(' ')).toContain('not a complete AP Calculus AB exam simulation');
  });

  it('balances ten items per unit and routes selected topic IDs at depth', () => {
    const unitCounts = countBy(pack.items, (item) => item.domainId);
    expect(Object.values(unitCounts)).toEqual([10, 10, 10, 10, 10, 10, 10, 10]);
    const selectedTopics = pack.blueprint.selectedFrameworkTopicIds;
    const topicCounts = countBy(pack.items.flatMap((item) => item.topicIds), (topicId) => topicId);
    expect(selectedTopics).toHaveLength(66);
    expect(selectedTopics.every((topicId) => topicCounts[topicId] >= 2)).toBe(true);
  });

  it('uses unique single-choice items with balanced answer positions', () => {
    expect(new Set(pack.items.map((item) => item.id)).size).toBe(80);
    expect(new Set(pack.items.map((item) => item.prompt)).size).toBe(80);
    expect(countBy(pack.items, (item) => item.answerIndex)).toEqual({ 0: 20, 1: 20, 2: 20, 3: 20 });
    for (const item of pack.items) {
      expect(item).toMatchObject({
        itemSchemaVersion: 2,
        type: 'single-choice',
        taskForm: 'multiple-choice',
        officialItem: false,
        releaseEligible: false,
        psychometricStatus: 'not-calibrated',
      });
      expect(item.choices).toHaveLength(4);
      expect(new Set(item.choices).size).toBe(4);
      expect(item.choiceRationales).toHaveLength(4);
      expect(item.rationale.length).toBeGreaterThanOrEqual(30);
    }
  });

  it('covers practices, representations, and calculator routes', () => {
    const practices = new Set(pack.items.map((item) => item.practiceId));
    const representations = new Set(pack.items.map((item) => item.representation));
    expect(practices).toEqual(new Set(['MP1', 'MP2', 'MP3', 'MP4']));
    expect(representations).toEqual(new Set(['analytical', 'tabular', 'verbal', 'graphical-text']));
    expect(countBy(pack.items, (item) => item.calculatorUse)).toEqual({
      'calculator-not-required': 56,
      'calculator-permitted-practice': 24,
    });
  });

  it('keeps item provenance, rights, and accessibility boundaries explicit', () => {
    for (const item of pack.items) {
      expect(item.provenance).toMatchObject({
        officialContentReproduced: false,
        sourceQuestionReproduced: false,
        stimulusOriginal: true,
      });
      expect(item.rights).toMatchObject({
        secureCollegeBoardContentUsed: false,
        copiedOrRephrasedCollegeBoardQuestion: false,
        sourceProseOrFiguresReproduced: false,
      });
      expect(item.accessibility).toMatchObject({
        essentialVisual: false,
        textEquivalentProvided: true,
        mathNotationPlainTextCompatible: true,
        linearReadingOrder: true,
      });
    }
  });

  it('provides eight chapters and twenty-four navigable lesson sections', () => {
    expect(library.chapters).toHaveLength(8);
    expect(library.chapters.every((chapter) => chapter.sections.length === 3)).toBe(true);
    expect(library.summary).toMatchObject({
      chapters: 8,
      sections: 24,
      knowledgeChecks: 24,
      flashcards: 40,
      memoryAids: 16,
      practiceRoutes: 24,
      studyRoutes: 4,
      quickReference: 8,
      diagrams: 8,
      diagramPlacements: 8,
      constructedResponseWorkshops: 8,
      topicRoutes: 40,
      richLessonPrototypes: 8,
      releaseEligibleRecords: 0,
    });
    for (const section of library.chapters.flatMap((chapter) => chapter.sections)) {
      expect(section.blocks.length).toBeGreaterThanOrEqual(5);
      expect(section.workedExample.steps.length).toBeGreaterThanOrEqual(2);
      expect(section.misconceptionGuidance.length).toBeGreaterThanOrEqual(1);
      expect(section.releaseEligible).toBe(false);
    }
  });

  it('routes every item exactly once through section practice', () => {
    const routes = library.chapters.flatMap((chapter) => chapter.sections.map((section) => section.practiceRoute));
    const routedItemIds = routes.flatMap((route) => route.itemIds);
    expect(routes).toHaveLength(24);
    expect(routedItemIds).toHaveLength(80);
    expect(new Set(routedItemIds).size).toBe(80);
    expect(new Set(routedItemIds)).toEqual(new Set(pack.items.map((item) => item.id)));
    expect(routes.every((route) => route.unscored && route.releaseEligible === false)).toBe(true);
  });

  it('provides cumulative routes and original study aids', () => {
    expect(library.studyRoutes).toHaveLength(4);
    expect(library.studyRoutes.every((route) => route.itemIds.length >= 20 && route.unscored && route.releaseEligible === false)).toBe(true);
    expect(library.flashcards).toHaveLength(40);
    expect(library.memoryAids).toHaveLength(16);
    expect(library.quickReference).toHaveLength(8);
    for (const reference of library.quickReference) {
      expect(reference.formulas.length).toBeGreaterThanOrEqual(3);
      expect(reference.decisionRules).toHaveLength(5);
      expect(reference.cautions.length).toBeGreaterThanOrEqual(3);
      expect(reference).toMatchObject({ originalStudyAid: true, officialExamReference: false, releaseEligible: false });
    }
  });

  it('provides optional reasoning flows with ordered text equivalents', () => {
    expect(library.diagrams).toHaveLength(8);
    expect(library.diagramPlacements).toHaveLength(8);
    for (const diagram of library.diagrams) {
      expect(diagram.spec.nodes).toHaveLength(4);
      expect(diagram.spec.edges).toHaveLength(3);
      expect(diagram.accessibility).toMatchObject({ fallbackMode: 'ordered-text-equivalent' });
      expect(diagram.accessibility.textEquivalent).toHaveLength(4);
      expect(diagram).toMatchObject({ unscored: true, officialItem: false, releaseEligible: false });
    }
  });

  it('keeps all eight response workshops original and explicitly unscored', () => {
    expect(library.constructedResponseWorkshops).toHaveLength(8);
    for (const workshop of library.constructedResponseWorkshops) {
      expect(workshop.parts).toHaveLength(4);
      expect(workshop.responsePlanning).toHaveLength(4);
      expect(workshop.selfCheck).toHaveLength(5);
      expect(workshop).toMatchObject({
        responseType: 'constructed-response-planning-workshop',
        original: true,
        officialItem: false,
        officialRubricUsed: false,
        unscored: true,
        automatedScoring: false,
        releaseEligible: false,
      });
    }
  });

  it('passes its bound native QA with zero structural findings', () => {
    expect(qa).toMatchObject({
      reportId: 'ap-calculus-ab-foundation-qa',
      version: '0.1.0-internal-preview',
      status: 'pass',
      automatedAssessment: 'pass',
      structuralFindings: [],
    });
    expect(qa.metrics).toMatchObject({
      itemCount: 80,
      unitCount: 8,
      selectedFrameworkTopicCount: 66,
      foundationTopicRouteCount: 40,
      chapterCount: 8,
      sectionCount: 24,
      constructedResponseWorkshopCount: 8,
    });
    expect(qa.coverage).toEqual({
      allSelectedTopicsRepresented: true,
      allUnitsRepresented: true,
      everyItemSectionRouted: true,
    });
  });
});

