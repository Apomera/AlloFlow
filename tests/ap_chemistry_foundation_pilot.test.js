import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '..');
const packPath = resolve(root, 'test_prep/ap_chemistry_foundation_pilot.json');
const libraryPath = resolve(root, 'test_prep/ap_chemistry_foundation_pilot_learning_library.json');
const qaPath = resolve(root, 'test_prep/ap_chemistry_foundation_pilot_qa.json');
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

describe('AP Chemistry internal foundation pilot', () => {
  it('crosswalks the current nine-unit blueprint without presenting itself as official', () => {
    expect(pack.id).toBe('ap-chemistry-foundation-pilot');
    expect(pack.version).toBe('0.4.0-internal-preview');
    expect(pack.status).toBe('preview');
    expect(pack.visibility).toBe('internal');
    expect(pack.released).toBe(false);
    expect(pack.releaseEligible).toBe(false);
    expect(pack.disclaimer).toMatch(/unofficial/i);
    expect(pack.disclaimer).toMatch(/laboratory competency/i);
    expect(pack.officialBlueprintUrl).toContain('ap-chemistry-course-and-exam-description.pdf');
    expect(pack.blueprint.officialSectionOne).toMatch(/60 multiple-choice/);
    expect(pack.blueprint.officialSectionTwo).toMatch(/7 free-response/);
    expect(pack.domains).toHaveLength(9);
    expect(pack.domains.every((domain) => domain.officialWeightMin < domain.officialWeightMax)).toBe(true);
    expect(pack.blueprint.bigIdeas).toHaveLength(7);
    expect(pack.blueprint.sciencePractices).toHaveLength(6);
  });

  it('contains a balanced 600-item pilot across all units and science practices', () => {
    const unitCounts = countsBy(pack.items.map((item) => item.domainId));
    const practiceCounts = countsBy(pack.items.map((item) => item.practiceId));
    const answerCounts = countsBy(pack.items.map((item) => String(item.answerIndex)));

    expect(pack.items).toHaveLength(600);
    expect(new Set(pack.items.map((item) => item.id)).size).toBe(600);
    expect(Object.values(unitCounts)).toEqual([64, 62, 79, 62, 64, 66, 68, 77, 58]);
    expect(Object.keys(practiceCounts).sort()).toEqual(['SP1', 'SP2', 'SP3', 'SP4', 'SP5', 'SP6']);
    expect(answerCounts).toEqual({ 0: 150, 1: 150, 2: 150, 3: 150 });
    expect(pack.sections).toHaveLength(120);
    expect(pack.sections.every((section) => section.itemIds.length === 5)).toBe(true);
    expect(pack.items.every((item) => item.choices.length === 4 && item.choiceRationales.length === 4)).toBe(true);
    expect(pack.items.every((item) => item.provenance === 'native-original' && item.releaseEligible === false)).toBe(true);
  });

  it('adds a 100-item capstone layer centered on data interpretation and argumentation', () => {
    const capstone = pack.items.filter((item) => Number(item.id.match(/-(\d{3})$/)?.[1]) >= 501);
    const capstonePractices = countsBy(capstone.map((item) => item.practiceId));

    expect(capstone).toHaveLength(100);
    expect(capstonePractices).toEqual({ SP3: 50, SP6: 50 });
    expect(capstone.every((item) => item.stimulus && item.editorialChecks.scenarioBased)).toBe(true);
  });

  it('routes every item to a topic-level remediation target and a native chapter', () => {
    const catalog = pack.blueprint.learningObjectiveCatalog;
    const objectiveById = new Map(catalog.map((objective) => [objective.id, objective]));

    expect(catalog).toHaveLength(91);
    expect(new Set(catalog.map((objective) => objective.topicId)).size).toBe(91);
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

  it('provides nine native chapters with structured lessons and study aids', () => {
    expect(library.chapters).toHaveLength(9);
    expect(library.chapters.filter((chapter) => chapter.foundationPrototype).length).toBe(9);
    expect(library.chapters.every((chapter) => Array.isArray(chapter.sections))).toBe(true);
    expect(library.chapters.every((chapter) => chapter.knowledgeChecks.length === 1)).toBe(true);
    expect(library.flashcards).toHaveLength(9);
    expect(library.memoryAids).toHaveLength(9);
    expect(library.sourceCatalog).toHaveLength(3);
    expect(library.summary).toMatchObject({ chapters: 9, sections: 9, knowledgeChecks: 9, richLessonPrototypes: 9 });
    expect(library.contentMigration).toMatchObject({ contentVersion: 'ap-chemistry-foundation-v3', richLessonPrototypes: 9 });
    expect(library.blueprint.pilotAlignment).toMatch(/600-item/);
    expect(library.chapters.every((chapter) => {
      const section = chapter.sections[0];
      return section.contentBlocks.length >= 8 && section.examples.length >= 3 && section.nonExamples.length >= 3 &&
        section.retrievalPrompts.length >= 2 && section.workedDataExample.rows.length >= 2;
    })).toBe(true);
  });

  it('passes deterministic QA and binds byte-identical deployment mirrors', () => {
    expect(qa.automatedAssessment).toBe('pass');
    expect(qa.structuralFindings).toEqual([]);
    expect(qa.metrics).toMatchObject({ itemCount: 600, unitCount: 9, topicCount: 91, chapterCount: 9, richLessonPrototypeCount: 9, nearDuplicatePairCount: 0 });
    for (const parity of qa.deploymentParity) expect(parity.status).toBe('pass');

    const manifest = readJson(manifestPath);
    const entry = manifest.entries.find((candidate) => candidate.id === pack.id);
    expect(entry).toMatchObject({ loadMode: 'lazy', visibility: 'internal', itemCount: 600, domainCount: 9 });
    expect(entry.sha256).toBe(sha256(packPath));
    expect(entry.nativeQaSha256).toBe(sha256(qaPath));
  });
});
