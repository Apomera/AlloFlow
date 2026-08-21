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
    expect(pack.version).toBe('0.2.0-internal-preview');
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

  it('contains a balanced 200-item single-choice pilot with two angles for every topic', () => {
    const unitCounts = countBy(pack.items.map((item) => item.domainId));
    const topicCounts = countBy(pack.items.flatMap((item) => item.topicIds));
    const answerCounts = countBy(pack.items.map((item) => String(item.answerIndex)));

    expect(pack.items).toHaveLength(200);
    expect(new Set(pack.items.map((item) => item.id)).size).toBe(200);
    expect(Object.values(unitCounts)).toEqual([40, 40, 40, 40, 40]);
    expect(Object.keys(topicCounts)).toHaveLength(55);
    expect(Object.values(topicCounts).every((count) => count >= 2)).toBe(true);
    expect(answerCounts).toEqual({ 0: 50, 1: 50, 2: 50, 3: 50 });
    expect(pack.sections).toHaveLength(40);
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
    expect(library.chapters.flatMap((chapter) => chapter.knowledgeChecks)).toHaveLength(15);
    expect(library.flashcards).toHaveLength(15);
    expect(library.memoryAids).toHaveLength(5);
    expect(library.constructedResponseWorkshops).toHaveLength(4);
    expect(library.constructedResponseWorkshops.every((workshop) => workshop.unscored === true)).toBe(true);
    expect(qa.automatedAssessment).toBe('pass');
    expect(qa.structuralFindings).toEqual([]);
    expect(qa.metrics).toMatchObject({ itemCount: 200, unitCount: 5, chapterCount: 5, sectionCount: 15 });
  });

  it('binds the generated pack and QA record into the lazy manifest', () => {
    const manifest = readJson(manifestPath);
    const entry = manifest.entries.find((candidate) => candidate.id === pack.id);
    expect(entry).toMatchObject({ loadMode: 'lazy', visibility: 'internal', itemCount: 200, domainCount: 5 });
    expect(entry.sha256).toBe(sha256(packPath));
    expect(entry.nativeQaSha256).toBe(sha256(qaPath));
    expect(entry.packUrl).toBe('./test_prep/ap_statistics_foundation_pilot.json');
  });
});
