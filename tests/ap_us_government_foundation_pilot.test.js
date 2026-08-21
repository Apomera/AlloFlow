import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const packPath = resolve(root, 'test_prep/ap_us_government_foundation_pilot.json');
const libraryPath = resolve(root, 'test_prep/ap_us_government_foundation_pilot_learning_library.json');
const qaPath = resolve(root, 'test_prep/ap_us_government_foundation_pilot_qa.json');
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

describe('AP U.S. Government and Politics internal foundation pilot', () => {
  it('crosswalks the current five-unit, sixty-topic public framework without presenting itself as official', () => {
    expect(pack.id).toBe('ap-us-government-foundation-pilot');
    expect(pack.version).toBe('0.4.0-internal-preview');
    expect(pack.status).toBe('preview');
    expect(pack.visibility).toBe('internal');
    expect(pack.released).toBe(false);
    expect(pack.releaseEligible).toBe(false);
    expect(pack.disclaimer).toMatch(/unofficial/i);
    expect(pack.disclaimer).toMatch(/official scores|score predictions/i);
    expect(pack.officialBlueprintUrl).toContain('ap-us-government-and-politics-course-and-exam-description.pdf');
    expect(pack.domains).toHaveLength(5);
    expect(pack.blueprint.officialFrameworkTopicCount).toBe(60);
    expect(pack.blueprint.officialFrameworkTopicIds).toHaveLength(60);
    expect(pack.blueprint.bigIdeas).toHaveLength(5);
    expect(pack.blueprint.skills).toHaveLength(5);
  });

  it('contains a balanced 200-item pilot with two angles for every topic', () => {
    const unitCounts = countBy(pack.items.map((item) => item.domainId));
    const skillCounts = countBy(pack.items.map((item) => item.skillId));
    const answerCounts = countBy(pack.items.map((item) => String(item.answerIndex)));
    const topicCounts = countBy(pack.items.flatMap((item) => item.topicIds));

    expect(pack.items).toHaveLength(200);
    expect(new Set(pack.items.map((item) => item.id)).size).toBe(200);
    expect(Object.values(unitCounts).sort((a, b) => a - b)).toEqual([24, 30, 36, 50, 60]);
    expect(Object.values(topicCounts).every((count) => count >= 2)).toBe(true);
    expect(Object.keys(topicCounts)).toHaveLength(60);
    expect(pack.depthCoverage).toMatchObject({ baseItemCount: 100, depthItemCount: 100, topicsWithAtLeastTwoItems: 60, topicCount: 60 });
    expect(pack.items.filter((item) => item.practiceSlice === 'foundation-slice')).toHaveLength(100);
    expect(pack.items.filter((item) => item.practiceSlice === 'depth-slice')).toHaveLength(100);
    expect(pack.items.every((item) => (item.practiceSlice === 'foundation-slice' && item.practiceAngle === 'foundation') || (item.practiceSlice === 'depth-slice' && item.practiceAngle === 'depth'))).toBe(true);
    expect(pack.practiceRouting).toMatchObject({ mode: 'section-linked-item-routes', sectionCount: 15, itemCount: 200, uniqueItemCount: 200, foundationItemCount: 100, depthItemCount: 100, topicDrillMapCount: 60 });
    expect(Object.keys(skillCounts).sort()).toEqual([
      '1.A', '1.B', '1.C', '1.D', '1.E',
      '2.A', '2.B', '2.C', '2.D',
      '3.A', '3.B', '3.C', '3.D', '3.E', '3.F',
      '4.A', '4.B', '4.C', '4.D',
      '5.A', '5.B', '5.C', '5.D',
    ]);
    expect(answerCounts).toEqual({ 0: 50, 1: 50, 2: 50, 3: 50 });
    expect(pack.sections).toHaveLength(40);
    expect(pack.sections.every((section) => section.itemIds.length === 5)).toBe(true);
    expect(pack.items.every((item) => item.choices.length === 4 && item.choiceRationales.length === 4)).toBe(true);
    expect(pack.items.every((item) => item.provenance === 'native-original' && item.releaseEligible === false)).toBe(true);
  });

  it('routes every item to a topic-level remediation target and structured unit lesson', () => {
    const objectiveById = new Map(pack.blueprint.learningObjectiveCatalog.map((objective) => [objective.id, objective]));
    expect(pack.blueprint.learningObjectiveCatalog).toHaveLength(60);
    for (const item of pack.items) {
      const objective = objectiveById.get(item.learningObjectiveId);
      expect(objective).toBeTruthy();
      expect(objective.topicId).toBe(item.topicIds[0]);
      expect(objective.domainId).toBe(item.domainId);
      expect(item.chapterIds).toEqual([objective.chapterId]);
      expect(item.learningSectionId).toBe(objective.sectionId);
      expect(objective.practiceIds).toContain(item.practiceId);
    }
  });

  it('provides five native chapters, fifteen structured sections, and deterministic QA', () => {
    expect(library.chapters).toHaveLength(5);
    expect(library.chapters.every((chapter) => chapter.foundationPrototype)).toBe(true);
    expect(library.chapters.every((chapter) => chapter.sections.length === 3)).toBe(true);
    expect(library.chapters.flatMap((chapter) => chapter.knowledgeChecks)).toHaveLength(15);
    expect(library.flashcards).toHaveLength(15);
    expect(library.memoryAids).toHaveLength(5);
    expect(library.summary).toMatchObject({ chapters: 5, sections: 15, knowledgeChecks: 15, richLessonPrototypes: 5 });
    expect(library.chapters.every((chapter) => chapter.sections.every((section) => section.contentBlocks.length >= 8))).toBe(true);
    const studySections = library.chapters.flatMap((chapter) => chapter.sections);
    expect(studySections.every((section) => section.practiceRoute.itemCount === section.practiceRoute.itemIds.length &&
      section.practiceRoute.foundationItemCount + section.practiceRoute.depthItemCount === section.practiceRoute.itemCount &&
      Object.values(section.practiceRoute.topicCounts).every((count) => count >= 2) &&
      Object.keys(section.practiceRoute.topicItemIds).length === Object.keys(section.practiceRoute.topicCounts).length &&
      Object.entries(section.practiceRoute.topicItemIds).every(([topicId, itemIds]) => itemIds.length === section.practiceRoute.topicCounts[topicId] && itemIds.every((itemId) => section.practiceRoute.itemIds.includes(itemId))))).toBe(true);
    expect(library.practiceRouting).toMatchObject({ mode: 'section-linked-item-routes', sectionCount: 15, itemCount: 200, uniqueItemCount: 200, foundationItemCount: 100, depthItemCount: 100, topicDrillMapCount: 60 });
    expect(qa.automatedAssessment).toBe('pass');
    expect(qa.structuralFindings).toEqual([]);
    expect(qa.metrics).toMatchObject({ itemCount: 200, unitCount: 5, topicCount: 60, topicsWithAtLeastTwoItems: 60, chapterCount: 5, sectionCount: 15, practiceSliceCounts: { 'foundation-slice': 100, 'depth-slice': 100 }, topicDrillMapCount: 60 });
  });

  it('binds the generated pack and QA record into the lazy manifest', () => {
    const manifest = readJson(manifestPath);
    const entry = manifest.entries.find((candidate) => candidate.id === pack.id);
    expect(entry).toMatchObject({ loadMode: 'lazy', visibility: 'internal', itemCount: 200, domainCount: 5 });
    expect(entry.sha256).toBe(sha256(packPath));
    expect(entry.nativeQaSha256).toBe(sha256(qaPath));
    expect(entry.packUrl).toBe('./test_prep/ap_us_government_foundation_pilot.json');
  });
});
