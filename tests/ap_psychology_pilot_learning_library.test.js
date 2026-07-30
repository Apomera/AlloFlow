import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const libraryPath = resolve(root, 'test_prep/ap_psychology_pilot_learning_library.json');
const library = JSON.parse(fs.readFileSync(libraryPath, 'utf8'));

function total(records, childKey) {
  return records.reduce((sum, record) => sum + (Array.isArray(record[childKey]) ? record[childKey].length : 0), 0);
}

describe('AP Psychology internal learning library', () => {
  it('contains the declared chapter, study-aid, and workshop inventory', () => {
    expect(library.packId).toBe('ap-psychology-pilot');
    expect(library.status).toBe('preview');
    expect(library.visibility).toBe('internal');
    expect(library.chapters).toHaveLength(5);
    expect(total(library.chapters, 'sections')).toBe(15);
    expect(total(library.chapters, 'knowledgeChecks')).toBe(10);
    expect(library.flashcards).toHaveLength(15);
    expect(library.memoryAids).toHaveLength(10);
    expect(library.constructedResponseWorkshops).toHaveLength(2);
    expect(library.summary).toMatchObject({
      chapters: 5,
      sections: 15,
      diagrams: 5,
      diagramPlacements: 5,
      knowledgeChecks: 10,
      flashcards: 15,
      memoryAids: 10,
      constructedResponseWorkshops: 2,
      releaseEligibleRecords: 0,
    });
  });

  it('provides three sections and two structurally valid checks per unit chapter', () => {
    const chapterIds = library.chapters.map((chapter) => chapter.id);
    const sectionIds = library.chapters.flatMap((chapter) => chapter.sections.map((section) => section.id));
    const checks = library.chapters.flatMap((chapter) => chapter.knowledgeChecks);

    expect(new Set(chapterIds).size).toBe(5);
    expect(new Set(sectionIds).size).toBe(15);
    expect(new Set(checks.map((check) => check.id)).size).toBe(10);

    for (const chapter of library.chapters) {
      expect(chapter.sections).toHaveLength(3);
      expect(chapter.knowledgeChecks).toHaveLength(2);
      expect(chapter.expertReviewStatus).toBe('pending');
      expect(chapter.accessibilityReviewStatus).toBe('pending-independent-review');
      expect(chapter.releaseEligible).toBe(false);
      for (const check of chapter.knowledgeChecks) {
        expect(check.prompt.trim()).not.toBe('');
        expect(check.choices).toHaveLength(4);
        expect(new Set(check.choices.map((choice) => choice.trim())).size).toBe(4);
        expect(check.answerIndex).toBeGreaterThanOrEqual(0);
        expect(check.answerIndex).toBeLessThan(check.choices.length);
        expect(check.rationale.trim()).not.toBe('');
        expect(check.references.length).toBeGreaterThan(0);
      }
    }
  });

  it('provides one optional, original, text-equivalent diagram placement per unit', () => {
    expect(library.diagrams).toHaveLength(5);
    expect(library.diagramPlacements).toHaveLength(5);
    expect(library.accessibility).toMatchObject({
      essentialVisualItems: 0,
      optionalDiagramCount: 5,
      diagramTextEquivalentsRequired: true,
      diagramsRequiredForComprehension: false,
      diagramFallbackMode: 'ordered-text-equivalent',
    });

    const chapterById = new Map(library.chapters.map((chapter) => [chapter.id, chapter]));
    const sectionToChapter = new Map(
      library.chapters.flatMap((chapter) =>
        chapter.sections.map((section) => [section.id, chapter.id])
      )
    );
    const diagramById = new Map(library.diagrams.map((diagram) => [diagram.id, diagram]));
    expect(diagramById.size).toBe(5);
    expect(new Set(library.diagramPlacements.map((placement) => placement.id)).size).toBe(5);
    expect(new Set(library.diagrams.map((diagram) => diagram.chapterId)).size).toBe(5);

    for (const diagram of library.diagrams) {
      const chapter = chapterById.get(diagram.chapterId);
      expect(chapter).toBeTruthy();
      expect(diagram.domainId).toBe(chapter.domainId);
      expect(diagram).toMatchObject({
        unscored: true,
        officialItem: false,
        releaseEligible: false,
        reviewStatus: 'source-reviewed-editorial-pass',
        expertReviewStatus: 'pending',
        rights: {
          originalSpecification: true,
          officialFigureReproduced: false,
          sourceFigureReproduced: false,
          thirdPartyArtworkIncluded: false,
        },
      });
      expect(diagram.caption.trim().split(/\s+/).length).toBeGreaterThanOrEqual(8);
      expect(diagram.learnerPurpose.trim().split(/\s+/).length).toBeGreaterThanOrEqual(8);
      expect(diagram.accessibility.essentialVisualContent).toBe(false);
      expect(diagram.accessibility.shortAlt.trim().split(/\s+/).length).toBeGreaterThanOrEqual(8);
      expect(diagram.accessibility.longDescription.trim().split(/\s+/).length).toBeGreaterThanOrEqual(25);
      expect(diagram.accessibility.textEquivalent.length).toBeGreaterThanOrEqual(3);
      expect(diagram.accessibility.fallbackMode).toBe('ordered-text-equivalent');
      expect(diagram.accessibility.colorIndependent).toBe(true);
      expect(diagram.spec.format).toBe('alloflow-diagram-v1');
      const nodeIds = diagram.spec.nodes.map((node) => node.id);
      expect(new Set(nodeIds).size).toBe(nodeIds.length);
      expect(diagram.accessibility.readingOrder).toHaveLength(nodeIds.length);
      expect(new Set(diagram.accessibility.readingOrder)).toEqual(new Set(nodeIds));
      expect(diagram.spec.edges.every((edge) => nodeIds.includes(edge.from) && nodeIds.includes(edge.to))).toBe(true);
    }

    for (const placement of library.diagramPlacements) {
      const diagram = diagramById.get(placement.diagramId);
      expect(diagram).toBeTruthy();
      expect(placement.chapterId).toBe(diagram.chapterId);
      expect(sectionToChapter.get(placement.sectionId)).toBe(placement.chapterId);
      expect(placement).toMatchObject({
        position: 'after-section-content',
        requiredForComprehension: false,
        unscored: true,
        fallbackMode: 'diagram-text-equivalent',
        accessibilityReviewStatus: 'pending-independent-review',
        releaseEligible: false,
      });
    }
  });

  it('keeps both AAQ- and EBQ-style workshops original, synthetic, and explicitly unscored', () => {
    const taskTypes = library.constructedResponseWorkshops.map((workshop) => workshop.taskType);
    expect(taskTypes.some((type) => /^AAQ-style/i.test(type))).toBe(true);
    expect(taskTypes.some((type) => /^EBQ-style/i.test(type))).toBe(true);

    for (const workshop of library.constructedResponseWorkshops) {
      expect(workshop.unscored).toBe(true);
      expect(workshop.automatedScoring).toBe(false);
      expect(workshop.scorePrediction).toBe(false);
      expect(workshop.officialItem).toBe(false);
      expect(workshop.expertReviewStatus).toBe('pending');
      expect(workshop.releaseEligible).toBe(false);
      expect(workshop.rights).toMatchObject({
        secureCollegeBoardContentUsed: false,
        copiedOrRephrasedOfficialPrompt: false,
        copiedOfficialRubric: false,
        originalStimulus: true,
      });
      expect(workshop.accessibility).toMatchObject({
        stimulusFormat: 'plain text',
        essentialVisualContent: false,
        readingOrder: 'linear',
        independentReviewStatus: 'pending',
      });
    }
  });

  it('keeps rights, expert, accessibility, safety, and production release gates closed', () => {
    expect(library.released).toBe(false);
    expect(library.releaseEligible).toBe(false);
    expect(library.rightsPolicy).toMatchObject({
      secureCollegeBoardContentUsed: false,
      copiedOrRephrasedCollegeBoardQuestions: false,
      copiedCollegeBoardRubricText: false,
      sourceProseOrFiguresReproduced: false,
      diagramSpecificationsOriginal: true,
      workshopStudiesAreSynthetic: true,
      status: 'pending-independent-rights-review',
    });
    expect(library.expertReviewGate).toMatchObject({ status: 'pending', releaseBlocked: true });
    expect(library.accessibility).toMatchObject({
      independentReviewStatus: 'pending',
      productionScreenReaderValidationStatus: 'pending',
      productionVoiceValidationStatus: 'pending',
    });
    expect(library.releaseGates).toMatchObject({
      independentRightsReview: 'pending',
      independentAccessibilityReview: 'pending',
      apPsychologySubjectExpertReview: 'pending',
      productionValidation: 'pending',
      studentSafetyReview: 'pending',
      fieldTesting: 'not-started',
      psychometricCalibration: 'not-started',
      cedAndPolicyReverification: 'required-before-release',
      releaseEligible: false,
    });
  });
});
