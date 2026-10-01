import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import { resolve } from 'node:path';

const read = (file) => fs.readFileSync(resolve(process.cwd(), file), 'utf8');
const library = JSON.parse(read('test_prep/praxis_core_5752_learning_library.json'));
const pack = JSON.parse(read('test_prep/praxis_core_5752_pack.json'));
const qa = JSON.parse(read('test_prep/praxis_core_5752_learning_library_qa.json'));

describe('Praxis Core Combined 5752 native learning library', () => {
  it('ships the complete learning and essay-practice inventory', () => {
    expect(library).toMatchObject({
      schemaVersion: 1,
      libraryId: 'praxis-core-5752-learning-library',
      packId: 'praxis-core-5752',
      simulation: { questionCount: 152, timeMinutes: 215, officialTotalTimeMinutes: 275, officialEssayCount: 2 },
      summary: { chapters: 12, sections: 48, knowledgeChecks: 60, flashcards: 75, memoryAids: 20, constructedResponseWorkshops: 8, sourceReviewedChapters: 12, sourceReviewedFlashcards: 75, sourceReviewedMemoryAids: 20, sourceReviewedConstructedResponseWorkshops: 8 },
    });
    expect(library.skills).toHaveLength(12);
    expect(library.chapters).toHaveLength(12);
    expect(library.flashcards).toHaveLength(75);
    expect(library.memoryAids).toHaveLength(20);
    expect(library.constructedResponseWorkshops).toHaveLength(8);
    expect(library.legalCaution).toContain('not an official score');
    expect(library.simulation.note).toContain('does not score essays');
  });

  it('gives every chapter four substantive lessons and five authoritative checks', () => {
    const allowedHosts = new Set(['praxis.ets.org', 'thecorestandards.org', 'www.thecorestandards.org']);
    for (const chapter of library.chapters) {
      expect(chapter.sections).toHaveLength(4);
      expect(chapter.knowledgeChecks).toHaveLength(5);
      expect(chapter.objectives.length).toBeGreaterThanOrEqual(3);
      expect(chapter.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(chapter.reviewNote).toContain('independent literacy, writing, mathematics, accessibility, and psychometric validation remain pending');
      expect(chapter.sections.every((entry) => entry.content.length >= 300 && entry.keyTerms.length >= 3)).toBe(true);
      expect(chapter.knowledgeChecks.every((check) => check.choices.length === 4 && check.answerIndex >= 0 && check.answerIndex < 4 && check.rationale.length >= 100)).toBe(true);
      expect(chapter.references.every((url) => allowedHosts.has(new URL(url).hostname))).toBe(true);
    }
  });

  it('provides balanced argumentative and source-based essay workshops with transparent self-checks', () => {
    const types = library.constructedResponseWorkshops.reduce((counts, workshop) => { counts[workshop.taskType] = (counts[workshop.taskType] || 0) + 1; return counts; }, {});
    expect(types).toEqual({ 'Argumentative Essay': 4, 'Informative/Explanatory Source-Based Essay': 4 });
    for (const workshop of library.constructedResponseWorkshops) {
      expect(workshop.prompt.length).toBeGreaterThanOrEqual(100);
      expect(workshop.stimulus.length).toBeGreaterThanOrEqual(300);
      expect(workshop.taskParts).toHaveLength(3);
      expect(workshop.planningFrame).toHaveLength(4);
      expect(workshop.successCriteria).toHaveLength(4);
      expect(workshop.commonPitfalls).toHaveLength(4);
      expect(workshop.sampleOutline).toHaveLength(3);
      expect(workshop.references.length).toBeGreaterThanOrEqual(2);
      expect(workshop.reviewStatus).toBe('source-reviewed-editorial-pass');
      expect(workshop.reviewNote).toContain('not an official ETS prompt, scoring guide, essay score, scaled score, pass prediction');
    }
  });

  it('explains the algebra knowledge check without importing the parallel-form equation', () => {
    const check = library.chapters.flatMap((chapter) => chapter.knowledgeChecks).find((entry) => entry.id === 'core5752-ch-11-check-01');
    expect(check.rationale).toContain('3x = 18');
    expect(check.rationale).not.toContain('5x = 30');
  });

  it('links all 200 questions to exactly one compatible skill and chapter', () => {
    const skillById = Object.fromEntries(library.skills.map((skill) => [skill.id, skill]));
    const chapterById = Object.fromEntries(library.chapters.map((chapter) => [chapter.id, chapter]));
    for (const item of pack.items) {
      const skill = skillById[item.skillIds[0]];
      const chapter = chapterById[item.chapterIds[0]];
      expect(item.skillIds).toHaveLength(1);
      expect(item.chapterIds).toHaveLength(1);
      expect(skill).toBeTruthy();
      expect(chapter).toBeTruthy();
      expect(skill.domainId).toBe(item.domainId);
      expect(skill.chapterId).toBe(chapter.id);
      expect(chapter.skillId).toBe(skill.id);
    }
    expect(pack).toMatchObject({ learningLibraryUrl: './test_prep/praxis_core_5752_learning_library.json', learningLibraryQaUrl: './test_prep/praxis_core_5752_learning_library_qa.json', simulationItemCount: 152, simulationTimeMinutes: 215 });
  });

  it('publishes passing QA and exact learning-library mirrors', () => {
    expect(qa.summary).toMatchObject({ chapters: 12, sections: 48, knowledgeChecks: 60, flashcards: 75, memoryAids: 20, constructedResponseWorkshops: 8, findings: [], status: 'pass' });
    expect(qa.standard.limitation).toContain('not ETS approval');
    expect(qa.standard.limitation).toContain('official essay scoring');
    for (const name of ['praxis_core_5752_learning_library.json', 'praxis_core_5752_learning_library_qa.json', 'praxis_core_5752_learning_library_qa.md']) expect(read('desktop/web-app/public/test_prep/' + name)).toBe(read('test_prep/' + name));
  });
});
