import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const packPath = resolve(root, 'test_prep/ap_biology_foundation_pilot.json');
const libraryPath = resolve(root, 'test_prep/ap_biology_foundation_pilot_learning_library.json');
const qaPath = resolve(root, 'test_prep/ap_biology_foundation_pilot_qa.json');
const manifestPath = resolve(root, 'test_prep/pack_manifest.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function countsBy(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] || 0) + 1;
    return counts;
  }, {});
}

function sha256(filePath) {
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

const pack = readJson(packPath);
const library = readJson(libraryPath);
const qa = readJson(qaPath);

describe('AP Biology internal foundation pilot', () => {
  it('crosswalks the current eight-unit blueprint without presenting itself as official', () => {
    expect(pack.id).toBe('ap-biology-foundation-pilot');
    expect(pack.version).toBe('0.8.0-internal-preview');
    expect(pack.status).toBe('preview');
    expect(pack.visibility).toBe('internal');
    expect(pack.released).toBe(false);
    expect(pack.releaseEligible).toBe(false);
    expect(pack.disclaimer).toMatch(/unofficial/i);
    expect(pack.disclaimer).toMatch(/laboratory competency/i);
    expect(pack.officialBlueprintUrl).toContain('ap-biology-course-and-exam-description.pdf');
    expect(pack.blueprint.officialSectionOne).toMatch(/60 multiple-choice/);
    expect(pack.blueprint.officialSectionTwo).toMatch(/6 free-response/);
    expect(pack.domains).toHaveLength(8);
    expect(pack.domains.every((domain) => domain.officialWeightMin < domain.officialWeightMax)).toBe(true);
    expect(pack.blueprint.bigIdeas).toHaveLength(4);
    expect(pack.blueprint.sciencePractices).toHaveLength(6);
  });

  it('contains a balanced 400-item pilot across all units and science practices', () => {
    const unitCounts = countsBy(pack.items.map((item) => item.domainId));
    const practiceCounts = countsBy(pack.items.map((item) => item.practiceId));
    const answerCounts = countsBy(pack.items.map((item) => String(item.answerIndex)));

    expect(pack.items).toHaveLength(400);
    expect(new Set(pack.items.map((item) => item.id)).size).toBe(400);
    expect(Object.values(unitCounts).every((count) => count >= 48)).toBe(true);
    expect(Object.keys(practiceCounts).sort()).toEqual(['SP1', 'SP2', 'SP3', 'SP4', 'SP5', 'SP6']);
    expect(answerCounts).toEqual({ 0: 100, 1: 100, 2: 100, 3: 100 });
    expect(pack.sections).toHaveLength(80);
    expect(pack.sections.every((section) => section.itemIds.length === 5)).toBe(true);
    expect(pack.items.every((item) => item.choices.length === 4 && item.choiceRationales.length === 4)).toBe(true);
    expect(pack.items.every((item) => item.provenance === 'native-original' && item.releaseEligible === false)).toBe(true);
  });

  it('routes every item to a topic-level remediation target and a native chapter', () => {
    const catalog = pack.blueprint.learningObjectiveCatalog;
    const objectiveById = new Map(catalog.map((objective) => [objective.id, objective]));

    expect(catalog).toHaveLength(60);
    expect(new Set(catalog.map((objective) => objective.topicId)).size).toBe(60);
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

  it('provides eight native chapters with structured lessons and study aids', () => {
    expect(library.chapters).toHaveLength(8);
    expect(library.chapters.filter((chapter) => chapter.foundationPrototype).length).toBe(8);
    expect(library.chapters.every((chapter) => Array.isArray(chapter.sections))).toBe(true);
    expect(library.chapters.every((chapter) => chapter.knowledgeChecks.length === 1)).toBe(true);
    expect(library.flashcards).toHaveLength(8);
    expect(library.memoryAids).toHaveLength(8);
    expect(library.summary).toMatchObject({ chapters: 8, sections: 8, knowledgeChecks: 8, richLessonPrototypes: 8 });
    expect(library.chapters.every((chapter) => {
      const section = chapter.sections[0];
      return section.contentBlocks.length >= 8 && section.examples.length >= 2 && section.nonExamples.length >= 2 &&
        section.retrievalPrompts.length >= 3 && section.workedDataExample.rows.length >= 2;
    })).toBe(true);
  });

  it('passes deterministic QA and binds byte-identical deployment mirrors', () => {
    expect(qa.automatedAssessment).toBe('pass');
    expect(qa.structuralFindings).toEqual([]);
    expect(qa.metrics).toMatchObject({ itemCount: 400, unitCount: 8, chapterCount: 8, richLessonPrototypeCount: 8 });
    for (const parity of qa.deploymentParity) expect(parity.status).toBe('pass');

    const manifest = readJson(manifestPath);
    const entry = manifest.entries.find((candidate) => candidate.id === pack.id);
    expect(entry).toMatchObject({ loadMode: 'lazy', visibility: 'internal', itemCount: 400, domainCount: 8 });
    expect(entry.sha256).toBe(sha256(packPath));
    expect(entry.nativeQaSha256).toBe(sha256(qaPath));
  });
});
