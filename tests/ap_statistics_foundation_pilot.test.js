import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const packPath = resolve(root, 'test_prep/ap_statistics_foundation_pilot.json');
const libraryPath = resolve(root, 'test_prep/ap_statistics_foundation_pilot_learning_library.json');
const qaPath = resolve(root, 'test_prep/ap_statistics_foundation_pilot_qa.json');
const manifestPath = resolve(root, 'test_prep/pack_manifest.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function sha256(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function countBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

const pack = readJson(packPath);
const library = readJson(libraryPath);
const qa = readJson(qaPath);

describe('AP Statistics internal foundation pilot', () => {
  it('crosswalks the current five-unit public framework without presenting itself as official', () => {
    expect(pack.id).toBe('ap-statistics-foundation-pilot');
    expect(pack.version).toBe('0.3.0-internal-preview');
    expect(pack.status).toBe('preview');
    expect(pack.visibility).toBe('internal');
    expect(pack.released).toBe(false);
    expect(pack.releaseEligible).toBe(false);
    expect(pack.disclaimer).toMatch(/unofficial/i);
    expect(pack.disclaimer).toMatch(/official scores|score predictions/i);
    expect(pack.officialBlueprintUrl).toContain('ap-statistics-course-and-exam-description.pdf');
    expect(pack.domains).toHaveLength(5);
    expect(pack.blueprint.officialFrameworkTopicCount).toBe(55);
    expect(pack.blueprint.officialFrameworkTopicIds).toHaveLength(55);
  });

  it('contains a balanced 240-item single-choice pilot with transfer depth for every topic', () => {
    const unitCounts = countBy(pack.items.map((item) => item.domainId));
    const topicCounts = countBy(pack.items.flatMap((item) => item.topicIds));
    const answerCounts = countBy(pack.items.map((item) => String(item.answerIndex)));

    expect(pack.items).toHaveLength(240);
    expect(new Set(pack.items.map((item) => item.id)).size).toBe(240);
    expect(Object.values(unitCounts)).toEqual([48, 48, 48, 48, 48]);
    expect(Object.keys(topicCounts)).toHaveLength(55);
    expect(Object.values(topicCounts).every((count) => count >= 2)).toBe(true);
    expect(answerCounts).toEqual({ 0: 60, 1: 60, 2: 60, 3: 60 });
    expect(pack.sections).toHaveLength(48);
    expect(pack.sections.every((section) => section.itemIds.length === 5)).toBe(true);
    expect(pack.items.every((item) => item.choices.length === 4 && item.choiceRationales.length === 4)).toBe(true);
    expect(pack.items.every((item) => item.provenance?.officialContentReproduced === false && item.officialItem === false && item.releaseEligible === false)).toBe(true);
  });

  it('routes items to topic objectives and structured learning content', () => {
    const objectiveById = new Map(pack.blueprint.learningObjectiveCatalog.map((objective) => [objective.id, objective]));
    expect(pack.blueprint.learningObjectiveCatalog).toHaveLength(55);
    for (const item of pack.items) {
      const objective = objectiveById.get(item.learningObjectiveId);
      expect(objective).toBeTruthy();
      expect(objective.id.startsWith(`${item.topicIds[0]}.`)).toBe(true);
      expect(item.chapterIds).toEqual([objective.chapterId]);
      expect(item.learningSectionId).toBe(objective.sectionId);
    }
  });

  it('provides five chapters, fifteen sections, and deterministic QA', () => {
    expect(library.chapters).toHaveLength(5);
    expect(library.chapters.every((chapter) => chapter.foundationPrototype)).toBe(true);
    expect(library.chapters.every((chapter) => chapter.sections.length === 3)).toBe(true);
    expect(library.chapters.flatMap((chapter) => chapter.knowledgeChecks)).toHaveLength(30);
    expect(library.flashcards).toHaveLength(30);
    expect(library.memoryAids).toHaveLength(10);
    expect(library.constructedResponseWorkshops).toHaveLength(9);
    expect(library.constructedResponseWorkshops.every((workshop) => workshop.unscored === true)).toBe(true);
    expect(library.chapters.flatMap((chapter) => chapter.sections.map((section) => section.practiceRoute))).toHaveLength(15);
    expect(library.chapters.flatMap((chapter) => chapter.sections.map((section) => section.practiceRoute)).every((route) => route.foundationItemIds.length > 0 && route.depthItemIds.length > 0 && route.transferItemIds.length > 0)).toBe(true);
    expect(library.studyRoutes).toHaveLength(4);
    expect(library.studyRoutes.every((route) => route.itemIds.length > 0 && route.releaseEligible === false)).toBe(true);
    expect(library.diagrams).toHaveLength(5);
    expect(library.diagramPlacements).toHaveLength(5);
    expect(library.diagrams.every((diagram) => diagram.unscored === true && diagram.accessibility.fallbackMode === 'ordered-text-equivalent')).toBe(true);
    expect(library.diagrams.every((diagram) => diagram.accessibility.textEquivalent.length >= 3)).toBe(true);
    expect(library.diagramPlacements.every((placement) => placement.requiredForComprehension === false && placement.fallbackMode === 'diagram-text-equivalent')).toBe(true);
    expect(qa.automatedAssessment).toBe('pass');
    expect(qa.structuralFindings).toEqual([]);
    expect(qa.metrics).toMatchObject({ itemCount: 240, unitCount: 5, chapterCount: 5, sectionCount: 15, practiceRouteCount: 15, studyRouteCount: 4, practiceRoutedItemCount: 240, diagramCount: 5, diagramPlacementCount: 5 });
  });

  it('binds the generated pack and QA record into the lazy manifest', () => {
    const manifest = readJson(manifestPath);
    const entry = manifest.entries.find((candidate) => candidate.id === pack.id);
    expect(entry).toMatchObject({ loadMode: 'lazy', visibility: 'internal', itemCount: 240, domainCount: 5 });
    expect(entry.sha256).toBe(sha256(packPath));
    expect(entry.nativeQaSha256).toBe(sha256(qaPath));
    expect(entry.packUrl).toBe('./test_prep/ap_statistics_foundation_pilot.json');
  });
});
